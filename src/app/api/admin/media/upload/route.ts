import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getEnv } from '@/lib/env';
import { getDb } from '@/db/client';
import { createMediaFromFile } from '@/services/admin/mediaServices';
import type { MediaProvider } from '@/types/admin';

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response!;

    const env = await getEnv();
    const client = getDb(env);
    if (!client) return NextResponse.json({ err: 'Database not available' }, { status: 500 });
    const { db, schema } = client;

    try {
        const formData = await request.formData();
        const files = [
            ...formData.getAll('file'),
            ...formData.getAll('files'),
        ].filter((item): item is File => item instanceof File);
        if (files.length === 0) {
            return NextResponse.json({ err: 'No file provided' }, { status: 400 });
        }

        const provider = (formData.get('provider') as MediaProvider) || undefined;
        const title = (formData.get('title') as string) || undefined;
        const alt = (formData.get('alt') as string) || undefined;
        const folder = (formData.get('folder') as string) || undefined;
        const category_ids = formData.get('category_ids')
            ? String(formData.get('category_ids')).split(',').map(s => s.trim()).filter(Boolean)
            : undefined;
        const tags = formData.get('tags')
            ? String(formData.get('tags')).split(',').map(s => s.trim()).filter(Boolean)
            : undefined;
        const visibility = (formData.get('visibility') as string) || undefined;

        const createdItems = [];
        const duplicates: { name: string; existingId: string; existingUrl: string }[] = [];
        const failures: { name: string; error: string }[] = [];

        for (const file of files) {
            try {
                const created = await createMediaFromFile({
                    env,
                    db,
                    schema,
                    file,
                    provider,
                    title,
                    alt,
                    folder,
                    category_ids,
                    tags,
                    visibility,
                });
                createdItems.push(created);
            } catch (err: unknown) {
                const error = err as Error & { isDuplicate?: boolean; existingMedia?: { id: string; url: string } };
                if (error.isDuplicate && error.existingMedia) {
                    duplicates.push({
                        name: file.name || 'unknown',
                        existingId: error.existingMedia.id,
                        existingUrl: error.existingMedia.url,
                    });
                } else {
                    failures.push({ name: file.name || 'unknown', error: String(err) });
                }
            }
        }

        if (createdItems.length === 0 && duplicates.length === 0) {
            return NextResponse.json(
                { ok: false, failures, successCount: 0, failCount: failures.length },
                { status: 500 },
            );
        }

        return NextResponse.json({
            ok: true,
            data: createdItems,
            successCount: createdItems.length,
            duplicateCount: duplicates.length,
            duplicates: duplicates.length ? duplicates : undefined,
            failCount: failures.length,
            failures: failures.length ? failures : undefined,
        });
    } catch (e) {
        return NextResponse.json({ err: String(e) }, { status: 500 });
    }
}
