-- Album categories migration (D1)
-- Safe to run multiple times

CREATE TABLE IF NOT EXISTS `album_categories` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL,
    `slug` TEXT NOT NULL,
    `description` TEXT,
    `display_order` INTEGER,
    `show_in_frontend` INTEGER NOT NULL DEFAULT 1,
    `created_at` TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `album_category_links` (
    `album_id` TEXT NOT NULL,
    `category_id` TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_album_categories_slug` ON `album_categories` (`slug`);
CREATE INDEX IF NOT EXISTS `idx_album_category_links_album_id` ON `album_category_links` (`album_id`);
CREATE INDEX IF NOT EXISTS `idx_album_category_links_category_id` ON `album_category_links` (`category_id`);
