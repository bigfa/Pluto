/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin Media Services - CRUD operations for media files
 *
 * Ported from hugo-cf-work admin media services.
 * All database functions take (db, schema, ...) parameters.
 */

import { eq, desc, asc, like, and, or, sql, inArray, count } from 'drizzle-orm';
import ExifReader from 'exifreader';
import type { Env } from '@/lib/env';
import type { MediaFile, MediaCreate, MediaUpdate, MediaProvider } from '@/types/admin';
import { putObject } from './mediaProviders';

/**
 * Compute MD5 hash of file content using Web Crypto API.
 * Returns hex string of the hash.
 */
async function computeFileHash(arrayBuffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a media with the given hash already exists.
 * Returns the existing media if found, null otherwise.
 */
export async function findMediaByHash(
    db: any,
    schema: any,
    fileHash: string,
): Promise<MediaFile | null> {
    if (!fileHash) return null;

    const rows = await db
        .select()
        .from(schema.media)
        .where(eq(schema.media.file_hash, fileHash))
        .limit(1);

    if (!rows[0]) return null;
    return rowToMediaFile(db, schema, rows[0]);
}

// Helper to safely get EXIF value from multiple possible locations
function safeGet(exif: any, tags: string[], groups: string[] = ['exif', 'file', 'ifd0']): string | undefined {
    if (!exif) return undefined;

    for (const group of groups) {
        if (exif[group]) {
            for (const tag of tags) {
                if (exif[group][tag]) {
                    const node = exif[group][tag];
                    // Prefer description if available and safe, otherwise value
                    if (node.description && typeof node.description === 'string') return node.description;
                    if (node.value) {
                        // Handle array values (e.g. [1, 160] for shutter speed sometimes)
                        if (Array.isArray(node.value)) return String(node.value[0]);
                        return String(node.value);
                    }
                }
            }
        }
    }
    return undefined;
}

function parseExifNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? undefined : parsed;
    }
    if (value && typeof value === 'object') {
        if ('numerator' in value && 'denominator' in value) {
            const numerator = Number((value as { numerator: unknown }).numerator);
            const denominator = Number((value as { denominator: unknown }).denominator);
            if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
                return numerator / denominator;
            }
        }
        const maybeValue = (value as { value?: unknown }).value;
        const maybeDescription = (value as { description?: unknown }).description;
        if (maybeValue !== undefined) {
            const parsed = parseExifNumber(maybeValue);
            if (parsed !== undefined) return parsed;
        }
        if (maybeDescription !== undefined) {
            const parsed = parseExifNumber(maybeDescription);
            if (parsed !== undefined) return parsed;
        }
    }
    return undefined;
}

function parseGpsCoordinate(raw: unknown): number | undefined {
    if (raw === undefined || raw === null) return undefined;
    if (Array.isArray(raw)) {
        const parts = raw.map(part => parseExifNumber(part)).filter((p): p is number => p !== undefined);
        if (parts.length >= 3) {
            return parts[0] + parts[1] / 60 + parts[2] / 3600;
        }
        if (parts.length === 2) {
            return parts[0] + parts[1] / 60;
        }
        if (parts.length === 1) {
            return parts[0];
        }
        return undefined;
    }
    return parseExifNumber(raw);
}

function parseGpsRef(raw: unknown): string | undefined {
    if (raw && typeof raw === 'object') {
        const maybeValue = (raw as { value?: unknown }).value;
        if (typeof maybeValue === 'string') return maybeValue;
        const maybeDescription = (raw as { description?: unknown }).description;
        if (typeof maybeDescription === 'string') return maybeDescription;
    }
    if (typeof raw === 'string') return raw;
    return undefined;
}

function formatCoordinate(value: number, positive: string, negative: string): string {
    const dir = value >= 0 ? positive : negative;
    return `${Math.abs(value).toFixed(5)}°${dir}`;
}

