import { Env } from "@/lib/env";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// KV Key Prefix
const KEY_PREFIX = {
    VIEW_COUNT: "album:view:",           // View count
    RATE_LIMIT: "album:view:rate:",      // Rate limit per IP
};

// Rate limit configuration
const RATE_LIMIT = {
    MAX_REQUESTS: 20,      // Max views per IP per minute
    WINDOW_SECONDS: 60,    // Time window (seconds)
};

/**
 * Generate IP hash (Privacy) - Web Crypto API
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
 * Get album view count
 */
export async function getAlbumViewCount(
    env: Env,
    albumId: string
): Promise<number> {
    if (!env.FARALLON) {
        const client = getDb(env);
        if (!client) return 0;
        const { db } = client;
        const result = await db.select({ view_count: schema.albums.view_count }).from(schema.albums).where(eq(schema.albums.id, albumId));
        return result[0]?.view_count ?? 0;
    }
    const key = buildKey(KEY_PREFIX.VIEW_COUNT, albumId);
    const value = await env.FARALLON.get(key);
    return value ? parseInt(value, 10) : 0;
}

/**
 * Increment rate limit counter
 */
async function incrementRateLimit(
    env: Env,
    clientIp: string
): Promise<{ allowed: boolean }> {
    if (!env.FARALLON) return { allowed: true };
    const ipHash = await hashIp(clientIp);
    const key = buildKey(KEY_PREFIX.RATE_LIMIT, ipHash);
    const value = await env.FARALLON.get(key);

    const current = value ? parseInt(value, 10) : 0;

    if (current >= RATE_LIMIT.MAX_REQUESTS) {
        return { allowed: false };
    }

    await env.FARALLON.put(key, String(current + 1), {
        expirationTtl: RATE_LIMIT.WINDOW_SECONDS,
    });

    return { allowed: true };
}

/**
 * Increment album view count
 */
export async function incrementAlbumView(
    env: Env,
    albumId: string,
    clientIp: string
): Promise<{
    success: boolean;
    views: number;
    error?: string;
}> {
    if (!env.FARALLON) {
        const client = getDb(env);
        if (!client) return { success: false, views: 0, error: "No storage configured" };
        const { db } = client;
        await db.update(schema.albums)
            .set({ view_count: sql`COALESCE(${schema.albums.view_count}, 0) + 1` })
            .where(eq(schema.albums.id, albumId));
        const result = await db.select({ view_count: schema.albums.view_count }).from(schema.albums).where(eq(schema.albums.id, albumId));
        return { success: true, views: result[0]?.view_count ?? 0 };
    }

    // Check rate limit
    const rateCheck = await incrementRateLimit(env, clientIp);
    if (!rateCheck.allowed) {
        const currentViews = await getAlbumViewCount(env, albumId);
        return {
            success: false,
            views: currentViews,
            error: "Too many requests",
        };
    }

    // Increment view count in KV
    const key = buildKey(KEY_PREFIX.VIEW_COUNT, albumId);
    const currentViews = await getAlbumViewCount(env, albumId);
    const newViews = currentViews + 1;
    await env.FARALLON.put(key, String(newViews));

    // Sync to DB
    try {
        const db = getDb(env)?.db;
        if (db) {
            // Use sql for atomic increment if possible, or simple set
            await db.update(schema.albums)
                .set({ view_count: sql`COALESCE(${schema.albums.view_count}, 0) + 1` })
                .where(eq(schema.albums.id, albumId));
        }
    } catch (e) {
        console.error('Failed to sync album views to DB', e);
    }

    return {
        success: true,
        views: newViews,
    };
}
