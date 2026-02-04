# Pluto

📷 Single-user personal photo gallery and manager.

## Features

- **Masonry layout** that respects original aspect ratios
- **Responsive** mobile-first UI
- **Configurable UI** via `src/config/site.ts`
- **Filters & sorting** by category, orientation, date, popularity
- **Lightbox** viewer with keyboard controls
- **Admin panel** at `/admin`
- **Workers-ready** OpenNext deployment

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:

    ```bash
    git clone <repository-url>
    cd photos
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Configure Environment:
   Copy `.env.example` to `.env.local` and edit values (see `CONFIGURATION.md` for full list).

4. Run Development Server:
    ```bash
    npm run dev
    ```

## Configuration

See:

- `CONFIGURATION.md` (EN)
- `CONFIGURATION_ZH.md` (中文)

## Admin Authentication

The project includes a built-in admin panel at `/admin`. You need to configure the following environment variables:

| Variable          | Required    | Description                                 |
| ----------------- | ----------- | ------------------------------------------- |
| `ADMIN_USER`      | Yes         | Admin username                              |
| `ADMIN_PASS_HASH` | Recommended | PBKDF2-SHA256 password hash                 |
| `ADMIN_PASS`      | Fallback    | Plaintext password (not recommended)        |
| `SESSION_SECRET`  | Yes         | JWT signing secret (at least 32 characters) |

### Setting Up Admin Password

1. Generate a password hash:

    ```bash
    node scripts/hash-password.mjs your-password
    # Output: pbkdf2:100000:<salt>:<hash>
    ```

2. Set the environment variable:

    **Cloudflare Workers** (recommended):

    ```bash
    wrangler secret put ADMIN_USER
    wrangler secret put ADMIN_PASS_HASH
    wrangler secret put SESSION_SECRET
    ```

    **Local development** (`.env.local`):

    ```env
    ADMIN_USER=admin
    ADMIN_PASS_HASH=pbkdf2:100000:xxxx:xxxx
    SESSION_SECRET=your-random-secret-at-least-32-chars
    ```

> **Note**: If `ADMIN_PASS_HASH` is set, plaintext `ADMIN_PASS` will be ignored. Login is rate-limited to 5 attempts per 15 minutes per IP (requires KV binding).

## Docker + SQLite (Local)

For a single-container deployment with SQLite and local media storage:

1. Set these environment variables:

```bash
SQLITE_PATH=/data/pluto.db
MEDIA_DEFAULT_PROVIDER=local
MEDIA_LOCAL_DIR=/data/uploads
MEDIA_LOCAL_PUBLIC_URL=https://your-domain/uploads
```

You can also set `MEDIA_LOCAL_PUBLIC_URL=/uploads`.
2. Initialize the database once:

```bash
sqlite3 /data/pluto.db < sql/init_d1.sql
```

3. Run:

```bash
npm run build
npm run start
```

Make sure `/data` is a persistent volume in Docker.

## Deployment

This project targets **Cloudflare Workers** via OpenNext.

- Manual deploy: `npm run deploy`
- Git auto-builds: Workers Builds (Git-connected)

Details:

- `DEPLOY_WORKERS.md`
- `DEPLOY_WORKERS_ZH.md`

## API Docs

See:

- `API_DOC.md` (EN)
- `API_DOC_ZH.md` (中文)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & SCSS Modules
- **Icons**: Lucide React
- **Deployment**: Cloudflare Workers (OpenNext)
