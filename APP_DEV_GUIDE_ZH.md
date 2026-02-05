# Pluto App 开发文档（Swift / iOS，中文）

本文件用于从零搭建 Pluto iOS App（Swift 原生）。面向「浏览 + 相册 + 登录/管理/上传 + 评论/密码相册」的首版 MVP。你可以直接按此文档完成开发。

---

## 1. 目标与范围

**首版功能**
- 首页照片瀑布流浏览（分页 / 筛选 / 排序）
- 相册列表与相册详情
- 密码相册解锁（OTP Token）
- 点赞（媒体 / 相册）
- 相册评论（列表 + 提交）
- 管理端：登录 / 媒体上传 / 相册管理 / 评论管理（基础）

**不包含（后续再做）**
- 多用户系统
- 高级搜索、地图视图、幻灯片
- 离线全部下载

---

## 2. 基础配置

### 2.1 必要配置

在 App 的 `Config.plist` 或 `Environment.swift` 中配置：

- `BASE_URL`：站点地址（例如 `https://photos.example.com`）
- `API_BASE_URL`（可选）：默认与 `BASE_URL` 相同
- `DEFAULT_LOCALE`：`zh` 或 `en`

### 2.2 推荐配置

- `MEDIA_THUMB_STYLE` / `MEDIA_MEDIUM_STYLE` / `MEDIA_LARGE_STYLE`
  - 控制图片 URL 尺寸参数（App 只使用接口返回 `url_*`）

---

## 3. API 约定

**所有接口统一返回 `ok` 字段**：
- `ok: true` → 成功
- `ok: false` → 失败，返回 `error` 或 `err`

**常用错误码**
- `PASSWORD_REQUIRED` (403)
- `INVALID_PASSWORD` (403)
- `UNAUTHORIZED` (401)
- `NOT_FOUND` (404)

**分页约定**
- `page` 从 1 开始
- `pageSize` 默认 20

---

## 4. 核心接口清单（App 用）

> 详细字段示例请参阅 `API_DOC_APP_ZH.md`

### 4.1 媒体列表
`GET /api/media/list`

用于首页瀑布流。

### 4.2 媒体详情
`GET /api/media/{id}`

用于灯箱/详情页。

### 4.3 相册列表
`GET /api/albums`

### 4.4 相册详情
`GET /api/albums/{id}`

若为密码相册：返回 403 + `PASSWORD_REQUIRED`

### 4.5 相册媒体
`GET /api/albums/{id}/media`

### 4.6 解锁密码相册
`POST /api/albums/{id}/unlock`

请求：
```json
{ "password": "..." }
```
返回：
```json
{ "ok": true, "token": "..." }
```
之后访问相册时在 Header 中加：
```
Authorization: Bearer <token>
```

### 4.7 点赞
- `POST /api/media/{id}/like`
- `POST /api/albums/{id}/like`

请求：
```json
{ "action": "like" }
```

### 4.8 评论
- `GET /api/albums/{id}/comments`
- `POST /api/albums/{id}/comments`

---

## 5. 身份鉴权（管理端）

### 5.1 登录

`POST /api/admin/login`

返回 Cookie（HttpOnly）。App 内部 WebView 或 API 端需要维持 Cookie。

### 5.2 管理端接口使用

所有后台接口都在 `/api/admin/*`，需要登录 Cookie。

**建议做法**
- App 管理端使用 **内置 WebView** 承载后台
- 若 App 原生管理页面：需要 Cookie 持久化

---

## 6. 媒体上传

接口：
`POST /api/admin/media/upload`

支持多图上传，`multipart/form-data`：
- `files`: File[]
- 可选字段：`provider`, `title`, `alt`, `folder`, `tags`, `category_ids`

**上传流程建议**
1. App 选择多张照片
2. 去重（按文件 hash）
3. 显示缩略图与进度
4. 批量上传
5. 失败重试

---

## 7. Swift 端架构建议

### 7.1 技术栈
- UI：SwiftUI
- 网络：URLSession + async/await
- 图片：Kingfisher / SDWebImageSwiftUI
- 本地缓存：URLCache + 本地轻量缓存

### 7.2 推荐模块
- `APIClient`
- `AuthManager`
- `MediaService`
- `AlbumService`
- `UploadService`
- `CacheManager`

### 7.3 模型设计

- Media
- Album
- Comment
- Category

字段对齐 `API_DOC_APP_ZH.md`

---

## 8. 图片加载策略（推荐）

1. 列表页用 `url_thumb` / `url_medium`
2. 详情页加载 `url_large`
3. 加载中使用模糊过渡（可用 blur 或低清图）
4. 缓存 7 天（HTTP Cache-Control）

---

## 9. 相册密码逻辑

- 点击密码相册立即弹出密码框
- 支持回车提交
- 解锁成功返回 OTP Token
- Token 缓存到本地（Keychain）

---

## 10. 错误与状态处理

- 网络错误：统一 toast/alert
- 403 + `PASSWORD_REQUIRED`：展示密码输入
- 401：回到登录
- 500：显示“服务异常”

---

## 11. 目录建议

```
PlutoApp/
  ├─ App/
  ├─ Networking/
  ├─ Models/
  ├─ Views/
  ├─ Services/
  ├─ Components/
  └─ Resources/
```

---

## 12. 开发顺序建议（MVP）

1. APIClient + 基础模型
2. 首页媒体列表
3. 相册列表 + 详情 + 媒体
4. 密码解锁
5. 点赞
6. 评论
7. 管理端：登录 + 上传（或 WebView）

---

## 13. 可选增强（后续）

- 多语言切换
- 本地离线收藏
- 高级搜索
- 评论管理

---

## 14. 对接文档索引

- `API_DOC_APP_ZH.md`（App 精简版 API）
- `API_DOC_ZH.md`（完整 API 文档）
- `CONFIGURATION_ZH.md`（配置说明）

---

如需更细粒度的 Swift 代码模板、模块初始化或 SwiftUI 示例页面结构，我可以继续补充。