async function reverseGeocodeCity(env: Env, lat: number, lon: number): Promise<string | undefined> {
    const provider = (env.GEOCODE_PROVIDER || 'nominatim').toLowerCase();
    if (!provider || provider === 'none') return undefined;
    if (provider !== 'nominatim') {
        // Placeholder for future providers
        return undefined;
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('zoom', '10'); // city-level
    url.searchParams.set('addressdetails', '1');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': env.GEOCODE_USER_AGENT || 'pluto/1.0 (photo gallery)',
                'Accept-Language': env.GEOCODE_LANGUAGE || 'zh-CN,zh;q=0.9,en;q=0.8',
            },
            signal: controller.signal,
        });

        if (!response.ok) return undefined;
        const data = await response.json() as { address?: Record<string, string> };
        const address = data.address || {};
        const city = address.city
            || address.town
            || address.village
            || address.municipality
            || address.county
            || address.state;

        if (!city) return undefined;
        const country = address.country;
        return country ? `${city}, ${country}` : city;
    } catch (err) {
        if ((err as { name?: string }).name !== 'AbortError') {
            console.warn('Reverse geocode failed', err);
        }
        return undefined;
    } finally {
        clearTimeout(timeout);
    }
}

// ---- Internal helpers ----

async function getMediaTags(db: any, schema: any, mediaId: string): Promise<string[]> {
    const rows = await db
        .select({ tag: schema.mediaTags.tag })
        .from(schema.mediaTags)
        .where(eq(schema.mediaTags.media_id, mediaId));
    return rows.map((r: any) => r.tag);
}

async function getMediaTagsByIds(
    db: any,
    schema: any,
    mediaIds: string[],
): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (mediaIds.length === 0) return map;

    const rows = await db
        .select({
            media_id: schema.mediaTags.media_id,
            tag: schema.mediaTags.tag,
        })
        .from(schema.mediaTags)
        .where(inArray(schema.mediaTags.media_id, mediaIds));

    for (const row of rows) {
        const list = map.get(row.media_id) || [];
        list.push(row.tag);
        map.set(row.media_id, list);
    }

    return map;
}

async function getMediaCategories(
    db: any,
    schema: any,
    mediaId: string,
): Promise<{ id: string; name: string }[]> {
    const rows = await db
        .select({
            id: schema.mediaCategories.id,
            name: schema.mediaCategories.name,
        })
        .from(schema.mediaCategoryLinks)
        .innerJoin(
            schema.mediaCategories,
            eq(schema.mediaCategoryLinks.category_id, schema.mediaCategories.id),
        )
        .where(eq(schema.mediaCategoryLinks.media_id, mediaId));
    return rows;
}

async function getMediaCategoriesByIds(
    db: any,
    schema: any,
    mediaIds: string[],
): Promise<Map<string, { id: string; name: string }[]>> {
    const map = new Map<string, { id: string; name: string }[]>();
    if (mediaIds.length === 0) return map;

    const rows = await db
        .select({
            media_id: schema.mediaCategoryLinks.media_id,
            id: schema.mediaCategories.id,
            name: schema.mediaCategories.name,
        })
        .from(schema.mediaCategoryLinks)
        .innerJoin(
            schema.mediaCategories,
            eq(schema.mediaCategoryLinks.category_id, schema.mediaCategories.id),
        )
        .where(inArray(schema.mediaCategoryLinks.media_id, mediaIds));

    for (const row of rows) {
        const list = map.get(row.media_id) || [];
        list.push({ id: row.id, name: row.name });
        map.set(row.media_id, list);
    }

    return map;
}

async function setMediaCategories(
    db: any,
    schema: any,
    mediaId: string,
    categoryIds: string[],
): Promise<void> {
    // Delete existing links
    await db
        .delete(schema.mediaCategoryLinks)
        .where(eq(schema.mediaCategoryLinks.media_id, mediaId));

    // Insert new links
    if (categoryIds.length > 0) {
        await db.insert(schema.mediaCategoryLinks).values(
            categoryIds.map((categoryId) => ({
                media_id: mediaId,
                category_id: categoryId,
            })),
        );
    }
}

