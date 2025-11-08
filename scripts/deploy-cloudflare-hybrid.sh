#!/bin/bash

# Cloudflare Pages + Supabase 混合架构部署脚本

set -e

echo "🚀 开始部署 Cloudflare Pages + Supabase 混合架构..."

# 检查环境变量
echo "🔍 检查环境变量..."
required_vars=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ 缺少必需的环境变量: $var"
    echo "请在 Cloudflare Pages 设置中添加以下环境变量："
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_KEY"
    exit 1
  fi
done

echo "✅ 环境变量检查通过"

# 检查 wrangler 是否安装
if ! command -v wrangler >/dev/null 2>&1; then
  echo "📦 安装 wrangler CLI..."
  npm install -g wrangler
fi

# 检查项目配置
echo "🔧 检查项目配置..."
if [ ! -f "wrangler.toml" ]; then
  echo "❌ 未找到 wrangler.toml 文件"
  exit 1
fi

# 构建项目
echo "🏗️  构建项目..."
if [ -f "scripts/build-cloudflare-hybrid.sh" ]; then
  bash scripts/build-cloudflare-hybrid.sh
else
  npm run build
fi

# 检查构建输出
if [ ! -d ".next" ]; then
  echo "❌ 构建失败：未找到 .next 目录"
  exit 1
fi

# 获取项目名称
project_name=$(grep "name.*=" wrangler.toml | head -1 | cut -d'"' -f2)
if [ -z "$project_name" ]; then
  project_name="hearthbutler-supabase"
fi

echo "📋 部署信息："
echo "  - 项目名称: $project_name"
echo "  - 构建目录: .next"
echo "  - 环境: ${NODE_ENV:-production}"

# 部署到 Cloudflare Pages
echo "🚀 部署到 Cloudflare Pages..."
if [ "$NODE_ENV" = "development" ]; then
  wrangler pages deploy .next --project-name="$project_name" --env development
elif [ "$NODE_ENV" = "staging" ]; then
  wrangler pages deploy .next --project-name="$project_name" --env staging
else
  wrangler pages deploy .next --project-name="$project_name" --env production
fi

# 检查部署状态
if [ $? -eq 0 ]; then
  echo "✅ 部署成功！"
  echo ""
  echo "🌐 访问您的应用："
  echo "  - 生产环境: https://$project_name.pages.dev"
  echo "  - 检查 Cloudflare Dashboard 获取准确的 URL"
  echo ""
  echo "📊 监控和日志："
  echo "  - Cloudflare Dashboard: https://dash.cloudflare.com"
  echo "  - Pages 日志: https://dash.cloudflare.com/pages/view/$project_name"
  echo ""
  echo "🔧 后续步骤："
  echo "  1. 验证所有 API 端点是否正常工作"
  echo "  2. 测试用户认证流程"
  echo "  3. 检查数据库连接"
  echo "  4. 配置自定义域名（可选）"
else
  echo "❌ 部署失败"
  echo "请检查："
  echo "  - Cloudflare 认证配置"
  echo "  - 环境变量设置"
  echo "  - 构建输出是否完整"
  exit 1
fi
