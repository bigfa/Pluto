# 更新日志

本文件记录项目的重要变更。

## [0.2.1] - 2026-02-07

### 新增
- 公开媒体详情接口 `GET /api/media/{id}`：返回单张照片的完整信息（分类、标签、EXIF、点赞状态等）。
- 图片上传重复检测：基于 SHA-256 哈希检测重复文件，跳过已存在的图片并提示用户。
- 数据库字段 `file_hash`：用于存储图片哈希值。
- 媒体浏览量功能：
  - 新增数据库字段 `media.view_count` 与索引 `idx_media_view_count`
  - 新增接口 `GET/POST /api/media/{id}/view`
  - 灯箱打开时自动记录并展示浏览量
  - 前台照片列表支持 `sort=views`
  - 后台媒体列表支持浏览量展示与 `sort=views`

### 变更
- 统一时间格式为 ISO 8601（`YYYY-MM-DDTHH:mm:ss.sssZ`）。

### 升级指南

从 v0.2.0 升级需要执行数据库迁移：

```bash
# Cloudflare D1 - 本地开发环境
npx wrangler d1 execute <DB_NAME> --local --file=drizzle/0003_add_media_file_hash.sql
npx wrangler d1 execute <DB_NAME> --local --file=drizzle/0004_add_media_view_count.sql

# Cloudflare D1 - 远程生产环境
npx wrangler d1 execute <DB_NAME> --remote --file=drizzle/0003_add_media_file_hash.sql
npx wrangler d1 execute <DB_NAME> --remote --file=drizzle/0004_add_media_view_count.sql

# Docker (SQLite) - 进入容器执行
sqlite3 /data/photos.db < drizzle/0003_add_media_file_hash.sql
sqlite3 /data/photos.db < drizzle/0004_add_media_view_count.sql

# Supabase (PostgreSQL)
psql -h <host> -U postgres -d postgres -f drizzle/0003_add_media_file_hash.sql
psql -h <host> -U postgres -d postgres -f drizzle/0004_add_media_view_count.sql
```

## [0.2.0] - 2026-02-06

### 新增
- 相册分类：新增表结构、后台管理、前台列表与筛选。
- 后台多图上传：队列、粘贴、去重、预览与单图进度遮罩。
- Docker 部署：Dockerfile、docker-compose、Nginx sidecar 示例与初始化脚本。
- 文档：新增 App API 文档，完善 API/配置/部署文档（中英文）。

### 变更
- 图片 URL 优先根据 `provider + object_key` 解析。
- 相册列表支持分类筛选并返回 `categories/category_ids`。
- i18n 增加相册分类/后台相关文案。
- Workers 环境变量加载逻辑优化。

### 修复
- 前台相册分类仅展示 `show_in_frontend` 的分类。
- 后台图片编辑弹窗滚动与操作按钮遮挡问题。
- 构建与类型错误修复。
