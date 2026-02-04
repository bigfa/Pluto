import { NextRequest, NextResponse } from 'next/server';
import { serializeCookie, cookieName } from '@/lib/admin/session';

export async function POST(request: NextRequest) {
    const secure = request.url.startsWith('https');
    const setCookieHeader = serializeCookie(cookieName(), '', {
        httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: 0,
    });

    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', setCookieHeader);
    return res;
}
