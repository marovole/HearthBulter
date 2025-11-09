#!/bin/bash

###############################################################################
# Cloudflare Pages 环境变量配置脚本
#
# 此脚本生成需要在Cloudflare Dashboard中配置的环境变量列表
# 用户需要手动将这些变量添加到Cloudflare Pages项目中
###############################################################################

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Cloudflare Pages 环境变量配置助手                      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  警告: 当前目录不是项目根目录${NC}"
    echo "请在项目根目录运行此脚本"
    exit 1
fi

echo -e "${GREEN}📋 生成环境变量配置...${NC}"
echo ""

# 读取 .env.local 文件
if [ -f ".env.local" ]; then
    source .env.local

    echo -e "${BLUE}✅ 找到 .env.local 文件${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  未找到 .env.local 文件${NC}"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

# 获取当前部署URL (如果存在)
if [ -f ".git/HEAD" ]; then
    DEPLOYMENT_URL="https://341ddd09.hearthbulter.pages.dev"
else
    DEPLOYMENT_URL="https://your-deployment-url.pages.dev"
fi

echo -e "${GREEN}📝 请在 Cloudflare Dashboard 中添加以下环境变量:${NC}"
echo ""

echo "┌─────────────────────────────────────────────────────────────┐"
echo "│ 访问地址: https://dash.cloudflare.com/pages                 │"
echo "│ 项目名称: hearthbulter                                     │"
echo "│ 部署URL: $DEPLOYMENT_URL"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

echo -e "${BLUE}1️⃣  添加到 'Production' 环境的所有变量:${NC}"
echo ""

# 打印环境变量 (隐藏敏感信息)
echo "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (已缩短)"
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "NEXTAUTH_URL=$DEPLOYMENT_URL"
echo "DATABASE_URL=postgresql://postgres.***@aws-***.pooler.supabase.com:6543/postgres"
echo ""

echo -e "${BLUE}2️⃣  完整环境变量列表 (用于复制粘贴):${NC}"
echo ""

cat << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://ppmliptjvzurewsiwswb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxpcHRqdnp1cmV3c2l3c3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODQ0MzEsImV4cCI6MjA3ODE2MDQzMX0.r1_kuC6ekX1u1omuxjdf4c7ZQ_e70ciqwKGGqK6mkP0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxpcHRqdnp1cmV3c2l3c3diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjU4NDQzMSwiZXhwIjoyMDc4MTYwNDMxfQ.BhFu9dKvNwaNX1GIIpheCGcm7DLgTKj7qNGh4-xgylA
NEXTAUTH_SECRET=4oHRfQeVZU4XKnaBKWvnnMYkuG4p1VXGOX6Zz5S6XtQ=
NEXTAUTH_URL=https://341ddd09.hearthbulter.pages.dev
EOF

echo ""
echo ""

echo -e "${GREEN}📋 操作步骤:${NC}"
echo "1. 打开 Cloudflare Dashboard: https://dash.cloudflare.com"
echo "2. 转到 'Pages' 部分"
echo "3. 选择 'hearthbulter' 项目"
echo "4. 点击 'Settings' 选项卡"
echo "5. 找到 'Environment variables' 部分"
echo "6. 点击 'Add variable' 按钮"
echo "7. 逐个添加上述所有变量"
echo "8. 确保选择 'Production' 环境"
echo "9. 保存后重新部署"
echo ""

echo -e "${GREEN}✅ 配置完成后:${NC}"
echo "- 访问: https://341ddd09.hearthbulter.pages.dev"
echo "- 等待 2-3 分钟让配置生效"
echo "- 测试网站基本功能"
echo ""

echo -e "${BLUE}💡 提示: 如有疑问，请参考 DEPLOYMENT_SUCCESS_REPORT.md${NC}"
echo ""
