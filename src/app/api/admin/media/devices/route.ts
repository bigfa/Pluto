/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const cameraRows = await db
            .select({
                make: schema.media.camera_make,
                model: schema.media.camera_model,
                count: sql<number>`count(*)`,
            })
            .from(schema.media)
            .where(sql`${schema.media.camera_model} IS NOT NULL AND ${schema.media.camera_model} != ''`)
            .groupBy(schema.media.camera_make, schema.media.camera_model)
            .orderBy(desc(sql<number>`count(*)`));

        const lensRows = await db
            .select({
                model: schema.media.lens_model,
                count: sql<number>`count(*)`,
            })
            .from(schema.media)
            .where(sql`${schema.media.lens_model} IS NOT NULL AND ${schema.media.lens_model} != ''`)
            .groupBy(schema.media.lens_model)
            .orderBy(desc(sql<number>`count(*)`));

        return NextResponse.json({
            ok: true,
            cameras: cameraRows.map((row: any) => ({
                make: row.make || undefined,
                model: row.model || undefined,
                count: Number(row.count || 0),
            })),
            lenses: lensRows.map((row: any) => ({
                model: row.model || undefined,
                count: Number(row.count || 0),
            })),
        });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
