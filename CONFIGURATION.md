# Pluto Configuration Reference (EN)

This document lists environment variables and config options used by the project, and explains what they do.

## How to Configure

- Cloudflare Workers: set variables in `wrangler.toml` or in the Cloudflare dashboard.
- Local development: set in `.env` / `.env.local`.

## Site / Branding (Public)

These are used by the frontend and are safe to expose.

- `NEXT_PUBLIC_SITE_NAME`
  - Site name shown in header/title.
  - Default: `Pluto`

- `NEXT_PUBLIC_SITE_TITLE`
  - HTML title used on public pages.
  - Default: `Pluto - Personal Photography Portfolio`

- `NEXT_PUBLIC_SITE_DESCRIPTION`
  - Meta description used by the public pages.
  - Default: `A showcase of personal photography works featuring landscapes, portraits, and more.`

- `NEXT_PUBLIC_SITE_LOGO`
  - Logo text/emoji.
  - Default: `📷`

- `NEXT_PUBLIC_SITE_URL`
  - Canonical site URL.
  - Default: `https://w.wpista.com`

## `src/config/site.ts` Options

These are non-env configuration values in `src/config/site.ts`.

- `siteInfo`
  - `name`, `title`, `description`, `logo`, `url`
  - Can be overridden by the `NEXT_PUBLIC_SITE_*` env vars above.

- `i18n`
  - `defaultLocale`: default language (env override: `NEXT_PUBLIC_DEFAULT_LOCALE`)
  - `locales`: supported locales list

- `navLinks`
  - Top navigation links (label/labelKey/href)

- `masonryColumns`
  - Masonry columns by breakpoint
  - Keys: `default`, `xl`, `lg`, `md`, `sm`

- `mediaGap`
  - Frontend photo grid spacing
  - `desktop` (env override: `NEXT_PUBLIC_MEDIA_GAP`)
  - `mobile` (env override: `NEXT_PUBLIC_MEDIA_GAP_MOBILE`)

- `pageSize`
  - Default page size for list endpoints (frontend usage)

- `features`
  - `enableFilters`: show filter panel
  - `enableLikes`: enable like functionality
  - `enableNewsletter`: enable newsletter/subscribe UI
  - `enableFooterMenu`: enable footer links

## Full Example `site.ts` Snippet

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

## i18n

- `NEXT_PUBLIC_DEFAULT_LOCALE`
  - Default language for the site and admin.
  - Supported: `en`, `zh`
  - Default: `en`

## Layout / UI

- `NEXT_PUBLIC_MEDIA_GAP`
  - Frontend photo grid spacing (desktop).
  - Example: `1rem`, `12px`
  - Default: `1rem`

- `NEXT_PUBLIC_MEDIA_GAP_MOBILE`
  - Frontend photo grid spacing (mobile).
  - Example: `0.75rem`, `8px`
  - Default: `0.75rem`

## API / Base URLs

- `NEXT_PUBLIC_BASE_URL`
  - Public base URL used for emails and links.
  - Example: `https://example.com`

- `NEXT_PUBLIC_API_BASE_URL`
  - Optional API base for client-side fallback.
  - Example: `https://example.com/api`

## Admin Auth

- `ADMIN_USER`
  - Admin username.

- `ADMIN_PASS_HASH`
  - PBKDF2 password hash (preferred).

- `ADMIN_PASS`
  - Plaintext password (legacy fallback).

- `SESSION_SECRET`
  - Secret for signing admin session tokens.

## Database

- `SUPABASE_DB_URL`
  - Postgres connection string for Supabase.

- `SUPABASE_URL`
  - Supabase project URL.

- `SUPABASE_SERVICE_ROLE_KEY`
  - Supabase service role key (server-only).

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase URL for client usage.

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase anon key for client usage.

## Storage Providers

### Default provider

- `MEDIA_DEFAULT_PROVIDER`
  - Default storage provider: `local` | `r2` | `upyun` | `cos`

### Local (Filesystem)

- `MEDIA_LOCAL_DIR`
  - Filesystem directory for uploaded media.
  - Default: `public/uploads`

- `MEDIA_LOCAL_PUBLIC_URL`
  - Public base URL for local files.
  - Example: `https://example.com/uploads` or `/uploads`
  - Default: `/uploads`

### R2

- `MEDIA_BUCKET`
  - Bound R2 bucket (Cloudflare binding, not env var)

- `R2_DOMAIN`
  - R2 public domain

- `MEDIA_DOMAIN`
  - Optional override for public media domain

### UpYun

- `UPYUN_BUCKET`
- `UPYUN_OPERATOR`
- `UPYUN_PASSWORD`
- `UPYUN_DOMAIN`

### Tencent COS

- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `COS_DOMAIN`

## Media URL Styles

These allow appending style parameters to image URLs for thumbnails and sizes.

- `MEDIA_THUMB_STYLE`
- `MEDIA_MEDIUM_STYLE`
- `MEDIA_LARGE_STYLE`

## Email / Newsletter (Resend)

- `RESEND_API_KEY`
  - Resend API key.

- `RESEND_FROM_EMAIL`
  - From address used when sending newsletters.

- `EMAIL_FROM`
  - Fallback from address if `RESEND_FROM_EMAIL` is not set.

## Geocoding (Optional)

- `GEOCODE_PROVIDER`
- `GEOCODE_API_KEY`
- `GEOCODE_USER_AGENT`
- `GEOCODE_LANGUAGE`
