import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { generateAlbumOTP } from '@/services/admin/albumServices';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const result = await generateAlbumOTP(db, schema, id);
        return NextResponse.json({ ok: true, otp: result.token });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
