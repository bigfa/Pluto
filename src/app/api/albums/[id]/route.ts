import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import type { Album } from '@/types/album';
import { parseCookie, cookieName, verifySessionToken } from '@/lib/admin/session';
import { resolveMediaUrls } from '@/lib/mediaTransforms';



interface Params {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id: idOrSlug } = await params;
        const env = await getEnv();
        const client = getDb(env);

        if (!client) {
            return NextResponse.json(
                { ok: false, error: 'Database not available' },
                { status: 500 }
            );
        }

        const { db, schema } = client;

        // Try to find by slug first, then by id
        let albumResults = await db
            .select()
            .from(schema.albums)
            .where(eq(schema.albums.slug, idOrSlug))
            .limit(1);

        let album = albumResults[0];

        if (!album) {
            albumResults = await db
                .select()
                .from(schema.albums)
                .where(eq(schema.albums.id, idOrSlug))
                .limit(1);
            album = albumResults[0];
        }

        if (!album) {
            return NextResponse.json(
                { ok: false, error: 'Album not found' },
                { status: 404 }
            );
        }

        const secret = env.SESSION_SECRET;
        let isAdmin = false;
        if (secret) {
            const cookies = parseCookie(request.headers.get('cookie'));
            const adminToken = cookies[cookieName()];
            if (adminToken) {
                const adminResult = await verifySessionToken(secret, adminToken);
                isAdmin = adminResult.ok;
            }
        }

        const isProtected = !!album.password;
        if (isProtected && !isAdmin) {
            const token = request.headers.get('Authorization')?.replace('Bearer ', '');
            if (!token) {
                return NextResponse.json(
                    { ok: false, code: 'PASSWORD_REQUIRED', data: { hasPassword: true } },
                    { status: 403 }
                );
            }

            const tokenResult = await db
                .select()
                .from(schema.albumOtps)
                .where(and(
                    eq(schema.albumOtps.album_id, album.id),
                    eq(schema.albumOtps.token, token),
                ))
                .limit(1);

            if (!tokenResult[0]) {
                return NextResponse.json(
                    { ok: false, code: 'PASSWORD_REQUIRED', data: { hasPassword: true } },
                    { status: 403 }
                );
            }
        }

        // Get cover media
        let cover_media: { id: string; url: string; url_medium?: string; url_thumb?: string } | undefined;
        if (album.cover_media_id) {
            const coverResults = await db
                .select({
                    id: schema.media.id,
                    url: schema.media.url,
                    url_thumb: schema.media.url_thumb,
                    url_medium: schema.media.url_medium,
                    url_large: schema.media.url_large,
                })
                .from(schema.media)
                .where(eq(schema.media.id, album.cover_media_id))
                .limit(1);

            if (coverResults[0]) {
                const urls = resolveMediaUrls(coverResults[0].url, env, {
                    url_thumb: coverResults[0].url_thumb,
                    url_medium: coverResults[0].url_medium,
                    url_large: coverResults[0].url_large,
                });
                cover_media = {
                    id: coverResults[0].id,
                    url: coverResults[0].url,
                    url_medium: urls.url_medium || undefined,
                    url_thumb: urls.url_thumb || undefined,
                };
            }
        }

        return NextResponse.json({
            ok: true,
            data: {
                id: album.id,
                title: album.title,
                description: album.description || '',
                cover_media_id: album.cover_media_id || '',
                cover_media,
                created_at: album.created_at,
                updated_at: album.updated_at,
                media_count: album.media_count || 0,
                views: album.view_count || 0,
                slug: album.slug || undefined,
                is_protected: isProtected,
            } as Album,
        });
    } catch (error) {
        console.error('Error fetching album:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to fetch album' },
            { status: 500 }
        );
    }
}
