/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sql, eq, or } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import type { Category } from "@/types/media";

export async function GET() {
    try {
        const env = await getEnv();
        const client = getDb(env);

        if (!client) {
            return NextResponse.json(
                { ok: false, error: "Database not available" },
                { status: 500 },
            );
        }

        const { db, schema } = client;

        const categories = await db
            .select()
            .from(schema.mediaCategories)
            .where(
                or(
                    eq(schema.mediaCategories.show_in_frontend, 1),
                    sql`${schema.mediaCategories.show_in_frontend} IS NULL`
                )
            )
            .orderBy(schema.mediaCategories.display_order);

        const countRows = await db
            .select({
                category_id: schema.mediaCategoryLinks.category_id,
                count: sql<number>`count(*)`,
            })
            .from(schema.mediaCategoryLinks)
            .groupBy(schema.mediaCategoryLinks.category_id);

        const countMap = new Map<string, number>();
        for (const row of countRows) {
            countMap.set(row.category_id, row.count || 0);
        }

        const categoriesWithCount: Category[] = categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug || cat.id,
            description: cat.description || undefined,
            media_count: countMap.get(cat.id) || 0,
        }));

        return NextResponse.json({
            ok: true,
            categories: categoriesWithCount,
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json(
            { ok: false, error: "Failed to fetch categories" },
            { status: 500 },
        );
    }
}
