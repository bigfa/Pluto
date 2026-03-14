import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.join(process.cwd(), 'drizzle/0005_optimize_media_list_indexes.sql');

describe('media list indexes migration', () => {
    it('defines optimized indexes for media list sorting and filtering', () => {
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        expect(migrationSql).toContain(
            "CREATE INDEX IF NOT EXISTS idx_media_list_date ON media (COALESCE(visibility, 'public'), datetime_original DESC, created_at DESC);",
        );
        expect(migrationSql).toContain(
            "CREATE INDEX IF NOT EXISTS idx_media_list_likes ON media (COALESCE(visibility, 'public'), COALESCE(likes, 0) DESC, created_at DESC);",
        );
        expect(migrationSql).toContain(
            "CREATE INDEX IF NOT EXISTS idx_media_list_views ON media (COALESCE(visibility, 'public'), COALESCE(view_count, 0) DESC, created_at DESC);",
        );
        expect(migrationSql).toContain(
            'CREATE INDEX IF NOT EXISTS idx_media_category_links_category_media ON media_category_links (category_id, media_id);',
        );
        expect(migrationSql).toContain(
            'CREATE INDEX IF NOT EXISTS idx_media_tags_tag_media ON media_tags (tag, media_id);',
        );
    });
});
