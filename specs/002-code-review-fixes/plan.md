# Implementation Plan: Code Review Fixes

**Branch**: `002-code-review-fixes` | **Date**: 2026-02-09 | **Spec**: `specs/002-code-review-fixes/spec.md`
**Input**: Feature specification from `specs/002-code-review-fixes/spec.md`

## Summary

v0.3.0 全项目 Review 发现的安全、数据正确性和代码质量问题的集中修复。以最小改动为原则，不引入新功能、不改变现有 API 行为（仅修正错误行为）。

## Technical Context

**Language/Version**: TypeScript（Next.js 15, React 19）
**Primary Dependencies**: Drizzle ORM, Cloudflare Workers KV
**Storage**: Cloudflare D1（SQLite）+ FARALLON KV
**Target Platform**: Cloudflare Workers (Edge Runtime)
**Project Type**: Web 应用（App Router）
**Constraints**: Edge runtime 兼容；纯修复，不引入新功能

## Constitution Check

- [x] 单用户定位 — 不涉及
- [x] 移动优先 — 不涉及 UI 变更
- [x] 边缘性能 — 不新增网络开销
- [x] 接口变更需同步文档 — 本次不变更接口契约（仅修正内部行为）

## Project Structure

### Documentation

```text
specs/002-code-review-fixes/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown
```

### Source Code Changes

```text
src/
├── app/api/
│   ├── albums/[id]/comments/[commentId]/route.ts  # H1: 添加 DELETE 鉴权
│   ├── albums/[id]/comments/route.ts               # H5: 评论长度校验
│   ├── albums/[id]/unlock/route.ts                  # H4: timingSafeEqual
│   ├── media/list/route.ts                          # M2: pageSize 边界
│   ├── admin/media/list/route.ts                    # M2: pageSize 边界
│   ├── admin/albums/route.ts                        # M1: 通用错误消息
│   └── (多个 admin 路由)                             # M1+M6: 错误格式统一
├── services/
│   ├── likeServices.ts                              # H3: 原子递增
│   ├── mediaViewServices.ts                         # M5: 提取 hashIp/buildKey; L1: 正则常量
│   ├── albumViewServices.ts                         # M5: 引用共享 hashIp/buildKey
│   └── albumLikeServices.ts                         # M5: 引用共享 hashIp/buildKey
└── lib/
    ├── crypto.ts                                    # M5 新建: hashIp()
    └── kv.ts                                        # M5 新建: buildKey()
```

## Design Decisions

### 1. H3 Like 竞态：仅修 DB 同步

KV 侧竞态在 Cloudflare Workers 单实例串行模型下风险极低。重点修复 DB 同步使用原子 `COALESCE + 1` 而非覆盖写入。

### 2. H4 timingSafeEqual：Edge 兼容

Cloudflare Workers 支持 `crypto.timingSafeEqual()` 但需要 `Uint8Array` 参数。用 `TextEncoder` 转换后比较。如果两个字符串长度不同，先做长度比较（长度不同直接返回 false 不泄露信息）。

### 3. M1 错误信息：渐进式修复

本次仅修复 admin 路由中 `String(e)` 直接返回的情况。保留 `console.error` 用于调试。不引入统一错误处理中间件（过度工程）。

### 4. M5 hashIp 提取：最小改动

新建 `src/lib/crypto.ts` 和 `src/lib/kv.ts`，三个 service 改为 import。函数签名不变，仅移动位置。

### 5. M6 错误格式：统一为 `{ ok, error }`

公开 API 已统一使用 `{ ok: false, error: "..." }` 格式。admin API 中的 `err` 字段全部改为 `error`。

## Complexity Tracking

无 Constitution 违规项。均为最小改动修复。
