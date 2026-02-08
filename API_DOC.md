# Pluto API Documentation (EN)

This document describes the HTTP APIs exposed by the Pluto project (Next.js + Cloudflare Workers). It is intended for App integration.

## Base URL

```
{BASE_URL}/api
```

`BASE_URL` should be your deployed site domain, e.g. `https://example.com`.

## Authentication

### Public APIs
No authentication required.

### Admin APIs
Admin endpoints require a valid admin session cookie set by the login endpoint.

- Cookie name: `photos_admin`
- Session is an HTTP-only cookie.

## Common Response Fields

Most endpoints return JSON with:

- `ok`: `true | false`
- On error: `error` or `err` message

## Pagination

Many list endpoints use:

- `page` (default 1)
- `pageSize` (default 20)

Response typically includes:

- `total`
- `totalPages`

## Public APIs

### Media List
`GET /media/list`

Query Parameters:

- `q`: search keyword (filename/title/location)
- `category`: category slug or id
- `tag`: tag string
- `page`: number
- `pageSize`: number
- `sort`: `date | likes | views` (default `date`)
- `orientation`: `landscape | portrait | square`

Sorting:

- `date`: uses `datetime_original` first, fallback to `created_at`.

Response:

```json
{
  "ok": true,
  "results": [
    {
      "id": "...",
      "url": "...",
      "url_thumb": "...",
      "url_medium": "...",
      "url_large": "...",
      "filename": "...",
      "alt": "...",
      "size": 0,
      "width": 0,
      "height": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "camera_make": "...",
      "camera_model": "...",
      "lens_model": "...",
      "aperture": "...",
      "shutter_speed": "...",
      "iso": "...",
      "focal_length": "...",
      "datetime_original": "2024-01-01T00:00:00.000Z",
      "location_name": "...",
      "categories": [{ "id": "...", "name": "...", "slug": "..." }],
      "category_ids": ["..."],
      "tags": ["..."],
      "likes": 0,
      "view_count": 0,
      "liked": false
    }
  ],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}
```

### Media Categories
`GET /media/categories`

Note: only categories with `show_in_frontend = 1` are returned.

Response:

```json
{
  "ok": true,
  "categories": [
    {
      "id": "...",
      "name": "...",
      "slug": "...",
      "description": "...",
      "media_count": 0
    }
  ]
}
```

### Media Details
`GET /media/{id}`

Note: Returns full details of a single photo. Only public photos (`visibility = 'public'` or `NULL`) are returned.

Response:

```json
{
  "ok": true,
  "data": {
    "id": "...",
    "url": "...",
    "url_thumb": "...",
    "url_medium": "...",
    "url_large": "...",
    "filename": "...",
    "title": "...",
    "alt": "...",
    "width": 1920,
    "height": 1080,
    "size": 123456,
    "mime_type": "image/jpeg",
    "camera_make": "...",
    "camera_model": "...",
    "lens_model": "...",
    "aperture": "f/2.8",
    "shutter_speed": "1/100",
    "iso": "100",
    "focal_length": "50mm",
    "datetime_original": "...",
    "location_name": "...",
    "categories": [{ "id": "...", "name": "...", "slug": "..." }],
    "tags": ["tag1", "tag2"],
    "likes": 10,
    "view_count": 120,
    "liked": false,
    "created_at": "2026-02-07T12:34:56.789Z"
  }
}
```

### Media Views
`GET /media/{id}/view`
`POST /media/{id}/view`

- `GET`: fetches current view count.
- `POST`: records a view (bot user-agents are ignored; repeat views within 5 minutes are deduplicated when KV is configured).

Response:

```json
{ "ok": true, "views": 123 }
```

### Media Likes
`GET /media/{id}/like`
`POST /media/{id}/like`
`DELETE /media/{id}/like`

- Like state is stored in an HTTP-only cookie per media id.

Response:

```json
{ "ok": true, "likes": 0, "liked": true }
```

### Album List
`GET /albums`

Query Parameters:

- `page`
- `pageSize`
- `q`
- `category` (category slug or id)

Response:

```json
{
  "ok": true,
  "albums": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "cover_media_id": "...",
      "cover_media": { "id": "...", "url": "...", "url_thumb": "...", "url_medium": "..." },
      "created_at": "...",
      "updated_at": "...",
      "media_count": 0,
      "views": 0,
      "likes": 0,
      "slug": "...",
      "is_protected": false,
      "categories": [{ "id": "...", "name": "...", "slug": "..." }],
      "category_ids": ["..."]
    }
  ],
  "total": 0,
  "totalPages": 0
}
```

### Album Categories
`GET /albums/categories`

Note: only categories with `show_in_frontend = 1` are returned.

Response:

```json
{
  "ok": true,
  "categories": [
    {
      "id": "...",
      "name": "...",
      "slug": "...",
      "description": "...",
      "media_count": 0
    }
  ]
}
```

### Album Detail
`GET /albums/{idOrSlug}`

- For protected albums: requires `Authorization: Bearer {token}`.
- If missing/invalid, returns `403` with `{ code: "PASSWORD_REQUIRED" }`.

