/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and, or, sql } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { resolveMediaOutputUrls } from '@/lib/mediaTransforms';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const env = await getEnv();
        const client = getDb(env);
        if (!client) {
            return NextResponse.json({ err: 'Database not available' }, { status: 500 });
        }
        const { db, schema } = client;

        // Fetch media with visibility filter (public or null)
        const rows = await db
            .select()
            .from(schema.media)
            .where(
                and(
                    eq(schema.media.id, id),
                    or(
                        eq(schema.media.visibility, 'public'),
                        sql`${schema.media.visibility} IS NULL`
                    )
                )
            )
            .limit(1);

        if (!rows[0]) {
            return NextResponse.json({ err: 'Not found' }, { status: 404 });
        }

        const row = rows[0];

        // Fetch tags and categories
        const [tagRows, categoryRows] = await Promise.all([
            db
                .select({ tag: schema.mediaTags.tag })
                .from(schema.mediaTags)
                .where(eq(schema.mediaTags.media_id, id)),
            db
                .select({
                    id: schema.mediaCategories.id,
                    name: schema.mediaCategories.name,
                    slug: schema.mediaCategories.slug,
                })
                .from(schema.mediaCategoryLinks)
                .innerJoin(
                    schema.mediaCategories,
                    eq(schema.mediaCategoryLinks.category_id, schema.mediaCategories.id)
                )
                .where(eq(schema.mediaCategoryLinks.media_id, id)),
        ]);

        const tags = tagRows.map((r: any) => r.tag);
        const categories = categoryRows.map((r: any) => ({
            id: r.id,
            name: r.name,
            slug: r.slug || r.id,
        }));

        // Check liked status from cookie
        const likedCookieValue = request.cookies.get(`media_like_${id}`)?.value;
        const liked = likedCookieValue === '1' || likedCookieValue === 'true';

        // Resolve URLs
        const requestOrigin = new URL(request.url).origin;
        const urls = resolveMediaOutputUrls(env, {
            url: row.url,
            provider: row.provider,
            object_key: row.object_key,
        }, requestOrigin);

        const data = {
            id: row.id,
            url: urls.url || row.url,
            url_thumb: urls.url_thumb,
            url_medium: urls.url_medium,
            url_large: urls.url_large,
            filename: row.filename || '',
            title: row.title || undefined,
            alt: row.alt || row.filename || '',
            mime_type: row.mime || undefined,
            size: row.size || 0,
            width: row.width ?? null,
            height: row.height ?? null,
            exif_json: row.exif_json || undefined,
            camera_make: row.camera_make ?? null,
            camera_model: row.camera_model ?? null,
            lens_model: row.lens_model ?? null,
            aperture: row.aperture ?? null,
            shutter_speed: row.shutter_speed ?? null,
            iso: row.iso ?? null,
            focal_length: row.focal_length ?? null,
            datetime_original: row.datetime_original ?? null,
            gps_lat: row.gps_lat ?? null,
            gps_lon: row.gps_lon ?? null,
            location_name: row.location_name ?? null,
            categories,
            category_ids: categories.map((c: any) => c.id),
            tags,
            likes: row.likes || 0,
            view_count: row.view_count || 0,
            liked,
            created_at: row.created_at,
            updated_at: row.updated_at || undefined,
        };

        return NextResponse.json({ ok: true, data });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
