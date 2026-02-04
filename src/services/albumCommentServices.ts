import { Env } from "@/lib/env";
import { encodeForHTML } from "@/lib/utils";
import { parseCommentMarkdown } from "@/lib/markdown";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, asc, and, count } from "drizzle-orm";

export type AlbumComment = {
    id: string;
    album_id: string;
    author_name: string;
    author_email: string;
    author_url?: string;
    author_ip: string;
    content: string;
    content_html?: string;
    parent_id?: string;
    status: "pending" | "approved";
    created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAlbumComment(row: any): AlbumComment {
    return {
        id: row.comment_id,
        album_id: row.comment_post_id,
        author_name: row.comment_author_name,
        author_email: row.comment_author_email,
        author_url: row.comment_author_url || undefined,
        author_ip: row.comment_author_ip,
        content: row.comment_content,
        content_html: parseCommentMarkdown(row.comment_content),
        parent_id: row.comment_parent || undefined,
        status: row.comment_status as "pending" | "approved",
        created_at: row.comment_date,
    };
}

// Create a new album comment
export async function createAlbumComment(
    env: Env,
    data: {
        album_id: string;
        author_name: string;
        author_email: string;
        author_url?: string;
        author_ip: string;
        content: string;
        parent_id?: string;
        status?: "pending" | "approved";
    }
): Promise<AlbumComment> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const sanitizedName = encodeForHTML(data.author_name);
    const sanitizedUrl = encodeForHTML(data.author_url || "");
    const status = data.status || "pending";
    const db = getDb(env)?.db;

    if (!db) throw new Error("Database not available");

    await db.insert(schema.comments).values({
        comment_id: id,
        comment_post_id: data.album_id,
        comment_author_name: sanitizedName,
        comment_author_email: data.author_email,
        comment_author_url: sanitizedUrl,
        comment_date: now,
        comment_content: data.content,
        comment_parent: data.parent_id || "",
        comment_status: status,
        comment_author_ip: data.author_ip,
        comment_type: 'album'
    });

    return {
        id,
        album_id: data.album_id,
        author_name: sanitizedName,
        author_email: data.author_email,
        author_url: data.author_url || undefined,
        author_ip: data.author_ip,
        content: data.content,
        content_html: parseCommentMarkdown(data.content),
        parent_id: data.parent_id || undefined,
        status,
        created_at: now,
    };
}

// Get comments for an album (only approved for public, all for admin)
export async function getAlbumComments(
    env: Env,
    albumId: string,
    includeAll: boolean = false
): Promise<AlbumComment[]> {
    const db = getDb(env)?.db;
    if (!db) return [];

    const conditions = [
        eq(schema.comments.comment_post_id, albumId),
        eq(schema.comments.comment_type, "album")
    ];

    if (!includeAll) {
        conditions.push(eq(schema.comments.comment_status, "approved"));
    }

    const rows = await db.select()
        .from(schema.comments)
        .where(and(...conditions))
        .orderBy(asc(schema.comments.comment_date));

    return rows.map(rowToAlbumComment);
}

// Get comment count for an album
export async function getAlbumCommentCount(
    env: Env,
    albumId: string,
    onlyApproved: boolean = true
): Promise<number> {
    const db = getDb(env)?.db;
    if (!db) return 0;

    const conditions = [
        eq(schema.comments.comment_post_id, albumId),
        eq(schema.comments.comment_type, "album")
    ];

    if (onlyApproved) {
        conditions.push(eq(schema.comments.comment_status, "approved"));
    }

    const res = await db.select({ count: count() })
        .from(schema.comments)
        .where(and(...conditions));

    return Number(res[0]?.count || 0);
}

// Delete an album comment
export async function deleteAlbumComment(
    env: Env,
    commentId: string
): Promise<boolean> {
    const db = getDb(env)?.db;
    if (!db) return false;

    // Delete child comments first
    await db.delete(schema.comments)
        .where(and(
            eq(schema.comments.comment_parent, commentId),
            eq(schema.comments.comment_type, "album")
        ));

    // Delete the comment
    const result = await db.delete(schema.comments)
        .where(and(
            eq(schema.comments.comment_id, commentId),
            eq(schema.comments.comment_type, "album")
        ))
        .returning({ id: schema.comments.comment_id });

    return Array.isArray(result) ? result.length > 0 : !!result;
}

// Approve a pending comment
export async function approveAlbumComment(
    env: Env,
    commentId: string
): Promise<boolean> {
    const db = getDb(env)?.db;
    if (!db) return false;

    const result = await db.update(schema.comments)
        .set({ comment_status: 'approved' })
        .where(and(
            eq(schema.comments.comment_id, commentId),
            eq(schema.comments.comment_type, 'album')
        ))
        .returning({ id: schema.comments.comment_id });

    return Array.isArray(result) ? result.length > 0 : !!result;
}
