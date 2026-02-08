# Tasks: Media View Count

**Input**: Design documents from `specs/001-media-view-count/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Database & Schema (Shared Infrastructure)

**Purpose**: 数据库和类型基础，所有 User Story 的前置依赖

- [x] T001 [P] 修改 `src/db/schema.ts`: media 表增加 `view_count: integer("view_count")` 字段（放在 `likes` 旁边）
- [x] T002 [P] 修改 `src/db/schema_pg.ts`: PostgreSQL 版本同步增加 `view_count` 字段
- [x] T003 [P] 新建 `drizzle/0004_add_media_view_count.sql`: `ALTER TABLE media ADD COLUMN view_count INTEGER; CREATE INDEX IF NOT EXISTS idx_media_view_count ON media(view_count);`
- [x] T004 [P] 修改 `sql/init_d1.sql` 和 `sql/init_supabase.sql`: 新建表定义中增加 `view_count` 字段和索引
- [x] T005 修改 `src/types/media.ts`: `Media` 接口增加 `view_count?: number`；`MediaListParams.sort` 类型扩展为 `'date' | 'likes' | 'views'`

**Checkpoint**: 数据库与类型定义就绪

---

## Phase 2: User Story 1 - Record Photo Views (Priority: P1) 🎯 MVP

**Goal**: 访客打开灯箱时记录浏览，通过 KV 去重

**Independent Test**: 调用 POST /api/media/{id}/view，验证 view_count 增加；5 分钟内重复调用不增加

### Implementation

- [x] T006 新建 `src/services/mediaViewServices.ts`: 参照 `albumViewServices.ts` 实现
  - `hashIp()` / `buildKey()` 工具函数（可直接复制）
  - KV Key 前缀: `media:view:` (计数), `media:view:dedup:` (去重)
  - `getMediaViewCount(env, mediaId)`: KV 优先 → DB 回退
  - `incrementMediaView(env, mediaId, clientIp)`: 去重检查 → 增加计数 → 同步 DB
  - 去重: KV key `media:view:dedup:{mediaId}:{ipHash}`, TTL 300s
  - `isBot(userAgent)`: 常见爬虫 UA 匹配函数
- [x] T007 新建 `src/app/api/media/[id]/view/route.ts`:
  - GET: 返回 `{ views }`
  - POST: 提取 IP(`cf-connecting-ip`)、UA；Bot 过滤；调用 `incrementMediaView`；返回 `{ ok, views }`

**Checkpoint**: 浏览量记录功能完成，可通过 API 验证

---

## Phase 3: User Story 2 - Display View Count in UI (Priority: P2)

**Goal**: 灯箱中展示浏览量，打开时触发记录

**Independent Test**: 在灯箱中看到 eye icon + 浏览数字

### Implementation

- [x] T008 修改 `src/lib/api.ts`: 增加 `recordMediaView(id)` 和 `getMediaViewCount(id)` 函数
- [x] T009 修改 `src/app/api/media/[id]/route.ts`: 返回数据中增加 `view_count` 字段
- [x] T010 修改 `src/app/api/media/list/route.ts`: select 中增加 `view_count` 字段，返回结果中包含 `view_count`
- [x] T011 修改 `src/components/LightBox.tsx`:
  - 在 likeSection 下方增加浏览量显示（eye icon + count）
  - 灯箱打开时调用 `recordMediaView(media.id)`，更新本地 state
- [x] T012 修改 `src/lib/i18n.ts`: 增加浏览量相关文案（如需）

**Checkpoint**: 灯箱展示浏览量且打开时计数增加

---

## Phase 4: User Story 3 - Sort by Views (Priority: P3)

**Goal**: 首页增加按浏览量排序选项

**Independent Test**: 选择 "views" 排序，照片按浏览量降序展示

### Implementation

- [x] T013 修改 `src/app/api/media/list/route.ts`: sort 参数支持 `views`，orderBy 增加 `desc(schema.media.view_count)` 分支
- [x] T014 修改 `src/app/(site)/HomeClient.tsx`:
  - `handleSortChange` 类型扩展为 `'date' | 'likes' | 'views'`
  - 排序按钮组增加 "views" 按钮（eye icon + 文案）
- [x] T015 修改 `src/hooks/useMediaList.ts` (如类型需要): sort 类型与 MediaListParams 同步
- [x] T016 修改 `src/lib/i18n.ts`: 增加排序按钮文案 `home_views` / `home_most_viewed`

**Checkpoint**: 首页支持三种排序: date / likes / views

---

## Phase 5: User Story 4 - Admin View Statistics (Priority: P4)

**Goal**: 管理后台媒体列表展示浏览量列

**Independent Test**: 管理后台媒体列表显示 views 列，支持排序

### Implementation

- [x] T017 修改 `src/app/api/admin/media/list/route.ts`: 返回数据中增加 `view_count`
- [x] T018 修改管理后台媒体列表组件: 增加 views 列显示

**Checkpoint**: 管理后台可见浏览量

---

## Phase 6: Polish & Documentation

**Purpose**: 文档更新与最终验证

- [x] T019 [P] 更新 `API_DOC.md` 和 `API_DOC_ZH.md`: 新增 view 相关接口文档
- [x] T020 [P] 更新 `CHANGELOG.md` 和 `CHANGELOG_ZH.md`
- [x] T021 执行数据库迁移（本地 + 远程）
- [x] T022 端到端验证：灯箱浏览 → 计数增加 → 排序生效 → 管理后台可见

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Schema)**: 无依赖，立即开始
- **Phase 2 (US1 - Record)**: 依赖 Phase 1
- **Phase 3 (US2 - Display)**: 依赖 Phase 2（需要 API 和 service）
- **Phase 4 (US3 - Sort)**: 依赖 Phase 1（view_count 字段），可与 Phase 3 并行
- **Phase 5 (US4 - Admin)**: 依赖 Phase 1，可与 Phase 3/4 并行
- **Phase 6 (Polish)**: 依赖所有前置 Phase 完成

### Parallel Opportunities

- T001/T002/T003/T004 可并行（不同文件）
- Phase 4 和 Phase 5 可与 Phase 3 并行
- T019/T020 可并行

### Implementation Strategy: Sequential by Priority

1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
2. 每个 Phase 完成后验证
3. Phase 2 完成即为 MVP
