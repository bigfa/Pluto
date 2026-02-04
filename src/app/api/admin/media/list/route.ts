import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { listMedia } from '@/services/admin/mediaServices';
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
        const q = url.searchParams.get('q') || undefined;
        const category = url.searchParams.get('category') || undefined;
        const tag = url.searchParams.get('tag') || undefined;
        const page = Number(url.searchParams.get('page')) || 1;
        const pageSize = Number(url.searchParams.get('pageSize')) || 20;

        const data = await listMedia(db, schema, { q, category, tag, page, pageSize });
        const results = data.results.map((item) => {
            const urls = resolveMediaUrls(item.url, env, {
                url_thumb: item.url_thumb,
                url_medium: item.url_medium,
                url_large: item.url_large,
            });
            return {
                ...item,
                url_thumb: urls.url_thumb,
                url_medium: urls.url_medium,
                url_large: urls.url_large,
            };
        });
        return NextResponse.json({ ok: true, ...data, results });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
