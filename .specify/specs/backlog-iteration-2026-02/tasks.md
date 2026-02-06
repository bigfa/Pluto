# 任务清单：Backlog 迭代（2026-02）

**Spec**: `.specify/specs/backlog-iteration-2026-02/spec.md`  
**Plan**: `.specify/specs/backlog-iteration-2026-02/plan.md`

## 阶段 1 — 展示与体验

1. 校验媒体排序逻辑：优先 `datetime_original`，缺失则回退 `created_at`。
2. 确保仅在 `sort=date` 时做日期分组展示。
3. 审核相册列表与首页移动端布局，修复遮挡/间距问题。
4. 确认分类接口仅返回 `show_in_frontend=1`。

## 阶段 2 — 后台上传体验

1. 验证多图上传队列与粘贴流程。
2. 每张图片显示独立进度遮罩。
3. 重复图片检测与提示逻辑稳定。

## 阶段 3 — 订阅与邮件可靠性

1. 审核 newsletter 发送接口返回的 `sent` 计数。
2. 后台发送失败时提示清晰。
3. 若响应结构有变更，更新 API 文档。

## 阶段 4 — 测试与回归

1. 为新增/变更逻辑补充单元测试。
2. 执行 `npm test` 并修复失败用例。

## 退出标准

1. Spec 验收场景全部通过。
2. 测试全部通过。
3. 接口或行为变更同步到文档。
