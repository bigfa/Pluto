/**
 * Category Services - D1 Implementation
 * 
 * Direct database access for Cloudflare D1.
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, sql, or } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { CategoriesResponse, Category } from '@/types/media';
import { getApiBaseUrl } from '@/lib/utils';

interface Env {
    DB?: D1Database;
}

export interface CategoryDetailResponse {
    ok: boolean;
    category?: Category;
    error?: string;
}

// ============ D1 Database Implementation ============

async function listCategoriesFromDb(
    db: ReturnType<typeof drizzle<typeof schema>>
): Promise<CategoriesResponse> {
    const categories = await db
        .select()
        .from(schema.mediaCategories)
        .orderBy(schema.mediaCategories.display_order);

    // Get media count for each category (only public media)
    const categoriesWithCount: Category[] = await Promise.all(
        categories.map(async (cat) => {
            const countResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(schema.mediaCategoryLinks)
                .innerJoin(
                    schema.media,
                    eq(schema.mediaCategoryLinks.media_id, schema.media.id)
                )
                .where(
                    sql`${schema.mediaCategoryLinks.category_id} = ${cat.id} 
                    AND (${schema.media.visibility} = 'public' OR ${schema.media.visibility} IS NULL)`
                );

            return {
                id: cat.id,
                name: cat.name,
                slug: cat.slug || cat.id,
                description: cat.description || undefined,
                media_count: countResult[0]?.count || 0,
            };
        })
    );

    return {
        ok: true,
        categories: categoriesWithCount,
    };
}

async function getCategoryBySlugFromDb(
    db: ReturnType<typeof drizzle<typeof schema>>,
    slug: string
): Promise<CategoryDetailResponse> {
    const categories = await db
        .select()
        .from(schema.mediaCategories)
        .where(or(eq(schema.mediaCategories.slug, slug), eq(schema.mediaCategories.id, slug)))
        .limit(1);

    if (categories.length === 0) {
        return { ok: false, error: 'Category not found' };
    }

    const cat = categories[0];

    // Get media count for this category (only public media)
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.mediaCategoryLinks)
        .innerJoin(
            schema.media,
            eq(schema.mediaCategoryLinks.media_id, schema.media.id)
        )
        .where(
            sql`${schema.mediaCategoryLinks.category_id} = ${cat.id}
            AND (${schema.media.visibility} = 'public' OR ${schema.media.visibility} IS NULL)`
        );

    return {
        ok: true,
        category: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug || cat.id,
            description: cat.description || undefined,
            media_count: countResult[0]?.count || 0,
        },
    };
}

// ============ API Fallback ============

async function listCategoriesFromApi(): Promise<CategoriesResponse> {
    const baseUrl = getApiBaseUrl();
    // Skip fetch if we can't construct a valid URL (e.g., in Workers without proper env)
    if (!baseUrl || baseUrl === '/api') {
        console.warn('Cannot fetch categories: no valid API base URL available');
        return { ok: false, categories: [] };
    }

    const url = `${baseUrl}/media/categories`;

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

// ============ Public API ============

export async function listCategories(env: Env): Promise<CategoriesResponse> {
    if (env.DB) {
        const db = drizzle(env.DB, { schema });
        return listCategoriesFromDb(db);
    }
    return listCategoriesFromApi();
}

export async function getCategoryBySlug(env: Env, slug: string): Promise<CategoryDetailResponse> {
    if (env.DB) {
        const db = drizzle(env.DB, { schema });
        return getCategoryBySlugFromDb(db, slug);
    }
    // API fallback: fetch all categories and find by slug
    const response = await listCategoriesFromApi();
    if (!response.ok) {
        return { ok: false, error: 'Failed to fetch categories' };
    }
    const category = response.categories.find(c => c.slug === slug || c.id === slug);
    if (!category) {
        return { ok: false, error: 'Category not found' };
    }
    return { ok: true, category };
}
