# Pluto

📷 单用户个人照片展示与管理。

## 功能特性

- **瀑布流布局**：尊重原始比例
- **响应式设计**：移动端优先
- **UI 可配置**：通过 `src/config/site.ts`
- **筛选与排序**：分类、方向、日期、热度
- **灯箱预览**：支持键盘操作
- **后台管理**：`/admin`
- **Workers 部署**：OpenNext 适配

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 pnpm

### 安装步骤

1. 克隆代码仓库:

    ```bash
    git clone <repository-url>
    cd photos
    ```

2. 安装依赖:

    ```bash
    npm install
    ```

3. 配置环境变量:
   复制 `.env.example` 为 `.env.local` 并修改（完整列表见 `CONFIGURATION_ZH.md`）。

4. 启动开发服务器:
    ```bash
    npm run dev
    ```

## 配置指南

请参考：

- `CONFIGURATION.md`（EN）
- `CONFIGURATION_ZH.md`（中文）

## Docker + SQLite（本地）

适合单容器部署，使用 SQLite + 本地媒体目录：

1. 设置环境变量：

```bash
SQLITE_PATH=/data/pluto.db
MEDIA_DEFAULT_PROVIDER=local
MEDIA_LOCAL_DIR=/data/uploads
MEDIA_LOCAL_PUBLIC_URL=https://your-domain/uploads
```

也可以使用 `MEDIA_LOCAL_PUBLIC_URL=/uploads`。

2. 初始化数据库（仅需一次）：

```bash
sqlite3 /data/pluto.db < sql/init_d1.sql
```

3. 构建并启动：

```bash
npm run build
npm run start
```

请确保 `/data` 是持久化挂载目录。

### Docker 构建与运行

```bash
docker build -t pluto:local .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e SQLITE_PATH=/data/pluto.db \
  -e MEDIA_DEFAULT_PROVIDER=local \
  -e MEDIA_LOCAL_DIR=/data/uploads \
  -e MEDIA_LOCAL_PUBLIC_URL=/uploads \
  -e NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASS_HASH=pbkdf2:100000:<salt_hex>:<hash_hex> \
  -e SESSION_SECRET=change-me-to-a-long-random-string \
  -v $(pwd)/data:/data \
  pluto:local
```

或使用 `docker-compose`：

```bash
docker compose up --build
```

### Nginx 静态路由（本地媒体）

如果希望 Nginx 直接托管本地图片：

```nginx
location /uploads/ {
  alias /data/uploads/;
  access_log off;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

设置 `MEDIA_LOCAL_PUBLIC_URL=https://your-domain/uploads`，并确保 `/data/uploads` 已挂载。

如果不使用 Nginx，也可以把卷挂载到 `public/uploads`，并设置 `MEDIA_LOCAL_DIR=public/uploads`，`MEDIA_LOCAL_PUBLIC_URL=/uploads`。

## 部署

本项目使用 OpenNext 部署到 **Cloudflare Workers**。

- 手动部署：`npm run deploy`
- Git 自动构建：Workers Builds（Git 绑定）

详细说明：

- `DEPLOY_WORKERS.md`
- `DEPLOY_WORKERS_ZH.md`

## API 文档

请参考：

- `API_DOC.md`（EN）
- `API_DOC_ZH.md`（中文）

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS & SCSS Modules
- **图标**: Lucide React
- **部署**: Cloudflare Workers (OpenNext)
