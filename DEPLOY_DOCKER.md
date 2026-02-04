# Pluto Docker Image Deployment Guide (EN)

This guide explains how to deploy Pluto using a published Docker image (e.g., Docker Hub). It targets local/server environments and defaults to SQLite + local media storage.

## 1. Prerequisites

- Docker and Docker Compose installed
- A persistent directory for database and uploads

Suggested structure:

```
./data
  ├─ pluto.db
  └─ uploads/
```

## 2. Required Environment Variables

Minimum required:

- `ADMIN_USER` admin username
- `ADMIN_PASS_HASH` admin password hash (PBKDF2)
- `SESSION_SECRET` session secret (32+ random chars)
- `SQLITE_PATH` SQLite file path (inside container)

Recommended example:

```
ADMIN_USER=admin
ADMIN_PASS_HASH=pbkdf2:100000:<salt_hex>:<hash_hex>
SESSION_SECRET=change-me-to-a-long-random-string
SQLITE_PATH=/data/pluto.db
MEDIA_DEFAULT_PROVIDER=local
MEDIA_LOCAL_DIR=/data/uploads
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Generate ADMIN_PASS_HASH

Run locally with Node:

```
node -e "const crypto=require('crypto');const pass='your-password';const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.pbkdf2Sync(pass,salt,100000,32,'sha256').toString('hex');console.log(`pbkdf2:100000:${salt}:${hash}`)"
```

Use the output as `ADMIN_PASS_HASH`.

## 3. Deploy via docker run

```
docker pull fatesinger/pluto:latest

docker run -d \
  --name pluto \
  -p 3000:3000 \
  -v $(pwd)/data:/data \
  -e NODE_ENV=production \
  -e SQLITE_PATH=/data/pluto.db \
  -e MEDIA_DEFAULT_PROVIDER=local \
  -e MEDIA_LOCAL_DIR=/data/uploads \
  -e NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASS_HASH=pbkdf2:100000:<salt_hex>:<hash_hex> \
  -e SESSION_SECRET=change-me-to-a-long-random-string \
  fatesinger/pluto:latest
```

Access: `http://localhost:3000`

On first start, SQLite is initialized automatically using `sql/init_d1.sql`.

## 4. Deploy via docker-compose (Recommended)

Create `docker-compose.yml`:

```
services:
  pluto:
    image: fatesinger/pluto:latest
    environment:
      NODE_ENV: production
      SQLITE_PATH: /data/pluto.db
      MEDIA_DEFAULT_PROVIDER: local
      MEDIA_LOCAL_DIR: /data/uploads
      NEXT_PUBLIC_BASE_URL: http://localhost:3000
      ADMIN_USER: admin
      ADMIN_PASS_HASH: pbkdf2:100000:<salt_hex>:<hash_hex>
      SESSION_SECRET: change-me-to-a-long-random-string
    volumes:
      - ./data:/data
    ports:
      - "3000:3000"
```

Start:

```
docker compose up -d
```

Access: `http://localhost:3000`

## 5. Optional: Nginx Sidecar (Local Media Access)

If you want `/uploads` to serve local files directly, use an Nginx sidecar.

Example `docker-compose.yml`:

```
services:
  pluto:
    image: fatesinger/pluto:latest
    environment:
      NODE_ENV: production
      SQLITE_PATH: /data/pluto.db
      MEDIA_DEFAULT_PROVIDER: local
      MEDIA_LOCAL_DIR: /data/uploads
      MEDIA_LOCAL_PUBLIC_URL: /uploads
      NEXT_PUBLIC_BASE_URL: http://localhost:8080
      ADMIN_USER: admin
      ADMIN_PASS_HASH: pbkdf2:100000:<salt_hex>:<hash_hex>
      SESSION_SECRET: change-me-to-a-long-random-string
    volumes:
      - ./data:/data

  nginx:
    image: nginx:1.27-alpine
    depends_on:
      - pluto
    ports:
      - "8080:80"
    volumes:
      - ./data:/data:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

Access: `http://localhost:8080`

> A full `nginx/nginx.conf` example is included in the repo.

## 6. Update Image

```
docker pull fatesinger/pluto:latest

# docker run

docker stop pluto && docker rm pluto
# re-run docker run

# docker-compose

docker compose down

docker compose up -d
```

## 7. Troubleshooting

### `ReferenceError: require is not defined`

Usually means the container is running an old image or a non-Node runtime. Pull the latest image and recreate containers:

```
docker pull fatesinger/pluto:latest

docker compose up -d --force-recreate
```

### Database not initialized

Ensure `SQLITE_PATH` points to `/data` and the volume is mounted. Initialization happens automatically on first start.

### Local images not accessible

For local media, set:

- `MEDIA_LOCAL_DIR=/data/uploads`
- `MEDIA_LOCAL_PUBLIC_URL=/uploads`

Then use Nginx (or another reverse proxy) to map `/uploads` to that directory.

---

See `CONFIGURATION.md` for more configuration details.
