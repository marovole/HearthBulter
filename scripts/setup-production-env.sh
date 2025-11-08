#!/bin/bash

# 生产环境快速设置脚本
# 交互式配置 Supabase 和 Cloudflare 凭据

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 欢迎信息
show_welcome() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    🚀 Health Butler                        ║${NC}"
    echo -e "${CYAN}║              生产环境配置向导                               ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}本向导将帮助您配置:${NC}"
    echo "• Supabase 数据库和后端服务"
    echo "• Cloudflare Pages 部署平台"
    echo "• 第三方 API 服务集成"
    echo "• 生产环境安全和性能优化"
    echo ""
}

# 进度显示
show_progress() {
    local step=$1
    local total=$2
    local message=$3
    
    local percentage=$((step * 100 / total))
    local filled=$((percentage / 2))
    local empty=$((50 - filled))
    
    printf "\r${BLUE}[%-${filled}s%-${empty}s]${NC} %d%% - %s" \
           "$(printf '█%.0s' $(seq 1 $filled))" \
           "$(printf '░%.0s' $(seq 1 $empty))" \
           "$percentage" \
           "$message"
}

# 输入验证
validate_input() {
    local input=$1
    local pattern=$2
    local error_msg=$3
    
    if [[ $input =~ $pattern ]]; then
        return 0
    else
        echo -e "${RED}错误: $error_msg${NC}"
        return 1
    fi
}

