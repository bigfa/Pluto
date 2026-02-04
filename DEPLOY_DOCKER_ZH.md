# Pluto Docker 镜像部署指南（中文）

本指南适用于使用已发布的 Docker 镜像（如 Docker Hub）部署 Pluto。适合本地或服务器环境，默认使用 SQLite + 本地媒体目录。

## 1. 准备工作

- 已安装 Docker 与 Docker Compose
- 准备一个可持久化的目录用于数据存储（数据库与上传文件）

建议目录结构：

```
./data
  ├─ pluto.db
  └─ uploads/
```

## 2. 必要环境变量

最少需要以下配置：

- `ADMIN_USER` 管理员用户名
- `ADMIN_PASS_HASH` 管理员密码哈希（PBKDF2）
- `SESSION_SECRET` 会话加密密钥（建议 32+ 随机字符）
- `SQLITE_PATH` SQLite 数据库路径（容器内路径）

推荐配置示例：

```
ADMIN_USER=admin
ADMIN_PASS_HASH=pbkdf2:100000:<salt_hex>:<hash_hex>
SESSION_SECRET=change-me-to-a-long-random-string
SQLITE_PATH=/data/pluto.db
MEDIA_DEFAULT_PROVIDER=local
MEDIA_LOCAL_DIR=/data/uploads
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 生成 ADMIN_PASS_HASH

在本地运行（Node 环境）：

```
node -e "const crypto=require('crypto');const pass='your-password';const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.pbkdf2Sync(pass,salt,100000,32,'sha256').toString('hex');console.log(`pbkdf2:100000:${salt}:${hash}`)"
```

将输出内容填入 `ADMIN_PASS_HASH`。

## 3. 使用 docker run 部署

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

访问：`http://localhost:3000`

首次启动会自动初始化 SQLite 数据库（使用 `sql/init_d1.sql`）。

## 4. 使用 docker-compose 部署（推荐）

创建 `docker-compose.yml`：

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

启动：

```
docker compose up -d
```

访问：`http://localhost:3000`

## 5. 可选：Nginx Sidecar（本地媒体访问）

如果需要 `/uploads` 直接访问本地图片，可使用 Nginx Sidecar。

`docker-compose.yml` 例子：

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

访问：`http://localhost:8080`

> `nginx/nginx.conf` 在项目中已提供完整示例。

## 6. 更新镜像

```
docker pull fatesinger/pluto:latest

# docker run

docker stop pluto && docker rm pluto
# 重新执行 docker run

# docker-compose
docker compose down

docker compose up -d
```

## 7. 常见问题

### 报错：ReferenceError: require is not defined

通常是运行的镜像不是最新版本或运行环境不是 Node。请重新拉取镜像并重启容器：

```
docker pull fatesinger/pluto:latest

docker compose up -d --force-recreate
```

### 数据库没有初始化

确保容器内 `SQLITE_PATH` 路径指向 `/data` 挂载目录，首次启动会自动初始化。

### 本地图片无法访问

如果使用本地媒体，需要配置：

- `MEDIA_LOCAL_DIR=/data/uploads`
- `MEDIA_LOCAL_PUBLIC_URL=/uploads`

并使用 Nginx Sidecar 或其他反代，将 `/uploads` 映射为静态目录。

---

如需更多配置说明，请参考 `CONFIGURATION_ZH.md`。
