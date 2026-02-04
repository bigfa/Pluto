/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin Album Comment Services
 *
 * Ported from hugo-cf-work albumCommentServices.
 * All functions take (db, schema, ...) parameters.
 */

import { eq, desc, and, count } from 'drizzle-orm';

export type AlbumComment = {
    id: string;
    album_id: string;
    author_name: string;
    author_email: string;
    author_url?: string;
    author_ip: string;
    content: string;
    parent_id?: string;
    status: 'pending' | 'approved';
    created_at: string;
};

function rowToAlbumComment(row: any): AlbumComment {
    return {
        id: row.comment_id,
        album_id: row.comment_post_id,
        author_name: row.comment_author_name,
        author_email: row.comment_author_email,
        author_url: row.comment_author_url || undefined,
        author_ip: row.comment_author_ip,
        content: row.comment_content,
        parent_id: row.comment_parent || undefined,
        status: row.comment_status as 'pending' | 'approved',
        created_at: row.comment_date,
    };
}

/**
 * List all album comments for admin with pagination and optional status filter.
 */
export async function listAlbumComments(
    db: any,
    schema: any,
    opts: {
        status?: 'pending' | 'approved' | 'all';
        page?: number;
        pageSize?: number;
    } = {},
): Promise<{
    results: AlbumComment[];
    total: number;
    page: number;
    pageSize: number;
}> {
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize || 20)));
    const page = Math.max(1, Number(opts.page || 1));
    const offset = (page - 1) * pageSize;

    const conditions = [eq(schema.comments.comment_type, 'album')];

    if (opts.status && opts.status !== 'all') {
        conditions.push(eq(schema.comments.comment_status, opts.status));
    }

    const whereClause = and(...conditions);

    const totalRes = await db
        .select({ total: count() })
        .from(schema.comments)
        .where(whereClause);
    const total = Number(totalRes[0]?.total || 0);

    const rows = await db
        .select()
        .from(schema.comments)
        .where(whereClause)
        .orderBy(desc(schema.comments.comment_date))
        .limit(pageSize)
        .offset(offset);

    return {
        results: rows.map(rowToAlbumComment),
        total,
        page,
        pageSize,
    };
}

/**
 * Approve an album comment.
 */
export async function approveAlbumComment(
    db: any,
    schema: any,
    commentId: string,
): Promise<boolean> {
    const result = await db
        .update(schema.comments)
        .set({ comment_status: 'approved' })
        .where(
            and(
                eq(schema.comments.comment_id, commentId),
                eq(schema.comments.comment_type, 'album'),
            ),
        )
        .returning({ id: schema.comments.comment_id });

    return Array.isArray(result) ? result.length > 0 : (result?.meta?.changes ?? 0) > 0;
}

/**
 * Delete an album comment and its child comments.
 */
export async function deleteAlbumComment(
    db: any,
    schema: any,
    commentId: string,
): Promise<boolean> {
    // Delete child comments first
    await db
        .delete(schema.comments)
        .where(
            and(
                eq(schema.comments.comment_parent, commentId),
                eq(schema.comments.comment_type, 'album'),
            ),
        );

    // Delete the comment
    const result = await db
        .delete(schema.comments)
        .where(
            and(
                eq(schema.comments.comment_id, commentId),
                eq(schema.comments.comment_type, 'album'),
            ),
        )
        .returning({ id: schema.comments.comment_id });

    return Array.isArray(result) ? result.length > 0 : (result?.meta?.changes ?? 0) > 0;
}
