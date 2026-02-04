# Pluto 部署到 Cloudflare Workers（中文）

本指南说明如何将 Pluto 部署到 Cloudflare Workers（OpenNext）。

## 1) 前置条件

- Node.js 18+ 与 `npm`
- Cloudflare 账号
- 通过 `npx wrangler` 使用 Wrangler

## 2) 安装依赖

```bash
npm install
```

## 3) Cloudflare 资源准备

需要创建：

- **D1 数据库**
- **R2 存储桶**（或其他存储）
- **KV Namespace**（可选，但当前项目使用）

## 4) 配置 `wrangler.toml`

确保包含：

- `name`
- `compatibility_date`
- `d1_databases`
- `r2_buckets`
- `kv_namespaces`
- `vars` 环境变量

示例：

```toml
name = "pluto"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "pluto"
database_id = "<your-d1-id>"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "pluto-media"

[[kv_namespaces]]
binding = "FARALLON"
id = "<your-kv-id>"

[vars]
NEXT_PUBLIC_BASE_URL = "https://example.com"
R2_DOMAIN = "https://your-r2-domain"
ADMIN_USER = "admin"
ADMIN_PASS_HASH = "pbkdf2:..."
SESSION_SECRET = "your-secret"
RESEND_API_KEY = "re_..."
EMAIL_FROM = "noreply@example.com"
```

## 5) 环境变量说明

必填（常见）：

- `NEXT_PUBLIC_BASE_URL`
- `ADMIN_USER`
- `ADMIN_PASS_HASH`
- `SESSION_SECRET`

## 生成 `ADMIN_PASS_HASH`

使用内置脚本：

```bash
node scripts/hash-password.mjs "<你的密码>"
```

将输出复制为 `ADMIN_PASS_HASH`（可通过 `wrangler secret put` 或环境变量设置）。

存储（三选一）：

- R2：`MEDIA_BUCKET` 绑定 + `R2_DOMAIN`
- 又拍云：`UPYUN_BUCKET`, `UPYUN_OPERATOR`, `UPYUN_PASSWORD`, `UPYUN_DOMAIN`
- 腾讯 COS：`COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`, `COS_DOMAIN`

邮件订阅（可选）：

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` 或 `EMAIL_FROM`

## 数据库初始化（D1）

首次部署需要执行一次初始化脚本：

```bash
npx wrangler d1 execute <DB_NAME> --file=sql/init_d1.sql
```

也可以在 D1 控制台中执行该脚本。

## 从本地 `.env` 一键同步

如果想把本地 `.env` 的配置一键同步到 Workers：

```bash
npm run wrangler:sync-env -- --file .env.local
```

脚本会自动将敏感值用 `wrangler secret put`，普通值用 `wrangler vars set`。
可传 `--env <name>`，或者 `--dry-run` 做演练。

## 6) 构建与部署

```bash
npm run deploy
```

该命令会执行 OpenNext 构建并部署到 Workers。

## Wrangler Vars / Secret 命令清单

非敏感信息用 `vars`，敏感信息用 `secret`。

```bash
# Public vars
wrangler vars set NEXT_PUBLIC_BASE_URL
wrangler vars set R2_DOMAIN
wrangler vars set EMAIL_FROM
wrangler vars set NEXT_PUBLIC_SITE_NAME
wrangler vars set NEXT_PUBLIC_SITE_TITLE
wrangler vars set NEXT_PUBLIC_SITE_DESCRIPTION
wrangler vars set NEXT_PUBLIC_SITE_URL
wrangler vars set NEXT_PUBLIC_DEFAULT_LOCALE
wrangler vars set NEXT_PUBLIC_LOCALES
wrangler vars set NEXT_PUBLIC_NAV_LINKS
wrangler vars set NEXT_PUBLIC_MASONRY_COLUMNS
wrangler vars set NEXT_PUBLIC_PAGE_SIZE
wrangler vars set NEXT_PUBLIC_MEDIA_GAP
wrangler vars set NEXT_PUBLIC_MEDIA_GAP_MOBILE
wrangler vars set NEXT_PUBLIC_ENABLE_FILTERS
wrangler vars set NEXT_PUBLIC_ENABLE_LIKES
wrangler vars set NEXT_PUBLIC_ENABLE_NEWSLETTER
wrangler vars set NEXT_PUBLIC_ENABLE_FOOTER_MENU

# Secrets
wrangler secret put ADMIN_USER
wrangler secret put ADMIN_PASS_HASH
wrangler secret put SESSION_SECRET
wrangler secret put RESEND_API_KEY
```

## 7) 绑定 Git 自动构建（Workers Builds）

如果希望推送代码后自动构建与部署，使用 Workers Builds：

1. 打开 Cloudflare 控制台 → **Workers & Pages** → **Workers**。
2. 点击 **Create application** → **Connect to Git**（Workers Builds）。
3. 选择 Git 平台和仓库。
4. 配置构建：
   - **Build command**：`npm run build`
   - **Build output**：`.open-next`（或本项目 OpenNext 的输出目录）
   - **Root directory**：项目根目录
   - **Environment variables**：与 `wrangler.toml` 相同（或在控制台中添加 Secret）
5. 在 **Settings → Variables & Bindings** 绑定 D1 / R2 / KV。
6. 保存并部署，之后目标分支每次 push 都会自动构建。

提示：如果你本地使用 `npm run deploy` 部署，建议关闭自动构建以避免重复部署。

## 8) 验证

- 访问域名或 Workers 地址
- 登录 `/admin` 管理后台

## 备注

- 管理员 Cookie 名称：`photos_admin`
- 默认语言可通过 `NEXT_PUBLIC_DEFAULT_LOCALE` 设置
