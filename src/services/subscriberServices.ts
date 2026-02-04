/**
 * Subscriber Services - D1 Implementation
 */

import { Env } from "@/lib/env";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";

export interface SubscribeResult {
    ok: boolean;
    token?: string;
    error?: string;
}

export interface SubscriberListResult {
    subscribers: schema.SubscribersTable[];
    total: number;
}

/**
 * Add a new subscriber or reactivate an existing one.
 */
export async function addSubscriber(env: Env, email: string): Promise<SubscribeResult> {
    const client = getDb(env);
    if (!client) {
        return { ok: false, error: 'Database not available' };
    }

    const { db } = client;

    // Check if email already exists
    const existing = await db.select({ id: schema.subscribers.id, status: schema.subscribers.status })
        .from(schema.subscribers)
        .where(eq(schema.subscribers.email, email))
        .limit(1);

    if (existing.length > 0) {
        // Already subscribed, ensure active
        await db.update(schema.subscribers)
            .set({ status: 'active', updated_at: sql`datetime('now')` })
            .where(eq(schema.subscribers.email, email));
        return { ok: true };
    }

    // Create new subscriber
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.subscribers)
        .values({
            id,
            email,
            token,
            status: 'active',
            created_at: now,
            updated_at: now
        });

    return { ok: true, token };
}

/**
 * Unsubscribe a user by their token.
 */
export async function unsubscribe(env: Env, token: string): Promise<boolean> {
    const client = getDb(env);
    if (!client) return false;

    const { db } = client;
    const result = await db.update(schema.subscribers)
        .set({ status: 'unsubscribed', updated_at: sql`datetime('now')` })
        .where(eq(schema.subscribers.token, token))
        .returning({ id: schema.subscribers.id });

    return Array.isArray(result) ? result.length > 0 : false;
}

/**
 * List subscribers with pagination.
 */
export async function listSubscribers(
    env: Env,
    page: number = 1,
    pageSize: number = 20
): Promise<SubscriberListResult> {
    const client = getDb(env);
    if (!client) {
        return { subscribers: [], total: 0 };
    }

    const { db } = client;
    const offset = (page - 1) * pageSize;

    const rows = await db.select()
        .from(schema.subscribers)
        .orderBy(desc(schema.subscribers.created_at))
        .limit(pageSize)
        .offset(offset);

    const totalRes = await db.select({ c: count() })
        .from(schema.subscribers);

    return {
        subscribers: rows,
        total: totalRes[0]?.c || 0
    };
}

/**
 * Get all active subscribers (for sending newsletters).
 */
export async function getActiveSubscribers(env: Env): Promise<schema.SubscribersTable[]> {
    const client = getDb(env);
    if (!client) return [];

    const { db } = client;
    return await db.select()
        .from(schema.subscribers)
        .where(eq(schema.subscribers.status, "active"));
}

/**
 * Check if subscription feature is enabled (RESEND_API_KEY is configured).
 */
export function isSubscriptionEnabled(env: Env): boolean {
    return !!env.RESEND_API_KEY;
}
