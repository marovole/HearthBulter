#!/bin/bash

# Cloudflare Pages 部署脚本
# 用于自动化部署到Cloudflare Pages

set -e

echo "🚀 开始 Cloudflare Pages 部署流程"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境变量
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}❌ 错误: CLOUDFLARE_API_TOKEN 环境变量未设置${NC}"
    echo -e "${YELLOW}请设置 Cloudflare API 令牌:${NC}"
    echo "export CLOUDFLARE_API_TOKEN='your-api-token'"
    echo ""
    echo "获取 API 令牌步骤:"
    echo "1. 访问 https://dash.cloudflare.com/profile/api-tokens"
    echo "2. 创建自定义令牌，包含以下权限:"
    echo "   - Cloudflare Pages:Edit"
    echo "   - Account:Read"
    echo "   - User:Read"
    exit 1
fi

# 检查项目是否存在
PROJECT_NAME="hearthbulter"
echo -e "${GREEN}✓${NC} 项目名: $PROJECT_NAME"

# 验证构建输出
if [ ! -d ".open-next" ]; then
    echo -e "${RED}❌ 错误: .open-next 目录不存在${NC}"
    echo "请先运行: pnpm run build:cloudflare"
    exit 1
fi

# 检查关键文件
if [ ! -f ".open-next/_worker.js" ]; then
    echo -e "${RED}❌ 错误: _worker.js 不存在${NC}"
    echo "构建可能失败，请检查构建日志"
    exit 1
fi

echo -e "${GREEN}✓${NC} 构建输出验证通过"

# 显示构建信息
echo ""
echo "📊 构建信息:"
echo "- Worker 文件大小: $(wc -c < .open-next/_worker.js) bytes"
echo "- 总构建大小: $(du -sh .open-next | cut -f1)"
echo ""

# 执行部署
echo "🚀 开始部署到 Cloudflare Pages..."
echo "这可能需要几分钟时间..."

if npx wrangler pages deploy .open-next --project-name=$PROJECT_NAME; then
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo ""
    echo "🎉 Cloudflare Pages 部署完成！"
    echo "=================================="
    echo ""
    echo "下一步:"
    echo "1. 访问 Cloudflare Dashboard 查看部署状态"
    echo "2. 在 Pages 设置中配置自定义域名（如需）"
    echo "3. 测试应用功能是否正常"
    echo "4. 监控性能和错误日志"
    echo ""
    echo "部署地址格式: https://$PROJECT_NAME.pages.dev"
    echo ""
    echo "如果需要回滚，可以随时切换回 Vercel 部署"
else
    echo -e "${RED}❌ 部署失败${NC}"
    echo ""
    echo "常见问题排查:"
    echo "1. 检查 CLOUDFLARE_API_TOKEN 是否正确"
    echo "2. 确认账户是否有 Pages 权限"
    echo "3. 检查项目名是否已被占用"
    echo "4. 查看详细错误日志"
    exit 1
fi
