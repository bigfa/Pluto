/* eslint-disable @typescript-eslint/no-explicit-any */
import RSS from 'rss';
import { desc, eq, or, sql } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { fetchAlbums, fetchAlbumMedia } from '@/lib/api';
import { resolveMediaOutputUrls } from '@/lib/mediaTransforms';

interface FeedAlbum {
    id: string;
    title: string;
    description: string;
    slug?: string;
    created_at: string;
    media: { url: string; alt?: string; filename?: string }[];
}

async function getAlbumsFromDb(): Promise<FeedAlbum[] | null> {
    try {
        const env = await getEnv();
        const client = getDb(env);
        if (!client) return null;

        const { db, schema } = client;

        const albums = await db
            .select()
            .from(schema.albums)
            .where(
                or(
                    eq(schema.albums.status, 'published'),
                    sql`${schema.albums.status} IS NULL`
                )
            )
            .orderBy(desc(schema.albums.created_at))
            .limit(20);

        const albumsWithMedia: FeedAlbum[] = await Promise.all(
            albums.map(async (album: any) => {
                const albumMediaLinks = await db
                    .select()
                    .from(schema.albumMedia)
                    .where(eq(schema.albumMedia.album_id, album.id))
                    .orderBy(schema.albumMedia.display_order)
                    .limit(5);

                const media = await Promise.all(
                    albumMediaLinks.map(async (link: any) => {
                        const results = await db
                            .select({
                                url: schema.media.url,
                                provider: schema.media.provider,
                                object_key: schema.media.object_key,
                                alt: schema.media.alt,
                                filename: schema.media.filename,
                            })
                            .from(schema.media)
                            .where(eq(schema.media.id, link.media_id))
                            .limit(1);
                        if (!results[0]) return null;
                        const urls = resolveMediaOutputUrls(env, {
                            url: results[0].url,
                            provider: results[0].provider,
                            object_key: results[0].object_key,
                        });
                        return {
                            url: urls.url || results[0].url,
                            alt: results[0].alt,
                            filename: results[0].filename,
                        };
                    })
                ).then(results => results.filter(Boolean));

                return {
                    id: album.id,
                    title: album.title,
                    description: album.description || '',
                    slug: album.slug || undefined,
                    created_at: album.created_at,
                    media,
                };
            })
        );

        return albumsWithMedia;
    } catch (e) {
        console.error('Failed to fetch albums from database for feed:', e);
        return null;
    }
}

async function getAlbumsFromApi(): Promise<FeedAlbum[]> {
    const { albums } = await fetchAlbums({ pageSize: 20 });

    return Promise.all(
        albums.map(async (album) => {
            try {
                const { media } = await fetchAlbumMedia(album.id, { pageSize: 5 });
                return {
                    id: album.id,
                    title: album.title,
                    description: album.description || '',
                    slug: album.slug || undefined,
                    created_at: album.created_at,
                    media: media.map(m => ({ url: m.url, alt: m.alt, filename: m.filename })),
                };
            } catch (err) {
                console.error(`Failed to fetch media for album ${album.id}:`, err);
                return {
                    id: album.id,
                    title: album.title,
                    description: album.description || '',
                    slug: album.slug || undefined,
                    created_at: album.created_at,
                    media: [],
                };
            }
        })
    );
}

export async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://p.wpista.com';

    const feed = new RSS({
        title: 'Photos Albums',
        description: 'New albums from Photos',
        feed_url: `${baseUrl}/feed.xml`,
        site_url: baseUrl,
        language: 'en',
    });

    try {
        // Try database first, fall back to API
        const albumsWithMedia = await getAlbumsFromDb() ?? await getAlbumsFromApi();

        albumsWithMedia.forEach(album => {
            let description = album.description || '';

            if (album.media && album.media.length > 0) {
                const imagesHtml = album.media
                    .map(m => `<img src="${m.url}" alt="${m.alt || m.filename}" style="max-width: 100%; height: auto; margin-bottom: 10px;" /><br/>`)
                    .join('');

                description += `<br/><br/>${imagesHtml}`;
            }

            feed.item({
                title: album.title,
                description: description,
                url: `${baseUrl}/albums/${album.slug || album.id}`,
                guid: album.id,
                date: album.created_at,
            });
        });

        return new Response(feed.xml({ indent: true }), {
            headers: {
                'Content-Type': 'application/xml',
            },
        });
    } catch (error) {
        console.error('Failed to generate RSS feed:', error);
        return new Response('Failed to generate RSS feed', { status: 500 });
    }
}
