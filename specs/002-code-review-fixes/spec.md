# Feature Spec: Code Review Fixes

**Feature**: 代码审查修复
**Date**: 2026-02-09
**Priority**: High
**Branch**: `002-code-review-fixes`

## Background

v0.3.0 发布后对全项目代码进行 Review，发现 5 个高优先级问题、8 个中优先级问题和 5 个低优先级改进点。本 spec 记录所有发现并规划修复优先级。

---

## HIGH - 需要尽快修复

### H1. 评论 DELETE 缺少鉴权

**文件**: `src/app/api/albums/[id]/comments/[commentId]/route.ts`
**问题**: DELETE handler 有 `// TODO: Add Authentication check here (Admin only)` 注释但未实现 `requireAdmin()` 校验，任何未认证用户可删除任意评论。
**修复**: 添加 `requireAdmin()` 鉴权检查，与 approve endpoint 保持一致。

### H2. description 字段赋值 Bug

**文件**: `src/services/admin/mediaServices.ts:614`
**问题**: `updateMedia()` 函数中 `if (changes.description !== undefined) updateData.alt = changes.description;` 将 description 错误赋值给 alt 字段，导致更新描述时覆盖 alt 文本，description 值丢失。
**修复**: 改为 `updateData.description = changes.description`，同时确认是否需要同时支持独立更新 alt。

### H3. Like 计数竞态条件

**文件**: `src/services/likeServices.ts:73-115`
**问题**: KV 读取当前值 → 内存中 +1 → 写回 KV 和 DB。并发场景下多个请求同时读取相同值，导致计数丢失。DB 同步使用 `set({ likes: newCount })` 而非原子操作。
**修复**: DB 更新改用 `sql\`COALESCE(likes, 0) + 1\`` 原子递增（与 mediaViewServices/albumViewServices 模式一致）。KV 侧的竞态在 Edge 环境下风险较低（KV 有最终一致性保证）。

### H4. 相册密码明文比较

**文件**: `src/app/api/albums/[id]/unlock/route.ts:73`
**问题**: `album.password !== password` 使用普通字符串比较，存在时序攻击（timing attack）风险。
**修复**: 使用 `crypto.timingSafeEqual()` 进行常量时间比较。注意需要将两个字符串转为等长 Buffer。

### H5. 评论内容无长度限制

**文件**: `src/app/api/albums/[id]/comments/route.ts:74-117`
**问题**: 评论内容仅检查 `!data.content`（存在性），无最大长度校验，可被用于存储超大内容。
**修复**: 添加 `content.length > 5000` 校验，返回 400 错误。同时对 `author_name`（100）、`author_url`（500）添加长度限制。

---

## MEDIUM - 建议修复

### M1. 错误信息泄露内部细节

**文件**: 多个 admin 路由（albums、media、comments 等）
**问题**: `catch` 块返回 `{ err: String(e) }` 或 `{ error: String(e) }`，暴露堆栈信息和内部错误消息。
**修复**: 改为返回通用错误消息（如 `"Internal server error"`），完整错误仅 `console.error` 记录。

### M2. pageSize 无上限校验

**文件**: 多个 list 路由（media/list、admin/media/list 等）
**问题**: `parseInt(searchParams.get('pageSize')!)` 无边界检查，可传入极大值导致性能问题。
**修复**: 添加 `Math.min(Math.max(pageSize, 1), 100)` 约束。`page` 同理确保 >= 1。

### M3. 评论接口无速率限制

**文件**: `src/app/api/albums/[id]/comments/route.ts`
**问题**: POST 评论无速率限制，同一 IP 可无限制发评论。
**修复**: 参照 album view 的 KV 速率限制模式，添加每 IP 10 分钟 5 条评论限制。

### M4. Media Like 无速率限制

**文件**: `src/app/api/media/[id]/like/route.ts`
**问题**: 有 bot 检测但无频率限制，可人为刷赞。
**修复**: 参照 albumLikeServices 模式，添加 KV 速率限制（10 次/分钟/IP）。

### M5. IP Hash 函数重复 3 次

**文件**: `mediaViewServices.ts`、`albumViewServices.ts`、`albumLikeServices.ts`
**问题**: `hashIp()` 和 `buildKey()` 函数在三个文件中完全相同，违反 DRY 原则。
**修复**: 提取到 `src/lib/crypto.ts`（hashIp）和 `src/lib/kv.ts`（buildKey），三个 service 统一引用。

### M6. 错误响应格式不统一

**文件**: 全局
**问题**: 混用 `{ err: ... }`、`{ error: ... }`、`{ ok: false }`、`{ success: false }` 等多种格式。
**修复**: 统一为 `{ ok: false, error: "..." }` 格式。`err` 字段全部改为 `error`。service 层统一返回 `{ success, ... }` 或 `{ ok, ... }`（选定一种）。

### M7. KV→DB 同步失败静默吞掉

**文件**: mediaViewServices、albumViewServices、likeServices
**问题**: KV 更新成功但 DB 同步失败时仅 `console.error`，客户端认为操作成功。
**修复**: 短期内可接受（KV 是主存储），但建议添加 metric/counter 追踪同步失败次数。长期考虑后台定时同步任务。

### M8. 无 CSRF 保护

**文件**: admin 路由
**问题**: admin 路由仅靠 HttpOnly cookie 认证，缺少 CSRF token。
**修复**: 添加 `X-CSRF-Token` header 校验或使用 SameSite=Strict cookie 属性（当前已是 SameSite=Lax）。鉴于是单用户站点，优先级可降低。

---

## LOW - 改进建议

### L1. isBot() 正则每次调用重新编译

**文件**: `src/services/mediaViewServices.ts:26`
**问题**: 正则字面量在函数体内，每次调用重新编译。
**修复**: 提取为模块级常量 `const BOT_PATTERN = /bot|spider|.../i;`

### L2. Rate limit / TTL 值硬编码

**文件**: albumViewServices、albumLikeServices、mediaViewServices
**问题**: `DEDUP_TTL_SECONDS = 300`、`MAX_REQUESTS = 20` 等值硬编码。
**修复**: 可暂不改动，后续统一到 `SITE_CONFIG` 或环境变量。

### L3. LikeButton 状态同步在 render 中执行

**文件**: `src/components/LikeButton.tsx:57-62`
**问题**: 状态同步逻辑直接在组件渲染函数体中执行，可能触发多余的重新渲染。
**修复**: 移入 `useEffect` 并设置正确的依赖数组。

### L4. admin/mediaServices.ts 全文件禁用 no-explicit-any

**文件**: `src/services/admin/mediaServices.ts:1`
**问题**: `/* eslint-disable @typescript-eslint/no-explicit-any */` 导致整个文件失去类型检查。
**修复**: 逐步为 DB 操作参数添加具体类型，移除全局 disable。可分批进行。

### L5. 缺少前端 ErrorBoundary

**问题**: 前台和后台均无 ErrorBoundary 组件，子组件抛错会导致整页白屏。
**修复**: 在 layout 层添加 React ErrorBoundary，显示友好的错误提示页面。

---

## Implementation Priority

### 第一批（本次修复）
- H1、H2、H3、H4、H5

### 第二批
- M1、M2、M5、M6

### 第三批
- M3、M4、M8

### 后续迭代
- M7、L1-L5
