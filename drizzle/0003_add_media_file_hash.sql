-- Add file_hash column to media table for duplicate detection
ALTER TABLE media ADD COLUMN file_hash TEXT;

-- Create index for fast duplicate lookup
CREATE INDEX IF NOT EXISTS idx_media_file_hash ON media(file_hash);
