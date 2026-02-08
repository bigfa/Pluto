ALTER TABLE media ADD COLUMN view_count INTEGER;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_media_view_count ON media(view_count);
