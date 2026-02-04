import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'photos_admin';

export function parseCookie(header: string | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!header) return out;
    const parts = header.split(';');
    for (const part of parts) {
        const [k, ...rest] = part.trim().split('=');
        if (!k) continue;
        out[k] = decodeURIComponent(rest.join('='));
    }
    return out;
}

export function serializeCookie(
    name: string,
    value: string,
    opts: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'Lax' | 'Strict' | 'None';
        path?: string;
        maxAge?: number;
    } = {}
): string {
    const segments = [`${name}=${encodeURIComponent(value)}`];
    if (opts.maxAge != null) segments.push(`Max-Age=${opts.maxAge}`);
    segments.push(`Path=${opts.path || '/'}`);
    if (opts.httpOnly) segments.push('HttpOnly');
    if (opts.secure) segments.push('Secure');
    if (opts.sameSite) segments.push(`SameSite=${opts.sameSite}`);
    return segments.join('; ');
}

export function cookieName(): string {
    return COOKIE_NAME;
}

function getSecret(secret: string): Uint8Array {
    return new TextEncoder().encode(secret);
}

export async function createSessionToken(
    secret: string,
    username: string,
    maxAgeSeconds: number
): Promise<string> {
    const token = await new SignJWT({ username })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(`${maxAgeSeconds}s`)
        .setIssuedAt()
        .sign(getSecret(secret));
    return token;
}

export async function verifySessionToken(
    secret: string,
    token: string
): Promise<{ ok: true; username: string } | { ok: false }> {
    try {
        const { payload } = await jwtVerify(token, getSecret(secret));
        const username = payload.username as string | undefined;
        if (!username) return { ok: false };
        return { ok: true, username };
    } catch {
        return { ok: false };
    }
}
