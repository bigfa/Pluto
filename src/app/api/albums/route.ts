/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, like, and, sql, or, inArray } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import type { Album } from '@/types/album';
import { resolveMediaOutputUrls } from '@/lib/mediaTransforms';



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

        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20;
        const q = searchParams.get('q') || undefined;
        const category = searchParams.get('category') || undefined;
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
            sql`${schema.albumCategories.show_in_frontend} IS NULL`
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

            const albumIds = categoryLinks.map((l: any) => l.album_id);
            if (albumIds.length === 0) {
                return NextResponse.json({ ok: true, albums: [], total: 0, totalPages: 0 });
            }
            conditions.push(inArray(schema.albums.id, albumIds));
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

        const albumIds = results.map((album: any) => album.id);
        const coverIds = results
            .map((album: any) => album.cover_media_id)
            .filter((id: string | null) => !!id) as string[];

        const coverMap = new Map<string, { id: string; url: string; url_medium?: string; url_thumb?: string }>();
        const categoriesByAlbum = new Map<string, { id: string; name: string; slug: string }[]>();
        if (albumIds.length > 0) {
            const [coverRows, categoryRows] = await Promise.all([
                coverIds.length > 0
                    ? db
                        .select({
                            id: schema.media.id,
                            url: schema.media.url,
                            provider: schema.media.provider,
                            object_key: schema.media.object_key,
                            url_thumb: schema.media.url_thumb,
                            url_medium: schema.media.url_medium,
                            url_large: schema.media.url_large,
                        })
                        .from(schema.media)
                        .where(inArray(schema.media.id, coverIds))
                    : Promise.resolve([]),
                db
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
                    ),
            ]);

            const requestOrigin = new URL(request.url).origin;
            for (const row of coverRows) {
                const urls = resolveMediaOutputUrls(env, {
                    url: row.url,
                    provider: row.provider,
                    object_key: row.object_key,
                }, requestOrigin);
                coverMap.set(row.id, {
                    id: row.id,
                    url: urls.url || row.url,
                    url_medium: urls.url_medium || undefined,
                    url_thumb: urls.url_thumb || undefined,
                });
            }

            for (const row of categoryRows) {
                const list = categoriesByAlbum.get(row.album_id) || [];
                list.push({ id: row.id, name: row.name, slug: row.slug || row.id });
                categoriesByAlbum.set(row.album_id, list);
            }
        }

        const albumsWithDetails: Album[] = results.map((album: any) => {
            const cover_media = album.cover_media_id
                ? coverMap.get(album.cover_media_id) || undefined
                : undefined;

            return {
                id: album.id,
                title: album.title,
                description: album.description || '',
                cover_media_id: album.cover_media_id || '',
                cover_media,
                created_at: album.created_at,
                updated_at: album.updated_at,
                media_count: album.media_count || 0,
                views: album.view_count || 0,
                likes: album.likes || 0,
                slug: album.slug || undefined,
                is_protected: !!album.password,
                categories: categoriesByAlbum.get(album.id) || [],
                category_ids: (categoriesByAlbum.get(album.id) || []).map((c) => c.id),
            } as Album;
        });

        return NextResponse.json({
            ok: true,
            albums: albumsWithDetails,
            total,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        console.error('Error fetching albums:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to fetch albums' },
            { status: 500 }
        );
    }
}
