/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin Album Services - CRUD operations for albums
 *
 * Ported from hugo-cf-work admin album services.
 * All database functions take (db, schema, ...) parameters.
 */

import { eq, desc, like, and, or, sql, inArray } from 'drizzle-orm';
import type { AlbumCreate, AlbumUpdate, MediaFile, MediaProvider } from '@/types/admin';

// ---- Helpers ----

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function getAlbumTags(db: any, schema: any, albumId: string): Promise<string[]> {
    const rows = await db
        .select({ tag: schema.albumTags.tag })
        .from(schema.albumTags)
        .where(eq(schema.albumTags.album_id, albumId));
    return rows.map((r: any) => r.tag);
}

async function setAlbumTags(db: any, schema: any, albumId: string, tags: string[]): Promise<void> {
    await db
        .delete(schema.albumTags)
        .where(eq(schema.albumTags.album_id, albumId));

    if (tags.length > 0) {
        await db.insert(schema.albumTags).values(
            tags.map((tag) => ({
                album_id: albumId,
                tag,
            })),
        );
    }
}

async function getAlbumCategories(
    db: any,
    schema: any,
    albumId: string,
): Promise<{ id: string; name: string; slug: string }[]> {
    const rows = await db
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
        .where(eq(schema.albumCategoryLinks.album_id, albumId));

    return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug || row.id,
    }));
}

async function setAlbumCategories(
    db: any,
    schema: any,
    albumId: string,
    categoryIds: string[],
): Promise<void> {
    await db
        .delete(schema.albumCategoryLinks)
        .where(eq(schema.albumCategoryLinks.album_id, albumId));

    if (categoryIds.length > 0) {
        await db.insert(schema.albumCategoryLinks).values(
            categoryIds.map((categoryId) => ({
                album_id: albumId,
                category_id: categoryId,
            })),
        );
    }
}

async function fetchCoverMedia(db: any, schema: any, coverMediaId: string | null): Promise<any | undefined> {
    if (!coverMediaId) return undefined;

    const rows = await db
        .select()
        .from(schema.media)
        .where(eq(schema.media.id, coverMediaId))
        .limit(1);

    if (!rows[0]) return undefined;

    const m = rows[0];
    return {
        id: m.id,
        url: m.url,
        provider: m.provider,
        object_key: m.object_key,
        url_thumb: m.url_thumb || undefined,
        url_medium: m.url_medium || undefined,
        url_large: m.url_large || undefined,
        filename: m.filename || undefined,
        width: m.width || undefined,
        height: m.height || undefined,
    };
}

// ---- Album row -> response object ----

async function albumRowToResponse(db: any, schema: any, album: any): Promise<any> {
    const tags = await getAlbumTags(db, schema, album.id);
    const categories = await getAlbumCategories(db, schema, album.id);
    const cover_media = await fetchCoverMedia(db, schema, album.cover_media_id);

    return {
        id: album.id,
        title: album.title,
        description: album.description || '',
        cover_media_id: album.cover_media_id || undefined,
        cover_media,
        slug: album.slug || undefined,
        status: album.status || 'published',
        password: album.password || undefined,
        is_protected: !!album.password,
        media_count: album.media_count || 0,
        view_count: album.view_count || 0,
        likes: album.likes || 0,
        tags,
        categories,
        category_ids: categories.map((c) => c.id),
        created_at: album.created_at,
        updated_at: album.updated_at,
    };
}

// ---- Public API ----

interface ListAlbumsOptions {
    page?: number;
    pageSize?: number;
    includeDrafts?: boolean;
    search?: string;
    category?: string;
}

/**
 * List albums with pagination and optional draft inclusion.
 */
