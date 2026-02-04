/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, like, and, sql, or, inArray } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import type { Media, MediaListParams } from '@/types/media';
import { resolveMediaUrls } from '@/lib/mediaTransforms';



export async function GET(request: NextRequest) {
    try {
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

        const params: MediaListParams = {
            q: searchParams.get('q') || undefined,
            category: searchParams.get('category') || undefined,
            tag: searchParams.get('tag') || undefined,
            page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
            pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
            sort: (searchParams.get('sort') as 'date' | 'likes') || 'date',
            orientation: (searchParams.get('orientation') as 'landscape' | 'portrait' | 'square') || undefined,
        };

        const { page = 1, pageSize = 20, q, category, tag, sort, orientation } = params;
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

            const mediaIds = categoryLinks.map((l: any) => l.media_id);
            if (mediaIds.length === 0) {
                return NextResponse.json({ ok: true, results: [], total: 0, page, pageSize, totalPages: 0 });
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
                return NextResponse.json({ ok: true, results: [], total: 0, page, pageSize, totalPages: 0 });
            }
            conditions.push(inArray(schema.media.id, mediaIds));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.media)
            .where(whereClause);

        const total = countResult[0]?.count || 0;

        // Get paginated results
        const dateSort = sql`coalesce(${schema.media.datetime_original}, ${schema.media.created_at})`;
        const orderBy = sort === 'likes'
            ? desc(schema.media.likes)
            : desc(dateSort);

        const results = await db
            .select({
                id: schema.media.id,
                url: schema.media.url,
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
            .where(whereClause)
            .orderBy(orderBy)
            .limit(pageSize)
            .offset(offset);

        const mediaIds = results.map((m: any) => m.id);
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

        const isLikedByCookie = (id: string) => {
            const value = request.cookies.get(`media_like_${id}`)?.value;
            return value === '1' || value === 'true';
        };

        const mediaWithDetails: Media[] = results.map((m: any) => {
            const categories = categoriesByMedia.get(m.id) || [];
            const tags = tagsByMedia.get(m.id) || [];
            const urls = resolveMediaUrls(m.url, env, {
                url_thumb: m.url_thumb,
                url_medium: m.url_medium,
                url_large: m.url_large,
            });

            return {
                id: m.id,
                url: m.url,
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
                category_ids: categories.map((c) => c.id),
                tags,
                likes: m.likes || 0,
                liked: isLikedByCookie(m.id),
            } as Media;
        });

        return NextResponse.json({
            ok: true,
            results: mediaWithDetails,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        console.error('Error fetching media:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to fetch media' },
            { status: 500 }
        );
    }
}
