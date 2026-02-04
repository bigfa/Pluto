/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { listAlbums, createAlbum } from '@/services/admin/albumServices';
import { resolveMediaUrls } from '@/lib/mediaTransforms';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page')) || 1;
        const pageSize = Number(url.searchParams.get('pageSize')) || 20;
        const q = url.searchParams.get('q') || undefined;
        const data = await listAlbums(db, schema, { page, pageSize, search: q, includeDrafts: true });
        const albums = data.albums.map((album: any) => {
            if (!album.cover_media?.url) return album;
            const urls = resolveMediaUrls(album.cover_media.url, env, {
                url_thumb: album.cover_media.url_thumb,
                url_medium: album.cover_media.url_medium,
                url_large: album.cover_media.url_large,
            });
            return {
                ...album,
                cover_media: {
                    ...album.cover_media,
                    url_thumb: urls.url_thumb,
                    url_medium: urls.url_medium,
                    url_large: urls.url_large,
                },
            };
        });
        return NextResponse.json({ ok: true, ...data, albums });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const body: any = await request.json();
        const { title, description, cover_media_id, slug, tags, password, status } = body;
        const data = await createAlbum(db, schema, { title, description, cover_media_id, slug, tags, password, status });
        return NextResponse.json({ ok: true, data });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
