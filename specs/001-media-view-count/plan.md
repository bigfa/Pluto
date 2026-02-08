# Implementation Plan: Media View Count

**Branch**: `001-media-view-count` | **Date**: 2026-02-08 | **Spec**: `specs/001-media-view-count/spec.md`
**Input**: Feature specification from `specs/001-media-view-count/spec.md`

## Summary

为媒体（照片）增加浏览量追踪功能。当访客在灯箱中查看照片时记录一次浏览，通过 KV 做 IP 去重（5 分钟窗口），将计数持久化至数据库，并在灯箱 UI、首页排序和管理后台中展示浏览量。

技术方案完全复用已有的相册浏览量（`albumViewServices`）和点赞（`likeServices`）架构模式。

## Technical Context

**Language/Version**: TypeScript（Next.js 15, React 19）
**Primary Dependencies**: Drizzle ORM, Cloudflare Workers KV
**Storage**: Cloudflare D1（SQLite）+ FARALLON KV
**Testing**: Vitest
**Target Platform**: Cloudflare Workers (Edge Runtime)
**Project Type**: Web 应用（App Router）
**Performance Goals**: 浏览记录 < 1s 响应；KV 去重保证高并发无数据库压力
**Constraints**: Edge runtime 兼容；最小化对现有代码的侵入
**Scale/Scope**: 单用户摄影展示站点

## Constitution Check

- [x] 单用户定位 - 不引入多用户模型
- [x] 移动优先 - 浏览量显示适配移动端
- [x] 边缘性能 - KV 去重避免数据库压力
- [x] 接口变更需同步文档
- [x] 数据库变更需同步 `init_*` 与迁移脚本

## Project Structure

### Documentation (this feature)

```text
specs/001-media-view-count/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown (next step)
```

### Source Code Changes

```text
src/
├── db/
│   ├── schema.ts            # 修改: media 表增加 view_count 字段
│   └── schema_pg.ts         # 修改: PostgreSQL 版本同步
├── services/
│   └── mediaViewServices.ts # 新建: 浏览量服务（参照 albumViewServices）
├── app/api/media/
│   ├── [id]/view/route.ts   # 新建: POST/GET 浏览量 API
│   └── list/route.ts        # 修改: 支持 sort=views
├── app/api/admin/media/
│   └── list/route.ts        # 修改: 返回 view_count 字段
├── components/
│   └── LightBox.tsx         # 修改: 显示浏览量 + 触发记录
├── types/
│   └── media.ts             # 修改: Media 接口增加 view_count
├── lib/
│   ├── api.ts               # 修改: 增加 recordMediaView 函数
│   └── i18n.ts              # 修改: 增加浏览量相关文案
└── app/(site)/
    └── HomeClient.tsx        # 修改: 增加 views 排序按钮

drizzle/
└── 0004_add_media_view_count.sql  # 新建: 迁移脚本

sql/
├── init_d1.sql              # 修改: 新建表包含 view_count
└── init_supabase.sql        # 修改: PostgreSQL 同步
```

**Structure Decision**: 使用现有 App/Service/Lib 结构，与 `albumViewServices` 保持一致的模式。

## Design Decisions

### 1. 去重机制：KV 5分钟窗口（非速率限制）

与相册浏览量的速率限制（20次/分钟）不同，媒体浏览量采用**精确去重**：

- KV Key: `media:view:{mediaId}:{ipHash}`
- TTL: 300 秒（5 分钟）
- 含义：同一 IP 对同一张照片 5 分钟内只计一次
- 原因：Spec 要求精确去重（场景3/4），而非速率限制

### 2. 浏览记录时机

在灯箱打开时由前端调用 `POST /api/media/{id}/view`，而非服务端渲染时触发。这与相册浏览量的处理方式一致。

### 3. Bot 过滤

在 API route 层检查 User-Agent，匹配常见爬虫模式时直接跳过记录。简单字符串匹配，非完整反爬方案。

### 4. 数据库字段

`media` 表增加 `view_count INTEGER`（默认 NULL → 视为 0），与 `albums.view_count` 一致。

### 5. 排序扩展

`sort` 参数扩展为 `'date' | 'likes' | 'views'`，影响：
- `MediaListParams.sort` 类型
- Media list API 的 orderBy 逻辑
- HomeClient 的排序按钮

## API Contracts

### POST /api/media/{id}/view

**Purpose**: 记录一次浏览

```
Request:
  Headers: cf-connecting-ip, user-agent
  Body: (empty)

Response 200:
  { "ok": true, "views": 43 }

Response 429 (debounced):
  { "ok": true, "views": 42 }
  // 不返回错误，仍返回当前计数（best-effort）
```

### GET /api/media/{id}/view

**Purpose**: 获取浏览量

```
Response 200:
  { "views": 42 }
```

### GET /api/media/list (modified)

```
Query: sort=views  (新增选项)

Response: 按 view_count DESC 排序
```

## Complexity Tracking

无 Constitution 违规项。
