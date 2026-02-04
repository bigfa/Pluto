/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { createSessionToken, serializeCookie, cookieName } from '@/lib/admin/session';
import { verifyPassword } from '@/lib/admin/password';
import { checkLoginRate, recordLoginFailure, clearLoginRate } from '@/lib/admin/rateLimit';

export async function POST(request: NextRequest) {
    const env = await getEnv();
    const hasHash = !!env.ADMIN_PASS_HASH;
    const hasPlain = !!env.ADMIN_PASS;

    if (!env.ADMIN_USER || (!hasHash && !hasPlain) || !env.SESSION_SECRET) {
        return NextResponse.json({ err: 'Admin not configured' }, { status: 500 });
    }

    const clientIp = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || '127.0.0.1';

    // Rate limit check
    const rate = await checkLoginRate(env, clientIp);
    if (!rate.allowed) {
        return NextResponse.json(
            { err: `登录尝试过多，请 ${rate.retryAfter} 秒后再试` },
            { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
        );
    }

    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ err: 'Invalid JSON' }, { status: 400 }); }

    const username = String(body.username || '');
    const password = String(body.password || '');

    // Verify username
    if (username !== env.ADMIN_USER) {
        await recordLoginFailure(env, clientIp);
        return NextResponse.json({ err: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password — prefer hash, fallback to plaintext
    let passwordValid = false;
    if (hasHash) {
        passwordValid = await verifyPassword(password, env.ADMIN_PASS_HASH!);
    } else {
        // Legacy plaintext comparison
        console.warn('[auth] Using plaintext ADMIN_PASS. Set ADMIN_PASS_HASH for better security. Run: node scripts/hash-password.mjs');
        passwordValid = password === env.ADMIN_PASS;
    }

    if (!passwordValid) {
        await recordLoginFailure(env, clientIp);
        return NextResponse.json({ err: 'Invalid credentials' }, { status: 401 });
    }

    // Success — clear rate limit
    await clearLoginRate(env, clientIp);

    const maxAge = 60 * 60 * 12;
    const token = await createSessionToken(env.SESSION_SECRET, username, maxAge);
    const secure = request.url.startsWith('https');
    const setCookieHeader = serializeCookie(cookieName(), token, {
        httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge,
    });

    const res = NextResponse.json({ ok: true, user: username });
    res.headers.set('Set-Cookie', setCookieHeader);
    return res;
}
