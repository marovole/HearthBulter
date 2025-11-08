#!/bin/bash

# Cloudflare Workers 部署脚本
# 用于解决Pages的25MB限制问题

set -e

echo "🚀 Cloudflare Workers 部署脚本"
echo "==============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查环境变量
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}❌ 错误: CLOUDFLARE_API_TOKEN 环境变量未设置${NC}"
    echo -e "${YELLOW}请设置 Cloudflare API 令牌:${NC}"
    echo "export CLOUDFLARE_API_TOKEN='your-api-token'"
    exit 1
fi

# 配置
WORKER_NAME="hearthbulter-optimized"
BUILD_DIR=".open-next"
WRANGLER_CONFIG="wrangler-optimized.toml"

echo -e "${BLUE}配置信息:${NC}"
echo "- Worker名称: $WORKER_NAME"
echo "- 构建目录: $BUILD_DIR"
echo "- Wrangler配置: $WRANGLER_CONFIG"
echo ""

# 检查构建输出
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ 错误: 构建目录不存在${NC}"
    echo "请先运行: pnpm run build:cloudflare-optimized"
    exit 1
fi

# 检查worker文件
if [ ! -f "$BUILD_DIR/worker.js" ]; then
    echo -e "${RED}❌ 错误: worker.js不存在${NC}"
    echo "构建可能失败，请检查构建日志"
    exit 1
fi

# 检查包大小
echo "📊 检查包大小..."
WORKER_SIZE=$(wc -c < "$BUILD_DIR/worker.js")
WORKER_SIZE_MB=$(echo "scale=2; $WORKER_SIZE / 1024 / 1024" | bc -l 2>/dev/null || echo "0")

echo "Worker文件大小: ${WORKER_SIZE_MB} MB"

if (( $(echo "$WORKER_SIZE_MB > 10" | bc -l 2>/dev/null || echo "0") )); then
    echo -e "${YELLOW}⚠️  警告: Worker文件大于10MB，可能影响性能${NC}"
fi

# 优化Workers配置
echo "🔧 优化Workers配置..."

# 创建优化的wrangler配置
cat > "$WRANGLER_CONFIG" << EOF
name = "$WORKER_NAME"
main = "$BUILD_DIR/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat", "nodejs_als"]

[env.production]
name = "${WORKER_NAME}-prod"

[vars]
NODE_ENV = "production"
NEXT_PUBLIC_ALLOWED_ORIGINS = "https://${WORKER_NAME}.your-subdomain.workers.dev"

[env.production.vars]
NODE_ENV = "production"
EOF

echo "✅ Wrangler配置创建完成"

# 部署到Workers
echo "🚀 部署到Cloudflare Workers..."
echo "这可能需要几分钟时间..."

if npx wrangler deploy --config "$WRANGLER_CONFIG"; then
    echo -e "${GREEN}✅ Workers部署成功！${NC}"
    echo ""
    echo "🎉 Cloudflare Workers 部署完成！"
    echo "==================================="
    echo ""
    echo "下一步:"
    echo "1. 访问 Cloudflare Dashboard 查看Workers状态"
    echo "2. 配置自定义域名（如需）"
echo "3. 测试应用功能是否正常"
    echo "4. 监控性能和错误日志"
    echo ""
    echo "Worker地址格式: https://$WORKER_NAME.your-subdomain.workers.dev"
    echo ""
    echo "优势:"
    echo "✅ 支持更大的包大小（最多10MB Worker文件）"
    echo "✅ 更灵活的函数配置"
    echo "✅ 更好的边缘计算性能"
    echo ""
    echo "注意: 需要在Cloudflare Dashboard中配置环境变量"
    
else
    echo -e "${RED}❌ Workers部署失败${NC}"
    echo ""
    echo "常见问题排查:"
    echo "1. 检查 CLOUDFLARE_API_TOKEN 是否正确"
    echo "2. 确认账户是否有Workers权限"
    echo "3. 检查Worker名称是否已被占用"
    echo "4. 查看详细错误日志"
    exit 1
fi

# 提供环境变量配置指导
echo ""
echo "🔧 环境变量配置指导:"
echo "在Cloudflare Dashboard中设置以下环境变量:"
echo "- DATABASE_URL: 您的Neon数据库连接字符串"
echo "- NEXTAUTH_SECRET: NextAuth密钥"
echo "- NEXTAUTH_URL: Worker部署地址"
echo "- 其他应用所需的环境变量"
echo ""
echo "配置完成后，您的应用将可以通过Workers访问！" 🎉

# 记录部署信息
echo "$(date): Workers部署完成 - $WORKER_NAME" >> deployment.log 2>/dev/null || true

exit 0
