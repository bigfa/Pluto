#!/bin/bash

# Supabase 快速设置脚本
# 用法: ./scripts/setup-supabase.sh

set -e

echo "🚀 Supabase 集成设置向导"
echo "=========================="
echo ""

# 检查是否已安装 Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI 未安装"
    echo "是否要安装 Supabase CLI? (y/n)"
    read -r install_cli

    if [ "$install_cli" = "y" ]; then
        echo "📦 正在安装 Supabase CLI..."
        npm install -g supabase
    fi
fi

# 检查 .env.local 是否存在
if [ ! -f .env.local ]; then
    echo "📝 创建 .env.local 文件..."
    cp .env.example .env.local
    echo "✅ .env.local 已创建"
else
    echo "ℹ️  .env.local 文件已存在"
fi

echo ""
echo "请输入你的 Supabase 项目信息："
echo "（可以在 https://app.supabase.com 的项目设置中找到）"
echo ""

# 读取 Supabase URL
read -p "Supabase URL (例: https://xxx.supabase.co): " supabase_url
read -p "Supabase Anon Key: " supabase_anon_key
read -p "Supabase Service Role Key: " supabase_service_key
read -p "Database URL (例: postgresql://...): " database_url

# 更新 .env.local
echo ""
echo "📝 更新环境变量..."

# 使用 sed 更新环境变量（兼容 macOS 和 Linux）
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$supabase_url|" .env.local
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key|" .env.local
    sed -i '' "s|SUPABASE_URL=.*|SUPABASE_URL=$supabase_url|" .env.local
    sed -i '' "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$supabase_service_key|" .env.local
    sed -i '' "s|SUPABASE_DB_URL=.*|SUPABASE_DB_URL=$database_url|" .env.local
else
    # Linux
    sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$supabase_url|" .env.local
    sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key|" .env.local
    sed -i "s|SUPABASE_URL=.*|SUPABASE_URL=$supabase_url|" .env.local
    sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$supabase_service_key|" .env.local
    sed -i "s|SUPABASE_DB_URL=.*|SUPABASE_DB_URL=$database_url|" .env.local
fi

echo "✅ 环境变量已更新"
echo ""

# 询问是否要推送数据库 schema
echo "是否要推送数据库 schema 到 Supabase? (y/n)"
read -r push_schema

if [ "$push_schema" = "y" ]; then
    echo "📊 推送数据库 schema..."
    npx drizzle-kit push --config=drizzle.config.supabase.ts
    echo "✅ Schema 已推送"
fi

echo ""
echo "🎉 Supabase 设置完成！"
echo ""
echo "下一步："
echo "1. 在 Supabase Dashboard 中创建 Storage Buckets (media, thumbnails, avatars)"
echo "2. 为表启用 Row Level Security (RLS)"
echo "3. 运行 'npm run dev' 启动开发服务器"
echo ""
echo "📚 详细文档请查看: SUPABASE_SETUP.md"
