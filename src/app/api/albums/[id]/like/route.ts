import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { getAlbumLikeCount, likeAlbum, unlikeAlbum } from '@/services/albumLikeServices';

// Remove runtime = 'edge' to support DB connections

const albumLikeCookieName = (id: string) => `album_like_${id}`;

function getCookieLiked(request: NextRequest, id: string): boolean {
    const value = request.cookies.get(albumLikeCookieName(id))?.value;
    return value === '1' || value === 'true';
}

function setLikeCookie(response: NextResponse, id: string): void {
    response.cookies.set(albumLikeCookieName(id), '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
    });
}

function clearLikeCookie(response: NextResponse, id: string): void {
    response.cookies.delete(albumLikeCookieName(id));
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();
    const likes = await getAlbumLikeCount(env, id);
    const liked = getCookieLiked(request, id);

    return NextResponse.json({ ok: true, likes, liked });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();
    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    if (getCookieLiked(request, id)) {
        const likes = await getAlbumLikeCount(env, id);
        return NextResponse.json({ ok: true, likes, liked: true });
    }

    const result = await likeAlbum(env, id, ip);

    if (!result.success) {
        const status = result.error?.includes('Too many') ? 429 : 400;
        return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    const response = NextResponse.json({ ok: true, likes: result.likes, liked: result.liked });
    setLikeCookie(response, id);
    return response;
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const env = await getEnv();
    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    if (!getCookieLiked(request, id)) {
        const likes = await getAlbumLikeCount(env, id);
        return NextResponse.json({ ok: true, likes, liked: false });
    }

    const result = await unlikeAlbum(env, id, ip);

    if (!result.success) {
        const status = result.error?.includes('Too many') ? 429 : 400;
        return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    const response = NextResponse.json({ ok: true, likes: result.likes, liked: result.liked });
    clearLikeCookie(response, id);
    return response;
}
