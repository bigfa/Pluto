/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { getAlbumById, updateAlbum, deleteAlbum } from '@/services/admin/albumServices';
import { resolveMediaUrls } from '@/lib/mediaTransforms';

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
        const data = await getAlbumById(db, schema, id);
        if (!data) return NextResponse.json({ err: 'Not found' }, { status: 404 });

        const cover = data.cover_media?.url
            ? resolveMediaUrls(data.cover_media.url, env, {
                url_thumb: data.cover_media.url_thumb,
                url_medium: data.cover_media.url_medium,
                url_large: data.cover_media.url_large,
            })
            : null;

        const normalized = cover && data.cover_media
            ? {
                ...data,
                cover_media: {
                    ...data.cover_media,
                    url_thumb: cover.url_thumb,
                    url_medium: cover.url_medium,
                    url_large: cover.url_large,
                },
            }
            : data;

        return NextResponse.json({ ok: true, data: normalized });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}

export async function PUT(
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
        const { title, description, cover_media_id, slug, tags, password, status } = body;
        const data = await updateAlbum(db, schema, id, { title, description, cover_media_id, slug, tags, password, status });
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
        await deleteAlbum(db, schema, id);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
