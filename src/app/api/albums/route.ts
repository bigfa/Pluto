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

        const coverIds = results
            .map((album: any) => album.cover_media_id)
            .filter((id: string | null) => !!id) as string[];

        const coverMap = new Map<string, { id: string; url: string; url_medium?: string; url_thumb?: string }>();
        if (coverIds.length > 0) {
            const coverRows = await db
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
                .where(inArray(schema.media.id, coverIds));

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