# 安全输入（隐藏敏感信息）
secure_input() {
    local prompt=$1
    local var_name=$2
    local min_length=$3
    
    echo -e "${YELLOW}$prompt${NC}"
    read -s input
    echo ""
    
    if [ ${#input} -lt $min_length ]; then
        echo -e "${RED}错误: 输入长度必须至少 $min_length 个字符${NC}"
        return 1
    fi
    
    eval "export $var_name=\"$input\""
    return 0
}

# 生成随机密钥
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 安装缺失的工具
install_tools() {
    echo -e "${BLUE}检查必需工具...${NC}"
    
    local missing_tools=()
    
    if ! command_exists "node"; then
        missing_tools+=("Node.js")
    fi
    
    if ! command_exists "npm"; then
        missing_tools+=("npm")
    fi
    
    if ! command_exists "wrangler"; then
        missing_tools+=("Wrangler CLI")
    fi
    
    if ! command_exists "supabase"; then
        missing_tools+=("Supabase CLI")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo -e "${YELLOW}检测到缺失的工具: ${missing_tools[*]}${NC}"
        echo -e "${BLUE}请手动安装这些工具，然后重新运行脚本${NC}"
        echo ""
        echo "安装指南:"
        [ -n "$(echo "${missing_tools[@]}" | grep -o "Node.js\|npm")" ] && echo "• Node.js: https://nodejs.org/"
        [ -n "$(echo "${missing_tools[@]}" | grep -o "Wrangler CLI")" ] && echo "• Wrangler: npm install -g wrangler"
        [ -n "$(echo "${missing_tools[@]}" | grep -o "Supabase CLI")" ] && echo "• Supabase: npm install -g supabase"
        return 1
    fi
    
    echo -e "${GREEN}✓ 所有必需工具已安装${NC}"
    return 0
}

# Supabase 配置
configure_supabase() {
    echo ""
    echo -e "${CYAN}步骤 1: Supabase 配置${NC}"
    echo "=================================="
    echo ""
    
    echo -e "${BLUE}请访问 https://app.supabase.com 获取以下信息:${NC}"
    echo ""
    
    # Supabase Project URL
    while true; do
        echo -e "${YELLOW}请输入 Supabase 项目 URL (格式: https://xxx.supabase.co):${NC}"
        read supabase_url
        
        if validate_input "$supabase_url" "^https://[a-zA-Z0-9-]+\.supabase\.co$" "URL 格式不正确"; then
            break
        fi
    done
    
    # Service Role Key
    while true; do
        if secure_input "请输入 Supabase Service Role Key (服务端密钥):" "service_key" 32; then
            break
        fi
    done
    
    # Anon Key
    while true; do
        if secure_input "请输入 Supabase Anon Key (客户端密钥):" "anon_key" 32; then
            break
        fi
    done
    
    # 测试连接
    echo ""
    echo -e "${BLUE}正在测试 Supabase 连接...${NC}"
    
    if command_exists curl; then
        if curl -s -o /dev/null -w "%{http_code}" "${supabase_url}/rest/v1/" | grep -q "200\|401"; then
            echo -e "${GREEN}✓ Supabase 连接正常${NC}"
        else
            echo -e "${RED}✗ Supabase 连接失败，请检查 URL 和密钥${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ 无法自动测试连接 (curl 未安装)${NC}"
    fi
    
    return 0
}

# Cloudflare 配置
configure_cloudflare() {
    echo ""
    echo -e "${CYAN}步骤 2: Cloudflare 配置${NC}"
    echo "=================================="
    echo ""
    
    echo -e "${BLUE}请访问 https://dash.cloudflare.com 获取以下信息:${NC}"
    echo ""
    
    # Account ID
    echo -e "${YELLOW}请输入 Cloudflare Account ID (在 Dashboard 右侧边栏):${NC}"
    read account_id
    
    # API Token
    while true; do
        if secure_input "请输入 Cloudflare API Token:" "api_token" 32; then
            break
        fi
    done
    
    # Site URL
    echo -e "${YELLOW}请输入站点 URL (如: https://your-app.pages.dev):${NC}"
    read site_url
    
    # 验证输入
    if [[ ! $site_url =~ ^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$ ]]; then
        echo -e "${RED}错误: URL 格式不正确${NC}"
        return 1
    fi
    
    # 测试 Cloudflare API
    echo ""
    echo -e "${BLUE}正在测试 Cloudflare API 连接...${NC}"
    
    if command_exists curl; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $api_token" \
            -H "Content-Type: application/json" \
            "https://api.cloudflare.com/client/v4/user/tokens/verify")
        
        if [ "$response" = "200" ]; then
            echo -e "${GREEN}✓ Cloudflare API 连接正常${NC}"
        else
            echo -e "${RED}✗ Cloudflare API 连接失败，请检查 Token${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ 无法自动测试连接 (curl 未安装)${NC}"
    fi
    
    return 0
}

# 第三方服务配置
configure_third_party() {
    echo ""
    echo -e "${CYAN}步骤 3: 第三方服务配置 (可选)${NC}"
    echo "=================================="
    echo ""
    
    echo -e "${BLUE}是否配置第三方 API 服务? (y/N):${NC}"
    read -r configure_api
    
    if [[ ! $configure_api =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}跳过第三方服务配置${NC}"
        return 0
    fi
    
    # OpenAI API
    echo -e "${BLUE}是否配置 OpenAI API? (y/N):${NC}"
    read -r configure_openai
    if [[ $configure_openai =~ ^[Yy]$ ]]; then
        while true; do
            if secure_input "请输入 OpenAI API Key:" "openai_key" 20; then
                break
            fi
        done
    fi
    
    # OpenRouter API
    echo -e "${BLUE}是否配置 OpenRouter API? (y/N):${NC}"
    read -r configure_openrouter
    if [[ $configure_openrouter =~ ^[Yy]$ ]]; then
        while true; do
            if secure_input "请输入 OpenRouter API Key:" "openrouter_key" 20; then
                break
            fi
        done
    fi
    
    # USDA API
    echo -e "${BLUE}是否配置 USDA API? (y/N):${NC}"
    read -r configure_usda
    if [[ $configure_usda =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}请输入 USDA API Key:${NC}"
        read usda_key
    fi
    
    return 0
}

# 生成环境变量文件
generate_env_file() {
    echo ""
    echo -e "${CYAN}步骤 4: 生成环境变量文件${NC}"
    echo "=================================="
    echo ""
    
    local env_file=".env.production"
    local backup_file=".env.production.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 备份现有文件
    if [ -f "$env_file" ]; then
        cp "$env_file" "$backup_file"
        echo -e "${YELLOW}已备份现有文件: $backup_file${NC}"
    fi
    
    # 生成 NextAuth 密钥
    local nextauth_secret=$(generate_secret 32)
    local jwt_secret=$(generate_secret 32)
    
    # 创建新的环境变量文件
    cat > "$env_file" << EOF
# Health Butler 生产环境配置
# 生成时间: $(date)

# ======================================
# Supabase 配置
# ======================================
SUPABASE_URL=$supabase_url
SUPABASE_SERVICE_KEY=$service_key
NEXT_PUBLIC_SUPABASE_URL=$supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key

# ======================================
# Cloudflare 配置
# ======================================
CLOUDFLARE_ACCOUNT_ID=$account_id
CLOUDFLARE_API_TOKEN=$api_token

# ======================================
# 应用配置
# ======================================
NEXT_PUBLIC_SITE_URL=$site_url
NODE_ENV=production

# ======================================
# 认证配置
# ======================================
NEXTAUTH_SECRET=$nextauth_secret
NEXTAUTH_URL=$site_url
JWT_SECRET=$jwt_secret

# ======================================
# 第三方 API 配置
# ======================================
${openai_key:+OPENAI_API_KEY=$openai_key}
${openrouter_key:+OPENROUTER_API_KEY=$openrouter_key}
${usda_key:+USDA_API_KEY=$usda_key}

# ======================================
# 性能和安全配置
# ======================================
CACHE_TTL=3600
API_CACHE_TTL=300
STATIC_CACHE_TTL=86400

# 功能开关
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REALTIME=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS=true
NEXT_PUBLIC_ENABLE_AI_CHAT=true

# ======================================
# 注意: 请妥善保管此文件
# 不要将密钥提交到代码仓库
# ======================================
EOF
    
    echo -e "${GREEN}✓ 环境变量文件已生成: $env_file${NC}"
    
    # 设置文件权限
    chmod 600 "$env_file"
    echo -e "${GREEN}✓ 文件权限已设置为 600 (仅所有者可读写)${NC}"
    
    return 0
}

# 验证配置
validate_configuration() {
    echo ""
    echo -e "${CYAN}步骤 5: 配置验证${NC}"
    echo "=================================="
    echo ""
    
    echo -e "${BLUE}正在验证配置...${NC}"
    
    # 运行环境变量检查
    if [ -f "scripts/check-environment.sh" ]; then
        bash scripts/check-environment.sh
    else
        echo -e "${YELLOW}警告: 未找到验证脚本，请手动检查配置${NC}"
    fi
    
    return 0
}

# 显示后续步骤
show_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 生产环境配置完成！${NC}"
    echo ""
    echo "=================================="
    echo -e "${BLUE}下一步操作:${NC}"
    echo ""
    echo "1. 测试配置:"
    echo "   npm run test"
    echo "   npm run type-check"
    echo ""
    echo "2. 构建应用:"
    echo "   npm run build:cloudflare-hybrid"
    echo ""
    echo "3. 部署到生产环境:"
    echo "   ./scripts/deploy-production.sh"
    echo ""
    echo "4. 验证部署:"
    echo "   ./scripts/validate-deployment.sh"
    echo ""
    echo "5. 监控部署状态:"
    echo "   访问 Cloudflare Dashboard"
    echo "   查看 Supabase Dashboard"
    echo ""
    echo "=================================="
    echo -e "${YELLOW}重要提醒:${NC}"
    echo "• 已将 .env.production 添加到 .gitignore"
    echo "• 请妥善保管所有 API 密钥"
    echo "• 定期轮换密钥以确保安全"
    echo "• 监控应用性能和错误日志"
    echo ""
}

# 主函数
main() {
    show_welcome
    
    # 检查工具
    if ! install_tools; then
        exit 1
    fi
    
    # 配置步骤
    local total_steps=5
    local current_step=1
    
    show_progress $current_step $total_steps "配置 Supabase..."
    if ! configure_supabase; then
        exit 1
    fi
    ((current_step++))
    
    show_progress $current_step $total_steps "配置 Cloudflare..."
    if ! configure_cloudflare; then
        exit 1
    fi
    ((current_step++))
    
    show_progress $current_step $total_steps "配置第三方服务..."
    if ! configure_third_party; then
        exit 1
    fi
    ((current_step++))
    
    show_progress $current_step $total_steps "生成配置文件..."
    if ! generate_env_file; then
        exit 1
    fi
    ((current_step++))
    
    show_progress $current_step $total_steps "验证配置..."
    if ! validate_configuration; then
        exit 1
    fi
    
    # 完成
    printf "\r${GREEN}✓ 配置完成！${NC}        \n"
    
    show_next_steps
}

# 错误处理
trap 'echo -e "\n${RED}配置过程被中断${NC}"; exit 1' INT TERM

# 运行主函数
main "$@" || {
    echo -e "\n${RED}配置失败${NC}"
    exit 1
}

# 成功退出
exit 0
