#!/bin/bash

# 环境变量验证脚本
# 验证生产环境配置是否完整

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
REQUIRED_COUNT=0
MISSING_COUNT=0
OPTIONAL_COUNT=0

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 检查环境变量
check_env_var() {
    local var_name=$1
    local description=$2
    local required=$3
    local mask_value=$4
    
    if [ -n "${!var_name}" ]; then
        if [ "$mask_value" = "true" ]; then
            local display_value="${!var_name:0:4}...${!var_name: -4}"
            log_success "$description: $display_value"
        else
            log_success "$description: ${!var_name}"
        fi
        
        if [ "$required" = "true" ]; then
            ((REQUIRED_COUNT++))
        else
            ((OPTIONAL_COUNT++))
        fi
    else
        if [ "$required" = "true" ]; then
            log_error "$description: 未设置 (必需)"
            ((MISSING_COUNT++))
        else
            log_warning "$description: 未设置 (可选)"
        fi
    fi
}

# 验证 URL 格式
validate_url() {
    local url=$1
    local description=$2
    
    if [[ $url =~ ^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$ ]]; then
        log_success "$description 格式正确"
        return 0
    else
        log_error "$description 格式错误: $url"
        return 1
    fi
}

# 验证密钥强度
check_key_strength() {
    local key=$1
    local description=$2
    local min_length=$3
    
    if [ ${#key} -ge $min_length ]; then
        log_success "$description 长度符合要求 (${#key} 字符)"
    else
        log_warning "$description 长度不足 (当前: ${#key}, 建议: $min_length+)"
    fi
}

# 测试网络连接
test_connection() {
    local url=$1
    local description=$2
    local timeout=10
    
    log_info "正在测试 $description 连接..."
    
    if command -v curl >/dev/null 2>&1; then
        if curl -s --max-time $timeout -o /dev/null "$url"; then
            log_success "$description 连接正常"
        else
            log_error "$description 连接失败"
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -q --timeout=$timeout -O /dev/null "$url"; then
            log_success "$description 连接正常"
        else
            log_error "$description 连接失败"
        fi
    else
        log_warning "无法测试连接 (curl/wget 未安装)"
    fi
}

# 主要验证函数
main() {
    echo "🔍 环境变量配置验证"
    echo "=================================="
    echo ""
    
    # 检查环境文件是否存在
    if [ -f ".env.production" ]; then
        log_info "加载 .env.production 文件"
        source .env.production
    elif [ -f ".env" ]; then
        log_info "加载 .env 文件"
        source .env
    else
        log_warning "未找到 .env.production 或 .env 文件，检查系统环境变量"
    fi
    
    echo ""
    echo "=================================="
    echo "必需配置验证:"
    echo "=================================="
    
    # Supabase 配置 (必需)
    check_env_var "SUPABASE_URL" "Supabase URL" true false
    check_env_var "SUPABASE_SERVICE_KEY" "Supabase Service Key" true true
    check_env_var "NEXT_PUBLIC_SUPABASE_URL" "Supabase 客户端 URL" true false
    check_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase 匿名密钥" true true
    
    # Cloudflare 配置 (必需)
    check_env_var "CLOUDFLARE_ACCOUNT_ID" "Cloudflare 账户 ID" true false
    check_env_var "CLOUDFLARE_API_TOKEN" "Cloudflare API Token" true true
    
    # 应用配置 (必需)
    check_env_var "NEXT_PUBLIC_SITE_URL" "站点 URL" true false
    check_env_var "NODE_ENV" "Node.js 环境" true false
    
    echo ""
    echo "=================================="
    echo "可选配置验证:"
    echo "=================================="
    
    # 第三方服务 (可选)
    check_env_var "OPENAI_API_KEY" "OpenAI API 密钥" false true
    check_env_var "OPENROUTER_API_KEY" "OpenRouter API 密钥" false true
    check_env_var "USDA_API_KEY" "USDA API 密钥" false false
    
    # 缓存和存储 (可选)
    check_env_var "UPSTASH_REDIS_REST_URL" "Upstash Redis URL" false false
    check_env_var "UPSTASH_REDIS_REST_TOKEN" "Upstash Redis Token" false true
    
    # 邮件服务 (可选)
    check_env_var "SMTP_HOST" "SMTP 主机" false false
    check_env_var "SMTP_USER" "SMTP 用户" false false
    check_env_var "SMTP_PASS" "SMTP 密码" false true
    
    # 监控 (可选)
    check_env_var "SENTRY_DSN" "Sentry DSN" false false
    check_env_var "WEBHOOK_URL" "Webhook URL" false false
    
    echo ""
    echo "=================================="
    echo "格式验证:"
    echo "=================================="
    
    # 验证 URL 格式
    if [ -n "$SUPABASE_URL" ]; then
        validate_url "$SUPABASE_URL" "Supabase URL"
    fi
    
    if [ -n "$NEXT_PUBLIC_SITE_URL" ]; then
        validate_url "$NEXT_PUBLIC_SITE_URL" "站点 URL"
    fi
    
    # 验证密钥强度
    if [ -n "$SUPABASE_SERVICE_KEY" ]; then
        check_key_strength "$SUPABASE_SERVICE_KEY" "Supabase Service Key" 32
    fi
    
    if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
        check_key_strength "$CLOUDFLARE_API_TOKEN" "Cloudflare API Token" 32
    fi
    
    echo ""
    echo "=================================="
    echo "连接测试:"
    echo "=================================="
    
    # 测试网络连接
    if [ -n "$SUPABASE_URL" ]; then
        test_connection "$SUPABASE_URL" "Supabase"
    fi
    
    if [ -n "$NEXT_PUBLIC_SITE_URL" ]; then
        test_connection "$NEXT_PUBLIC_SITE_URL" "站点"
    fi
    
    echo ""
    echo "=================================="
    echo "验证结果总结:"
    echo "=================================="
    
    local total_required=8  # 必需配置的数量
    local configured_required=$((REQUIRED_COUNT - MISSING_COUNT))
    local completion_rate=$((configured_required * 100 / total_required))
    
    echo "必需配置: $configured_required/$total_required"
    echo "可选配置: $OPTIONAL_COUNT"
    echo "完成度: $completion_rate%"
    echo ""
    
    if [ $MISSING_COUNT -eq 0 ]; then
        log_success "🎉 所有必需配置已设置！"
        echo ""
        echo "下一步操作:"
        echo "1. 运行测试: npm test"
        echo "2. 构建应用: npm run build:cloudflare-hybrid"
        echo "3. 部署应用: ./scripts/deploy-production.sh"
        exit 0
    else
        log_error "❌ 有 $MISSING_COUNT 个必需配置缺失"
        echo ""
        echo "请先设置缺失的环境变量，然后重新运行验证"
        echo ""
        echo "配置建议:"
        echo "1. 复制 .env.production.example 为 .env.production"
        echo "2. 填入所有必需的环境变量值"
        echo "3. 确保所有 URL 和密钥格式正确"
        echo "4. 重新运行此验证脚本"
        exit 1
    fi
}

# 显示帮助信息
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h     显示帮助信息"
    echo "  --detailed     显示详细验证信息"
    echo ""
    echo "环境变量文件搜索顺序:"
    echo "  1. .env.production"
    echo "  2. .env"
    echo "  3. 系统环境变量"
    echo ""
    echo "示例:"
    echo "  $0                    # 基本验证"
    echo "  $0 --detailed         # 详细验证"
    exit 0
fi

# 错误处理
trap 'log_error "验证过程被中断"; exit 1' INT TERM

# 运行主函数
main "$@" || {
    log_error "验证失败"
    exit 1
}

# 成功退出
exit 0
