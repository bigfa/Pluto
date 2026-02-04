import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { parseCookie, cookieName, verifySessionToken } from './session';

export async function requireAdmin(
    request: NextRequest
): Promise<{ ok: true; username: string } | { ok: false; response: NextResponse }> {
    const env = await getEnv();
    const secret = env.SESSION_SECRET;

    if (!secret) {
        return {
            ok: false,
            response: NextResponse.json(
                { ok: false, error: 'SESSION_SECRET is not configured' },
                { status: 500 }
            ),
        };
    }

    const cookies = parseCookie(request.headers.get('cookie'));
    const token = cookies[cookieName()];

    if (!token) {
        return {
            ok: false,
            response: NextResponse.json(
                { ok: false, error: 'Unauthorized' },
                { status: 401 }
            ),
        };
    }

    const result = await verifySessionToken(secret, token);
    if (!result.ok) {
        return {
            ok: false,
            response: NextResponse.json(
                { ok: false, error: 'Unauthorized' },
                { status: 401 }
            ),
        };
    }

    return { ok: true, username: result.username };
}
