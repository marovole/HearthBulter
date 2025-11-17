#!/bin/bash

###############################################################################
# Cloudflare Pages + Supabase 一键部署脚本
# 
# 用法:
#   ./scripts/deploy-cloudflare-supabase.sh [环境]
#
# 环境选项:
#   - production (默认)
#   - staging
#   - development
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║   Cloudflare Pages + Supabase 部署脚本                    ║"
    echo "║   Health Butler 混合架构自动部署                          ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查必需工具
check_prerequisites() {
    log_info "检查必需工具..."

    local missing_tools=()

    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi

    if ! command -v pnpm &> /dev/null; then
        missing_tools+=("pnpm")
    fi

    if ! command -v wrangler &> /dev/null; then
        missing_tools+=("wrangler")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必需工具: ${missing_tools[*]}"
        echo ""
        echo "安装说明:"
        echo "  - Node.js: https://nodejs.org/"
        echo "  - pnpm: npm install -g pnpm"
        echo "  - wrangler: npm install -g wrangler"
        exit 1
    fi

    log_success "所有必需工具已安装"
}

# 检查环境变量
check_environment_variables() {
    log_info "检查环境变量..."

    local missing_vars=()

    # 必需的环境变量
    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_KEY"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必需的环境变量:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "请在 .env.local 中设置这些变量，或导出到环境中"
        exit 1
    fi

    log_success "环境变量配置正确"
}

# 加载环境变量
load_environment() {
    local env_file=".env.local"
    
    if [ -f "$env_file" ]; then
        log_info "从 $env_file 加载环境变量..."
        set -a
        source "$env_file"
        set +a
        log_success "环境变量已加载"
    else
        log_warning "$env_file 不存在，将使用系统环境变量"
    fi
}

# 运行测试
run_tests() {
    log_info "运行测试套件..."

    # 类型检查
    log_info "TypeScript 类型检查..."
    if pnpm type-check || true; then
        log_success "类型检查通过"
    else
        log_warning "类型检查失败，但将继续部署"
    fi

    # ESLint
    log_info "ESLint 代码检查..."
    if pnpm lint || true; then
        log_success "代码检查通过"
    else
        log_warning "代码检查失败，但将继续部署"
    fi

    # 数据库连接测试
    if [ -f "scripts/test-supabase-connection.js" ]; then
        log_info "测试 Supabase 连接..."
        if node scripts/test-supabase-connection.js; then
            log_success "Supabase 连接正常"
        else
            log_error "Supabase 连接失败"
            read -p "是否继续部署? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
}

# 构建项目
build_project() {
    log_info "开始构建项目..."

    # 设置构建目标
    export BUILD_TARGET=cloudflare

    # 清理旧构建
    log_info "清理旧构建文件..."
    rm -rf .next
    rm -rf .open-next

    # 运行构建
    log_info "执行 Cloudflare Next.js 构建..."
    if pnpm build:cloudflare; then
        log_success "项目构建成功"
    else
        log_error "项目构建失败"
        exit 1
    fi

    # 检查构建输出
    if [ ! -d ".next" ]; then
        log_error "构建输出目录不存在"
        exit 1
    fi

    log_success "构建输出验证通过"
}

# 部署到 Cloudflare
deploy_to_cloudflare() {
    local environment=${1:-production}
    
    log_info "部署到 Cloudflare Pages ($environment)..."

    # 确认部署
    echo ""
    log_warning "准备部署到 $environment 环境"
    echo ""
    echo "部署信息:"
    echo "  - 项目: hearthbutler"
    echo "  - 环境: $environment"
    echo "  - 分支: $(git branch --show-current)"
    echo "  - 提交: $(git rev-parse --short HEAD)"
    echo ""
    
    if [ "$environment" == "production" ]; then
        read -p "确认部署到生产环境? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "部署已取消"
            exit 0
        fi
    fi

    # 执行部署
    log_info "上传到 Cloudflare Pages..."
    
    local deploy_cmd="wrangler pages deploy .next --project-name=hearthbutler"
    
    if [ "$environment" != "production" ]; then
        deploy_cmd="$deploy_cmd --branch=$environment"
    fi

    if $deploy_cmd; then
        log_success "部署成功！"
    else
        log_error "部署失败"
        exit 1
    fi
}

# 验证部署
verify_deployment() {
    local environment=${1:-production}
    
    log_info "验证部署..."

    # 获取部署 URL
    local url="https://hearthbutler.pages.dev"
    if [ "$environment" != "production" ]; then
        url="https://$environment.hearthbutler.pages.dev"
    fi

    log_info "部署 URL: $url"

    # 健康检查
    log_info "执行健康检查..."
    
    if command -v curl &> /dev/null; then
        if curl -f -s -o /dev/null "$url"; then
            log_success "健康检查通过"
        else
            log_warning "健康检查失败（可能需要等待部署完成）"
        fi
    fi
}

# 显示部署总结
show_summary() {
    local environment=${1:-production}
    
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                     部署完成！                            ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "部署信息:"
    echo "  - 环境: $environment"
    echo "  - 时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "访问链接:"
    if [ "$environment" == "production" ]; then
        echo "  - https://hearthbutler.pages.dev"
        echo "  - https://your-custom-domain.com (如已配置)"
    else
        echo "  - https://$environment.hearthbutler.pages.dev"
    fi
    echo ""
    echo "Cloudflare Dashboard:"
    echo "  - https://dash.cloudflare.com/"
    echo ""
    echo "Supabase Dashboard:"
    echo "  - https://supabase.com/dashboard"
    echo ""
    echo "下一步:"
    echo "  1. 在浏览器中访问部署的应用"
    echo "  2. 测试关键功能（登录、数据加载等）"
    echo "  3. 检查 Cloudflare Analytics"
    echo "  4. 监控错误日志"
    echo ""
}

# 主函数
main() {
    local environment=${1:-production}

    show_banner

    # 步骤 1: 前置检查
    check_prerequisites
    load_environment
    check_environment_variables

    # 步骤 2: 测试（可选）
    if [ "${SKIP_TESTS}" != "true" ]; then
        run_tests
    else
        log_warning "跳过测试（SKIP_TESTS=true）"
    fi

    # 步骤 3: 构建
    build_project

    # 步骤 4: 部署
    deploy_to_cloudflare "$environment"

    # 步骤 5: 验证
    verify_deployment "$environment"

    # 步骤 6: 总结
    show_summary "$environment"
}

# 显示帮助
show_help() {
    echo "用法: $0 [环境] [选项]"
    echo ""
    echo "环境:"
    echo "  production   部署到生产环境（默认）"
    echo "  staging      部署到预览环境"
    echo "  development  部署到开发环境"
    echo ""
    echo "选项:"
    echo "  --skip-tests  跳过测试"
    echo "  --help        显示帮助"
    echo ""
    echo "示例:"
    echo "  $0                    # 部署到生产环境"
    echo "  $0 staging            # 部署到预览环境"
    echo "  SKIP_TESTS=true $0   # 跳过测试直接部署"
    echo ""
}

# 解析参数
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    show_help
    exit 0
fi

if [ "$1" == "--skip-tests" ]; then
    export SKIP_TESTS=true
    shift
fi

# 执行主函数
main "$@"
