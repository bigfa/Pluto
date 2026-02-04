import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { getAlbumComments, createAlbumComment, type AlbumComment } from '@/services/albumCommentServices';
import { parseCookie, cookieName, verifySessionToken } from '@/lib/admin/session';
import type { Comment } from '@/types/comment';

// Remove runtime = 'edge' to support DB connections

// Cookie name for tracking user's pending comments
const PENDING_COMMENTS_COOKIE = 'photos_pending_comments';

function albumCommentToComment(ac: AlbumComment): Comment {
    return {
        id: ac.id,
        album_id: ac.album_id,
        author_name: ac.author_name,
        author_url: ac.author_url,
        content: ac.content,
        content_html: ac.content_html,
        created_at: ac.created_at,
        parent_id: ac.parent_id,
        status: ac.status,
    };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();

    // Check if user is admin
    const cookies = parseCookie(request.headers.get('cookie'));
    const sessionToken = cookies[cookieName()];
    let isAdmin = false;

    if (sessionToken && env.SESSION_SECRET) {
        const result = await verifySessionToken(env.SESSION_SECRET, sessionToken);
        isAdmin = result.ok;
    }

    // Get user's pending comment IDs from cookie
    const userPendingIds: string[] = [];
    const pendingCookie = cookies[PENDING_COMMENTS_COOKIE];
    if (pendingCookie) {
        try {
            userPendingIds.push(...JSON.parse(pendingCookie));
        } catch { /* ignore parse errors */ }
    }

    // Admin sees all, others see only approved + their own pending
    const allComments = await getAlbumComments(env, id, isAdmin);

    let visibleComments: AlbumComment[];
    if (isAdmin) {
        visibleComments = allComments;
    } else {
        // Show approved comments + user's own pending comments
        visibleComments = allComments.filter(
            c => c.status === 'approved' || userPendingIds.includes(c.id)
        );
    }

    const comments: Comment[] = visibleComments.map(albumCommentToComment);

    return NextResponse.json({
        ok: true,
        comments,
        isAdmin,
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();
    const data = await request.json() as {
        author_name?: string;
        content: string;
        author_email?: string;
        author_url?: string;
        parent_id?: string;
    };
    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    // Check if user is admin
    const cookies = parseCookie(request.headers.get('cookie'));
    const sessionToken = cookies[cookieName()];
    let isAdmin = false;

    if (sessionToken && env.SESSION_SECRET) {
        const result = await verifySessionToken(env.SESSION_SECRET, sessionToken);
        isAdmin = result.ok;
    }

    // Basic validation - admin can skip name/email
    if (!isAdmin && (!data.author_name || !data.author_email)) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!data.content) {
        return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    try {
        const comment = await createAlbumComment(env, {
            album_id: id,
            author_name: isAdmin ? (data.author_name || 'Admin') : data.author_name!,
            author_email: isAdmin ? (data.author_email || 'admin@local') : data.author_email!,
            author_url: data.author_url,
            author_ip: ip,
            content: data.content,
            parent_id: data.parent_id,
            status: isAdmin ? 'approved' : 'pending', // Admin comments are auto-approved
        });

        // For non-admin users, track their pending comment ID in cookie
        const response = NextResponse.json({
            ok: true,
            data: {
                id: comment.id,
                status: comment.status,
            },
        });

        if (!isAdmin) {
            // Update pending comments cookie
            const existingPending: string[] = [];
            const pendingCookie = cookies[PENDING_COMMENTS_COOKIE];
            if (pendingCookie) {
                try {
                    existingPending.push(...JSON.parse(pendingCookie));
                } catch { /* ignore */ }
            }
            existingPending.push(comment.id);
            // Keep only last 50 pending IDs
            const newPending = existingPending.slice(-50);

            response.cookies.set(PENDING_COMMENTS_COOKIE, JSON.stringify(newPending), {
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                httpOnly: false, // Allow JS access for client-side tracking
                sameSite: 'lax',
            });
        }

        return response;
    } catch (e) {
        console.error('Failed to create comment', e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
