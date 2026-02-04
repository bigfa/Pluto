import { Env } from '@/lib/env';
import { getDb } from '@/db/client';
import * as schema from '@/db/schema';
import type { LikeResponse } from '@/lib/api';
import { eq, sql } from 'drizzle-orm';

/**
 * Get like status for a media item.
 */
export async function getLikes(env: Env, mediaId: string, ip: string): Promise<LikeResponse> {
    if (!env.FARALLON) {
        const client = getDb(env);
        if (!client) return { ok: false, likes: 0, liked: false, error: 'No storage configured' };
        const { db } = client;
        const result = await db.select({ likes: schema.media.likes }).from(schema.media).where(eq(schema.media.id, mediaId));
        return { ok: true, likes: result[0]?.likes ?? 0, liked: false };
    }

    const likeKey = `likes:${mediaId}`;
    const userLikeKey = `liked:${mediaId}:${ip}`;

    const [likesStr, userLiked] = await Promise.all([
        env.FARALLON.get(likeKey),
        env.FARALLON.get(userLikeKey),
    ]);

    return {
        ok: true,
        likes: parseInt(likesStr || '0', 10),
        liked: !!userLiked,
    };
}

/**
 * Toggle like status for a media item.
 */
export async function toggleLike(env: Env, mediaId: string, ip: string, action: 'like' | 'unlike'): Promise<LikeResponse> {
    if (!env.FARALLON) {
        const client = getDb(env);
        if (!client) return { ok: false, likes: 0, liked: false, error: 'No storage configured' };
        const { db } = client;
        if (action === 'like') {
            await db.update(schema.media)
                .set({ likes: sql`COALESCE(${schema.media.likes}, 0) + 1` })
                .where(eq(schema.media.id, mediaId));
        } else {
            await db.update(schema.media)
                .set({ likes: sql`MAX(COALESCE(${schema.media.likes}, 0) - 1, 0)` })
                .where(eq(schema.media.id, mediaId));
        }
        const result = await db.select({ likes: schema.media.likes }).from(schema.media).where(eq(schema.media.id, mediaId));
        return { ok: true, likes: result[0]?.likes ?? 0, liked: action === 'like' };
    }

    const likeKey = `likes:${mediaId}`;
    const userLikeKey = `liked:${mediaId}:${ip}`;

    const hasLiked = await env.FARALLON.get(userLikeKey);

    // Prevent duplicate likes
    if (action === 'like' && hasLiked) {
        const currentLikes = await env.FARALLON.get(likeKey);
        return { ok: true, likes: parseInt(currentLikes || '0', 10), liked: true };
    }
    // Prevent duplicate unlikes
    if (action === 'unlike' && !hasLiked) {
        const currentLikes = await env.FARALLON.get(likeKey);
        return { ok: true, likes: parseInt(currentLikes || '0', 10), liked: false };
    }

    let newCount = 0;

    if (action === 'like') {
        // Increment count
        const currentLikes = parseInt((await env.FARALLON.get(likeKey)) || '0', 10);
        newCount = currentLikes + 1;

        await Promise.all([
            env.FARALLON.put(likeKey, newCount.toString()),
            env.FARALLON.put(userLikeKey, Date.now().toString()), // Store timestamp
        ]);

        // Sync to DB
        try {
            const db = getDb(env)?.db;
            if (db) {
                await db.update(schema.media)
                    .set({ likes: newCount })
                    .where(eq(schema.media.id, mediaId));
            }
        } catch (e) {
            console.error('Failed to sync likes to DB', e);
        }
    } else {
        // Decrement count
        const currentLikes = parseInt((await env.FARALLON.get(likeKey)) || '0', 10);
        newCount = Math.max(0, currentLikes - 1);

        await Promise.all([
            env.FARALLON.put(likeKey, newCount.toString()),
            env.FARALLON.delete(userLikeKey),
        ]);

        // Sync to DB
        try {
            const db = getDb(env)?.db;
            if (db) {
                await db.update(schema.media)
                    .set({ likes: newCount })
                    .where(eq(schema.media.id, mediaId));
            }
        } catch (e) {
            console.error('Failed to sync likes to DB', e);
        }
    }

    return {
        ok: true,
        likes: newCount,
        liked: action === 'like',
    };
}
