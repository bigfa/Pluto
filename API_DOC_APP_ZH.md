# Pluto App API 文档（精简版）

本文件为 App 端专用的精简 API 说明，适合移动端按需加载与缓存。字段以“列表精简、详情完整”为原则。

## 基本信息

- **Base URL**: `NEXT_PUBLIC_BASE_URL`
- **所有响应**默认包含：`ok` 字段
- **错误响应**：`ok: false` + `error/err` + 可选 `code`

## 约定

- 列表接口返回精简字段（适合瀑布流/网格）
- 详情接口返回完整字段
- 图片字段优先使用：`url_thumb` → `url_medium` → `url_large`
- `datetime_original` 优先用于排序，为空时回退 `created_at`

---

## 1. 获取媒体列表

`GET /api/media/list`

### Query 参数

- `page` (number, default 1)
- `pageSize` (number, default 20)
- `q` (string, optional)
- `category` (string, optional)
- `tag` (string, optional)
- `sort` (`date` | `likes`, default `date`)
- `orientation` (`landscape` | `portrait` | `square`, optional)

### 精简响应字段

- `id`
- `url`
- `url_thumb`
- `url_medium`
- `url_large`
- `width`
- `height`
- `likes`
- `liked`
- `datetime_original`
- `created_at`

### 响应示例

```json
{
  "ok": true,
  "results": [
    {
      "id": "m_123",
      "url": "https://img.example.com/2025/01/uuid.jpg",
      "url_thumb": "https://img.example.com/2025/01/uuid.jpg?thumb",
      "url_medium": "https://img.example.com/2025/01/uuid.jpg?medium",
      "url_large": "https://img.example.com/2025/01/uuid.jpg?large",
      "width": 4032,
      "height": 3024,
      "likes": 12,
      "liked": false,
      "datetime_original": "2025-01-16T08:12:00.000Z",
      "created_at": "2025-01-20T10:22:33.000Z"
    }
  ],
  "total": 120,
  "page": 1,
  "pageSize": 20,
  "totalPages": 6
}
```

---

## 2. 获取媒体详情

`GET /api/media/{id}`

### 完整响应字段

- 列表字段 +
- `filename`
- `size`
- `mime_type`
- `camera_make`
- `camera_model`
- `lens_model`
- `aperture`
- `shutter_speed`
- `iso`
- `focal_length`
- `location_name`
- `gps_lat`
- `gps_lon`
- `tags`
- `categories`

### 响应示例

```json
{
  "ok": true,
  "data": {
    "id": "m_123",
    "url": "https://img.example.com/2025/01/uuid.jpg",
    "url_thumb": "https://img.example.com/2025/01/uuid.jpg?thumb",
    "url_medium": "https://img.example.com/2025/01/uuid.jpg?medium",
    "url_large": "https://img.example.com/2025/01/uuid.jpg?large",
    "filename": "DSC001.jpg",
    "size": 4021312,
    "mime_type": "image/jpeg",
    "width": 4032,
    "height": 3024,
    "camera_make": "Sony",
    "camera_model": "A7M4",
    "lens_model": "24-70mm",
    "aperture": "f/2.8",
    "shutter_speed": "1/125",
    "iso": "200",
    "focal_length": "35mm",
    "datetime_original": "2025-01-16T08:12:00.000Z",
    "location_name": "Shanghai",
    "gps_lat": 31.2304,
    "gps_lon": 121.4737,
    "tags": ["street", "night"],
    "categories": [{"id": "c1", "name": "City"}]
  }
}
```

---

## 3. 相册列表

`GET /api/albums`

### Query 参数

- `page` (number, default 1)
- `pageSize` (number, default 20)
- `q` (string, optional)
- `category` (string, optional，分类 slug 或 id)

### 精简字段

- `id`
- `title`
- `description`
- `cover_media.url` / `url_thumb` / `url_medium`
- `media_count`
- `likes`
- `slug`
- `is_protected`
- `categories`
- `category_ids`

### 响应示例