async function setMediaTags(
    db: any,
    schema: any,
    mediaId: string,
    tags: string[],
): Promise<void> {
    // Delete existing tags
    await db
        .delete(schema.mediaTags)
        .where(eq(schema.mediaTags.media_id, mediaId));

    // Insert new tags
    if (tags.length > 0) {
        await db.insert(schema.mediaTags).values(
            tags.map((tag) => ({
                media_id: mediaId,
                tag,
            })),
        );
    }
}

// ---- Helpers to map DB row -> MediaFile ----

function mapRowToMediaFile(
    row: any,
    tags: string[],
    categories: { id: string; name: string }[],
): MediaFile {
    return {
        id: row.id,
        filename: row.filename || undefined,
        url: row.url,
        provider: row.provider as MediaProvider,
        object_key: row.object_key,
        size: row.size || undefined,
        mime_type: row.mime || undefined,
        width: row.width || undefined,
        height: row.height || undefined,
        url_thumb: row.url_thumb || undefined,
        url_medium: row.url_medium || undefined,
        url_large: row.url_large || undefined,
        file_hash: row.file_hash || undefined,
        title: row.title || undefined,
        alt: row.alt || undefined,
        exif_json: row.exif_json || undefined,
        camera_make: row.camera_make || undefined,
        camera_model: row.camera_model || undefined,
        lens_model: row.lens_model || undefined,
        aperture: row.aperture || undefined,
        shutter_speed: row.shutter_speed || undefined,
        iso: row.iso || undefined,
        focal_length: row.focal_length || undefined,
        datetime_original: row.datetime_original || undefined,
        gps_lat: row.gps_lat ?? undefined,
        gps_lon: row.gps_lon ?? undefined,
        location_name: row.location_name || undefined,
        likes: row.likes || 0,
        view_count: row.view_count || 0,
        visibility: row.visibility || 'public',
        tags,
        categories,
        category_ids: categories.map((c: any) => c.id),
        created_at: row.created_at,
        updated_at: row.updated_at || undefined,
    };
}

async function rowToMediaFile(db: any, schema: any, row: any): Promise<MediaFile> {
    const tags = await getMediaTags(db, schema, row.id);
    const categories = await getMediaCategories(db, schema, row.id);
    return mapRowToMediaFile(row, tags, categories);
}

// ---- Public CRUD functions ----

interface ListMediaOptions {
    page?: number;
    pageSize?: number;
    q?: string;
    category?: string;
    tag?: string;
    visibility?: string;
    orientation?: 'landscape' | 'portrait' | 'square';
    sort?: 'date' | 'date_asc' | 'name' | 'likes' | 'views';
}

/**
 * List media with filters and pagination.
 */
