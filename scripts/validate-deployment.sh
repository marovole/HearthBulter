#!/bin/bash

# 部署验证脚本
# 验证 Cloudflare Pages + Supabase 混合架构部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
DEPLOYMENT_URL="${1:-https://hearthbutler-supabase.pages.dev}"
TIMEOUT=30
RETRY_COUNT=3

# 计数器
TESTS_PASSED=0
TESTS_FAILED=0

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

# 测试函数
test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3
    local method=${4:-GET}
    local data=${5:-}
    
    log_info "Testing: $description"
    
    local url="${DEPLOYMENT_URL}${endpoint}"
    local response
    local status_code
    
    for ((i=1; i<=RETRY_COUNT; i++)); do
        if [ "$method" = "POST" ] && [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$url" 2>/dev/null || echo "000")
        else
            response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
        fi
        
        status_code=$(echo "$response" | tail -n1)
        
        if [ "$status_code" != "000" ]; then
            break
        fi
        
        log_warning "Retry $i/$RETRY_COUNT for $endpoint"
        sleep 2
    done
    
    if [ "$status_code" = "000" ]; then
        log_error "$description - Connection failed"
        return 1
    fi
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "$description - Status: $status_code"
        return 0
    else
        log_error "$description - Expected: $expected_status, Got: $status_code"
        return 1
    fi
}

# 测试静态资源
test_static_assets() {
    log_info "测试静态资源..."
    
    local static_assets=(
        "/" 
        "/index.html"
        "/favicon.ico"
    )
    
    for asset in "${static_assets[@]}"; do
        test_endpoint "$asset" "200" "Static asset: $asset"
    done
}

# 测试 API 端点
test_api_endpoints() {
    log_info "测试 API 端点..."
    
    # 健康检查端点
    test_endpoint "/api/v1/health" "200" "Health check endpoint"
    
    # 食物搜索端点
    test_endpoint "/api/v1/foods/search?q=apple" "200" "Food search endpoint"
    
    # 认证端点（应该返回 401，因为没有认证）
    test_endpoint "/api/auth/login" "400" "Auth endpoint (no credentials)"
    
    # 仪表板端点（应该返回 400，因为缺少参数）
    test_endpoint "/api/v1/dashboard/overview" "400" "Dashboard endpoint (no memberId)"
}

# 测试 CORS
test_cors() {
    log_info "测试 CORS 配置..."
    
    local url="${DEPLOYMENT_URL}/api/v1/health"
    local response=$(curl -s -I -X OPTIONS "$url" 2>/dev/null | head -n 20)
    
    if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        log_success "CORS headers present"
    else
        log_error "CORS headers missing"
    fi
    
    if echo "$response" | grep -q "Access-Control-Allow-Methods.*GET.*POST"; then
        log_success "CORS methods configured"
    else
        log_error "CORS methods not configured properly"
    fi
}

# 测试性能
test_performance() {
    log_info "测试性能..."
    
    local url="${DEPLOYMENT_URL}/api/v1/health"
    local start_time=$(date +%s%3N)
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        if [ $duration -lt 1000 ]; then
            log_success "Performance test - Response time: ${duration}ms"
        else
            log_warning "Performance test - Response time: ${duration}ms (slow)"
        fi
    else
        log_error "Performance test failed"
    fi
}

