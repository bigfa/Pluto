import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { getAlbumComments, createAlbumComment, type AlbumComment } from '@/services/albumCommentServices';
import { parseCookie, cookieName, verifySessionToken } from '@/lib/admin/session';
import { getDb } from '@/db/client';
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

async function isAdminRequest(
    request: NextRequest,
    sessionSecret?: string
): Promise<{ isAdmin: boolean; cookies: Record<string, string> }> {
    const cookies = parseCookie(request.headers.get('cookie'));
    const sessionToken = cookies[cookieName()];
    if (!sessionToken || !sessionSecret) {
        return { isAdmin: false, cookies };
    }

    const result = await verifySessionToken(sessionSecret, sessionToken);
    return { isAdmin: result.ok, cookies };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();
    const client = getDb(env);
    if (!client) {
        return NextResponse.json({ ok: false, error: 'Database not available', code: 'SERVER_ERROR' }, { status: 500 });
    }

    const { isAdmin, cookies } = await isAdminRequest(request, env.SESSION_SECRET);

    const userPendingIds: string[] = [];
    const pendingCookieValue = cookies[PENDING_COMMENTS_COOKIE];
    if (pendingCookieValue) {
        try {
            const parsedPending = JSON.parse(pendingCookieValue);
            if (Array.isArray(parsedPending)) {
                userPendingIds.push(...parsedPending.filter((value): value is string => typeof value === 'string'));
            }
        } catch { /* ignore parse errors */ }
    }

    try {
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
    } catch (e) {
        console.error('Failed to fetch comments', e);
        return NextResponse.json({ ok: false, error: 'Failed to fetch comments', code: 'SERVER_ERROR' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();
    const client = getDb(env);
    if (!client) {
        return NextResponse.json({ ok: false, error: 'Database not available', code: 'SERVER_ERROR' }, { status: 500 });
    }

    let data: {
        author_name?: string;
        content: string;
        author_email?: string;
        author_url?: string;
        parent_id?: string;
    };
    try {
        data = await request.json() as {
            author_name?: string;
            content: string;
            author_email?: string;
            author_url?: string;
            parent_id?: string;
        };
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';
    const { isAdmin, cookies } = await isAdminRequest(request, env.SESSION_SECRET);

    // Basic validation - admin can skip name/email
    const authorName = data.author_name?.trim();
    const authorEmail = data.author_email?.trim();
    const content = data.content?.trim();

    if (!isAdmin && (!authorName || !authorEmail)) {
        return NextResponse.json({ ok: false, error: "Missing required fields", code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (!content) {
        return NextResponse.json({ ok: false, error: "Missing content", code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    try {
        const comment = await createAlbumComment(env, {
            album_id: id,
            author_name: isAdmin ? (authorName || 'Admin') : authorName!,
            author_email: isAdmin ? (authorEmail || 'admin@local') : authorEmail!,
            author_url: data.author_url,
            author_ip: ip,
            content,
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
        return NextResponse.json({ ok: false, error: "Failed to create comment", code: 'SERVER_ERROR' }, { status: 500 });
    }
}