export async function listMedia(
    db: any,
    schema: any,
    options: ListMediaOptions = {},
): Promise<{
    results: MediaFile[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}> {
    const {
        page = 1,
        pageSize = 20,
        q,
        category,
        tag,
        visibility,
        orientation,
        sort = 'date',
    } = options;

    const offset = (page - 1) * pageSize;
    const conditions: any[] = [];

    // Visibility filter
    if (visibility) {
        conditions.push(eq(schema.media.visibility, visibility));
    }

    // Search
    if (q) {
        conditions.push(
            or(
                like(schema.media.filename, `%${q}%`),
                like(schema.media.title, `%${q}%`),
                like(schema.media.location_name, `%${q}%`),
            ),
        );
    }

    // Orientation
    if (orientation === 'landscape') {
        conditions.push(sql`${schema.media.width} > ${schema.media.height}`);
    } else if (orientation === 'portrait') {
        conditions.push(sql`${schema.media.height} > ${schema.media.width}`);
    } else if (orientation === 'square') {
        conditions.push(sql`${schema.media.width} = ${schema.media.height}`);
    }

    // Category filter
    if (category) {
        const catLinks = await db
            .select({ media_id: schema.mediaCategoryLinks.media_id })
            .from(schema.mediaCategoryLinks)
            .innerJoin(
                schema.mediaCategories,
                eq(schema.mediaCategoryLinks.category_id, schema.mediaCategories.id),
            )
            .where(
                or(
                    eq(schema.mediaCategories.slug, category),
                    eq(schema.mediaCategories.id, category),
                ),
            );
        const mediaIds = catLinks.map((l: any) => l.media_id);
        if (mediaIds.length === 0) {
            return { results: [], total: 0, page, pageSize, totalPages: 0 };
        }
        conditions.push(inArray(schema.media.id, mediaIds));
    }

    // Tag filter
    if (tag) {
        const tagLinks = await db
            .select({ media_id: schema.mediaTags.media_id })
            .from(schema.mediaTags)
            .where(eq(schema.mediaTags.tag, tag));
        const mediaIds = tagLinks.map((l: any) => l.media_id);
        if (mediaIds.length === 0) {
            return { results: [], total: 0, page, pageSize, totalPages: 0 };
        }
        conditions.push(inArray(schema.media.id, mediaIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.media)
        .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Sort order
    let orderBy;
    switch (sort) {
        case 'date_asc':
            orderBy = asc(schema.media.created_at);
            break;
        case 'name':
            orderBy = asc(schema.media.filename);
            break;
        case 'likes':
            orderBy = desc(schema.media.likes);
            break;
        case 'views':
            orderBy = desc(schema.media.view_count);
            break;
        default:
            orderBy = desc(schema.media.created_at);
    }

    // Fetch rows
    const rows = await db
        .select()
        .from(schema.media)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset);

    const mediaIds = rows.map((row: any) => row.id);
    const [tagsByMedia, categoriesByMedia] = await Promise.all([
        getMediaTagsByIds(db, schema, mediaIds),
        getMediaCategoriesByIds(db, schema, mediaIds),
    ]);

    const results: MediaFile[] = rows.map((row: any) => {
        const tags = tagsByMedia.get(row.id) || [];
        const categories = categoriesByMedia.get(row.id) || [];
        return mapRowToMediaFile(row, tags, categories);
    });

    return {
        results,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

/**
 * Get a single media file by ID.
 */
export async function getMediaById(
    db: any,
    schema: any,
    id: string,
): Promise<MediaFile | null> {
    const rows = await db
        .select()
        .from(schema.media)
        .where(eq(schema.media.id, id))
        .limit(1);

    if (!rows[0]) return null;
    return rowToMediaFile(db, schema, rows[0]);
}

/**
 * Create a media record.
 */
export async function createMedia(
    db: any,
    schema: any,
    data: MediaCreate,
): Promise<MediaFile> {
    const now = new Date().toISOString();
    const id = data.id || crypto.randomUUID();

    await db.insert(schema.media).values({
        id,
        provider: data.provider,
        object_key: data.object_key,
        url: data.url,
        url_thumb: data.thumb_url || null,
        filename: data.filename || null,
        mime: data.mime_type || null,
        size: data.size || null,
        width: data.width || null,
        height: data.height || null,
        file_hash: data.file_hash || null,
        title: data.title || null,
        alt: data.alt || null,
        exif_json: data.exif_json || null,
        camera_make: data.camera_make || null,
        camera_model: data.camera_model || null,
        lens_model: data.lens_model || null,
        aperture: data.aperture || null,
        shutter_speed: data.shutter_speed || null,
        iso: data.iso || null,
        focal_length: data.focal_length || null,
        datetime_original: data.datetime_original || null,
        gps_lat: data.gps_lat ?? null,
        gps_lon: data.gps_lon ?? null,
        location_name: data.location_name || null,
        visibility: data.visibility || 'public',
        likes: 0,
        view_count: 0,
        created_at: data.created_at || now,
        updated_at: data.updated_at || now,
    });

    // Set categories
    if (data.category_ids && data.category_ids.length > 0) {
        await setMediaCategories(db, schema, id, data.category_ids);
    }

    // Set tags
    if (data.tags && data.tags.length > 0) {
        await setMediaTags(db, schema, id, data.tags);
    }

    return (await getMediaById(db, schema, id))!;
}

/**
 * Update a media record.
 */
export async function updateMedia(
    db: any,
    schema: any,
    id: string,
    changes: MediaUpdate,
): Promise<MediaFile | null> {
    const existing = await getMediaById(db, schema, id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updateData: any = {
        updated_at: changes.updated_at || now,
    };

    if (changes.title !== undefined) updateData.title = changes.title;
    if (changes.alt !== undefined) updateData.alt = changes.alt;
    if (changes.description !== undefined) updateData.alt = changes.description;
    if (changes.visibility !== undefined) updateData.visibility = changes.visibility;

    await db
        .update(schema.media)
        .set(updateData)
        .where(eq(schema.media.id, id));

    // Update categories if provided
    if (changes.category_ids !== undefined) {
        await setMediaCategories(db, schema, id, changes.category_ids);
    }

    // Update tags if provided
    if (changes.tags !== undefined) {
        await setMediaTags(db, schema, id, changes.tags);
    }

    return getMediaById(db, schema, id);
}

/**
 * Delete a media record and all related links.
 */
export async function deleteMedia(
    db: any,
    schema: any,
    id: string,
): Promise<boolean> {
    const existing = await getMediaById(db, schema, id);
    if (!existing) return false;

    // Delete related records in order
    await db
        .delete(schema.mediaTags)
        .where(eq(schema.mediaTags.media_id, id));

    await db
        .delete(schema.mediaCategoryLinks)
        .where(eq(schema.mediaCategoryLinks.media_id, id));

    await db
        .delete(schema.albumMedia)
        .where(eq(schema.albumMedia.media_id, id));

    await db
        .delete(schema.media)
        .where(eq(schema.media.id, id));

    return true;
}

/**
 * Get multiple media files by IDs.
 */
export async function getMediaByIds(
    db: any,
    schema: any,
    ids: string[],
): Promise<MediaFile[]> {
    if (ids.length === 0) return [];

    const rows = await db
        .select()
        .from(schema.media)
        .where(inArray(schema.media.id, ids));

    return Promise.all(rows.map((row: any) => rowToMediaFile(db, schema, row)));
}

/**
 * Create a media record from a raw File upload.
 *
 * Handles EXIF extraction, object key generation, and storage upload.
 * Thumbnail generation is skipped (no @cf-wasm/photon available).
 */
export async function createMediaFromFile(options: {
    env: Env;
    db: any;
    schema: any;
    file: File;
    title?: string;
    alt?: string;
    provider?: MediaProvider;
    folder?: string;
    tags?: string[];
    category_ids?: string[];
    visibility?: string;
}): Promise<MediaFile> {
    const {
        env,
        db,
        schema,
        file,
        title,
        alt,
        provider = (env.MEDIA_DEFAULT_PROVIDER as MediaProvider) || 'r2',
        folder,
        tags,
        category_ids,
        visibility = 'public',
    } = options;

    const arrayBuffer = await file.arrayBuffer();
    const contentType = file.type || 'application/octet-stream';
    const filename = file.name;

    // ---- Compute file hash and check for duplicates ----
    const fileHash = await computeFileHash(arrayBuffer);
    const existingMedia = await findMediaByHash(db, schema, fileHash);
    if (existingMedia) {
        // Throw error with existing media info for duplicate detection
        const error = new Error('Duplicate file detected') as Error & { isDuplicate: true; existingMedia: MediaFile };
        error.isDuplicate = true;
        error.existingMedia = existingMedia;
        throw error;
    }

    // ---- EXIF extraction ----
    let exifData: any = null;
    let cameraMake: string | undefined;
    let cameraModel: string | undefined;
    let lensModel: string | undefined;
    let aperture: string | undefined;
    let shutterSpeed: string | undefined;
    let iso: string | undefined;
    let focalLength: string | undefined;
    let datetimeOriginal: string | undefined;
    let gpsLat: number | undefined;
    let gpsLon: number | undefined;
    let width: number | undefined;
    let height: number | undefined;

    try {
        const tags_exif = ExifReader.load(arrayBuffer, { expanded: true });

        // Flatten EXIF data for storage
        exifData = {};
        for (const group in tags_exif) {
            if (group !== 'thumbnail') {
                Object.assign(exifData, (tags_exif as any)[group]);
            }
        }

        // Dimensions
        if (tags_exif.file?.['Image Width']) {
            width = Number(tags_exif.file['Image Width'].value);
        }
        if (tags_exif.file?.['Image Height']) {
            height = Number(tags_exif.file['Image Height'].value);
        }
        // Fallback for dimensions from EXIF
        if (!width && tags_exif.exif?.ImageWidth) {
            width = Number(tags_exif.exif.ImageWidth.value);
        }
        if (!height && tags_exif.exif?.ImageLength) {
            height = Number(tags_exif.exif.ImageLength.value);
        }
        // Also try PixelXDimension / PixelYDimension
        if (!width && tags_exif.exif?.PixelXDimension) {
            width = Number(tags_exif.exif.PixelXDimension.value);
        }
        if (!height && tags_exif.exif?.PixelYDimension) {
            height = Number(tags_exif.exif.PixelYDimension.value);
        }

        // Camera info
        cameraMake = safeGet(tags_exif, ['Make'], ['ifd0', 'file', 'exif']);
        cameraModel = safeGet(tags_exif, ['Model'], ['ifd0', 'file', 'exif']);
        lensModel = safeGet(tags_exif, ['LensModel', 'LensInfo', 'Lens'], ['exif', 'ifd0']);

        aperture = safeGet(tags_exif, ['FNumber', 'ApertureValue'], ['exif']);
        shutterSpeed = safeGet(tags_exif, ['ExposureTime', 'ShutterSpeedValue'], ['exif']);
        iso = safeGet(tags_exif, ['ISOSpeedRatings', 'ISO'], ['exif']);
        focalLength = safeGet(tags_exif, ['FocalLength'], ['exif']);
        datetimeOriginal = safeGet(tags_exif, ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'], ['exif', 'ifd0']);

        // GPS
        const gpsTags = tags_exif.gps as Record<string, unknown> | undefined;
        if (gpsTags?.Latitude !== undefined) {
            const lat = parseGpsCoordinate(gpsTags.Latitude);
            const latRef = parseGpsRef(gpsTags.LatitudeRef);
            if (lat !== undefined) {
                gpsLat = latRef === 'S' ? -Math.abs(lat) : lat;
            }
        }
        if (gpsTags?.Longitude !== undefined) {
            const lon = parseGpsCoordinate(gpsTags.Longitude);
            const lonRef = parseGpsRef(gpsTags.LongitudeRef);
            if (lon !== undefined) {
                gpsLon = lonRef === 'W' ? -Math.abs(lon) : lon;
            }
        }
    } catch {
        // EXIF extraction failed - continue without it
    }

    // ---- Generate object key ----
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = crypto.randomUUID();
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folderPrefix = folder ? `${folder}/` : '';
    const objectKey = `${folderPrefix}${yyyy}/${mm}/${uuid}-${sanitized}`;

    // ---- Upload to storage ----
    await putObject(env, provider, objectKey, arrayBuffer, contentType);

    // ---- Store URL as object key to keep domain flexible ----
    const url = objectKey;

    // ---- Create database record ----
    let locationName: string | undefined;
    if (gpsLat !== undefined && gpsLon !== undefined) {
        locationName = await reverseGeocodeCity(env, gpsLat, gpsLon);
        if (!locationName) {
            locationName = `${formatCoordinate(gpsLat, 'N', 'S')}, ${formatCoordinate(gpsLon, 'E', 'W')}`;
        }
    }

    const mediaData: MediaCreate = {
        provider,
        object_key: objectKey,
        url,
        filename,
        mime_type: contentType,
        size: arrayBuffer.byteLength,
        width,
        height,
        file_hash: fileHash,
        title: title || filename,
        alt: alt || title || filename,
        exif_json: exifData ? JSON.stringify(exifData) : undefined,
        camera_make: cameraMake,
        camera_model: cameraModel,
        lens_model: lensModel,
        aperture,
        shutter_speed: shutterSpeed,
        iso,
        focal_length: focalLength,
        datetime_original: datetimeOriginal,
        gps_lat: gpsLat,
        gps_lon: gpsLon,
        location_name: locationName,
        visibility,
        tags,
        category_ids,
    };

    return createMedia(db, schema, mediaData);
}

// Suppress unused import warnings
void count;
