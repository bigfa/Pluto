import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { getLikes, toggleLike } from '@/services/likeServices';

// export const runtime = 'edge';

const mediaLikeCookieName = (id: string) => `media_like_${id}`;

function getCookieLiked(request: NextRequest, id: string): boolean {
    const value = request.cookies.get(mediaLikeCookieName(id))?.value;
    return value === '1' || value === 'true';
}

function setLikeCookie(response: NextResponse, id: string): void {
    response.cookies.set(mediaLikeCookieName(id), '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
    });
}

function clearLikeCookie(response: NextResponse, id: string): void {
    response.cookies.delete(mediaLikeCookieName(id));
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const env = await getEnv();
        const ip = request.headers.get('cf-connecting-ip') || 'unknown';

        const result = await getLikes(env, id, ip);
        return NextResponse.json({ ...result, liked: getCookieLiked(request, id) });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const env = await getEnv();
        const ip = request.headers.get('cf-connecting-ip') || 'unknown';

        if (getCookieLiked(request, id)) {
            const result = await getLikes(env, id, ip);
            return NextResponse.json({ ...result, liked: true });
        }

        const result = await toggleLike(env, id, ip, 'like');
        const response = NextResponse.json(result);
        if (result.ok) {
            setLikeCookie(response, id);
        }
        return response;
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const env = await getEnv();
        const ip = request.headers.get('cf-connecting-ip') || 'unknown';

        if (!getCookieLiked(request, id)) {
            const result = await getLikes(env, id, ip);
            return NextResponse.json({ ...result, liked: false });
        }

        const result = await toggleLike(env, id, ip, 'unlike');
        const response = NextResponse.json(result);
        if (result.ok) {
            clearLikeCookie(response, id);
        }
        return response;
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}
