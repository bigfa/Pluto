# Pluto 接口文档（中文）

本文档描述 Pluto 项目对外提供的 HTTP API，供 App 接入使用。

## 基础地址

```
{BASE_URL}/api
```

`BASE_URL` 为部署域名，例如 `https://example.com`。

## 鉴权

### 公共接口
无需鉴权。

### 管理后台接口
需要管理员登录后的 Cookie（`photos_admin`）。

- Cookie 名称：`photos_admin`
- HTTP-only

## 通用响应

大多数接口返回 JSON：

- `ok`: `true | false`
- 失败时包含 `error` 或 `err`

## 分页

常用参数：

- `page`（默认 1）
- `pageSize`（默认 20）

返回字段：

- `total`
- `totalPages`

## 公共接口

### 照片列表
`GET /media/list`

Query 参数：

- `q`: 关键词（文件名/标题/位置）
- `category`: 分类 slug 或 id
- `tag`: 标签
- `page`
- `pageSize`
- `sort`: `date | likes`（默认 `date`）
- `orientation`: `landscape | portrait | square`

排序规则：

- `date`：优先按 `datetime_original`，为空时回退 `created_at`。

响应示例：

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
      "liked": false
    }
  ],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}
```

### 照片分类
`GET /media/categories`

响应：

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

### 照片点赞
`GET /media/{id}/like`
`POST /media/{id}/like`
`DELETE /media/{id}/like`

- 点赞状态由 HTTP-only Cookie 记录。

响应：

```json
{ "ok": true, "likes": 0, "liked": true }
```

### 相册列表
`GET /albums`

Query 参数：

- `page`
- `pageSize`
- `q`

响应：

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
      "is_protected": false
    }
  ],
  "total": 0,
  "totalPages": 0
}
```

### 相册详情
`GET /albums/{idOrSlug}`

- 密码相册需 `Authorization: Bearer {token}`。
- 未提供或无效会返回 `403` 和 `{ code: "PASSWORD_REQUIRED" }`。

响应：

```json
{ "ok": true, "data": { ...album } }
```

### 相册照片
`GET /albums/{idOrSlug}/media`

Query 参数：

- `page`
- `pageSize`

- 密码相册需 `Authorization: Bearer {token}`。

响应：

```json
{ "ok": true, "media": [ ...media ], "total": 0 }
```

### 相册解锁（密码）
`POST /albums/{idOrSlug}/unlock`

Body：

```json
{ "password": "..." }
```

响应：

```json
{ "ok": true, "token": "..." }
```

### 相册浏览数
`GET /albums/{id}/view`
`POST /albums/{id}/view`

- `POST` 会增加浏览次数（有 IP 限制）。

响应：

```json
{ "views": 0 }
```

### 相册点赞
`GET /albums/{id}/like`
`POST /albums/{id}/like`
`DELETE /albums/{id}/like`

- 点赞状态由 HTTP-only Cookie 记录。

响应：

```json
{ "ok": true, "likes": 0, "liked": true }
```

### 相册评论
`GET /albums/{id}/comments`

响应：

```json
{ "ok": true, "comments": [ ... ], "isAdmin": false }
```

`POST /albums/{id}/comments`

Body：

```json
{
  "author_name": "...",
  "author_email": "...",
  "author_url": "...",
  "content": "...",
  "parent_id": "..."
}
```

响应：

```json
{ "ok": true, "data": { "id": "...", "status": "pending" } }
```

### 评论审核（管理员）
`POST /albums/{id}/comments/{commentId}/approve`

### 评论删除（当前无权限校验）
`DELETE /albums/{id}/comments/{commentId}`

注意：当前删除接口未做鉴权，生产环境建议限制为管理员。

### 订阅
`GET /subscribe`

响应：

```json
{ "ok": true, "enabled": true }
```

`POST /subscribe`

Body：

```json
{ "email": "user@example.com" }
```

响应：

```json
{ "ok": true, "token": "..." }
```

## 管理后台接口

所有后台接口需要 `photos_admin` Cookie。

### 登录与会话

- `POST /admin/login`
  - Body: `{ "username": "...", "password": "..." }`
  - 成功会写入 `photos_admin` Cookie

- `POST /admin/logout`
  - 清除 Cookie

- `GET /admin/me`
  - 返回 `{ ok: true, user: "..." }`

### 媒体

- `GET /admin/media/list`
  - Query: `q, category, tag, page, pageSize`

- `GET /admin/media/{id}`
- `PUT /admin/media/{id}`
  - Body: `{ title, alt, category_ids, tags, visibility }`
- `DELETE /admin/media/{id}`

- `POST /admin/media/upload`
  - `multipart/form-data`
  - 字段: `file` 或 `files`（支持多文件）、`provider`、`title`、`alt`、`folder`、`category_ids`（逗号分隔）、`tags`（逗号分隔）、`visibility`

### 媒体分类

- `GET /admin/media/categories`
- `POST /admin/media/categories`
  - Body: `{ name, slug, description, display_order }`

- `PUT /admin/media/categories/{id}`
- `DELETE /admin/media/categories/{id}`

### 媒体标签

- `GET /admin/media/tags`

### 设备统计

- `GET /admin/media/devices`
  - 返回相机/镜头统计

### 存储方式

- `GET /admin/providers`
  - 返回可用存储与默认值

### 相册

- `GET /admin/albums`
  - Query: `page, pageSize, q`
- `POST /admin/albums`

- `GET /admin/albums/{id}`
- `PUT /admin/albums/{id}`
- `DELETE /admin/albums/{id}`

- `GET /admin/albums/{id}/media`
- `POST /admin/albums/{id}/media`
  - Body: `{ media_ids: ["..."] }`
- `DELETE /admin/albums/{id}/media`
  - Body: `{ media_ids: ["..."] }`

- `POST /admin/albums/{id}/otp`
  - 返回 `{ ok: true, otp: "..." }`

### 相册评论

- `GET /admin/album-comments`
  - Query: `page, pageSize, status`（`all | pending | approved`）

- `POST /admin/album-comments/{id}/approve`
- `DELETE /admin/album-comments/{id}`

### 邮件通知

- `GET /admin/newsletters`
  - Query: `page, pageSize`

- `POST /admin/newsletters`
  - 创建: `{ subject, content, type }`
  - 发送: `{ action: "send", id: "newsletterId" }`

### 订阅用户

- `GET /admin/subscribers`
  - Query: `page, pageSize`

