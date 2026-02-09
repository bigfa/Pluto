import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { approveAlbumComment } from '@/services/albumCommentServices';
import { requireAdmin } from '@/lib/admin/auth';
import { getDb } from '@/db/client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    const { commentId } = await params;
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    try {
        const env = await getEnv();
        const client = getDb(env);
        if (!client) {
            return NextResponse.json({ ok: false, error: 'Database not available', code: 'SERVER_ERROR' }, { status: 500 });
        }

        const success = await approveAlbumComment(env, commentId);
        if (!success) {
            return NextResponse.json({ ok: false, error: 'Comment not found', code: 'NOT_FOUND' }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('Failed to approve comment', e);
        return NextResponse.json({ ok: false, error: 'Failed to approve comment', code: 'SERVER_ERROR' }, { status: 500 });
    }
}
