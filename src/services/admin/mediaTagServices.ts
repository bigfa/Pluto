/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin Media Tag Services - Tag aggregation
 *
 * Ported from hugo-cf-work admin tag services.
 * All functions take (db, schema, ...) parameters.
 */

import { sql, desc } from 'drizzle-orm';

/**
 * List all unique media tags with their usage count.
 * Returns tags sorted by count descending.
 */
export async function listAllMediaTags(
    db: any,
    schema: any,
): Promise<{ tag: string; count: number }[]> {
    const rows = await db
        .select({
            tag: schema.mediaTags.tag,
            count: sql<number>`count(*)`.as('count'),
        })
        .from(schema.mediaTags)
        .groupBy(schema.mediaTags.tag)
        .orderBy(desc(sql`count(*)`));

    return rows.map((r: any) => ({
        tag: r.tag,
        count: Number(r.count),
    }));
}
