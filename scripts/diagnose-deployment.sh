#!/bin/bash
#
# Cloudflare Pages 部署诊断脚本
#

set -euo pipefail

echo "🔍 诊断 Cloudflare Pages 部署问题..."
echo ""

# 1. 检查已上传的机密
echo "1️⃣ 检查已配置的机密变量："
npx wrangler pages secret list --project-name=hearthbulter
echo ""

# 2. 检查最新部署状态
echo "2️⃣ 检查最新部署："
npx wrangler pages deployment list --project-name=hearthbulter | head -10
echo ""

# 3. 检查构建产物
echo "3️⃣ 检查构建产物："
if [ -d ".open-next" ]; then
  echo "✅ .open-next 目录存在"
  echo "   大小: $(du -sh .open-next | cut -f1)"
  echo "   关键文件:"
  ls -lh .open-next/*.js 2>/dev/null || echo "   ❌ 未找到 worker.js"
else
  echo "❌ .open-next 目录不存在，需要重新构建"
fi
echo ""

# 4. 检查 wrangler.toml 配置
echo "4️⃣ 检查 wrangler.toml 公开变量："
grep -A 20 "^\[vars\]" wrangler.toml | grep -E "^[A-Z_]+" || echo "未找到变量配置"
echo ""

# 5. 建议
echo "📋 诊断建议："
echo ""
echo "如果部署显示 Active 但网站无法访问，请："
echo "1. 访问 Cloudflare Dashboard 查看运行时日志："
echo "   https://dash.cloudflare.com/b80eef96097fab92f15b574ed5fbb927/pages/view/hearthbulter"
echo ""
echo "2. 进入最新部署 → Functions 标签 → 查看实时日志"
echo ""
echo "3. 查找以下可能的错误："
echo "   - 'Missing environment variable'"
echo "   - 'Cannot find module'"
echo "   - 'Prisma Client'"
echo "   - 'NextAuth'"
echo ""
echo "4. 如果看到具体错误，复制完整错误信息来找我分析"
echo ""
