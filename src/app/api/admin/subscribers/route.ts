import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { listSubscribers } from '@/services/subscriberServices';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();

    try {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page')) || 1;
        const pageSize = Number(url.searchParams.get('pageSize')) || 20;

        const data = await listSubscribers(env, page, pageSize);
        return NextResponse.json({ ok: true, ...data });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
