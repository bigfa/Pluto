/**
 * Newsletter Services - D1 Implementation
 */

import { Env } from "@/lib/env";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getActiveSubscribers } from "./subscriberServices";

export interface NewsletterListResult {
    newsletters: schema.NewslettersTable[];
    total: number;
}

export interface SendNewsletterResult {
    ok: boolean;
    count: number;
    total: number;
    failed: number;
    error?: string;
    code?: 'NOT_FOUND' | 'SERVER_ERROR';
    failedRecipients?: string[];
}

/**
 * Create a new newsletter draft.
 */
export async function createNewsletter(
    env: Env,
    subject: string,
    content: string,
    type: string = 'general'
): Promise<schema.NewslettersTable | null> {
    const client = getDb(env);
    if (!client) return null;

    const { db } = client;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.newsletters)
        .values({
            id,
            subject,
            content,
            type,
            status: 'draft',
            recipients_count: 0,
            created_at: now
        });

    return {
        id,
        subject,
        content,
        type,
        status: 'draft',
        recipients_count: 0,
        created_at: now,
        sent_at: null
    };
}

/**
 * List newsletters with pagination.
 */
export async function listNewsletters(
    env: Env,
    page: number = 1,
    pageSize: number = 20
): Promise<NewsletterListResult> {
    const client = getDb(env);
    if (!client) {
        return { newsletters: [], total: 0 };
    }

    const { db } = client;
    const offset = (page - 1) * pageSize;

    const rows = await db.select()
        .from(schema.newsletters)
        .orderBy(desc(schema.newsletters.created_at))
        .limit(pageSize)
        .offset(offset);

    const totalRes = await db.select({ c: count() })
        .from(schema.newsletters);

    return {
        newsletters: rows,
        total: totalRes[0]?.c || 0
    };
}

// Resend API Type
interface ResendEmail {
    from: string;
    to: string[];
    subject: string;
    html: string;
}

async function sendViaResend(apiKey: string, email: ResendEmail) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(email)
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('Resend Error:', err);
        throw new Error(`Resend Error: ${err}`);
    }
    return res.json();
}

/**
 * Send a newsletter to all active subscribers.
 */
export async function sendNewsletter(
    env: Env,
    id: string
): Promise<SendNewsletterResult> {
    const client = getDb(env);
    if (!client) {
        return { ok: false, count: 0, total: 0, failed: 0, error: 'Database not available', code: 'SERVER_ERROR' };
    }

    const { db } = client;

    const newsletters = await db.select()
        .from(schema.newsletters)
        .where(eq(schema.newsletters.id, id))
        .limit(1);

    const newsletter = newsletters[0];

    if (!newsletter || newsletter.status === 'sent') {
        return { ok: false, count: 0, total: 0, failed: 0, error: 'Newsletter not found or already sent', code: 'NOT_FOUND' };
    }

    if (!env.RESEND_API_KEY) {
        return { ok: false, count: 0, total: 0, failed: 0, error: 'RESEND_API_KEY not configured', code: 'SERVER_ERROR' };
    }

    // Get Active Subscribers
    const subscribers = await getActiveSubscribers(env);
    const total = subscribers.length;
    if (subscribers.length === 0) {
        return { ok: true, count: 0, total: 0, failed: 0 };
    }

    // Update status to sending
    await db.update(schema.newsletters)
        .set({ status: 'sending' })
        .where(eq(schema.newsletters.id, id));

    const from = env.RESEND_FROM_EMAIL || env.EMAIL_FROM || "updates@example.com";
    const domain = env.NEXT_PUBLIC_BASE_URL || "https://example.com";

    let sentCount = 0;
    let failedCount = 0;
    const failedRecipients: string[] = [];
    const maxFailedSamples = 20;

    const batchSize = 10;
    for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        const settled = await Promise.allSettled(
            batch.map(async (sub) => {
                const unsubscribeLink = `${domain}/unsubscribe?token=${sub.token}`;
                const content = newsletter.content
                    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeLink)
                    .replace(/\{\{email\}\}/g, sub.email);

                const footer = `<p style="font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
                You are receiving this email because you subscribed to our updates.<br>
                <a href="${unsubscribeLink}">Unsubscribe</a>
            </p>`;

                await sendViaResend(env.RESEND_API_KEY!, {
                    from,
                    to: [sub.email],
                    subject: newsletter.subject,
                    html: content + footer
                });
                return sub.email;
            }),
        );

        settled.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                sentCount += 1;
                return;
            }

            failedCount += 1;
            const failedEmail = batch[index]?.email;
            if (failedEmail && failedRecipients.length < maxFailedSamples) {
                failedRecipients.push(failedEmail);
            }
            console.error(`Failed to send to ${failedEmail ?? 'unknown-recipient'}`, result.reason);
        });
    }

    const finalStatus = sentCount === 0 ? 'failed' : 'sent';
    await db.update(schema.newsletters)
        .set({
            status: finalStatus,
            recipients_count: sentCount,
            sent_at: sentCount > 0 ? new Date().toISOString() : null
        })
        .where(eq(schema.newsletters.id, id));

    if (total > 0 && sentCount === 0) {
        return {
            ok: false,
            count: 0,
            total,
            failed: failedCount,
            error: 'All sends failed',
            code: 'SERVER_ERROR',
            failedRecipients,
        };
    }

    return {
        ok: true,
        count: sentCount,
        total,
        failed: failedCount,
        failedRecipients: failedCount > 0 ? failedRecipients : undefined,
    };
}