```json
{
  "ok": true,
  "albums": [
    {
      "id": "a_001",
      "title": "Japan 2024",
      "description": "Tokyo & Kyoto",
      "cover_media": {
        "id": "m_123",
        "url": "https://img.example.com/2025/01/uuid.jpg",
        "url_thumb": "https://img.example.com/2025/01/uuid.jpg?thumb",
        "url_medium": "https://img.example.com/2025/01/uuid.jpg?medium"
      },
      "media_count": 88,
      "likes": 10,
      "slug": "japan-2024",
      "is_protected": true,
      "categories": [{ "id": "c1", "name": "Travel", "slug": "travel" }],
      "category_ids": ["c1"]
    }
  ],
  "total": 5,
  "totalPages": 1
}
```

---

## 4. 相册详情

`GET /api/albums/{id}`

### 响应示例

```json
{
  "ok": true,
  "data": {
    "id": "a_001",
    "title": "Japan 2024",
    "description": "Tokyo & Kyoto",
    "cover_media": {
      "id": "m_123",
      "url": "https://img.example.com/2025/01/uuid.jpg",
      "url_thumb": "https://img.example.com/2025/01/uuid.jpg?thumb",
      "url_medium": "https://img.example.com/2025/01/uuid.jpg?medium"
    },
    "media_count": 88,
    "views": 100,
    "likes": 10,
    "slug": "japan-2024",
    "is_protected": true
  }
}
```

---

## 5. 获取相册媒体

`GET /api/albums/{id}/media`

### Query 参数

- `page` (number, default 1)
- `pageSize` (number, default 50)

### 响应示例

```json
{
  "ok": true,
  "media": [
    {
      "id": "m_123",
      "url": "https://img.example.com/2025/01/uuid.jpg",
      "url_thumb": "https://img.example.com/2025/01/uuid.jpg?thumb",
      "url_medium": "https://img.example.com/2025/01/uuid.jpg?medium",
      "url_large": "https://img.example.com/2025/01/uuid.jpg?large",
      "width": 4032,
      "height": 3024,
      "likes": 12,
      "liked": false,
      "datetime_original": "2025-01-16T08:12:00.000Z",
      "created_at": "2025-01-20T10:22:33.000Z"
    }
  ],
  "total": 88
}
```

---

## 6. 相册解锁（密码）

`POST /api/albums/{id}/unlock`

### Request

```json
{
  "password": "your-password"
}
```

### Response

```json
{
  "ok": true,
  "token": "otp-token-string"
}
```

> App 侧应保存 token，并在后续访问相册时通过 `Authorization: Bearer <token>` 传递。

---

## 7. 点赞

### 媒体点赞

`POST /api/media/{id}/like`

Request:

```json
{ "action": "like" }
```

Response:

```json
{ "ok": true, "likes": 13, "liked": true }
```

### 相册点赞

`POST /api/albums/{id}/like`

Request:

```json
{ "action": "like" }
```

Response:

```json
{ "ok": true, "likes": 11, "liked": true }
```

---

## 8. 相册浏览量

`POST /api/albums/{id}/view`

Response:

```json
{ "ok": true }
```

---

## 9. 分类列表

`GET /api/media/categories`

说明：仅返回 `show_in_frontend = 1` 的分类。

响应示例：

```json
{
  "ok": true,
  "categories": [
    { "id": "c1", "name": "City", "slug": "city", "count": 12 }
  ]
}
```

## 10. 相册分类列表

`GET /api/albums/categories`

说明：仅返回 `show_in_frontend = 1` 的分类。

响应示例：

```json
{
  "ok": true,
  "categories": [
    { "id": "a1", "name": "Travel", "slug": "travel", "count": 5 }
  ]
}
```

---

## 11. 评论列表与提交

### 获取评论

`GET /api/albums/{id}/comments`

### 提交评论

`POST /api/albums/{id}/comments`

Request:

```json
{
  "author": "Tom",
  "email": "tom@example.com",
  "content": "Great photos!"
}
```

Response:

```json
{ "ok": true }
```

---

## 错误码参考（App 侧常用）

- `PASSWORD_REQUIRED` → 403
- `INVALID_PASSWORD` → 403
- `UNAUTHORIZED` → 401
- `NOT_FOUND` → 404
- `RATE_LIMITED` → 429
- `VALIDATION_ERROR` → 400
- `SERVER_ERROR` → 500

---

如需更完整字段或后台接口说明，请参考 `API_DOC.md` / `API_DOC_ZH.md`。
