# 更新日志

本文件记录项目的重要变更。

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

