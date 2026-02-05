/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { getMediaById, updateMedia, deleteMedia } from '@/services/admin/mediaServices';
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
        const data = await getMediaById(db, schema, id);
        if (!data) return NextResponse.json({ err: 'Not found' }, { status: 404 });
        const requestOrigin = new URL(request.url).origin;
        const urls = resolveMediaOutputUrls(env, {
            url: data.url,
            provider: data.provider,
            object_key: data.object_key,
        }, requestOrigin);
        return NextResponse.json({
            ok: true,
            data: {
                ...data,
                url: urls.url || data.url,
                url_thumb: urls.url_thumb,
                url_medium: urls.url_medium,
                url_large: urls.url_large,
            },
        });
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
        const { title, alt, category_ids, tags, visibility } = body;
        const data = await updateMedia(db, schema, id, { title, alt, category_ids, tags, visibility });
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
        await deleteMedia(db, schema, id);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
