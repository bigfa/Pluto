# Pluto Deployment to Cloudflare Workers (EN)

This guide describes how to deploy Pluto to Cloudflare Workers (OpenNext).

## Prerequisites

- Node.js 18+ and `npm`
- Cloudflare account
- `wrangler` available via `npx wrangler`

## 1) Install Dependencies

```bash
npm install
```

## 2) Cloudflare Setup

Create the following in Cloudflare:

- **D1 Database**
- **R2 Bucket** (or other storage provider)
- **KV Namespace** (optional but used in this project)

## 3) Configure `wrangler.toml`

Ensure `wrangler.toml` includes:

- `name`
- `compatibility_date`
- `d1_databases`
- `r2_buckets`
- `kv_namespaces`
- `vars` for env values

Example:

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

## 4) Environment Variables

Required (typical):

- `NEXT_PUBLIC_BASE_URL`
- `ADMIN_USER`
- `ADMIN_PASS_HASH`
- `SESSION_SECRET`

## Generate `ADMIN_PASS_HASH`

Use the built-in script:

```bash
node scripts/hash-password.mjs "<your-password>"
```

Copy the output and set it as `ADMIN_PASS_HASH` (via `wrangler secret put` or your env/vars).

Storage (choose one provider):

- R2: `MEDIA_BUCKET` binding + `R2_DOMAIN`
- UpYun: `UPYUN_BUCKET`, `UPYUN_OPERATOR`, `UPYUN_PASSWORD`, `UPYUN_DOMAIN`
- COS: `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`, `COS_DOMAIN`

Newsletter (optional):

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` or `EMAIL_FROM`

## Database Initialization (D1)

Run the D1 init script once:

```bash
npx wrangler d1 execute <DB_NAME> --file=sql/init_d1.sql
```

You can also run this in the D1 Console if you prefer.

## Sync From Local `.env`

If you want to push your local `.env` values to Workers in one step:

```bash
npm run wrangler:sync-env -- --file .env.local
```

This script writes non-sensitive values into `wrangler.toml` under `[vars]` (or `[env.<name>.vars]` when using `--env`),
and pushes secrets via `wrangler secret put`. You can pass `--env <name>` or run a dry run with `--dry-run`.

## 5) Build & Deploy

```bash
npm run deploy
```

This runs OpenNext build and deploys to Workers.

## Wrangler Vars & Secrets

Non-secret values live in `wrangler.toml`:

```toml
[vars]
NEXT_PUBLIC_BASE_URL = "https://example.com"
R2_DOMAIN = "https://your-r2-domain"
EMAIL_FROM = "hi@example.com"
NEXT_PUBLIC_SITE_NAME = "Pluto"
NEXT_PUBLIC_SITE_TITLE = "Pluto"
NEXT_PUBLIC_SITE_DESCRIPTION = "My photo gallery"
NEXT_PUBLIC_SITE_URL = "https://example.com"
NEXT_PUBLIC_DEFAULT_LOCALE = "zh"
NEXT_PUBLIC_LOCALES = "zh,en"
NEXT_PUBLIC_NAV_LINKS = "[]"
NEXT_PUBLIC_MASONRY_COLUMNS = "4"
NEXT_PUBLIC_PAGE_SIZE = "20"
NEXT_PUBLIC_MEDIA_GAP = "16"
NEXT_PUBLIC_MEDIA_GAP_MOBILE = "8"
NEXT_PUBLIC_ENABLE_FILTERS = "true"
NEXT_PUBLIC_ENABLE_LIKES = "true"
NEXT_PUBLIC_ENABLE_NEWSLETTER = "false"
NEXT_PUBLIC_ENABLE_FOOTER_MENU = "true"
```

Per-environment:

```toml
[env.production.vars]
NEXT_PUBLIC_BASE_URL = "https://example.com"
```

Secrets are still set via CLI:

```bash
wrangler secret put ADMIN_USER
wrangler secret put ADMIN_PASS_HASH
wrangler secret put SESSION_SECRET
wrangler secret put RESEND_API_KEY
```

## 6) Git-Connected Auto Builds (Workers Builds)

Use this if you want Cloudflare to build and deploy automatically on push.

1. Open Cloudflare Dashboard → **Workers & Pages** → **Workers**.
2. Click **Create application** → **Connect to Git** (Workers Builds).
3. Select your Git provider and repository.
4. Configure:
   - **Build command**: `npm run build`
   - **Build output**: `.open-next` (or the OpenNext output directory used by this project)
   - **Root directory**: project root
   - **Environment variables**: same as in `wrangler.toml` (or use secrets in the dashboard)
5. Link your D1/R2/KV bindings in **Settings → Variables & Bindings**.
6. Save and deploy. Subsequent pushes to the selected branch will auto-build.

Tip: If you use `npm run deploy` locally, keep Workers Builds disabled to avoid double-deploys.

## 7) Verify

- Visit your domain or the Workers URL
- Login to `/admin`

## Notes

- Admin cookie name: `photos_admin`
- For i18n default language: `NEXT_PUBLIC_DEFAULT_LOCALE`
