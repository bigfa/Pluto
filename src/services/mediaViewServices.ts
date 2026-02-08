import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { Env } from "@/lib/env";

const KEY_PREFIX = {
    VIEW_COUNT: "media:view:",
    DEDUP: "media:view:dedup:",
};

const DEDUP_TTL_SECONDS = 300;

async function hashIp(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((item) => item.toString(16).padStart(2, "0")).join("");
    return hashHex.substring(0, 16);
}

function buildKey(prefix: string, ...parts: string[]): string {
    return prefix + parts.join(":");
}

export function isBot(userAgent: string): boolean {
    return /bot|spider|crawler|slurp|bingpreview|facebookexternalhit|headless|curl|wget|python-requests/i.test(
        userAgent,
    );
}

export async function getMediaViewCount(env: Env, mediaId: string): Promise<number> {
    if (env.FARALLON) {
        const key = buildKey(KEY_PREFIX.VIEW_COUNT, mediaId);
        const value = await env.FARALLON.get(key);
        if (value) {
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }

    const client = getDb(env);
    if (!client) return 0;
    const { db, schema } = client;

    const rows = await db
        .select({ view_count: schema.media.view_count })
        .from(schema.media)
        .where(eq(schema.media.id, mediaId))
        .limit(1);

    return rows[0]?.view_count ?? 0;
}

export async function incrementMediaView(
    env: Env,
    mediaId: string,
    clientIp: string,
): Promise<{ success: boolean; views: number; deduped?: boolean; error?: string }> {
    const client = getDb(env);
    if (!client) {
        return { success: false, views: 0, error: "Database not available" };
    }
    const { db, schema } = client;

    if (!env.FARALLON) {
        await db
            .update(schema.media)
            .set({ view_count: sql`COALESCE(${schema.media.view_count}, 0) + 1` })
            .where(eq(schema.media.id, mediaId));

        const rows = await db
            .select({ view_count: schema.media.view_count })
            .from(schema.media)
            .where(eq(schema.media.id, mediaId))
            .limit(1);

        return { success: true, views: rows[0]?.view_count ?? 0 };
    }

    const ipHash = await hashIp(clientIp || "unknown");
    const dedupKey = buildKey(KEY_PREFIX.DEDUP, mediaId, ipHash);
    const dedupHit = await env.FARALLON.get(dedupKey);

    if (dedupHit) {
        const currentViews = await getMediaViewCount(env, mediaId);
        return { success: true, views: currentViews, deduped: true };
    }

    await env.FARALLON.put(dedupKey, "1", { expirationTtl: DEDUP_TTL_SECONDS });

    const currentViews = await getMediaViewCount(env, mediaId);
    const nextViews = currentViews + 1;
    const viewCountKey = buildKey(KEY_PREFIX.VIEW_COUNT, mediaId);
    await env.FARALLON.put(viewCountKey, String(nextViews));

    try {
        await db
            .update(schema.media)
            .set({ view_count: sql`COALESCE(${schema.media.view_count}, 0) + 1` })
            .where(eq(schema.media.id, mediaId));
    } catch (error) {
        console.error("Failed to sync media view count to DB:", error);
    }

    return { success: true, views: nextViews };
}
