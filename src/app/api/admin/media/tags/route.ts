import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { listAllMediaTags } from '@/services/admin/mediaTagServices';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const tags = await listAllMediaTags(db, schema);
        return NextResponse.json({ ok: true, tags });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
