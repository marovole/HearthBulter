#!/bin/bash

# Supabase 配置助手脚本
# 引导用户完成 Supabase 数据库配置

echo "🔧 健康管家 Supabase 配置助手"
echo ""

# 检查命令是否可用
check_command() {
    if command -v "$1" &> /dev/null; then
        echo "✅ $1 已安装"
        return 0
    else
        echo "❌ $1 未安装"
        return 1
    fi
}

echo "🔍 检查环境要求"
echo "===================="

check_command "open"
check_command "curl"

echo ""
echo "📋 Supabase 配置步骤"
echo "=================="

echo ""
echo "🎯 步骤 1: 创建 Supabase 项目"
echo "------------------------------"
echo "1. 在浏览器中访问: https://supabase.com"
echo "2. 点击 'Start your project' 或 'New project'"
echo "3. 选择组织 (如果没有，需要先创建组织)"
echo "4. 项目配置:"
echo "   - 项目名称: hearthbutler-prod"
echo "   - 数据库密码: [生成强密码，建议保存到密码管理器]"
echo "   - 区域: Northeast Asia (Seoul) - 推荐最近区域"
echo "5. 点击 'Create new project'"
echo ""
echo "⏱️  预计时间: 2-3 分钟 (数据库初始化)"
echo ""

echo "🎯 步骤 2: 获取数据库连接字符串"
echo "------------------------------------"
echo "1. 项目创建完成后，进入项目仪表盘"
echo "2. 在左侧菜单点击 'Settings'"
echo "3. 选择 'Database' 标签页"
echo "4. 找到 'Connection string' 部分"
echo "5. 点击 'URI' 旁边的复制按钮"
echo ""
echo "⚠️  重要: 必须使用 'Pooler' 连接字符串"
echo "格式应该包含: .pooler."
echo "示例: postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
echo ""

echo "🎯 步骤 3: 配置 Vercel 环境变量"
echo "--------------------------------------"
echo "1. 访问: https://dash.cloudflare.com"
echo "2. 找到并点击 'HearthBulter' 项目"
echo "3. 点击 'Settings' 标签"
echo "4. 选择 'Environment Variables'"
echo "5. 添加以下变量:"
echo ""

echo "📝 环境变量配置清单"
echo "======================"
echo ""

# 生成连接字符串模板
echo "DATABASE_URL:"
echo "将刚才复制的 Supabase 连接字符串粘贴到这里"
echo ""

# 提供已生成的安全密钥
echo "NEXTAUTH_SECRET:"
echo "ntZl8q4ZA3c2LIWf+rpJKTDBYJzYeUpjCEY/X0Jy5Ho="
echo ""

echo "NEXTAUTH_URL:"
echo "https://hearth-bulter.vercel.app"
echo ""

echo "NEXT_PUBLIC_ALLOWED_ORIGINS:"
echo "https://hearth-bulter.vercel.app"
echo ""

# Redis 配置提示
echo "UPSTASH_REDIS_REST_URL:"
echo "https://teaching-eagle-34132.upstash.io"
echo ""

echo "UPSTASH_REDIS_REST_TOKEN:"
echo "AYVUAAIncDJlNTBmMjlkMDBhMDY0MTU1OWQ2YmVjM2Q2N2Y2MmI3ZHAyMzQxMzI"
echo ""

echo ""
echo "🎯 步骤 4: 运行数据库迁移"
echo "------------------------------"
echo "1. 等待 Vercel 部署完成 (环境变量更新后)"
echo "2. 在项目根目录运行:"
echo "   npx prisma migrate deploy"
echo "3. 验证迁移状态:"
echo "   npx prisma migrate status"
echo ""

echo "🎯 步骤 5: 验证配置"
echo "-------------------------"
echo "1. 等待 Vercel 重新部署完成"
echo "2. 运行验证检查:"
echo "   npm run check:deployment https://hearth-bulter.vercel.app"
echo "3. 手动测试:"
echo "   - 访问: https://hearth-bulter.vercel.app"
echo "   - 测试用户注册功能"
echo "   - 测试用户登录功能"
echo "   - 检查: https://hearth-bulter.vercel.app/api/health"
echo ""

echo "🛠️ 常见问题解决"
echo "=================="

echo "问题1: 连接字符串格式错误"
echo "症状: 数据库连接失败"
echo "解决: 确保使用 .pooler. 连接，而非直接连接"
echo ""

echo "问题2: 密码包含特殊字符"
echo "症状: 连接认证失败"
echo "解决: URL 编码密码或重新生成简单密码"
echo ""

echo "问题3: 区域选择不当"
echo "症状: 连接速度慢"
echo "解决: 选择最近的区域 (推荐 Seoul)"
echo ""

echo "问题4: 权限不足"
echo "症状: 数据库操作失败"
echo "解决: 检查 Supabase 用户权限设置"
echo ""

echo "📋 配置完成检查清单"
echo "===================="
echo "✅ Supabase 项目创建成功"
echo "✅ 连接字符串已复制 (使用 .pooler.)"
echo "✅ Vercel 环境变量已配置"
echo "✅ 数据库迁移已运行"
echo "✅ API 端点返回 HTTP 200"
echo "✅ 用户可以注册和登录"
echo ""

echo "🔗 有用链接"
echo "============"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Cloudflare Pages Dashboard: https://dash.cloudflare.com"
echo "- 部署验证: npm run check:deployment https://hearth-bulter.vercel.app"
echo "- 修复指南: PRODUCTION_FIX_GUIDE.md"
echo ""

echo "🎯 预期结果"
echo "============"
echo "✅ 数据库连接正常"
echo "✅ API 端点工作正常"
echo "✅ 用户可以注册登录"
echo "✅ 系统健康分数 > 80%"
echo ""

echo "⏱️  预计配置时间: 15-20 分钟"
echo "🎉 配置完成后你的健康管家应用将完全可用！"

echo ""
echo "💡 提示: 如果遇到问题，可以运行这个脚本重新查看详细步骤"
echo "📞 需要帮助时，查看 PRODUCTION_FIX_GUIDE.md 获取更多故障排除信息"
