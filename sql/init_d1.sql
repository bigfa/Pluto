-- ============================================
-- Cloudflare D1 (SQLite) Database Init Script
-- ============================================
-- Usage:
--   npx wrangler d1 execute <DB_NAME> --file=sql/init_d1.sql
--   or via D1 Console
-- ============================================

-- Media: core table for all photos/videos
CREATE TABLE IF NOT EXISTS `media` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `provider` TEXT NOT NULL,
    `object_key` TEXT NOT NULL,
    `url` TEXT NOT NULL,
    `url_thumb` TEXT,
    `url_medium` TEXT,
    `url_large` TEXT,
    `filename` TEXT,
    `mime` TEXT,
    `size` INTEGER,
    `width` INTEGER,
    `height` INTEGER,
    `title` TEXT,
    `alt` TEXT,
    `exif_json` TEXT,
    `camera_make` TEXT,
    `camera_model` TEXT,
    `lens_model` TEXT,
    `aperture` TEXT,
    `shutter_speed` TEXT,
    `iso` TEXT,
    `focal_length` TEXT,
    `datetime_original` TEXT,
    `gps_lat` REAL,
    `gps_lon` REAL,
    `location_name` TEXT,
    `created_at` TEXT NOT NULL,
    `updated_at` TEXT NOT NULL,
    `likes` INTEGER,
    `visibility` TEXT
);

-- Media Categories
CREATE TABLE IF NOT EXISTS `media_categories` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL,
    `slug` TEXT NOT NULL,
    `description` TEXT,
    `display_order` INTEGER,
    `show_in_frontend` INTEGER NOT NULL DEFAULT 1,
    `created_at` TEXT NOT NULL
);

-- Media <-> Category junction
CREATE TABLE IF NOT EXISTS `media_category_links` (
    `media_id` TEXT NOT NULL,
    `category_id` TEXT NOT NULL
);

-- Media Tags
CREATE TABLE IF NOT EXISTS `media_tags` (
    `media_id` TEXT NOT NULL,
    `tag` TEXT NOT NULL
);

-- Albums
CREATE TABLE IF NOT EXISTS `albums` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT,
    `cover_media_id` TEXT,
    `created_at` TEXT NOT NULL,
    `updated_at` TEXT NOT NULL,
    `media_count` INTEGER,
    `view_count` INTEGER,
    `likes` INTEGER,
    `slug` TEXT,
    `password` TEXT,
    `status` TEXT
);

-- Album Tags
CREATE TABLE IF NOT EXISTS `album_tags` (
    `album_id` TEXT NOT NULL,
    `tag` TEXT NOT NULL
);

-- Album <-> Media junction (with ordering)
CREATE TABLE IF NOT EXISTS `album_media` (
    `album_id` TEXT NOT NULL,
    `media_id` TEXT NOT NULL,
    `display_order` INTEGER,
    `created_at` TEXT NOT NULL
);

-- Album One-Time Passwords (for password-protected album access)
CREATE TABLE IF NOT EXISTS `album_otps` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `album_id` TEXT NOT NULL,
    `token` TEXT NOT NULL,
    `created_at` TEXT NOT NULL
);

-- Comments (album comments)
CREATE TABLE IF NOT EXISTS `comments` (
    `comment_id` TEXT PRIMARY KEY NOT NULL,
    `comment_post_id` TEXT,
    `comment_author_name` TEXT,
    `comment_author_email` TEXT,
    `comment_author_url` TEXT,
    `comment_author_ip` TEXT,
    `comment_date` TEXT,
    `comment_content` TEXT,
    `comment_parent` TEXT,
    `comment_likes` INTEGER,
    `comment_dislikes` INTEGER,
    `comment_status` TEXT,
    `comment_type` TEXT
);

-- Subscribers (email newsletter)
CREATE TABLE IF NOT EXISTS `subscribers` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `email` TEXT NOT NULL UNIQUE,
    `token` TEXT NOT NULL UNIQUE,
    `status` TEXT NOT NULL DEFAULT 'active',
    `created_at` TEXT NOT NULL,
    `updated_at` TEXT NOT NULL
);

-- Newsletters
CREATE TABLE IF NOT EXISTS `newsletters` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `subject` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `type` TEXT NOT NULL DEFAULT 'general',
    `recipients_count` INTEGER DEFAULT 0,
    `status` TEXT NOT NULL DEFAULT 'draft',
    `created_at` TEXT NOT NULL,
    `sent_at` TEXT
);

-- ============================================
-- Indexes
-- ============================================

-- Media
CREATE INDEX IF NOT EXISTS `idx_media_created_at` ON `media` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_media_visibility` ON `media` (`visibility`);
CREATE INDEX IF NOT EXISTS `idx_media_provider` ON `media` (`provider`);

-- Media Categories
CREATE UNIQUE INDEX IF NOT EXISTS `idx_media_categories_slug` ON `media_categories` (`slug`);

-- Media Category Links
CREATE INDEX IF NOT EXISTS `idx_media_category_links_media_id` ON `media_category_links` (`media_id`);
CREATE INDEX IF NOT EXISTS `idx_media_category_links_category_id` ON `media_category_links` (`category_id`);

-- Media Tags
CREATE INDEX IF NOT EXISTS `idx_media_tags_media_id` ON `media_tags` (`media_id`);
CREATE INDEX IF NOT EXISTS `idx_media_tags_tag` ON `media_tags` (`tag`);

-- Albums
CREATE INDEX IF NOT EXISTS `idx_albums_slug` ON `albums` (`slug`);
CREATE INDEX IF NOT EXISTS `idx_albums_created_at` ON `albums` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_albums_status` ON `albums` (`status`);

-- Album Tags
CREATE INDEX IF NOT EXISTS `idx_album_tags_album_id` ON `album_tags` (`album_id`);

-- Album Media
CREATE INDEX IF NOT EXISTS `idx_album_media_album_id` ON `album_media` (`album_id`);
CREATE INDEX IF NOT EXISTS `idx_album_media_media_id` ON `album_media` (`media_id`);

-- Album OTPs
CREATE INDEX IF NOT EXISTS `idx_album_otps_album_id` ON `album_otps` (`album_id`);
CREATE INDEX IF NOT EXISTS `idx_album_otps_token` ON `album_otps` (`token`);

-- Comments
CREATE INDEX IF NOT EXISTS `idx_comments_post_id` ON `comments` (`comment_post_id`);
CREATE INDEX IF NOT EXISTS `idx_comments_status` ON `comments` (`comment_status`);
CREATE INDEX IF NOT EXISTS `idx_comments_parent` ON `comments` (`comment_parent`);

-- Subscribers
CREATE INDEX IF NOT EXISTS `idx_subscribers_email` ON `subscribers` (`email`);
CREATE INDEX IF NOT EXISTS `idx_subscribers_token` ON `subscribers` (`token`);
CREATE INDEX IF NOT EXISTS `idx_subscribers_status` ON `subscribers` (`status`);

-- Newsletters
CREATE INDEX IF NOT EXISTS `idx_newsletters_status` ON `newsletters` (`status`);
CREATE INDEX IF NOT EXISTS `idx_newsletters_created_at` ON `newsletters` (`created_at`);
