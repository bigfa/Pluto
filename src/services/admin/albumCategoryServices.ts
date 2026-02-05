/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin Album Category Services - CRUD for album categories
 */

import { eq, asc } from 'drizzle-orm';

// ---- Helpers ----

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ---- Types ----

interface CategoryData {
    name: string;
    slug?: string;
    description?: string;
    display_order?: number;
    show_in_frontend?: boolean;
}

interface CategoryPatch {
    name?: string;
    slug?: string;
    description?: string;
    display_order?: number;
    show_in_frontend?: boolean;
}

interface CategoryRow {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    display_order: number | null;
    show_in_frontend: number | null;
    created_at: string;
}

// ---- Public API ----

export async function createAlbumCategory(
    db: any,
    schema: any,
    data: CategoryData,
): Promise<CategoryRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = data.slug?.trim() || slugify(data.name) || id;

    await db.insert(schema.albumCategories).values({
        id,
        name: data.name,
        slug,
        description: data.description || null,
        display_order: data.display_order ?? 0,
        show_in_frontend: data.show_in_frontend === undefined ? 1 : data.show_in_frontend ? 1 : 0,
        created_at: now,
    });

    const rows = await db
        .select()
        .from(schema.albumCategories)
        .where(eq(schema.albumCategories.id, id))
        .limit(1);

    return rows[0];
}

export async function listAlbumCategories(
    db: any,
    schema: any,
): Promise<CategoryRow[]> {
    const rows = await db
        .select()
        .from(schema.albumCategories)
        .orderBy(asc(schema.albumCategories.display_order), asc(schema.albumCategories.name));

    return rows;
}

export async function getAlbumCategoryById(
    db: any,
    schema: any,
    id: string,
): Promise<CategoryRow | null> {
    const rows = await db
        .select()
        .from(schema.albumCategories)
        .where(eq(schema.albumCategories.id, id))
        .limit(1);

    return rows[0] || null;
}

export async function updateAlbumCategory(
    db: any,
    schema: any,
    id: string,
    patch: CategoryPatch,
): Promise<CategoryRow | null> {
    const existing = await getAlbumCategoryById(db, schema, id);
    if (!existing) return null;

    const updateData: any = {};
    if (patch.name !== undefined) {
        updateData.name = patch.name;
        if (patch.slug === undefined) {
            const generated = slugify(patch.name);
            updateData.slug = generated || existing.slug || existing.id;
        }
    }
    if (patch.slug !== undefined) {
        const normalized = patch.slug.trim();
        updateData.slug = normalized || existing.slug || existing.id;
    }
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.display_order !== undefined) updateData.display_order = patch.display_order;
    if (patch.show_in_frontend !== undefined) {
        updateData.show_in_frontend = patch.show_in_frontend ? 1 : 0;
    }

    if (Object.keys(updateData).length > 0) {
        await db
            .update(schema.albumCategories)
            .set(updateData)
            .where(eq(schema.albumCategories.id, id));
    }

    return getAlbumCategoryById(db, schema, id);
}

export async function deleteAlbumCategory(
    db: any,
    schema: any,
    id: string,
): Promise<boolean> {
    const existing = await getAlbumCategoryById(db, schema, id);
    if (!existing) return false;

    await db
        .delete(schema.albumCategoryLinks)
        .where(eq(schema.albumCategoryLinks.category_id, id));

    await db
        .delete(schema.albumCategories)
        .where(eq(schema.albumCategories.id, id));

    return true;
}
