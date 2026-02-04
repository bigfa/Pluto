import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { approveAlbumComment } from '@/services/albumCommentServices';
import { parseCookie, cookieName, verifySessionToken } from '@/lib/admin/session';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    const { commentId } = await params;
    const env = await getEnv();

    // Check if user is admin
    const cookies = parseCookie(request.headers.get('cookie'));
    const sessionToken = cookies[cookieName()];

    if (!sessionToken || !env.SESSION_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await verifySessionToken(env.SESSION_SECRET, sessionToken);
    if (!result.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const success = await approveAlbumComment(env, commentId);
        if (!success) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('Failed to approve comment', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