export async function listAlbums(
    db: any,
    schema: any,
    options: ListAlbumsOptions = {},
): Promise<{
    albums: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}> {
    const { page = 1, pageSize = 20, includeDrafts = false, search, category } = options;
    const offset = (page - 1) * pageSize;
    const conditions: any[] = [];

    // Status filter
    if (!includeDrafts) {
        conditions.push(
            or(
                eq(schema.albums.status, 'published'),
                sql`${schema.albums.status} IS NULL`,
            ),
        );
    }

    // Search filter
    if (search) {
        conditions.push(
            or(
                like(schema.albums.title, `%${search}%`),
                like(schema.albums.description, `%${search}%`),
            ),
        );
    }

    if (category) {
        const categoryLinks = await db
            .select({ album_id: schema.albumCategoryLinks.album_id })
            .from(schema.albumCategoryLinks)
            .innerJoin(
                schema.albumCategories,
                eq(schema.albumCategoryLinks.category_id, schema.albumCategories.id),
            )
            .where(or(eq(schema.albumCategories.slug, category), eq(schema.albumCategories.id, category)));

        const albumIds = categoryLinks.map((l: any) => l.album_id);
        if (albumIds.length === 0) {
            return { albums: [], total: 0, page, pageSize, totalPages: 0 };
        }
        conditions.push(inArray(schema.albums.id, albumIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.albums)
        .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Fetch albums
    const rows = await db
        .select()
        .from(schema.albums)
        .where(whereClause)
        .orderBy(desc(schema.albums.created_at))
        .limit(pageSize)
        .offset(offset);

    const albums = await Promise.all(
        rows.map((row: any) => albumRowToResponse(db, schema, row)),
    );

    return {
        albums,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

/**
 * Get a single album by UUID or slug.
 */
export async function getAlbumById(
    db: any,
    schema: any,
    idOrSlug: string,
): Promise<any | null> {
    // Try slug first
    let rows = await db
        .select()
        .from(schema.albums)
        .where(eq(schema.albums.slug, idOrSlug))
        .limit(1);

    if (!rows[0]) {
        // Try by ID
        rows = await db
            .select()
            .from(schema.albums)
            .where(eq(schema.albums.id, idOrSlug))
            .limit(1);
    }

    if (!rows[0]) return null;
    return albumRowToResponse(db, schema, rows[0]);
}

/**
 * Create a new album.
 */
export async function createAlbum(
    db: any,
    schema: any,
    data: AlbumCreate,
): Promise<any> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = data.slug || slugify(data.title);

    await db.insert(schema.albums).values({
        id,
        title: data.title,
        description: data.description || null,
        cover_media_id: data.cover_media_id || null,
        slug,
        password: data.password || null,
        status: data.status || 'draft',
        media_count: 0,
        view_count: 0,
        likes: 0,
        created_at: now,
        updated_at: now,
    });

    // Set tags
    if (data.tags && data.tags.length > 0) {
        await setAlbumTags(db, schema, id, data.tags);
    }

    if (data.category_ids && data.category_ids.length > 0) {
        await setAlbumCategories(db, schema, id, data.category_ids);
    }

    return getAlbumById(db, schema, id);
}

/**
 * Update an album (partial update).
 */
export async function updateAlbum(
    db: any,
    schema: any,
    id: string,
    changes: AlbumUpdate,
): Promise<any | null> {
    const existing = await getAlbumById(db, schema, id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updateData: any = {
        updated_at: now,
    };

    if (changes.title !== undefined) updateData.title = changes.title;
    if (changes.description !== undefined) updateData.description = changes.description;
    if (changes.cover_media_id !== undefined) updateData.cover_media_id = changes.cover_media_id;
    if (changes.slug !== undefined) updateData.slug = changes.slug;
    if (changes.password !== undefined) updateData.password = changes.password;
    if (changes.status !== undefined) updateData.status = changes.status;

    await db
        .update(schema.albums)
        .set(updateData)
        .where(eq(schema.albums.id, id));

    // Update tags if provided
    if (changes.tags !== undefined) {
        await setAlbumTags(db, schema, id, changes.tags);
    }

    if (changes.category_ids !== undefined) {
        await setAlbumCategories(db, schema, id, changes.category_ids);
    }

    return getAlbumById(db, schema, id);
}

/**
 * Delete an album and its album_media links.
 */
export async function deleteAlbum(
    db: any,
    schema: any,
    id: string,
): Promise<boolean> {
    const existing = await getAlbumById(db, schema, id);
    if (!existing) return false;

    // Delete album_media links
    await db
        .delete(schema.albumMedia)
        .where(eq(schema.albumMedia.album_id, id));

    // Delete album tags
    await db
        .delete(schema.albumTags)
        .where(eq(schema.albumTags.album_id, id));

    await db
        .delete(schema.albumCategoryLinks)
        .where(eq(schema.albumCategoryLinks.album_id, id));

    // Delete album OTPs
    await db
        .delete(schema.albumOtps)
        .where(eq(schema.albumOtps.album_id, id));

    // Delete the album
    await db
        .delete(schema.albums)
        .where(eq(schema.albums.id, id));

    return true;
}

// ---- Album Media ----

interface GetAlbumMediaOptions {
    page?: number;
    pageSize?: number;
}

/**
 * Get paginated media for an album, joined with the media table.
 */
export async function getAlbumMedia(
    db: any,
    schema: any,
    albumId: string,
    options: GetAlbumMediaOptions = {},
): Promise<{
    media: MediaFile[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}> {
    const { page = 1, pageSize = 50 } = options;
    const offset = (page - 1) * pageSize;

    // Total count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.albumMedia)
        .where(eq(schema.albumMedia.album_id, albumId));
    const total = countResult[0]?.count || 0;

    // Fetch album_media links with ordering
    const links = await db
        .select()
        .from(schema.albumMedia)
        .where(eq(schema.albumMedia.album_id, albumId))
        .orderBy(schema.albumMedia.display_order)
        .limit(pageSize)
        .offset(offset);

    if (links.length === 0) {
        return { media: [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    // Fetch media details
    const mediaIds = links.map((l: any) => l.media_id);
    const mediaRows = await db
        .select()
        .from(schema.media)
        .where(inArray(schema.media.id, mediaIds));

    // Build a map for ordering
    const mediaMap = new Map<string, any>();
    for (const row of mediaRows) {
        mediaMap.set(row.id, row);
    }

    // Return in display_order
    const media: MediaFile[] = links
        .map((link: any) => {
            const m = mediaMap.get(link.media_id);
            if (!m) return null;
            return {
                id: m.id,
                filename: m.filename || undefined,
                url: m.url,
                provider: m.provider as MediaProvider,
                object_key: m.object_key,
                size: m.size || undefined,
                mime_type: m.mime || undefined,
                width: m.width || undefined,
                height: m.height || undefined,
                url_thumb: m.url_thumb || undefined,
                url_medium: m.url_medium || undefined,
                url_large: m.url_large || undefined,
                title: m.title || undefined,
                alt: m.alt || undefined,
                camera_make: m.camera_make || undefined,
                camera_model: m.camera_model || undefined,
                lens_model: m.lens_model || undefined,
                aperture: m.aperture || undefined,
                shutter_speed: m.shutter_speed || undefined,
                iso: m.iso || undefined,
                focal_length: m.focal_length || undefined,
                datetime_original: m.datetime_original || undefined,
                gps_lat: m.gps_lat ?? undefined,
                gps_lon: m.gps_lon ?? undefined,
                location_name: m.location_name || undefined,
                likes: m.likes || 0,
                visibility: m.visibility || 'public',
                created_at: m.created_at,
                updated_at: m.updated_at || undefined,
            } as MediaFile;
        })
        .filter((m: any): m is MediaFile => m !== null);

    return {
        media,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

/**
 * Add media items to an album.
 */
export async function addMediaToAlbum(
    db: any,
    schema: any,
    albumId: string,
    mediaIds: string[],
): Promise<void> {
    if (mediaIds.length === 0) return;

    const now = new Date().toISOString();

    // Get current max display_order
    const maxOrderResult = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(display_order), 0)` })
        .from(schema.albumMedia)
        .where(eq(schema.albumMedia.album_id, albumId));
    let currentOrder = maxOrderResult[0]?.maxOrder || 0;

    // Check which media are already in the album
    const existingLinks = await db
        .select({ media_id: schema.albumMedia.media_id })
        .from(schema.albumMedia)
        .where(
            and(
                eq(schema.albumMedia.album_id, albumId),
                inArray(schema.albumMedia.media_id, mediaIds),
            ),
        );
    const existingSet = new Set(existingLinks.map((l: any) => l.media_id));

    // Insert only new links
    const newLinks = mediaIds
        .filter((mid) => !existingSet.has(mid))
        .map((mid) => {
            currentOrder += 1;
            return {
                album_id: albumId,
                media_id: mid,
                display_order: currentOrder,
                created_at: now,
            };
        });

    if (newLinks.length > 0) {
        await db.insert(schema.albumMedia).values(newLinks);
    }

    // Update media_count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.albumMedia)
        .where(eq(schema.albumMedia.album_id, albumId));
    const mediaCount = countResult[0]?.count || 0;

    await db
        .update(schema.albums)
        .set({ media_count: mediaCount })
        .where(eq(schema.albums.id, albumId));
}

/**
 * Remove media items from an album.
 */
export async function removeMediaFromAlbum(
    db: any,
    schema: any,
    albumId: string,
    mediaIds: string[],
): Promise<void> {
    if (mediaIds.length === 0) return;

    await db
        .delete(schema.albumMedia)
        .where(
            and(
                eq(schema.albumMedia.album_id, albumId),
                inArray(schema.albumMedia.media_id, mediaIds),
            ),
        );

    // Update media_count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.albumMedia)
        .where(eq(schema.albumMedia.album_id, albumId));
    const mediaCount = countResult[0]?.count || 0;

    await db
        .update(schema.albums)
        .set({ media_count: mediaCount })
        .where(eq(schema.albums.id, albumId));
}

/**
 * Generate a 6-digit OTP for album access and store it.
 */
export async function generateAlbumOTP(
    db: any,
    schema: any,
    albumId: string,
): Promise<{ id: string; token: string; created_at: string }> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Generate 6-digit OTP
    const token = String(Math.floor(100000 + Math.random() * 900000));

    await db.insert(schema.albumOtps).values({
        id,
        album_id: albumId,
        token,
        created_at: now,
    });

    return { id, token, created_at: now };
}
