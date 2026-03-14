-- Improve media list performance on public filter + common sort modes.
CREATE INDEX IF NOT EXISTS idx_media_list_date ON media (COALESCE(visibility, 'public'), datetime_original DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_list_likes ON media (COALESCE(visibility, 'public'), COALESCE(likes, 0) DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_list_views ON media (COALESCE(visibility, 'public'), COALESCE(view_count, 0) DESC, created_at DESC);

-- Improve category/tag filtered list queries.
CREATE INDEX IF NOT EXISTS idx_media_category_links_category_media ON media_category_links (category_id, media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tag_media ON media_tags (tag, media_id);
