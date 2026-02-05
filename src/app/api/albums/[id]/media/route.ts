/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import type { Media } from '@/types/media';
import { parseCookie, cookieName, verifySessionToken } from '@/lib/admin/session';
import { resolveMediaOutputUrls } from '@/lib/mediaTransforms';



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
        const { searchParams } = new URL(request.url);

        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 50;
        const offset = (page - 1) * pageSize;

        // Find album by slug or id
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

        // Check if password protected
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

        // Get total count
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.albumMedia)
            .where(eq(schema.albumMedia.album_id, album.id));

        const total = countResult[0]?.count || 0;

        // Get media IDs for this album with ordering
        const albumMediaLinks = await db
            .select()
            .from(schema.albumMedia)
            .where(eq(schema.albumMedia.album_id, album.id))
            .orderBy(schema.albumMedia.display_order)
            .limit(pageSize)
            .offset(offset);

        if (albumMediaLinks.length === 0) {
            return NextResponse.json({ ok: true, media: [], total });
        }

        const mediaIds = albumMediaLinks.map((link: any) => link.media_id);
        const mediaRows = await db
            .select({
                id: schema.media.id,
                url: schema.media.url,
                provider: schema.media.provider,
                object_key: schema.media.object_key,
                url_thumb: schema.media.url_thumb,
                url_medium: schema.media.url_medium,
                url_large: schema.media.url_large,
                filename: schema.media.filename,
                alt: schema.media.alt,
                width: schema.media.width,
                height: schema.media.height,
                size: schema.media.size,
                created_at: schema.media.created_at,
                camera_make: schema.media.camera_make,
                camera_model: schema.media.camera_model,
                lens_model: schema.media.lens_model,
                aperture: schema.media.aperture,
                shutter_speed: schema.media.shutter_speed,
                iso: schema.media.iso,
                focal_length: schema.media.focal_length,
                datetime_original: schema.media.datetime_original,
                location_name: schema.media.location_name,
                likes: schema.media.likes,
            })
            .from(schema.media)
            .where(inArray(schema.media.id, mediaIds));

        const mediaMap = new Map<string, typeof mediaRows[number]>();
        for (const row of mediaRows) {
            mediaMap.set(row.id, row);
        }

        const isLikedByCookie = (id: string) => {
            const value = request.cookies.get(`media_like_${id}`)?.value;
            return value === '1' || value === 'true';
        };

        const requestOrigin = new URL(request.url).origin;
        const media: Media[] = albumMediaLinks
            .map((link: any) => {
                const m = mediaMap.get(link.media_id);
                if (!m) return null;
                const urls = resolveMediaOutputUrls(env, {
                    url: m.url,
                    provider: m.provider,
                    object_key: m.object_key,
                }, requestOrigin);
                return {
                    id: m.id,
                    url: urls.url || m.url,
                    url_thumb: urls.url_thumb,
                    url_medium: urls.url_medium,
                    url_large: urls.url_large,
                    filename: m.filename || '',
                    alt: m.alt || m.filename || '',
                    size: m.size || 0,
                    width: m.width ?? null,
                    height: m.height ?? null,
                    created_at: m.created_at,
                    camera_make: m.camera_make ?? null,
                    camera_model: m.camera_model ?? null,
                    lens_model: m.lens_model ?? null,
                    aperture: m.aperture ?? null,
                    shutter_speed: m.shutter_speed ?? null,
                    iso: m.iso ?? null,
                    focal_length: m.focal_length ?? null,
                    datetime_original: m.datetime_original ?? null,
                    location_name: m.location_name ?? null,
                    categories: [],
                    category_ids: [],
                    tags: [],
                    likes: m.likes || 0,
                    liked: isLikedByCookie(m.id),
                } as Media;
            })
            .filter((m: Media | null): m is Media => m !== null);

        return NextResponse.json({ ok: true, media, total });
    } catch (error) {
        console.error('Error fetching album media:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to fetch album media' },
            { status: 500 }
        );
    }
}
