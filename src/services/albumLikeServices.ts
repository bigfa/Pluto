import { Env } from "@/lib/env";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// KV Key Prefix
const KEY_PREFIX = {
    LIKE_COUNT: "album:like:",           // Like count
    RATE_LIMIT: "album:rate:",           // Rate limit
};

// Rate Limit Config
const RATE_LIMIT = {
    MAX_REQUESTS: 10,      // requests per minute
    WINDOW_SECONDS: 60,    // seconds
};

/**
 * Generate IP Hash
 */
async function hashIp(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex.substring(0, 16);
}

/**
 * Build KV Key
 */
function buildKey(prefix: string, ...parts: string[]): string {
    return prefix + parts.join(":");
}

/**
 * Get Album Like Count (KV)
 */
export async function getAlbumLikeCount(
    env: Env,
    albumId: string
): Promise<number> {
    const client = getDb(env);
    if (!client) return 0;
    const { db } = client;
    const result = await db.select({ likes: schema.albums.likes }).from(schema.albums).where(eq(schema.albums.id, albumId));
    const likes = result[0]?.likes ?? 0;
    if (env.FARALLON) {
        const key = buildKey(KEY_PREFIX.LIKE_COUNT, albumId);
        try {
            await env.FARALLON.put(key, String(likes));
        } catch (e) {
            console.warn('Failed to seed album like count to KV', e);
        }
    }
    return likes;
}

/**
 * Check Rate Limit
 */
async function checkRateLimit(
    env: Env,
    clientIp: string
): Promise<{ allowed: boolean; remaining: number }> {
    if (!env.FARALLON) return { allowed: true, remaining: 10 };
    const ipHash = await hashIp(clientIp);
    const key = buildKey(KEY_PREFIX.RATE_LIMIT, ipHash);
    const value = await env.FARALLON.get(key);

    const current = value ? parseInt(value, 10) : 0;
    const remaining = RATE_LIMIT.MAX_REQUESTS - current;

    return {
        allowed: current < RATE_LIMIT.MAX_REQUESTS,
        remaining: Math.max(0, remaining - 1),
    };
}

/**
 * Increment Rate Limit
 */
async function incrementRateLimit(
    env: Env,
    clientIp: string
): Promise<void> {
    if (!env.FARALLON) return;
    const ipHash = await hashIp(clientIp);
    const key = buildKey(KEY_PREFIX.RATE_LIMIT, ipHash);
    const value = await env.FARALLON.get(key);

    const current = value ? parseInt(value, 10) : 0;
    await env.FARALLON.put(key, String(current + 1), {
        expirationTtl: RATE_LIMIT.WINDOW_SECONDS,
    });
}

/**
 * Like Album
 */
export async function likeAlbum(
    env: Env,
    albumId: string,
    clientIp: string
): Promise<{
    success: boolean;
    likes: number;
    liked: boolean;
    error?: string;
}> {
    if (env.FARALLON) {
        const rateCheck = await checkRateLimit(env, clientIp);
        if (!rateCheck.allowed) {
            const currentLikes = await getAlbumLikeCount(env, albumId);
            return {
                success: false,
                likes: currentLikes,
                liked: true,
                error: "Too many requests, please try again later",
            };
        }
        await incrementRateLimit(env, clientIp);
    }

    const client = getDb(env);
    if (!client) return { success: false, likes: 0, liked: false, error: "No storage configured" };

    const { db } = client;
    await db.update(schema.albums)
        .set({ likes: sql`COALESCE(${schema.albums.likes}, 0) + 1` })
        .where(eq(schema.albums.id, albumId));
    const result = await db.select({ likes: schema.albums.likes }).from(schema.albums).where(eq(schema.albums.id, albumId));
    const likes = result[0]?.likes ?? 1;

    if (env.FARALLON) {
        const countKey = buildKey(KEY_PREFIX.LIKE_COUNT, albumId);
        try {
            await env.FARALLON.put(countKey, String(likes));
        } catch (e) {
            console.warn('Failed to update album like count in KV', e);
        }
    }

    return { success: true, likes, liked: true };
}

/**
 * Unlike Album
 */
export async function unlikeAlbum(
    env: Env,
    albumId: string,
    clientIp: string
): Promise<{
    success: boolean;
    likes: number;
    liked: boolean;
    error?: string;
}> {
    if (env.FARALLON) {
        const rateCheck = await checkRateLimit(env, clientIp);
        if (!rateCheck.allowed) {
            const currentLikes = await getAlbumLikeCount(env, albumId);
            return {
                success: false,
                likes: currentLikes,
                liked: false,
                error: "Too many requests, please try again later",
            };
        }
        await incrementRateLimit(env, clientIp);
    }

    const client = getDb(env);
    if (!client) return { success: false, likes: 0, liked: false, error: "No storage configured" };

    const { db } = client;
    await db.update(schema.albums)
        .set({ likes: sql`MAX(COALESCE(${schema.albums.likes}, 0) - 1, 0)` })
        .where(eq(schema.albums.id, albumId));
    const result = await db.select({ likes: schema.albums.likes }).from(schema.albums).where(eq(schema.albums.id, albumId));
    const likes = result[0]?.likes ?? 0;

    if (env.FARALLON) {
        const countKey = buildKey(KEY_PREFIX.LIKE_COUNT, albumId);
        try {
            await env.FARALLON.put(countKey, String(likes));
        } catch (e) {
            console.warn('Failed to update album like count in KV', e);
        }
    }

    return { success: true, likes, liked: false };
}

/**
 * Get Album Like Info
 */
export async function getAlbumLikeInfo(
    env: Env,
    albumId: string
): Promise<{
    likes: number;
    liked: boolean;
}> {
    const likes = await getAlbumLikeCount(env, albumId);
    return { likes, liked: false };
}
