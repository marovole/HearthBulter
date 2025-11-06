#!/bin/bash

# 快速部署状态检查脚本

echo "🔍 健康管家部署状态检查"
echo ""

# 检查是否有活跃的 vercel 进程
if pgrep -f "vercel" > /dev/null; then
    echo "📊 Vercel CLI 正在运行中..."
    echo "请访问 https://vercel.com/dashboard 查看详细进度"
    echo ""
    echo "💡 提示: 构建通常需要 3-5 分钟"
    echo "⏱️  建议等待构建完成后再进行后续配置"
else
    echo "✅ Vercel CLI 进程已完成"
    echo "🔧 可以继续进行配置和验证"
    echo ""
    
    # 检查最新的 git 提交
    echo "📝 最新提交信息:"
    git log -1 --oneline
    echo ""
    
    echo "📌 下一步操作:"
    echo "1. 访问 Vercel Dashboard 确认部署状态"
    echo "2. 配置生产环境变量"
    echo "3. 运行部署验证脚本"
    echo ""
    echo "🚀 快速命令参考:"
    echo "   - 检查部署状态: npm run check:deployment <url>"
    echo "   - 重新部署: npm run deploy:vercel"
fi

echo ""
echo "🔗 有用链接:"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- 部署文档: VERCEL_PRODUCTION_DEPLOYMENT.md"
echo "- 监控端点: /api/monitoring"
