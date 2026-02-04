/* eslint-disable @typescript-eslint/no-explicit-any */
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
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();

    try {
        const body: any = await request.json();
        const { subject, content, type, action, id } = body;

        // If action is 'send', send the newsletter
        if (action === 'send' && id) {
            const result = await sendNewsletter(env, id);
            if (!result.ok) {
                return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
            }
            return NextResponse.json({ ok: true, sent: result.count });
        }

        // Otherwise create a new newsletter
        if (!subject || !content) {
            return NextResponse.json({ ok: false, error: 'Subject and content are required' }, { status: 400 });
        }

        const newsletter = await createNewsletter(env, subject, content, type || 'general');
        if (!newsletter) {
            return NextResponse.json({ ok: false, error: 'Failed to create newsletter' }, { status: 500 });
        }

        return NextResponse.json({ ok: true, newsletter });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
