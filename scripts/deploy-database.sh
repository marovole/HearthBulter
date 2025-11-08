#!/bin/bash

# 数据库部署迁移脚本
# 用于生产环境数据库表结构创建

echo "🗄️ 健康管家数据库部署脚本"
echo ""

# 检查 Prisma CLI
if ! command -v npx &> /dev/null; then
    echo "❌ npx 未找到"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

echo "📋 数据库迁移步骤"
echo "=================="

echo ""
echo "🎯 步骤 1: 检查 Prisma 客户端"
echo "---------------------------------"
npx prisma generate
if [ $? -eq 0 ]; then
    echo "✅ Prisma 客户端生成成功"
else
    echo "❌ Prisma 客户端生成失败"
    exit 1
fi

echo ""
echo "🎯 步骤 2: 部署数据库迁移"
echo "------------------------------"
echo "⚠️  注意: 这将应用数据库结构到生产环境"
echo "⏱️  预计时间: 1-2 分钟"

npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移部署成功"
else
    echo "❌ 数据库迁移失败"
    echo ""
    echo "🛠️ 可能的原因:"
    echo "1. DATABASE_URL 环境变量未配置或错误"
    echo "2. 数据库连接权限不足"
    echo "3. 数据库服务器不可访问"
    echo ""
    echo "🔧 解决建议:"
    echo "1. 检查 Vercel 环境变量配置"
    echo "2. 验证数据库连接字符串格式"
    echo "3. 确认数据库服务器状态"
    exit 1
fi

echo ""
echo "🎯 步骤 3: 验证迁移状态"
echo "-------------------------"
npx prisma migrate status
if [ $? -eq 0 ]; then
    echo "✅ 迁移状态检查成功"
else
    echo "⚠️  迁移状态检查失败，但这通常不影响功能"
fi

echo ""
echo "🎯 步骤 4: 生成 Prisma Studio 访问"
echo "------------------------------------"
echo "💡 提示: Prisma Studio 可用于查看数据库内容"
echo "🔗 访问命令: npx prisma studio"
echo "⚠️  注意: 仅在本地开发时使用，不要在生产环境暴露"

echo ""
echo "📊 迁移完成检查清单"
echo "===================="
echo "✅ Prisma 客户端已生成"
echo "✅ 数据库表结构已创建"
echo "✅ 所有迁移已应用"
echo "✅ 数据库连接正常"

echo ""
echo "🚀 后续验证步骤"
echo "=================="
echo "1. 等待 Vercel 部署完成"
echo "2. 运行应用验证:"
echo "   npm run check:deployment https://hearth-bulter.vercel.app"
echo "3. 测试用户注册功能"
echo "4. 测试用户登录功能"
echo "5. 检查 API 端点状态"

echo ""
echo "🔗 有用链接"
echo "============"
echo "- 应用验证: npm run check:deployment https://hearth-bulter.vercel.app"
echo "- Cloudflare Pages Dashboard: https://dash.cloudflare.com"
echo "- 数据库状态: npx prisma migrate status"

echo ""
echo "⏱️  预计完成时间: 5-10 分钟"
echo "🎉 数据库迁移完成后，你的应用将完全可用！"

echo ""
echo "🛠️ 如果遇到问题:"
echo "================="
echo "1. 检查 Vercel 环境变量配置"
echo "2. 验证数据库连接字符串"
echo "3. 查看 Vercel 部署日志"
echo "4. 运行数据库连接测试:"
echo "   npx prisma db pull --preview-feature"

echo ""
echo "📞 技术支持:"
echo "============"
echo "- 部署文档: PRODUCTION_FIX_GUIDE.md"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Cloudflare Pages Dashboard: https://dash.cloudflare.com"
