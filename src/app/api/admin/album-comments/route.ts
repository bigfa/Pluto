import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { listAlbumComments } from '@/services/admin/albumCommentServices';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page')) || 1;
        const pageSize = Number(url.searchParams.get('pageSize')) || 20;
        const status = (url.searchParams.get('status') || undefined) as 'all' | 'pending' | 'approved' | undefined;

        const data = await listAlbumComments(db, schema, { status, page, pageSize });
        return NextResponse.json({ ok: true, ...data });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
