# Tasks: Code Review Fixes

**Input**: Design documents from `specs/002-code-review-fixes/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Critical Security & Data Fixes (H1-H5)

**Purpose**: 修复安全漏洞和数据正确性问题

- [ ] T001 [H1] 修改 `src/app/api/albums/[id]/comments/[commentId]/route.ts`: DELETE handler 添加 `requireAdmin()` 鉴权检查，删除 TODO 注释
- [ ] T002 [H2] 修改 `src/services/admin/mediaServices.ts:614`: 将 `updateData.alt = changes.description` 改为 `updateData.description = changes.description`
- [ ] T003 [H3] 修改 `src/services/likeServices.ts`: DB 同步改用 `sql\`COALESCE(${schema.media.likes}, 0) + 1\`` 原子递增，替换 `set({ likes: newCount })` 覆盖写入（like 和 unlike 两个分支都需修改）
- [ ] T004 [H4] 修改 `src/app/api/albums/[id]/unlock/route.ts`: 密码比较改用 `crypto.timingSafeEqual()`，需 TextEncoder 转 Uint8Array，处理长度不等情况
- [ ] T005 [H5] 修改 `src/app/api/albums/[id]/comments/route.ts`: POST handler 添加字段长度校验 — `content`(5000)、`author_name`(100)、`author_url`(500)，超限返回 400

**Checkpoint**: 所有安全漏洞和数据 Bug 修复完毕

---

## Phase 2: Error Handling & Input Validation (M1, M2, M6)

**Purpose**: 统一错误处理和输入校验

- [ ] T006 [P] [M1] 修改 admin 路由中的 catch 块: 将 `{ err: String(e) }` 改为 `{ ok: false, error: "Internal server error" }`，保留 `console.error(e)`。涉及文件:
  - `src/app/api/admin/albums/route.ts`
  - `src/app/api/admin/albums/[id]/route.ts`
  - `src/app/api/admin/media/upload/route.ts`
  - `src/app/api/admin/media/[id]/route.ts`
  - 其他返回 `String(e)` 的 admin 路由
- [ ] T007 [P] [M2] 修改 list 路由的 pageSize/page 校验: 添加 `Math.min(Math.max(pageSize, 1), 100)` 和 `Math.max(page, 1)`。涉及文件:
  - `src/app/api/media/list/route.ts`
  - `src/app/api/admin/media/list/route.ts`
  - `src/app/api/albums/route.ts`（如适用）
- [ ] T008 [P] [M6] 统一错误响应格式: 将 admin 路由中的 `err` 字段全部改为 `error`，确保所有响应使用 `{ ok: false, error: "..." }` 格式。可与 T006 合并执行

**Checkpoint**: 错误处理统一，输入边界受控

---

## Phase 3: Code Deduplication (M5, L1)

**Purpose**: 提取重复代码为共享模块

- [ ] T009 新建 `src/lib/crypto.ts`: 提取 `hashIp()` 函数（从 albumViewServices.ts 复制，导出）
- [ ] T010 新建 `src/lib/kv.ts`: 提取 `buildKey()` 函数（从 albumViewServices.ts 复制，导出）
- [ ] T011 [P] 修改 `src/services/mediaViewServices.ts`: 删除本地 `hashIp`/`buildKey`，改为从 `@/lib/crypto` 和 `@/lib/kv` 导入；将 bot 正则提取为模块级常量（L1）
- [ ] T012 [P] 修改 `src/services/albumViewServices.ts`: 删除本地 `hashIp`/`buildKey`，改为从共享模块导入
- [ ] T013 [P] 修改 `src/services/albumLikeServices.ts`: 删除本地 `hashIp`/`buildKey`，改为从共享模块导入

**Checkpoint**: 三个 service 共享 hashIp/buildKey，无重复代码

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: 无依赖，立即开始。T001-T005 互不依赖可并行
- **Phase 2**: 无依赖，可与 Phase 1 并行。T006/T007/T008 互不依赖可并行
- **Phase 3**: T009/T010 先完成，然后 T011/T012/T013 可并行

### Implementation Strategy

1. Phase 1 全部并行完成 → 验证安全修复
2. Phase 2 全部并行完成 → 验证错误处理
3. Phase 3 顺序完成（先建共享模块，再改 service）→ 验证无回归
