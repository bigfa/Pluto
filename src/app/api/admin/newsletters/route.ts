import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { listNewsletters, createNewsletter, sendNewsletter } from '@/services/newsletterServices';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();

    try {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page')) || 1;
        const pageSize = Number(url.searchParams.get('pageSize')) || 20;

        const data = await listNewsletters(env, page, pageSize);
        return NextResponse.json({ ok: true, ...data });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e), code: 'SERVER_ERROR' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();

    try {
        let body: {
            subject?: string;
            content?: string;
            type?: string;
            action?: string;
            id?: string;
        };
        try {
            body = await request.json() as {
                subject?: string;
                content?: string;
                type?: string;
                action?: string;
                id?: string;
            };
        } catch {
            return NextResponse.json({ ok: false, error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 });
        }

        const { subject, content, type, action, id } = body;

        // If action is 'send', send the newsletter
        if (action === 'send') {
            if (!id) {
                return NextResponse.json({ ok: false, error: 'Missing newsletter id', code: 'VALIDATION_ERROR' }, { status: 400 });
            }
            const result = await sendNewsletter(env, id);
            if (!result.ok) {
                const status = result.code === 'NOT_FOUND' ? 404 : 500;
                return NextResponse.json(
                    {
                        ok: false,
                        error: result.error || 'Failed to send newsletter',
                        code: result.code || 'SERVER_ERROR',
                        sent: result.count,
                        total: result.total,
                        failed: result.failed,
                        failedRecipients: result.failedRecipients,
                    },
                    { status },
                );
            }
            return NextResponse.json({
                ok: true,
                sent: result.count,
                total: result.total,
                failed: result.failed,
                failedRecipients: result.failedRecipients,
            });
        }

        // Otherwise create a new newsletter
        if (!subject || !content) {
            return NextResponse.json({ ok: false, error: 'Subject and content are required', code: 'VALIDATION_ERROR' }, { status: 400 });
        }

        const newsletter = await createNewsletter(env, subject, content, type || 'general');
        if (!newsletter) {
            return NextResponse.json({ ok: false, error: 'Failed to create newsletter', code: 'SERVER_ERROR' }, { status: 500 });
        }

        return NextResponse.json({ ok: true, newsletter });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e), code: 'SERVER_ERROR' }, { status: 500 });
    }
}
