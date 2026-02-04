# Pluto 配置参数文档（中文）

本文档说明项目使用的环境变量与配置参数及其作用。

## 配置方式

- Cloudflare Workers：在 `wrangler.toml` 或控制台中设置。
- 本地开发：使用 `.env` / `.env.local`。

## 站点信息（前台）

以下变量用于前台展示，可安全暴露。

- `NEXT_PUBLIC_SITE_NAME`
  - 站点名称（导航栏/标题显示）
  - 默认值：`Pluto`

- `NEXT_PUBLIC_SITE_TITLE`
  - 前台页面 HTML 标题
  - 默认值：`Pluto - Personal Photography Portfolio`

- `NEXT_PUBLIC_SITE_DESCRIPTION`
  - 前台页面描述
  - 默认值：`A showcase of personal photography works featuring landscapes, portraits, and more.`

- `NEXT_PUBLIC_SITE_LOGO`
  - 站点 Logo 文本/符号
  - 默认值：`📷`

- `NEXT_PUBLIC_SITE_URL`
  - 站点主域名
  - 默认值：`https://w.wpista.com`

## `src/config/site.ts` 配置项

这些是 `src/config/site.ts` 中的非环境变量配置。

- `siteInfo`
  - `name`, `title`, `description`, `logo`, `url`
  - 可被 `NEXT_PUBLIC_SITE_*` 环境变量覆盖

- `i18n`
  - `defaultLocale`：默认语言（可用 `NEXT_PUBLIC_DEFAULT_LOCALE` 覆盖）
  - `locales`：支持的语言列表

- `navLinks`
  - 顶部导航菜单配置（label/labelKey/href）

- `masonryColumns`
  - 瀑布流列数配置（不同断点）
  - 字段：`default`, `xl`, `lg`, `md`, `sm`

- `mediaGap`
  - 前台照片网格间距
  - `desktop`（可用 `NEXT_PUBLIC_MEDIA_GAP` 覆盖）
  - `mobile`（可用 `NEXT_PUBLIC_MEDIA_GAP_MOBILE` 覆盖）

- `pageSize`
  - 列表默认分页大小（前台使用）

- `features`
  - `enableFilters`：是否显示筛选面板
  - `enableLikes`：是否启用点赞
  - `enableNewsletter`：是否启用订阅/邮件入口
  - `enableFooterMenu`：是否显示页脚菜单

## 完整示例 `site.ts` 配置片段

```ts
export const SITE_CONFIG = {
  siteInfo: {
    name: "Pluto",
    logo: "📷",
    title: "Pluto - Personal Photography Portfolio",
    description: "A showcase of personal photography works featuring landscapes, portraits, and more.",
    url: "https://example.com",
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh"],
  },
  navLinks: [
    { href: "/", label: "Home", labelKey: "nav_home" },
    { href: "/albums", label: "Albums", labelKey: "nav_albums" },
    { href: "/categories", label: "Categories", labelKey: "nav_categories" },
    { href: "/about", label: "About", labelKey: "nav_about" },
  ],
  masonryColumns: {
    default: 3,
    xl: 3,
    lg: 3,
    md: 2,
    sm: 1,
  },
  mediaGap: {
    desktop: "1rem",
    mobile: "0.75rem",
  },
  pageSize: 20,
  features: {
    enableFilters: true,
    enableLikes: true,
    enableNewsletter: true,
    enableFooterMenu: true,
  },
};
```

## 多语言 i18n

- `NEXT_PUBLIC_DEFAULT_LOCALE`
  - 默认语言
  - 支持：`en`、`zh`
  - 默认：`en`

## 布局 / UI

- `NEXT_PUBLIC_MEDIA_GAP`
  - 前台照片网格间距（桌面端）
  - 示例：`1rem`、`12px`
  - 默认：`1rem`

- `NEXT_PUBLIC_MEDIA_GAP_MOBILE`
  - 前台照片网格间距（移动端）
  - 示例：`0.75rem`、`8px`
  - 默认：`0.75rem`

## API / 基础地址

- `NEXT_PUBLIC_BASE_URL`
  - 网站基准地址（用于邮件与链接）
  - 示例：`https://example.com`

- `NEXT_PUBLIC_API_BASE_URL`
  - 可选，前端备用 API 地址
  - 示例：`https://example.com/api`

## 管理后台登录

- `ADMIN_USER`
  - 管理员用户名

- `ADMIN_PASS_HASH`
  - PBKDF2 密码 Hash（推荐）

- `ADMIN_PASS`
  - 明文密码（旧方案，不推荐）

- `SESSION_SECRET`
  - 用于签发后台 Session Token

## 数据库

- `SQLITE_PATH`
  - 本地 SQLite 文件路径（Node/Docker 环境）。
  - 设置后优先使用 SQLite（优先于 Supabase/D1）。
  - 示例：`/data/pluto.db`

- `SUPABASE_DB_URL`
  - Supabase Postgres 连接串

- `SUPABASE_URL`
  - Supabase 项目地址

- `SUPABASE_SERVICE_ROLE_KEY`
  - Supabase Service Role Key（仅服务端使用）

- `NEXT_PUBLIC_SUPABASE_URL`
  - 前端使用的 Supabase URL

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 前端使用的 Supabase Anon Key

## 存储配置

### 默认存储

- `MEDIA_DEFAULT_PROVIDER`
  - 默认存储：`local` | `r2` | `upyun` | `cos`

### 本地存储（Filesystem）

- `MEDIA_LOCAL_DIR`
  - 本地文件存储目录。
  - 默认：`public/uploads`

- `MEDIA_LOCAL_PUBLIC_URL`
  - 本地文件的公开访问前缀。
  - 示例：`https://example.com/uploads` 或 `/uploads`
  - 默认：`/uploads`

### R2

- `MEDIA_BUCKET`
  - 绑定的 R2 存储桶（Cloudflare binding）

- `R2_DOMAIN`
  - R2 公网域名

- `MEDIA_DOMAIN`
  - 可选，覆盖媒体域名

### 又拍云 UpYun

- `UPYUN_BUCKET`
- `UPYUN_OPERATOR`
- `UPYUN_PASSWORD`
- `UPYUN_DOMAIN`

### 腾讯 COS

- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `COS_DOMAIN`

## 图片样式参数

用于控制缩略图/中图/大图的 URL 参数。

- `MEDIA_THUMB_STYLE`
- `MEDIA_MEDIUM_STYLE`
- `MEDIA_LARGE_STYLE`

## 邮件 / Newsletter（Resend）

- `RESEND_API_KEY`
  - Resend API Key

- `RESEND_FROM_EMAIL`
  - 邮件 From 地址

- `EMAIL_FROM`
  - 备用 From 地址（当未设置 `RESEND_FROM_EMAIL` 时使用）

## 地理编码（可选）

- `GEOCODE_PROVIDER`
- `GEOCODE_API_KEY`
- `GEOCODE_USER_AGENT`
- `GEOCODE_LANGUAGE`
