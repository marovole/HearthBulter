#!/bin/bash

# 部署状态检查脚本
# 用于验证健康管家应用部署状态

DEPLOYMENT_URL="$1"

if [ -z "$DEPLOYMENT_URL" ]; then
    echo "❌ 请提供部署URL"
    echo "用法: ./check-deployment.sh <deployment-url>"
    exit 1
fi

echo "🔍 检查部署状态: $DEPLOYMENT_URL"
echo ""

# 检查函数
check_endpoint() {
    local endpoint="$1"
    local description="$2"
    local url="$DEPLOYMENT_URL$endpoint"
    
    echo "🔍 检查 $description..."
    
    if command -v curl &> /dev/null; then
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        response_time=$(curl -s -o /dev/null -w "%{time_total}" "$url" 2>/dev/null || echo "0")
        
        if [ "$http_code" = "200" ]; then
            echo "✅ $description - HTTP $http_code (${response_time}s)"
            return 0
        else
            echo "❌ $description - HTTP $http_code (${response_time}s)"
            return 1
        fi
    else
        echo "⚠️  curl 未安装，跳过 $description"
        return 2
    fi
}

# 检查关键端点
echo ""
echo "📊 应用端点检查:"

check_endpoint "" "首页"
check_endpoint "/api/health" "健康检查端点"
check_endpoint "/api/monitoring" "监控端点"

echo ""
echo "📈 性能指标分析:"

if command -v curl &> /dev/null; then
    # 获取监控数据
    monitoring_data=$(curl -s "$DEPLOYMENT_URL/api/monitoring" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$monitoring_data" ]; then
        # 提取关键指标（需要 jq）
        if command -v jq &> /dev/null; then
            health_score=$(echo "$monitoring_data" | jq -r '.systemHealth.score // 0')
            error_rate=$(echo "$monitoring_data" | jq -r '.performanceStats.errorRate // 0')
            avg_response_time=$(echo "$monitoring_data" | jq -r '.performanceStats.averageResponseTime // 0')
            
            echo "🏥 系统健康分数: $health_score%"
            echo "📊 错误率: $error_rate%"
            echo "⚡ 平均响应时间: ${avg_response_time}ms"
            
            # 评估结果
            if [ "$health_score" -ge 80 ] && [ "${error_rate%.*}" -le 5 ] && [ "$avg_response_time" -le 1000 ]; then
                echo ""
                echo "🎉 部署状态: 优秀"
                echo "✅ 所有关键指标都在目标范围内"
            elif [ "$health_score" -ge 60 ] && [ "${error_rate%.*}" -le 10 ] && [ "$avg_response_time" -le 2000 ]; then
                echo ""
                echo "⚠️  部署状态: 可接受"
                echo "🔧 建议优化性能指标"
            else
                echo ""
                echo "🚨 部署状态: 需要关注"
                echo "📋 建议立即检查系统问题"
            fi
        else
            echo "📊 监控数据获取成功，但需要 jq 进行详细分析"
            echo "安装 jq: brew install jq"
        fi
    else
        echo "❌ 无法获取监控数据"
    fi
else
    echo "⚠️  curl 未安装，无法进行性能分析"
fi

echo ""
echo "📋 部署检查清单:"
echo "[ ] 首页正常加载"
echo "[ ] 用户注册功能"
echo "[ ] 用户登录功能"
echo "[ ] 数据库连接正常"
echo "[ ] API 端点响应正常"
echo "[ ] 监控系统工作正常"

echo ""
echo "🔧 手动测试建议:"
echo "1. 访问 $DEPLOYMENT_URL"
echo "2. 尝试注册新用户"
echo "3. 登录并访问仪表盘"
echo "4. 检查数据展示"
echo "5. 监控 /api/monitoring 端点"

echo ""
echo "📞 如果遇到问题:"
echo "- Cloudflare Pages Dashboard: https://dash.cloudflare.com"
echo "- 构建日志: Pages → HearthBulter → Build logs"
echo "- 实时日志: Pages → HearthBulter → Functions logs"
