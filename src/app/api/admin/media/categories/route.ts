/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { sql } from 'drizzle-orm';
import { listCategories, createCategory } from '@/services/admin/mediaCategoryServices';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const categories = await listCategories(db, schema);
        const categoriesWithCount = await Promise.all(
            categories.map(async (cat: any) => {
                const result = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.mediaCategoryLinks)
                    .where(sql`${schema.mediaCategoryLinks.category_id} = ${cat.id}`);
                return { ...cat, slug: cat.slug || cat.id, media_count: Number(result[0]?.count ?? 0) };
            })
        );
        return NextResponse.json({ ok: true, categories: categoriesWithCount });
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
        const { name, slug, description, display_order, show_in_frontend } = body;
        const data = await createCategory(db, schema, { name, slug, description, display_order, show_in_frontend });
        return NextResponse.json({ ok: true, data });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
