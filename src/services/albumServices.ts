/**
 * Album Services - D1 Implementation
 * 
 * Direct database access for Cloudflare D1.
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, like, and, sql, or, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Album, AlbumListResponse, AlbumDetailResponse, AlbumListParams } from '@/types/album';
import type { Media } from '@/types/media';
import type { MediaProvider } from '@/types/admin';
import { getApiBaseUrl } from '@/lib/utils';
import { resolveMediaOutputUrls } from '@/lib/mediaTransforms';
import type { Env } from '@/lib/env';

type MediaRow = typeof schema.media.$inferSelect;

// ============ D1 Database Implementation ============

async function listAlbumsFromDb(
    db: ReturnType<typeof drizzle<typeof schema>>,
    env: Env,
    options: AlbumListParams = {}
): Promise<AlbumListResponse> {
    const { page = 1, pageSize = 20, q, category } = options;
    const offset = (page - 1) * pageSize;

    // Build where conditions - only published albums
    const conditions = [
        or(
            eq(schema.albums.status, 'published'),
            sql`${schema.albums.status} IS NULL`
        )
    ];

    if (q) {
        conditions.push(
            or(
                like(schema.albums.title, `%${q}%`),
                like(schema.albums.description, `%${q}%`)
            )
        );
    }

    const categoryVisibilityCondition = or(
        eq(schema.albumCategories.show_in_frontend, 1),
        sql`${schema.albumCategories.show_in_frontend} IS NULL`,
    );

    if (category) {
        const categoryLinks = await db
            .select({ album_id: schema.albumCategoryLinks.album_id })
            .from(schema.albumCategoryLinks)
            .innerJoin(
                schema.albumCategories,
                eq(schema.albumCategoryLinks.category_id, schema.albumCategories.id),
            )
            .where(
                and(
                    or(eq(schema.albumCategories.slug, category), eq(schema.albumCategories.id, category)),
                    categoryVisibilityCondition,
                ),
            );

        const albumIdsByCategory = categoryLinks.map((l) => l.album_id);
        if (albumIdsByCategory.length === 0) {
            return { ok: true, albums: [], total: 0, totalPages: 0 };
        }
        conditions.push(inArray(schema.albums.id, albumIdsByCategory));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.albums)
        .where(whereClause);

    const total = countResult[0]?.count || 0;

    // Get paginated albums
    const results = await db
        .select()
        .from(schema.albums)
        .where(whereClause)
        .orderBy(desc(schema.albums.created_at))
        .limit(pageSize)
        .offset(offset);

    const albumIds = results.map((album) => album.id);
    const coverIds = results
        .map((album) => album.cover_media_id)
        .filter((id): id is string => !!id);

    const coverMap = new Map<string, { id: string; url: string; url_medium?: string; url_thumb?: string }>();
    const tagsByAlbum = new Map<string, string[]>();
    const categoriesByAlbum = new Map<string, { id: string; name: string; slug: string }[]>();

    const [coverRows, tagRows, categoryRows]: [MediaRow[], { album_id: string; tag: string }[], { album_id: string; id: string; name: string; slug: string }[]] = await Promise.all([
        coverIds.length > 0
            ? db
                .select()
                .from(schema.media)
                .where(inArray(schema.media.id, coverIds))
            : Promise.resolve([]),
        albumIds.length > 0
            ? db
                .select({ album_id: schema.albumTags.album_id, tag: schema.albumTags.tag })
                .from(schema.albumTags)
                .where(inArray(schema.albumTags.album_id, albumIds))
            : Promise.resolve([]),
        albumIds.length > 0
            ? db
                .select({
                    album_id: schema.albumCategoryLinks.album_id,
                    id: schema.albumCategories.id,
                    name: schema.albumCategories.name,
                    slug: schema.albumCategories.slug,
                })
                .from(schema.albumCategoryLinks)
                .innerJoin(
                    schema.albumCategories,
                    eq(schema.albumCategoryLinks.category_id, schema.albumCategories.id),
                )
                .where(
                    and(
                        inArray(schema.albumCategoryLinks.album_id, albumIds),
                        categoryVisibilityCondition,
                    ),
                )
            : Promise.resolve([]),
    ]);

    for (const row of coverRows) {
        const urls = resolveMediaOutputUrls(env, {
            url: row.url,
            provider: row.provider as MediaProvider | null | undefined,
            object_key: row.object_key,
        });
        coverMap.set(row.id, {
            id: row.id,
            url: urls.url || row.url,
            url_medium: urls.url_medium || undefined,
            url_thumb: urls.url_thumb || undefined,
        });
    }

    for (const row of tagRows) {
        const list = tagsByAlbum.get(row.album_id) || [];
        list.push(row.tag);
        tagsByAlbum.set(row.album_id, list);
    }

    for (const row of categoryRows) {
        const list = categoriesByAlbum.get(row.album_id) || [];
        list.push({ id: row.id, name: row.name, slug: row.slug || row.id });
        categoriesByAlbum.set(row.album_id, list);
    }

    const albumsWithDetails: Album[] = results.map((album) => ({
        id: album.id,
        title: album.title,
        description: album.description || '',
        cover_media_id: album.cover_media_id || '',
        cover_media: album.cover_media_id ? coverMap.get(album.cover_media_id) : undefined,
        created_at: album.created_at,
        updated_at: album.updated_at,
        media_count: album.media_count || 0,
        views: album.view_count || 0,
        likes: album.likes || 0,
        slug: album.slug || undefined,
        tags: tagsByAlbum.get(album.id) || [],
        categories: categoriesByAlbum.get(album.id) || [],
        category_ids: (categoriesByAlbum.get(album.id) || []).map((c) => c.id),
        is_protected: !!album.password,
    }));

    return {
        ok: true,
        albums: albumsWithDetails,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
}

async function getAlbumByIdFromDb(
    db: ReturnType<typeof drizzle<typeof schema>>,
    env: Env,
    idOrSlug: string
): Promise<AlbumDetailResponse> {
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
        throw new Error('Album not found');
    }

    // Check if password protected
    const isProtected = !!album.password;

    // Get cover media
    let cover_media: Media | undefined;
    if (album.cover_media_id) {
        const coverResults = await db
            .select()
            .from(schema.media)
            .where(eq(schema.media.id, album.cover_media_id))
            .limit(1);

        if (coverResults[0]) {
            const urls = resolveMediaOutputUrls(env, {
                url: coverResults[0].url,
                provider: coverResults[0].provider as MediaProvider | null | undefined,
                object_key: coverResults[0].object_key,
            });
            cover_media = {
                ...coverResults[0],
                categories: [],
                category_ids: [],
                tags: [],
                likes: coverResults[0].likes || 0,
                liked: false,
                url: urls.url || coverResults[0].url,
                url_thumb: urls.url_thumb,
                url_medium: urls.url_medium,
                url_large: urls.url_large,
            } as Media;
        }
    }

    // Get tags
    const tagResults = await db
        .select({ tag: schema.albumTags.tag })
        .from(schema.albumTags)
        .where(eq(schema.albumTags.album_id, album.id));

    const categoryResults = await db
        .select({
            id: schema.albumCategories.id,
            name: schema.albumCategories.name,
            slug: schema.albumCategories.slug,
        })
        .from(schema.albumCategoryLinks)
        .innerJoin(
            schema.albumCategories,
            eq(schema.albumCategoryLinks.category_id, schema.albumCategories.id),
        )
        .where(
            and(
                eq(schema.albumCategoryLinks.album_id, album.id),
                or(
                    eq(schema.albumCategories.show_in_frontend, 1),
                    sql`${schema.albumCategories.show_in_frontend} IS NULL`,
                ),
            ),
        );

    return {
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
            tags: tagResults.map(t => t.tag),
            categories: categoryResults.map((c) => ({ id: c.id, name: c.name, slug: c.slug || c.id })),
            category_ids: categoryResults.map((c) => c.id),
            is_protected: isProtected,
        } as Album,
    };
}

interface AlbumMediaOptions {
    page?: number;
    pageSize?: number;
    token?: string;
}

async function getAlbumMediaFromDb(
    db: ReturnType<typeof drizzle<typeof schema>>,
    env: Env,
    albumId: string,
    options: AlbumMediaOptions = {}
): Promise<{ ok: boolean; media: Media[]; total: number }> {
    const { page = 1, pageSize = 50 } = options;
    const offset = (page - 1) * pageSize;

    // Find album by slug or id
    let albumResults = await db
        .select()
        .from(schema.albums)
        .where(eq(schema.albums.slug, albumId))
        .limit(1);

    let album = albumResults[0];

    if (!album) {
        albumResults = await db
            .select()
            .from(schema.albums)
            .where(eq(schema.albums.id, albumId))
            .limit(1);
        album = albumResults[0];
    }

    if (!album) {
        throw new Error('Album not found');
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
        return { ok: true, media: [], total };
    }

    const mediaIds = albumMediaLinks.map((link) => link.media_id);
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

    const media: Media[] = albumMediaLinks
        .map((link) => {
            const m = mediaMap.get(link.media_id);
            if (!m) return null;
            const urls = resolveMediaOutputUrls(env, {
                url: m.url,
                provider: m.provider as MediaProvider | null | undefined,
                object_key: m.object_key,
            });
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
                liked: false,
            } as Media;
        })
        .filter((m): m is Media => m !== null);

    return { ok: true, media, total };
}

// ============ API Fallback ============

async function listAlbumsFromApi(params: AlbumListParams = {}): Promise<AlbumListResponse> {
    const baseUrl = getApiBaseUrl();
    // Skip fetch if we can't construct a valid URL
    if (!baseUrl || baseUrl === '/api') {
        console.warn('Cannot fetch albums: no valid API base URL available');
        return { ok: false, albums: [], total: 0, totalPages: 0 };
    }

    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set('q', params.q);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    const url = `${baseUrl}/albums${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

async function getAlbumByIdFromApi(id: string, token?: string): Promise<AlbumDetailResponse> {
    const baseUrl = getApiBaseUrl();
    // Skip fetch if we can't construct a valid URL
    if (!baseUrl || baseUrl === '/api') {
        console.warn('Cannot fetch album: no valid API base URL available');
        return { ok: false, data: null as never };
    }

    const url = `${baseUrl}/albums/${id}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
        if (response.status === 403) {
            const errorData = await response.json() as { code?: string; data?: unknown };
            throw Object.assign(new Error(`API request failed: ${response.status}`), {
                status: response.status,
                code: errorData.code,
                data: errorData.data,
            });
        }
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

async function getAlbumMediaFromApi(
    id: string,
    params: AlbumMediaOptions = {}
): Promise<{ ok: boolean; media: Media[]; total: number }> {
    const baseUrl = getApiBaseUrl();
    // Skip fetch if we can't construct a valid URL
    if (!baseUrl || baseUrl === '/api') {
        console.warn('Cannot fetch album media: no valid API base URL available');
        return { ok: false, media: [], total: 0 };
    }

    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    const url = `${baseUrl}/albums/${id}/media${queryString ? `?${queryString}` : ''}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (params.token) {
        headers['Authorization'] = `Bearer ${params.token}`;
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
        if (response.status === 403) {
            const errorData = await response.json() as { code?: string; data?: unknown };
            throw Object.assign(new Error(`API request failed: ${response.status}`), {
                status: response.status,
                code: errorData.code,
                data: errorData.data,
            });
        }
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

// ============ Public API ============

export async function listAlbums(
    env: Env,
    params: AlbumListParams = {}
): Promise<AlbumListResponse> {
    if (env.DB) {
        const db = drizzle(env.DB, { schema });
        return listAlbumsFromDb(db, env, params);
    }
    return listAlbumsFromApi(params);
}

export async function getAlbumById(
    env: Env,
    id: string,
    token?: string
): Promise<AlbumDetailResponse> {
    if (env.DB) {
        const db = drizzle(env.DB, { schema });
        return getAlbumByIdFromDb(db, env, id);
    }
    return getAlbumByIdFromApi(id, token);
}

export async function getAlbumMedia(
    env: Env,
    albumId: string,
    options: AlbumMediaOptions = {}
): Promise<{ ok: boolean; media: Media[]; total: number }> {
    if (env.DB) {
        const db = drizzle(env.DB, { schema });
        return getAlbumMediaFromDb(db, env, albumId, options);
    }
    return getAlbumMediaFromApi(albumId, options);
}
