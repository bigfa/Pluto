import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Media
export const media = sqliteTable("media", {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    object_key: text("object_key").notNull(),
    url: text("url").notNull(),
    url_thumb: text("url_thumb"),
    url_medium: text("url_medium"),
    url_large: text("url_large"),
    filename: text("filename"),
    mime: text("mime"),
    size: integer("size"),
    width: integer("width"),
    height: integer("height"),
    title: text("title"),
    alt: text("alt"),
    exif_json: text("exif_json"),
    camera_make: text("camera_make"),
    camera_model: text("camera_model"),
    lens_model: text("lens_model"),
    aperture: text("aperture"),
    shutter_speed: text("shutter_speed"),
    iso: text("iso"),
    focal_length: text("focal_length"),
    datetime_original: text("datetime_original"),
    gps_lat: real("gps_lat"),
    gps_lon: real("gps_lon"),
    location_name: text("location_name"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
    likes: integer("likes"),
    visibility: text("visibility"),
});

// Media Categories
export const mediaCategories = sqliteTable("media_categories", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    display_order: integer("display_order"),
    show_in_frontend: integer("show_in_frontend").notNull().default(1),
    created_at: text("created_at").notNull(),
});

// Media Category Links
export const mediaCategoryLinks = sqliteTable("media_category_links", {
    media_id: text("media_id").notNull(),
    category_id: text("category_id").notNull(),
});

// Media Tags
export const mediaTags = sqliteTable("media_tags", {
    media_id: text("media_id").notNull(),
    tag: text("tag").notNull(),
});

// Albums
export const albums = sqliteTable("albums", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    cover_media_id: text("cover_media_id"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
    media_count: integer("media_count"),
    view_count: integer("view_count"),
    likes: integer("likes"),
    slug: text("slug"),
    password: text("password"),
    status: text("status"),
});

// Album Tags
export const albumTags = sqliteTable("album_tags", {
    album_id: text("album_id").notNull(),
    tag: text("tag").notNull(),
});

// Album Media
export const albumMedia = sqliteTable("album_media", {
    album_id: text("album_id").notNull(),
    media_id: text("media_id").notNull(),
    display_order: integer("display_order"),
    created_at: text("created_at").notNull(),
});

// Album OTPs
export const albumOtps = sqliteTable("album_otps", {
    id: text("id").primaryKey(),
    album_id: text("album_id").notNull(),
    token: text("token").notNull(),
    created_at: text("created_at").notNull(),
});

// Comments (for albums)
export const comments = sqliteTable("comments", {
    comment_id: text("comment_id").primaryKey(),
    comment_post_id: text("comment_post_id"),
    comment_author_name: text("comment_author_name"),
    comment_author_email: text("comment_author_email"),
    comment_author_url: text("comment_author_url"),
    comment_author_ip: text("comment_author_ip"),
    comment_date: text("comment_date"),
    comment_content: text("comment_content"),
    comment_parent: text("comment_parent"),
    comment_likes: integer("comment_likes"),
    comment_dislikes: integer("comment_dislikes"),
    comment_status: text("comment_status"),
    comment_type: text("comment_type"),
});

// Subscribers
export const subscribers = sqliteTable("subscribers", {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    token: text("token").notNull(),
    status: text("status").notNull(), // 'active' | 'unsubscribed' | 'pending'
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
});
export type SubscribersTable = typeof subscribers.$inferSelect;

// Newsletters
export const newsletters = sqliteTable("newsletters", {
    id: text("id").primaryKey(),
    subject: text("subject").notNull(),
    content: text("content").notNull(),
    type: text("type").notNull(), // 'album_new' | 'general'
    recipients_count: integer("recipients_count"),
    status: text("status").notNull(), // 'draft' | 'sending' | 'sent' | 'failed'
    created_at: text("created_at").notNull(),
    sent_at: text("sent_at"),
});
export type NewslettersTable = typeof newsletters.$inferSelect;
