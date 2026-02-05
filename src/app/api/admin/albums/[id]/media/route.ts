/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { getAlbumMedia, addMediaToAlbum, removeMediaFromAlbum } from '@/services/admin/albumServices';
import { resolveMediaOutputUrls } from '@/lib/mediaTransforms';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
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

        const data = await getAlbumMedia(db, schema, id, { page, pageSize });
        const requestOrigin = new URL(request.url).origin;
        const media = data.media.map((item) => {
            const urls = resolveMediaOutputUrls(env, {
                url: item.url,
                provider: item.provider,
                object_key: item.object_key,
            }, requestOrigin);
            return {
                ...item,
                url: urls.url || item.url,
                url_thumb: urls.url_thumb,
                url_medium: urls.url_medium,
                url_large: urls.url_large,
            };
        });
        return NextResponse.json({ ok: true, ...data, media });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const body: any = await request.json();
        const mediaIds: string[] = body.media_ids || [];
        const data = await addMediaToAlbum(db, schema, id, mediaIds);
        return NextResponse.json({ ok: true, data });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const body: any = await request.json();
        const mediaIds: string[] = body.media_ids || [];
        await removeMediaFromAlbum(db, schema, id, mediaIds);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
