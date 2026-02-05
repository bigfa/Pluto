/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin Media Category Services - CRUD for media categories
 *
 * Ported from hugo-cf-work admin category services.
 * All functions take (db, schema, ...) parameters.
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

/**
 * Create a new media category.
 */
export async function createCategory(
    db: any,
    schema: any,
    data: CategoryData,
): Promise<CategoryRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = data.slug?.trim() || slugify(data.name) || id;

    await db.insert(schema.mediaCategories).values({
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
        .from(schema.mediaCategories)
        .where(eq(schema.mediaCategories.id, id))
        .limit(1);

    return rows[0];
}

/**
 * List all media categories ordered by display_order then name.
 */
export async function listCategories(
    db: any,
    schema: any,
): Promise<CategoryRow[]> {
    const rows = await db
        .select()
        .from(schema.mediaCategories)
        .orderBy(asc(schema.mediaCategories.display_order), asc(schema.mediaCategories.name));

    return rows;
}

/**
 * Get a single category by ID.
 */
export async function getCategoryById(
    db: any,
    schema: any,
    id: string,
): Promise<CategoryRow | null> {
    const rows = await db
        .select()
        .from(schema.mediaCategories)
        .where(eq(schema.mediaCategories.id, id))
        .limit(1);

    return rows[0] || null;
}

/**
 * Update a category (partial update).
 */
export async function updateCategory(
    db: any,
    schema: any,
    id: string,
    patch: CategoryPatch,
): Promise<CategoryRow | null> {
    const existing = await getCategoryById(db, schema, id);
    if (!existing) return null;

    const updateData: any = {};
    if (patch.name !== undefined) {
        updateData.name = patch.name;
        // Auto-update slug if name changes and no explicit slug given
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
            .update(schema.mediaCategories)
            .set(updateData)
            .where(eq(schema.mediaCategories.id, id));
    }

    return getCategoryById(db, schema, id);
}

/**
 * Delete a category by ID.
 */
export async function deleteCategory(
    db: any,
    schema: any,
    id: string,
): Promise<boolean> {
    const existing = await getCategoryById(db, schema, id);
    if (!existing) return false;

    // Remove category links first
    await db
        .delete(schema.mediaCategoryLinks)
        .where(eq(schema.mediaCategoryLinks.category_id, id));

    // Delete the category
    await db
        .delete(schema.mediaCategories)
        .where(eq(schema.mediaCategories.id, id));

    return true;
}