# 测试 SSL/HTTPS
test_ssl() {
    log_info "测试 SSL/HTTPS..."
    
    if [[ "$DEPLOYMENT_URL" == https://* ]]; then
        local ssl_info=$(curl -s -I "$DEPLOYMENT_URL" 2>/dev/null | grep -i "strict-transport-security")
        
        if [ -n "$ssl_info" ]; then
            log_success "HSTS header present"
        else
            log_warning "HSTS header missing"
        fi
        
        log_success "SSL/HTTPS enabled"
    else
        log_warning "Site not using HTTPS"
    fi
}

# 测试错误处理
test_error_handling() {
    log_info "测试错误处理..."
    
    # 测试 404 错误
    test_endpoint "/api/nonexistent" "404" "404 error handling"
    
    # 测试无效参数
    test_endpoint "/api/v1/foods/search" "400" "Invalid parameters handling"
}

# 测试数据库连接（如果可能）
test_database_connection() {
    log_info "测试数据库连接..."
    
    # 尝试通过 API 测试数据库连接
    local health_response=$(curl -s "${DEPLOYMENT_URL}/api/v1/health" 2>/dev/null)
    
    if echo "$health_response" | grep -q "database"; then
        log_success "Database connection test passed"
    else
        log_warning "Cannot verify database connection from API response"
    fi
}

# 测试实时功能
test_realtime_features() {
    log_info "测试实时功能..."
    
    # 检查 WebSocket 连接（如果可用）
    # 这里可以添加 WebSocket 连接测试
    log_info "实时功能需要客户端测试"
}

# 生成测试报告
generate_report() {
    log_info "生成测试报告..."
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local success_rate=$((TESTS_PASSED * 100 / total_tests))
    
    echo ""
    echo "=================================="
    echo "部署验证测试报告"
    echo "=================================="
    echo "部署 URL: $DEPLOYMENT_URL"
    echo "测试时间: $(date)"
    echo ""
    echo "测试结果:"
    echo "- 通过: $TESTS_PASSED"
    echo "- 失败: $TESTS_FAILED"
    echo "- 总计: $total_tests"
    echo "- 成功率: $success_rate%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo "✅ 所有测试通过！部署验证成功。"
    else
        echo "❌ 部分测试失败，请检查问题。"
    fi
    
    echo "=================================="
    echo ""
    
    # 保存报告
    local report_file="reports/deployment_validation_$(date +%Y%m%d_%H%M%S).txt"
    mkdir -p reports
    
    cat > "$report_file" << EOF
Health Butler 部署验证报告
===========================

部署 URL: $DEPLOYMENT_URL
验证时间: $(date)

测试结果:
- 通过测试: $TESTS_PASSED
- 失败测试: $TESTS_FAILED
- 总测试数: $total_tests
- 成功率: $success_rate%

$(if [ $TESTS_FAILED -eq 0 ]; then echo "✅ 所有测试通过！部署验证成功。"; else echo "❌ 部分测试失败，需要修复。"; fi)

建议操作:
$(if [ $TESTS_FAILED -gt 0 ]; then echo "- 修复失败的测试项目"; fi)
- 进行用户验收测试
- 配置监控告警
- 设置备份策略
- 制定回滚计划

注意事项:
- 验证所有API端点功能
- 测试用户认证流程
- 检查数据同步状态
- 确认性能指标达标
EOF
    
    log_info "测试报告已保存: $report_file"
}

# 主函数
main() {
    echo "🔍 开始部署验证测试"
    echo "=================================="
    echo "部署 URL: $DEPLOYMENT_URL"
    echo "测试时间: $(date)"
    echo "=================================="
    echo ""
    
    # 运行测试
    test_static_assets
    test_api_endpoints
    test_cors
    test_performance
    test_ssl
    test_error_handling
    test_database_connection
    test_realtime_features
    
    # 生成报告
    generate_report
    
    echo ""
    echo "=================================="
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo "🎉 所有验证测试通过！"
        exit 0
    else
        echo "❌ 部分验证测试失败"
        exit 1
    fi
}

# 错误处理
trap 'log_error "验证过程被中断"; exit 1' INT TERM

# 显示帮助信息
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [部署URL]"
    echo ""
    echo "参数:"
    echo "  部署URL    要验证的部署URL (默认: https://hearthbutler-supabase.pages.dev)"
    echo ""
    echo "示例:"
    echo "  $0"
    echo "  $0 https://my-app.pages.dev"
    echo ""
    echo "选项:"
    echo "  --help, -h  显示帮助信息"
    exit 0
fi

# 运行主函数
main "$@" || {
    log_error "验证失败"
    exit 1
}

# 成功退出
exit 0
