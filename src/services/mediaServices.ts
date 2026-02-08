/**
 * Media Services - D1 Implementation
 * 
 * Direct database access for Cloudflare D1.
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, like, and, sql, or, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Media, MediaListParams, MediaListResponse, CategoriesResponse, Category } from '@/types/media';
import type { MediaProvider } from '@/types/admin';
import { getApiBaseUrl } from '@/lib/utils';
import { resolveMediaOutputUrls } from '@/lib/mediaTransforms';
import type { Env } from '@/lib/env';

// ============ D1 Database Implementation ============

async function listMediaFromDb(
    db: ReturnType<typeof drizzle<typeof schema>>,
    env: Env,
    options: MediaListParams = {}
): Promise<MediaListResponse> {
    const {
        page = 1,
        pageSize = 20,
        q,
        category,
        tag,
        sort = 'date',
        orientation,
    } = options;

    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [];

    // Only show public media
    conditions.push(
        or(
            eq(schema.media.visibility, 'public'),
            sql`${schema.media.visibility} IS NULL`
        )
    );

    // Search query
    if (q) {
        conditions.push(
            or(
                like(schema.media.filename, `%${q}%`),
                like(schema.media.title, `%${q}%`),
                like(schema.media.location_name, `%${q}%`)
            )
        );
    }

    // Orientation filter
    if (orientation === 'landscape') {
        conditions.push(sql`${schema.media.width} > ${schema.media.height}`);
    } else if (orientation === 'portrait') {
        conditions.push(sql`${schema.media.height} > ${schema.media.width}`);
    } else if (orientation === 'square') {
        conditions.push(sql`${schema.media.width} = ${schema.media.height}`);
    }

    // Category filter
    if (category) {
        const categoryLinks = await db
            .select({ media_id: schema.mediaCategoryLinks.media_id })
            .from(schema.mediaCategoryLinks)
            .innerJoin(
                schema.mediaCategories,
                eq(schema.mediaCategoryLinks.category_id, schema.mediaCategories.id)
            )
            .where(or(eq(schema.mediaCategories.slug, category), eq(schema.mediaCategories.id, category)));

        const mediaIds = categoryLinks.map(l => l.media_id);
        if (mediaIds.length === 0) {
            return { ok: true, results: [], total: 0, page, pageSize, totalPages: 0 };
        }
        conditions.push(inArray(schema.media.id, mediaIds));
    }

    // Tag filter
    if (tag) {
        const tagLinks = await db
            .select({ media_id: schema.mediaTags.media_id })
            .from(schema.mediaTags)
            .where(eq(schema.mediaTags.tag, tag));

        const mediaIds = tagLinks.map(l => l.media_id);
        if (mediaIds.length === 0) {
            return { ok: true, results: [], total: 0, page, pageSize, totalPages: 0 };
        }
        conditions.push(inArray(schema.media.id, mediaIds));
    }

    // Build query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.media)
        .where(whereClause);

    const total = countResult[0]?.count || 0;

    // Get paginated results
    const orderBy = sort === 'likes'
        ? [sql`COALESCE(${schema.media.likes}, 0) DESC`, desc(schema.media.created_at)]
        : sort === 'views'
            ? [sql`COALESCE(${schema.media.view_count}, 0) DESC`, desc(schema.media.created_at)]
            : [desc(schema.media.datetime_original), desc(schema.media.created_at)];

        const results = await db
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
            view_count: schema.media.view_count,
        })
        .from(schema.media)
        .where(whereClause)
        .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
        .limit(pageSize)
        .offset(offset);

    const mediaIds = results.map((m) => m.id);
    const tagsByMedia = new Map<string, string[]>();
    const categoriesByMedia = new Map<string, { id: string; name: string; slug: string }[]>();

    if (mediaIds.length > 0) {
        const [tagRows, categoryRows] = await Promise.all([
            db
                .select({
                    media_id: schema.mediaTags.media_id,
                    tag: schema.mediaTags.tag,
                })
                .from(schema.mediaTags)
                .where(inArray(schema.mediaTags.media_id, mediaIds)),
            db
                .select({
                    media_id: schema.mediaCategoryLinks.media_id,
                    id: schema.mediaCategories.id,
                    name: schema.mediaCategories.name,
                    slug: schema.mediaCategories.slug,
                })
                .from(schema.mediaCategoryLinks)
                .innerJoin(
                    schema.mediaCategories,
                    eq(schema.mediaCategoryLinks.category_id, schema.mediaCategories.id)
                )
                .where(inArray(schema.mediaCategoryLinks.media_id, mediaIds)),
        ]);

        for (const row of tagRows) {
            const list = tagsByMedia.get(row.media_id) || [];
            list.push(row.tag);
            tagsByMedia.set(row.media_id, list);
        }

        for (const row of categoryRows) {
            const list = categoriesByMedia.get(row.media_id) || [];
            list.push({ id: row.id, name: row.name, slug: row.slug || row.id });
            categoriesByMedia.set(row.media_id, list);
        }
    }

    const mediaWithDetails: Media[] = results.map((m) => {
        const categories = categoriesByMedia.get(m.id) || [];
        const tags = tagsByMedia.get(m.id) || [];
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
            categories,
            category_ids: categories.map(c => c.id),
            tags,
            likes: m.likes || 0,
            view_count: m.view_count || 0,
            liked: false,
        } as Media;
    });

    return {
        ok: true,
        results: mediaWithDetails,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

async function fetchCategoriesFromDb(
    db: ReturnType<typeof drizzle<typeof schema>>
): Promise<CategoriesResponse> {
    const categories = await db
        .select()
        .from(schema.mediaCategories)
        .orderBy(schema.mediaCategories.display_order);

    const countRows = await db
        .select({
            category_id: schema.mediaCategoryLinks.category_id,
            count: sql<number>`count(*)`,
        })
        .from(schema.mediaCategoryLinks)
        .innerJoin(
            schema.media,
            eq(schema.mediaCategoryLinks.media_id, schema.media.id)
        )
        .where(
            or(
                eq(schema.media.visibility, 'public'),
                sql`${schema.media.visibility} IS NULL`
            )
        )
        .groupBy(schema.mediaCategoryLinks.category_id);

    const countMap = new Map<string, number>();
    for (const row of countRows) {
        countMap.set(row.category_id, row.count || 0);
    }

    const categoriesWithCount: Category[] = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || undefined,
        count: countMap.get(cat.id) || 0,
    }));

    return {
        ok: true,
        categories: categoriesWithCount,
    };
}

// ============ API Fallback ============

async function listMediaFromApi(params: MediaListParams = {}): Promise<MediaListResponse> {
    const baseUrl = getApiBaseUrl();
    // Skip fetch if we can't construct a valid URL
    if (!baseUrl || baseUrl === '/api') {
        console.warn('Cannot fetch media: no valid API base URL available');
        return { ok: false, results: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }

    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set('q', params.q);
    if (params.category) searchParams.set('category', params.category);
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.orientation) searchParams.set('orientation', params.orientation);

    const queryString = searchParams.toString();
    const url = `${baseUrl}/media/list${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

async function fetchCategoriesFromApi(): Promise<CategoriesResponse> {
    const baseUrl = getApiBaseUrl();
    // Skip fetch if we can't construct a valid URL
    if (!baseUrl || baseUrl === '/api') {
        console.warn('Cannot fetch categories: no valid API base URL available');
        return { ok: false, categories: [] };
    }

    const url = `${baseUrl}/media/categories`;

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

// ============ Public API ============

export async function listMedia(
    env: Env,
    params: MediaListParams = {}
): Promise<MediaListResponse> {
    // Use D1 if available
    if (env.DB) {
        const db = drizzle(env.DB, { schema });
        return listMediaFromDb(db, env, params);
    }
    // Fall back to API
    return listMediaFromApi(params);
}

export async function fetchCategories(env: Env): Promise<CategoriesResponse> {
    // Use D1 if available
    if (env.DB) {
        const db = drizzle(env.DB, { schema });
        return fetchCategoriesFromDb(db);
    }
    // Fall back to API
    return fetchCategoriesFromApi();
}
