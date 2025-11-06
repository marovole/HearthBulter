#!/bin/bash

# Vercel 生产环境变量配置助手
# 简化环境变量配置过程

echo "🔧 健康管家生产环境变量配置助手"
echo ""

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装"
    echo "请运行: npm i -g vercel"
    exit 1
fi

if ! vercel whoami &> /dev/null; then
    echo "❌ 未登录 Vercel"
    echo "请运行: vercel login"
    exit 1
fi

echo "✅ Vercel 环境检查通过"
echo ""

# 生成安全的 NEXTAUTH_SECRET
generate_secret() {
    openssl rand -base64 32 2>/dev/null || {
        echo "请手动生成32字符的安全密钥"
        echo "推荐使用: openssl rand -base64 32"
        return 1
    }
}

echo "📋 必需的环境变量配置"
echo "================================="

echo ""
echo "1️⃣ DATABASE_URL (PostgreSQL 连接)"
echo "推荐使用 Supabase，配置如下："
echo ""
echo "   Supabase 项目创建步骤："
echo "   - 访问: https://supabase.com"
echo "   - 创建新项目: hearthbutler-prod"
echo "   - 获取连接字符串 (使用 .pooler. 链接)"
echo ""
echo "   连接字符串格式："
echo "   postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
echo ""

echo "2️⃣ NEXTAUTH_SECRET (认证密钥)"
echo "需要生成32+字符的安全密钥："
generated_secret=$(generate_secret)
if [ $? -eq 0 ]; then
    echo "   建议密钥: $generated_secret"
fi
echo ""

echo "3️⃣ NEXTAUTH_URL (应用域名)"
echo "部署后从 Vercel 获取实际域名，格式："
echo "   https://your-hearthbulter-app.vercel.app"
echo ""

echo "4️⃣ NEXT_PUBLIC_ALLOWED_ORIGINS (CORS 配置)"
echo "与 NEXTAUTH_URL 相同的域名"
echo ""

echo "🔗 Redis 缓存配置 (已有)"
echo "UPSTASH_REDIS_REST_URL: 已配置"
echo "UPSTASH_REDIS_REST_TOKEN: 已配置"
echo ""

echo "📝 配置步骤"
echo "==============="
echo ""
echo "方法1: 使用 Vercel CLI"
echo "---------------------------------"
echo "逐个添加环境变量："
echo ""
echo "# 数据库连接"
echo 'vercel env add DATABASE_URL production'
echo ""
echo "# 认证密钥"
echo 'vercel env add NEXTAUTH_SECRET production'
echo ""
echo "# 应用域名 (部署后更新)"
echo 'vercel env add NEXTAUTH_URL production'
echo ""
echo "# CORS 配置"
echo 'vercel env add NEXT_PUBLIC_ALLOWED_ORIGINS production'
echo ""
echo "# Redis 配置 (如果需要)"
echo 'vercel env add UPSTASH_REDIS_REST_URL production'
echo 'vercel env add UPSTASH_REDIS_REST_TOKEN production'
echo ""

echo "方法2: 使用 Vercel Dashboard"
echo "-----------------------------------"
echo "1. 访问: https://vercel.com/dashboard"
echo "2. 进入项目: Settings → Environment Variables"
echo "3. 点击 'Add' 添加以下变量："
echo ""
echo "变量清单:"
echo "- DATABASE_URL"
echo "- NEXTAUTH_SECRET"
echo "- NEXTAUTH_URL"
echo "- NEXT_PUBLIC_ALLOWED_ORIGINS"
echo "- UPSTASH_REDIS_REST_URL"
echo "- UPSTASH_REDIS_REST_TOKEN"
echo ""

echo "🚨 重要提醒"
echo "============"
echo "1. NEXTAUTH_SECRET 必须 32+ 字符且非示例值"
echo "2. NEXTAUTH_URL 部署后需要更新为实际域名"
echo "3. DATABASE_URL 推荐使用 Supabase 的 .pooler. 连接"
echo "4. 更新环境变量后会触发重新部署"
echo ""

echo "✅ 环境变量配置完成后:"
echo "1. 等待 Vercel 自动重新部署"
echo "2. 获取实际的部署域名"
echo "3. 更新 NEXTAUTH_URL 为实际域名"
echo "4. 运行部署验证: npm run check:deployment <url>"
echo ""

echo "🔍 验证命令参考:"
echo "=================="
echo "# 检查部署状态"
echo "npm run check:deployment https://your-app.vercel.app"
echo ""
echo "# 本地验证"
echo "npm run pre-deploy"
echo "npm run build"
echo ""

echo "📞 需要帮助？"
echo "============"
echo "- 部署文档: VERCEL_PRODUCTION_DEPLOYMENT.md"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- 快速状态检查: npm run quick-status-check"
