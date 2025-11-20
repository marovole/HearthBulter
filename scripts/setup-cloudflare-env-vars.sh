#!/bin/bash

# Cloudflare Pages 环境变量配置脚本
# 使用方法：
# 1. 修改下面的环境变量值
# 2. 运行：bash scripts/setup-cloudflare-env-vars.sh

set -e

echo "🔧 配置 Cloudflare Pages 环境变量..."
echo ""

# 项目名称
PROJECT_NAME="hearthbulter"

# ===========================================
# ⚠️ 请在下面替换为你的实际值
# ===========================================

# Supabase 配置
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key-here"
SUPABASE_ANON_KEY="your-anon-key-here"

# 数据库配置
DATABASE_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"

# NextAuth 配置
NEXTAUTH_SECRET="your-32-character-secret-here"
NEXTAUTH_URL="https://hearthbulter.pages.dev"

# AI API 配置（可选）
OPENAI_API_KEY="your-openai-api-key"
OPENROUTER_API_KEY="your-openrouter-api-key"

# ===========================================

echo "📋 将要设置以下环境变量："
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - SUPABASE_SERVICE_KEY"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - DATABASE_URL"
echo "  - NEXTAUTH_SECRET"
echo "  - NEXTAUTH_URL"
echo ""

# 检查是否已安装 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误: wrangler 未安装"
    echo "请先安装: npm install -g wrangler"
    exit 1
fi

# 提示用户确认
read -p "⚠️ 确认要设置这些环境变量吗？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

echo ""
echo "🚀 开始设置环境变量..."

# 设置 Production 环境变量
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --name="$PROJECT_NAME" <<< "$SUPABASE_URL"
npx wrangler pages secret put SUPABASE_SERVICE_KEY --name="$PROJECT_NAME" <<< "$SUPABASE_SERVICE_KEY"
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --name="$PROJECT_NAME" <<< "$SUPABASE_ANON_KEY"
npx wrangler pages secret put DATABASE_URL --name="$PROJECT_NAME" <<< "$DATABASE_URL"
npx wrangler pages secret put NEXTAUTH_SECRET --name="$PROJECT_NAME" <<< "$NEXTAUTH_SECRET"
npx wrangler pages secret put NEXTAUTH_URL --name="$PROJECT_NAME" <<< "$NEXTAUTH_URL"

# 可选的 AI API keys
if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "your-openai-api-key" ]; then
    npx wrangler pages secret put OPENAI_API_KEY --name="$PROJECT_NAME" <<< "$OPENAI_API_KEY"
fi

if [ -n "$OPENROUTER_API_KEY" ] && [ "$OPENROUTER_API_KEY" != "your-openrouter-api-key" ]; then
    npx wrangler pages secret put OPENROUTER_API_KEY --name="$PROJECT_NAME" <<< "$OPENROUTER_API_KEY"
fi

echo ""
echo "✅ 环境变量设置完成！"
echo ""
echo "📝 下一步："
echo "  1. 触发重新部署：git commit --allow-empty -m 'chore: trigger rebuild' && git push"
echo "  2. 或访问 Cloudflare Pages 控制台手动重新部署"
echo ""
