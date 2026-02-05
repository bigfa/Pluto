-- ================================================
-- Supabase (PostgreSQL) Database Init Script
-- ================================================
-- Usage:
--   Execute in Supabase SQL Editor, or:
--   psql -h <host> -U postgres -d postgres -f sql/init_supabase.sql
-- ================================================

-- Media: core table for all photos/videos
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY NOT NULL,
    provider TEXT NOT NULL,
    object_key TEXT NOT NULL,
    url TEXT NOT NULL,
    url_thumb TEXT,
    url_medium TEXT,
    url_large TEXT,
    filename TEXT,
    mime TEXT,
    size INTEGER,
    width INTEGER,
    height INTEGER,
    title TEXT,
    alt TEXT,
    exif_json TEXT,
    camera_make TEXT,
    camera_model TEXT,
    lens_model TEXT,
    aperture TEXT,
    shutter_speed TEXT,
    iso TEXT,
    focal_length TEXT,
    datetime_original TEXT,
    gps_lat DOUBLE PRECISION,
    gps_lon DOUBLE PRECISION,
    location_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    likes INTEGER,
    visibility TEXT
);

-- Media Categories
CREATE TABLE IF NOT EXISTS media_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    display_order INTEGER,
    show_in_frontend INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- Media <-> Category junction
CREATE TABLE IF NOT EXISTS media_category_links (
    media_id TEXT NOT NULL,
    category_id TEXT NOT NULL
);

-- Media Tags
CREATE TABLE IF NOT EXISTS media_tags (
    media_id TEXT NOT NULL,
    tag TEXT NOT NULL
);

-- Albums
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cover_media_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    media_count INTEGER,
    view_count INTEGER,
    likes INTEGER,
    slug TEXT,
    password TEXT,
    status TEXT
);

-- Album Tags
CREATE TABLE IF NOT EXISTS album_tags (
    album_id TEXT NOT NULL,
    tag TEXT NOT NULL
);

-- Album Categories
CREATE TABLE IF NOT EXISTS album_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    display_order INTEGER,
    show_in_frontend INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- Album <-> Category junction
CREATE TABLE IF NOT EXISTS album_category_links (
    album_id TEXT NOT NULL,
    category_id TEXT NOT NULL
);

-- Album <-> Media junction (with ordering)
CREATE TABLE IF NOT EXISTS album_media (
    album_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    display_order INTEGER,
    created_at TEXT NOT NULL
);

-- Album One-Time Passwords (for password-protected album access)
CREATE TABLE IF NOT EXISTS album_otps (
    id TEXT PRIMARY KEY NOT NULL,
    album_id TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Comments (album comments)
CREATE TABLE IF NOT EXISTS comments (
    comment_id TEXT PRIMARY KEY NOT NULL,
    comment_post_id TEXT,
    comment_author_name TEXT,
    comment_author_email TEXT,
    comment_author_url TEXT,
    comment_author_ip TEXT,
    comment_date TEXT,
    comment_content TEXT,
    comment_parent TEXT,
    comment_likes INTEGER,
    comment_dislikes INTEGER,
    comment_status TEXT,
    comment_type TEXT
);

-- Subscribers (email newsletter)
CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Newsletters
CREATE TABLE IF NOT EXISTS newsletters (
    id TEXT PRIMARY KEY NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    recipients_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    sent_at TEXT
);

-- ================================================
-- Indexes
-- ================================================

-- Media
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media (created_at);
CREATE INDEX IF NOT EXISTS idx_media_visibility ON media (visibility);
CREATE INDEX IF NOT EXISTS idx_media_provider ON media (provider);

-- Media Categories
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_categories_slug ON media_categories (slug);

-- Media Category Links
CREATE INDEX IF NOT EXISTS idx_media_category_links_media_id ON media_category_links (media_id);
CREATE INDEX IF NOT EXISTS idx_media_category_links_category_id ON media_category_links (category_id);

-- Media Tags
CREATE INDEX IF NOT EXISTS idx_media_tags_media_id ON media_tags (media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tag ON media_tags (tag);

-- Albums
CREATE INDEX IF NOT EXISTS idx_albums_slug ON albums (slug);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums (created_at);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums (status);

-- Album Tags
CREATE INDEX IF NOT EXISTS idx_album_tags_album_id ON album_tags (album_id);
CREATE INDEX IF NOT EXISTS idx_album_categories_slug ON album_categories (slug);
CREATE INDEX IF NOT EXISTS idx_album_category_links_album_id ON album_category_links (album_id);

-- Album Media
CREATE INDEX IF NOT EXISTS idx_album_media_album_id ON album_media (album_id);
CREATE INDEX IF NOT EXISTS idx_album_media_media_id ON album_media (media_id);

-- Album OTPs
CREATE INDEX IF NOT EXISTS idx_album_otps_album_id ON album_otps (album_id);
CREATE INDEX IF NOT EXISTS idx_album_otps_token ON album_otps (token);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (comment_post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments (comment_status);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (comment_parent);

-- Subscribers
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers (token);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers (status);

-- Newsletters
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters (status);
CREATE INDEX IF NOT EXISTS idx_newsletters_created_at ON newsletters (created_at);

-- ================================================
-- Row Level Security (RLS)
-- ================================================
-- Enable RLS on all tables (Supabase best practice)
-- By default, no access unless policies are defined.
-- The app connects via service_role key, which bypasses RLS.

ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- ================================================
-- Public Read Policies (for anon/public access)
-- ================================================
-- Allow public read on media (only public visibility)
CREATE POLICY "Public can read public media" ON media
    FOR SELECT USING (visibility IS NULL OR visibility = 'public');

-- Allow public read on categories
CREATE POLICY "Public can read categories" ON media_categories
    FOR SELECT USING (true);

-- Allow public read on category links
CREATE POLICY "Public can read category links" ON media_category_links
    FOR SELECT USING (true);

-- Allow public read on tags
CREATE POLICY "Public can read tags" ON media_tags
    FOR SELECT USING (true);

-- Allow public read on published albums
CREATE POLICY "Public can read published albums" ON albums
    FOR SELECT USING (status IS NULL OR status = 'published');

-- Allow public read on album tags
CREATE POLICY "Public can read album tags" ON album_tags
    FOR SELECT USING (true);

-- Allow public read on album categories
CREATE POLICY "Public can read album categories" ON album_categories
    FOR SELECT USING (true);

-- Allow public read on album category links
CREATE POLICY "Public can read album category links" ON album_category_links
    FOR SELECT USING (true);

-- Allow public read on album media links
CREATE POLICY "Public can read album media" ON album_media
    FOR SELECT USING (true);

-- Allow public read on approved comments
CREATE POLICY "Public can read approved comments" ON comments
    FOR SELECT USING (comment_status = 'approved');

-- Allow public to insert comments (for new comment submissions)
CREATE POLICY "Public can insert comments" ON comments
    FOR INSERT WITH CHECK (true);

-- Allow public to subscribe (insert into subscribers)
CREATE POLICY "Public can subscribe" ON subscribers
    FOR INSERT WITH CHECK (true);

-- No public read access to subscribers or newsletters (admin only via service_role)
