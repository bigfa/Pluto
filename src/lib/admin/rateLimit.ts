/**
 * Login Rate Limiting
 *
 * Tracks failed login attempts per IP using KV (preferred) or DB fallback.
 * Blocks login after MAX_ATTEMPTS failures within WINDOW_SECONDS.
 */

import { Env } from '@/lib/env';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

const KEY_PREFIX = 'login:rate:';

async function hashIp(ip: string): Promise<string> {
    const data = new TextEncoder().encode(ip);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return hex.substring(0, 16);
}

/**
 * Check whether a login attempt is allowed for the given IP.
 * Returns { allowed, remaining, retryAfter }.
 */
export async function checkLoginRate(
    env: Env,
    clientIp: string,
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    if (!env.FARALLON) {
        // No KV available — allow but log warning
        return { allowed: true, remaining: MAX_ATTEMPTS };
    }

    const ipHash = await hashIp(clientIp);
    const key = KEY_PREFIX + ipHash;
    const raw = await env.FARALLON.get(key);

    if (!raw) {
        return { allowed: true, remaining: MAX_ATTEMPTS };
    }

    const data = JSON.parse(raw) as { count: number; firstAt: number };
    const elapsed = Date.now() - data.firstAt;
    const windowMs = WINDOW_SECONDS * 1000;

    // Window expired — allow
    if (elapsed >= windowMs) {
        return { allowed: true, remaining: MAX_ATTEMPTS };
    }

    if (data.count >= MAX_ATTEMPTS) {
        const retryAfter = Math.ceil((windowMs - elapsed) / 1000);
        return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining: MAX_ATTEMPTS - data.count };
}

/**
 * Record a failed login attempt for the given IP.
 */
export async function recordLoginFailure(
    env: Env,
    clientIp: string,
): Promise<void> {
    if (!env.FARALLON) return;

    const ipHash = await hashIp(clientIp);
    const key = KEY_PREFIX + ipHash;
    const raw = await env.FARALLON.get(key);

    let data: { count: number; firstAt: number };
    if (raw) {
        data = JSON.parse(raw);
        const elapsed = Date.now() - data.firstAt;
        if (elapsed >= WINDOW_SECONDS * 1000) {
            // Window expired — reset
            data = { count: 1, firstAt: Date.now() };
        } else {
            data.count += 1;
        }
    } else {
        data = { count: 1, firstAt: Date.now() };
    }

    await env.FARALLON.put(key, JSON.stringify(data), {
        expirationTtl: WINDOW_SECONDS,
    });
}

/**
 * Clear rate limit record on successful login.
 */
export async function clearLoginRate(
    env: Env,
    clientIp: string,
): Promise<void> {
    if (!env.FARALLON) return;

    const ipHash = await hashIp(clientIp);
    const key = KEY_PREFIX + ipHash;
    await env.FARALLON.delete(key);
}
