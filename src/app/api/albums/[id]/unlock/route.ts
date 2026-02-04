import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';

interface Params {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const { id: idOrSlug } = await params;
        const env = await getEnv();
        const client = getDb(env);

        if (!client) {
            return NextResponse.json(
                { ok: false, error: 'Database not available' },
                { status: 500 }
            );
        }

        const { db, schema } = client;
        const body = (await request.json().catch(() => ({}))) as { password?: string };
        const password = typeof body.password === 'string' ? body.password : '';

        if (!password) {
            return NextResponse.json(
                { ok: false, error: 'Password required' },
                { status: 400 }
            );
        }

        // Find album by slug or id
        let albumResults = await db
            .select()
            .from(schema.albums)
            .where(eq(schema.albums.slug, idOrSlug))
            .limit(1);

        let album = albumResults[0];

        if (!album) {
            albumResults = await db
                .select()
                .from(schema.albums)
                .where(eq(schema.albums.id, idOrSlug))
                .limit(1);
            album = albumResults[0];
        }

        if (!album) {
            return NextResponse.json(
                { ok: false, error: 'Album not found' },
                { status: 404 }
            );
        }

        // Allow OTP token as password
        const otpMatch = await db
            .select()
            .from(schema.albumOtps)
            .where(and(
                eq(schema.albumOtps.album_id, album.id),
                eq(schema.albumOtps.token, password),
            ))
            .limit(1);

        if (otpMatch[0]) {
            return NextResponse.json({ ok: true, token: password });
        }

        if (!album.password || album.password !== password) {
            return NextResponse.json(
                { ok: false, error: 'INVALID_PASSWORD' },
                { status: 403 }
            );
        }

        const token = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.insert(schema.albumOtps).values({
            id: crypto.randomUUID(),
            album_id: album.id,
            token,
            created_at: now,
        });

        return NextResponse.json({ ok: true, token });
    } catch (error) {
        console.error('Error unlocking album:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to unlock album' },
            { status: 500 }
        );
    }
}
