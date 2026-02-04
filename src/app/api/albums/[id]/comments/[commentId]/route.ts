import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { deleteAlbumComment } from '@/services/albumCommentServices';

// Remove runtime = 'edge' to support DB connections

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, commentId: string }> }
) {
    const { commentId } = await params;
    const env = await getEnv();

    // TODO: Add Authentication check here (Admin only)

    try {
        const success = await deleteAlbumComment(env, commentId);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Comment not found or failed to delete" }, { status: 404 });
        }
    } catch (e) {
        console.error('Failed to delete comment', e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
