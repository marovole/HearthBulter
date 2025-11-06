#!/bin/bash

# 健康管家 Vercel 部署脚本
# 自动化生产环境部署流程

echo "🚀 开始健康管家 Vercel 生产部署..."
echo ""

# 检查 Vercel CLI 是否安装
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装"
    echo "请运行: npm i -g vercel"
    exit 1
fi

# 检查是否已登录 Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ 未登录 Vercel"
    echo "请运行: vercel login"
    exit 1
fi

echo "✅ Vercel 环境检查通过"
echo ""

# 检查当前分支
current_branch=$(git branch --show-current)
echo "📂 当前分支: $current_branch"

if [ "$current_branch" != "main" ]; then
    echo "⚠️  警告: 不在 main 分支"
    read -p "是否继续部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 部署已取消"
        exit 1
    fi
fi

echo ""
echo "🔧 开始部署流程..."

# 1. 本地构建测试
echo "📦 1/5 本地构建测试..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 本地构建失败"
    exit 1
fi
echo "✅ 本地构建成功"

# 2. 运行预部署检查
echo ""
echo "🔍 2/5 预部署检查..."
npm run pre-deploy
if [ $? -ne 0 ]; then
    echo "❌ 预部署检查失败"
    echo "请修复错误后重试"
    exit 1
fi
echo "✅ 预部署检查通过"

# 3. 部署到 Vercel
echo ""
echo "🚀 3/5 部署到 Vercel..."
echo "这将部署到 Vercel 并创建新的生产环境..."

# 询问是否为生产环境部署
read -p "是否部署到生产环境? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔴 部署到生产环境..."
    vercel --prod
else
    echo "🟡 部署到预览环境..."
    vercel
fi

if [ $? -ne 0 ]; then
    echo "❌ Vercel 部署失败"
    exit 1
fi

echo "✅ Vercel 部署成功"

# 4. 获取部署信息
echo ""
echo "📋 4/5 获取部署信息..."
deployment_url=$(vercel ls --scope=marovole 2>/dev/null | head -n 2 | tail -n 1 | awk '{print $2}')
if [ -z "$deployment_url" ]; then
    echo "⚠️  无法自动获取部署URL"
    deployment_url="请查看 Vercel Dashboard"
fi

echo "🌐 部署URL: $deployment_url"

# 5. 部署后验证
echo ""
echo "🔍 5/5 部署后验证..."
echo "等待5秒让应用启动..."
sleep 5

# 检查健康端点
if command -v curl &> /dev/null; then
    echo "🩺 检查应用健康状态..."
    health_check=$(curl -s -o /dev/null -w "%{http_code}" "$deployment_url/api/health" 2>/dev/null || echo "000")
    
    if [ "$health_check" = "200" ]; then
        echo "✅ 健康检查通过"
    else
        echo "⚠️  健康检查失败 (HTTP $health_check)"
    fi
    
    echo "📊 检查监控端点..."
    monitoring_check=$(curl -s -o /dev/null -w "%{http_code}" "$deployment_url/api/monitoring" 2>/dev/null || echo "000")
    
    if [ "$monitoring_check" = "200" ]; then
        echo "✅ 监控端点正常"
    else
        echo "⚠️  监控端点异常 (HTTP $monitoring_check)"
    fi
else
    echo "⚠️  curl 未安装，跳过健康检查"
fi

echo ""
echo "🎉 部署完成!"
echo ""
echo "📌 重要提醒:"
echo "1. 检查并更新环境变量 NEXTAUTH_URL"
echo "2. 验证数据库连接配置"
echo "3. 测试用户注册和登录功能"
echo "4. 监控 /api/monitoring 端点"
echo ""
echo "📊 生产环境监控:"
echo "   健康检查: $deployment_url/api/monitoring"
echo "   Vercel Dashboard: https://vercel.com/dashboard"
echo ""
echo "✅ 健康管家应用已成功部署!"
