# Changelog

All notable changes to this project will be documented in this file.

## [0.2.1] - 2026-02-07

### Added
- Public media details endpoint `GET /api/media/{id}`: returns full photo info including categories, tags, EXIF, and like status.
- Upload duplicate detection: SHA-256 hash-based detection that skips existing files and notifies users.
- Database field `file_hash`: stores image hash for duplicate detection.
- Media view-count feature:
  - DB field `media.view_count` with index `idx_media_view_count`
  - New endpoint `GET/POST /api/media/{id}/view`
  - Lightbox now records and displays media view count
  - Media list supports `sort=views`
  - Admin media list supports view-count display and `sort=views`

### Changed
- Unified all timestamps to ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`).

### Upgrade Guide

Upgrading from v0.2.0 requires a database migration:

```bash
# Cloudflare D1 - Local development
npx wrangler d1 execute <DB_NAME> --local --file=drizzle/0003_add_media_file_hash.sql
npx wrangler d1 execute <DB_NAME> --local --file=drizzle/0004_add_media_view_count.sql

# Cloudflare D1 - Remote production
npx wrangler d1 execute <DB_NAME> --remote --file=drizzle/0003_add_media_file_hash.sql
npx wrangler d1 execute <DB_NAME> --remote --file=drizzle/0004_add_media_view_count.sql

# Docker (SQLite) - Execute inside container
sqlite3 /data/photos.db < drizzle/0003_add_media_file_hash.sql
sqlite3 /data/photos.db < drizzle/0004_add_media_view_count.sql

# Supabase (PostgreSQL)
psql -h <host> -U postgres -d postgres -f drizzle/0003_add_media_file_hash.sql
psql -h <host> -U postgres -d postgres -f drizzle/0004_add_media_view_count.sql
```

## [0.2.0] - 2026-02-06

### Added
- Album categories: schema, admin CRUD, public listing, and album filtering.
- Admin media upload: multi-image queue with paste support, dedupe, previews, and per-item progress overlay.
- Docker deployment: Dockerfile, docker-compose, Nginx sidecar guidance, and init scripts.
- App/API docs: new App-focused API doc and expanded API/config/deploy docs (EN/ZH).

### Changed
- Media URL resolution now uses `provider + object_key` where available.
- Public album list now supports category filtering and returns categories/ids.
- i18n: added album category/admin labels and related strings.
- Env loading improved for Workers (Cloudflare bindings).

### Fixed
- Album/detail category visibility now respects `show_in_frontend`.
- Admin media edit dialog layout scrolling and button visibility.
- Several build/type issues found during deploy.
