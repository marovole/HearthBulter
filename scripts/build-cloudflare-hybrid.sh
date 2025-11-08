#!/bin/bash

# Cloudflare Pages + Supabase 混合架构构建脚本
# 用于构建静态导出版本并部署到 Cloudflare Pages

set -e

echo "🚀 开始构建 Cloudflare Pages + Supabase 混合架构..."

# 清理之前的构建
if [ -d ".next" ]; then
  echo "🧹 清理之前的构建文件..."
  rm -rf .next
fi

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 生成 Prisma 客户端（如果需要）
if [ -f "prisma/schema.prisma" ]; then
  echo "🔧 生成 Prisma 客户端..."
  npx prisma generate
fi

# 构建 Next.js 静态导出
echo "🏗️  构建 Next.js 静态导出..."
npm run build

# 验证构建输出
if [ ! -d ".next" ]; then
  echo "❌ 构建失败：未找到 .next 目录"
  exit 1
fi

# 检查主要文件是否存在
if [ ! -f ".next/index.html" ] && [ ! -f ".next/index.htm" ]; then
  echo "⚠️  警告：未找到 index.html 文件"
fi

# 检查 Functions 目录
if [ -d "functions" ]; then
  echo "✅ Functions 目录已存在"
else
  echo "⚠️  警告：未找到 functions 目录"
fi

# 显示构建结果
echo "📊 构建统计："
echo "  - 静态文件目录: .next"
if command -v du >/dev/null 2>&1; then
  echo "  - 构建大小: $(du -sh .next | cut -f1)"
fi

# 可选：运行类型检查
echo "🔍 运行类型检查..."
if npm run type-check; then
  echo "✅ 类型检查通过"
else
  echo "⚠️  类型检查失败，但继续构建"
fi

# 可选：运行测试
echo "🧪 运行测试..."
if npm test; then
  echo "✅ 测试通过"
else
  echo "⚠️  测试失败，但继续构建"
fi

echo "✅ Cloudflare Pages + Supabase 混合架构构建完成！"
echo ""
echo "下一步操作："
echo "  1. 部署到 Cloudflare Pages: npm run deploy:cloudflare-hybrid"
echo "  2. 或者手动部署: wrangler pages deploy .next --project-name=hearthbutler-supabase"
echo ""
echo "⚠️  重要提醒："
echo "  - 确保在 Cloudflare Dashboard 中设置好 Supabase 环境变量"
echo "  - 检查 wrangler.toml 中的配置是否正确"
echo "  - 验证 Supabase 数据库连接是否正常"
