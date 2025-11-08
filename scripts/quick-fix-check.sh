#!/bin/bash

# 快速修复验证脚本

DEPLOYMENT_URL="https://hearth-bulter.vercel.app"

echo "🔧 健康管家快速修复验证"
echo "部署URL: $DEPLOYMENT_URL"
echo ""

# 检查函数
check_status() {
    local url="$1"
    local description="$2"
    local expected="$3"
    
    echo "🔍 检查 $description..."
    
    if command -v curl &> /dev/null; then
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
        if [ "$http_code" = "$expected" ]; then
            echo "✅ $description - HTTP $http_code"
            return 0
        else
            echo "❌ $description - HTTP $http_code (期望 $expected)"
            return 1
        fi
    else
        echo "⚠️  curl 未安装，跳过 $description"
        return 2
    fi
}

echo "📊 关键端点状态检查"
echo "========================"

# 检查关键端点
check_status "$DEPLOYMENT_URL" "首页" "200"
echo ""
check_status "$DEPLOYMENT_URL/api/health" "健康检查端点" "200"
echo ""
check_status "$DEPLOYMENT_URL/api/monitoring" "监控端点" "200"

echo ""
echo "🚨 当前问题诊断"
echo "================"

# 重新检查以获取详细错误
if command -v curl &> /dev/null; then
    health_response=$(curl -s -w "%{http_code}" "$DEPLOYMENT_URL/api/health" -o /tmp/health_response.txt 2>/dev/null)
    monitoring_response=$(curl -s -w "%{http_code}" "$DEPLOYMENT_URL/api/monitoring" -o /tmp/monitoring_response.txt 2>/dev/null)
    
    echo "健康检查端点状态: HTTP $health_response"
    if [ "$health_response" != "200" ]; then
        echo "📝 健康检查响应内容:"
        head -5 /tmp/health_response.txt 2>/dev/null || echo "无法获取响应内容"
    fi
    
    echo ""
    echo "监控端点状态: HTTP $monitoring_response"
    if [ "$monitoring_response" != "200" ]; then
        echo "📝 监控端点响应内容:"
        head -5 /tmp/monitoring_response.txt 2>/dev/null || echo "无法获取响应内容"
    fi
    
    # 清理临时文件
    rm -f /tmp/health_response.txt /tmp/monitoring_response.txt
fi

echo ""
echo "🔧 立即修复建议"
echo "================"

echo "1️⃣ 配置环境变量"
echo "访问 Cloudflare Pages Dashboard → Settings → Environment Variables"
echo "确保以下变量正确配置："
echo "- DATABASE_URL (Supabase 连接字符串)"
echo "- NEXTAUTH_SECRET (32+ 字符安全密钥)"
echo "- NEXTAUTH_URL (https://hearth-bulter.vercel.app)"
echo "- NEXT_PUBLIC_ALLOWED_ORIGINS (https://hearth-bulter.vercel.app)"
echo "- UPSTASH_REDIS_REST_URL"
echo "- UPSTASH_REDIS_REST_TOKEN"

echo ""
echo "2️⃣ 重新部署应用"
echo "环境变量保存后 Vercel 会自动重新部署"
echo "等待 3-5 分钟完成"

echo ""
echo "3️⃣ 验证修复"
echo "部署完成后重新运行:"
echo "npm run check:deployment $DEPLOYMENT_URL"

echo ""
echo "📋 Supabase 快速配置"
echo "=================="
echo "1. 访问: https://supabase.com"
echo "2. 创建项目: hearthbutler-prod"
echo "3. 获取连接字符串 (使用 .pooler. 连接)"
echo "4. 复制到 Vercel 环境变量"

echo ""
echo "🔗 有用链接"
echo "============"
echo "- Cloudflare Pages Dashboard: https://dash.cloudflare.com"
echo "- 修复指南: PRODUCTION_FIX_GUIDE.md"
echo "- 部署验证: npm run check:deployment $DEPLOYMENT_URL"

echo ""
echo "🎯 预期修复结果"
echo "================"
echo "✅ 所有端点返回 HTTP 200"
echo "✅ 用户可以注册和登录"
echo "✅ 监控系统正常工作"
echo "✅ 系统健康分数 > 80%"

echo ""
echo "⏱️  预计修复时间: 15-20 分钟"
echo "🎉 修复成功后你的应用将完全可用！"