Response:

```json
{ "ok": true, "data": { ...album } }
```

### Album Media
`GET /albums/{idOrSlug}/media`

Query Parameters:

- `page`
- `pageSize`

- For protected albums: requires `Authorization: Bearer {token}`.

Response:

```json
{ "ok": true, "media": [ ...media ], "total": 0 }
```

### Album Unlock (Password)
`POST /albums/{idOrSlug}/unlock`

Body:

```json
{ "password": "..." }
```

Response:

```json
{ "ok": true, "token": "..." }
```

### Album Views
`GET /albums/{id}/view`
`POST /albums/{id}/view`

- `POST` increments view count with IP throttling.

Response:

```json
{ "views": 0 }
```

### Album Likes
`GET /albums/{id}/like`
`POST /albums/{id}/like`
`DELETE /albums/{id}/like`

- Like state is stored in an HTTP-only cookie per album id.

Response:

```json
{ "ok": true, "likes": 0, "liked": true }
```

### Album Comments
`GET /albums/{id}/comments`

Response:

```json
{ "ok": true, "comments": [ ... ], "isAdmin": false }
```

`POST /albums/{id}/comments`

Body:

```json
{
  "author_name": "...",
  "author_email": "...",
  "author_url": "...",
  "content": "...",
  "parent_id": "..."
}
```

Response:

```json
{ "ok": true, "data": { "id": "...", "status": "pending" } }
```

### Comment Approve (Admin Only)
`POST /albums/{id}/comments/{commentId}/approve`

### Comment Delete (No Auth Check Yet)
`DELETE /albums/{id}/comments/{commentId}`

Note: currently no auth check for delete; should be restricted in production.

### Subscribe
`GET /subscribe`

Response:

```json
{ "ok": true, "enabled": true }
```

`POST /subscribe`

Body:

```json
{ "email": "user@example.com" }
```

Response:

```json
{ "ok": true, "token": "..." }
```

## Admin APIs

All admin endpoints require the `photos_admin` session cookie.

### Auth

- `POST /admin/login`
  - Body: `{ "username": "...", "password": "..." }`
  - Sets `photos_admin` cookie

- `POST /admin/logout`
  - Clears cookie

- `GET /admin/me`
  - Returns `{ ok: true, user: "..." }`

### Media

- `GET /admin/media/list`
  - Query: `q, category, tag, page, pageSize, sort`
  - `sort`: `date | date_asc | name | likes | views`

- `GET /admin/media/{id}`
- `PUT /admin/media/{id}`
  - Body: `{ title, alt, category_ids, tags, visibility }`
- `DELETE /admin/media/{id}`

- `POST /admin/media/upload`
  - `multipart/form-data`
  - Fields: `file` or `files` (multiple), `provider`, `title`, `alt`, `folder`, `category_ids` (comma), `tags` (comma), `visibility`

### Media Categories

- `GET /admin/media/categories`
- `POST /admin/media/categories`
  - Body: `{ name, slug, description, display_order, show_in_frontend }`

- `PUT /admin/media/categories/{id}`
- Body: `{ name, slug, description, display_order, show_in_frontend }`
- `DELETE /admin/media/categories/{id}`

### Media Tags

- `GET /admin/media/tags`

### Media Devices

- `GET /admin/media/devices`
  - Returns camera and lens counts.

### Providers

- `GET /admin/providers`
  - Returns list of available storage providers and default provider.

### Albums

- `GET /admin/albums`
  - Query: `page, pageSize, q`
- `POST /admin/albums`
  - Body: `{ title, description, cover_media_id, slug, tags, category_ids, password, status }`

- `GET /admin/albums/{id}`
- `PUT /admin/albums/{id}`
  - Body: `{ title, description, cover_media_id, slug, tags, category_ids, password, status }`
- `DELETE /admin/albums/{id}`

- `GET /admin/albums/{id}/media`
- `POST /admin/albums/{id}/media`
  - Body: `{ media_ids: ["..."] }`
- `DELETE /admin/albums/{id}/media`
  - Body: `{ media_ids: ["..."] }`

- `POST /admin/albums/{id}/otp`
  - Returns `{ ok: true, otp: "..." }`

### Album Categories

- `GET /admin/albums/categories`
- `POST /admin/albums/categories`
  - Body: `{ name, slug, description, display_order, show_in_frontend }`

- `PUT /admin/albums/categories/{id}`
  - Body: `{ name, slug, description, display_order, show_in_frontend }`
- `DELETE /admin/albums/categories/{id}`

### Album Comments

- `GET /admin/album-comments`
  - Query: `page, pageSize, status` (`all | pending | approved`)

- `POST /admin/album-comments/{id}/approve`
- `DELETE /admin/album-comments/{id}`

### Newsletters

- `GET /admin/newsletters`
  - Query: `page, pageSize`

- `POST /admin/newsletters`
  - Create: `{ subject, content, type }`
  - Send: `{ action: "send", id: "newsletterId" }`

### Subscribers

- `GET /admin/subscribers`
  - Query: `page, pageSize`
