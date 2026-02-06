# Pluto Constitution

该文档从 `AGENTS.md` 合并而来，用于规范 Spec‑Kit 工作流中的设计与实现。

## Core Principles

### 单用户定位（非多租户）
Pluto 是单用户个人摄影展示站点，不引入多用户体系与权限模型。所有功能以“个人作品展示”为核心。

### 移动优先与体验优先
所有新功能必须在移动端可用，布局与交互优先考虑小屏体验。

### 性能与边缘优先
Cloudflare Workers 边缘性能是核心差异化优势；避免无谓的网络与数据库开销。

### 隐私与安全为基线
评论、订阅等功能必须遵守隐私规范；默认避免引入不必要的数据采集。

### 文档同步
新增/变更 API、配置、部署或核心行为时，必须更新对应文档（API/配置/部署）。

## Additional Constraints

### 技术栈
- Next.js 15 + React 19 + TypeScript
- Drizzle ORM
- Cloudflare Workers（D1 / R2 / KV）

### 目录与模块规范
- 前台组件：`src/components`
- 后台组件：`src/components/admin`
- API 路由：`src/app/api`
- 服务层：`src/services`

### API 约定
- REST 风格，名词复数：`/media`, `/albums`, `/comments`
- 子资源层级：`/albums/{id}/media`
- 动作后缀：`/like`, `/view`, `/unlock`, `/approve`
- 后台统一 `/admin` 前缀
- 列表接口默认支持 `page` / `pageSize`
- 日期字段统一 ISO 8601
- 返回体包含 `ok` 字段

### 错误码规范
- `PASSWORD_REQUIRED` (403)
- `INVALID_PASSWORD` (403)
- `UNAUTHORIZED` (401)
- `NOT_FOUND` (404)
- `RATE_LIMITED` (429)
- `VALIDATION_ERROR` (400)
- `SERVER_ERROR` (500)

### 业务约定
- `SITE_CONFIG` 作为功能开关与默认配置来源
- 媒体排序：`datetime_original` 优先，其次 `created_at`

## Workflow & Quality Gates

- 新增核心逻辑时优先补单元测试（可测范围内）
- 数据库变更需同步 `init_*` 与迁移脚本
- 公共接口变更需更新 API 文档
- 避免无关的大范围改动

## Governance

本 Constitution 在 Spec‑Kit 流程中拥有最高优先级；如需变更，须同步更新 `AGENTS.md` 与本文件。

**Version**: 1.1 | **Ratified**: 2026-02-06 | **Last Amended**: 2026-02-06
