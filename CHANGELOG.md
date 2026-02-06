# Changelog

All notable changes to this project will be documented in this file.

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

