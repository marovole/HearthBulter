#!/bin/bash

# ========================================
# HearthBulter Staging Environment Deployment Script
# ========================================
# 此脚本自动化Staging环境的部署流程
#
# 使用方法：
#   chmod +x scripts/deploy-staging.sh
#   ./scripts/deploy-staging.sh
#
# 前置要求：
#   - 已配置.env.staging或Vercel环境变量
#   - 已安装Node.js 18+和pnpm
#   - 已安装Vercel CLI（如需自动部署）
# ========================================

set -e  # 遇到错误立即退出

# 颜色输出配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
}

log_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ========================================
# 步骤1：环境检查
# ========================================
log_step "步骤1：环境检查"

log_info "检查Node.js版本..."
if ! command -v node &> /dev/null; then
    log_error "未检测到Node.js，请先安装Node.js 18或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js版本过低（当前: $(node -v)），需要18或更高版本"
    exit 1
fi
log_success "Node.js版本: $(node -v)"

log_info "检查pnpm..."
if ! command -v pnpm &> /dev/null; then
    log_warning "未检测到pnpm，尝试使用npm..."
    PACKAGE_MANAGER="npm"
else
    log_success "pnpm版本: $(pnpm -v)"
    PACKAGE_MANAGER="pnpm"
fi

log_info "检查Prisma CLI..."
if ! command -v prisma &> /dev/null; then
    log_info "未检测到全局Prisma CLI，将使用npx"
    PRISMA_CMD="npx prisma"
else
    log_success "Prisma CLI已安装"
    PRISMA_CMD="prisma"
fi

# ========================================
# 步骤2：环境变量验证
# ========================================
log_step "步骤2：环境变量验证"

# 检查.env.staging文件
if [ -f ".env.staging" ]; then
    log_success "找到.env.staging文件"
    export $(cat .env.staging | grep -v '^#' | xargs)
else
    log_warning "未找到.env.staging文件，将使用Vercel环境变量"
    log_info "如需本地测试，请先复制.env.staging.example到.env.staging并配置"
fi

# 验证必需的环境变量
REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_warning "以下必需环境变量未配置："
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    log_info "如果在Vercel上部署，这些变量将在Vercel项目设置中配置"

    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "部署已取消"
        exit 1
    fi
else
    log_success "所有必需环境变量已配置"
fi

# ========================================
# 步骤3：依赖安装
# ========================================
log_step "步骤3：依赖安装"

log_info "安装项目依赖..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install --frozen-lockfile
else
    npm ci
fi
log_success "依赖安装完成"

# ========================================
# 步骤4：数据库迁移（可选）
# ========================================
log_step "步骤4：数据库迁移"

if [ -n "$DATABASE_URL" ]; then
    log_info "数据库URL已配置，准备运行迁移..."

    read -p "是否运行数据库迁移？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "生成Prisma客户端..."
        $PRISMA_CMD generate
        log_success "Prisma客户端生成完成"

        log_info "运行数据库迁移..."
        $PRISMA_CMD migrate deploy
        log_success "数据库迁移完成"

        log_info "检查迁移状态..."
        $PRISMA_CMD migrate status
    else
        log_warning "跳过数据库迁移"
    fi
else
    log_warning "DATABASE_URL未配置，跳过数据库迁移"
fi

# ========================================
# 步骤5：构建验证
# ========================================
log_step "步骤5：构建验证"

log_info "运行TypeScript类型检查..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    if pnpm run type-check 2>&1 | grep -q "error"; then
        log_warning "TypeScript类型检查发现错误，但不阻塞部署"
    else
        log_success "TypeScript类型检查通过"
    fi
else
    if npm run type-check 2>&1 | grep -q "error"; then
        log_warning "TypeScript类型检查发现错误，但不阻塞部署"
    else
        log_success "TypeScript类型检查通过"
    fi
fi

log_info "运行生产构建..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm run build
else
    npm run build
fi
log_success "生产构建完成"

# ========================================
# 步骤6：运行测试（可选）
# ========================================
log_step "步骤6：测试验证"

read -p "是否运行测试套件？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "运行测试..."
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm test --passWithNoTests || log_warning "部分测试失败，但继续部署"
    else
        npm test -- --passWithNoTests || log_warning "部分测试失败，但继续部署"
    fi
else
    log_warning "跳过测试"
fi

# ========================================
# 步骤7：安全审计
# ========================================
log_step "步骤7：安全审计"

log_info "运行依赖安全审计..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    if pnpm audit --prod; then
        log_success "安全审计通过，无已知漏洞"
    else
        log_warning "发现依赖安全问题，建议修复后再部署"
        read -p "是否继续部署？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "部署已取消"
            exit 1
        fi
    fi
else
    if npm audit --production; then
        log_success "安全审计通过，无已知漏洞"
    else
        log_warning "发现依赖安全问题，建议修复后再部署"
        read -p "是否继续部署？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "部署已取消"
            exit 1
        fi
    fi
fi

# ========================================
# 步骤8：Vercel部署（可选）
# ========================================
log_step "步骤8：Vercel部署"

if command -v vercel &> /dev/null; then
    log_success "检测到Vercel CLI"

    read -p "是否立即部署到Vercel Staging？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "开始Vercel部署..."

        # 部署到预览环境
        vercel --prod=false

        log_success "Vercel部署完成！"
        log_info "请检查Vercel控制台查看部署状态"
    else
        log_info "跳过自动部署"
        log_info "手动部署方式："
        echo "  1. 推送代码到GitHub: git push origin main"
        echo "  2. Vercel将自动检测并部署"
        echo "  3. 或使用: vercel --prod=false"
    fi
else
    log_warning "未检测到Vercel CLI"
    log_info "安装Vercel CLI: npm i -g vercel"
    log_info ""
    log_info "或通过Git推送触发自动部署："
    echo "  git add ."
    echo "  git commit -m \"chore: staging deployment\""
    echo "  git push origin main"
fi

# ========================================
# 步骤9：部署后验证
# ========================================
log_step "步骤9：部署后验证清单"

echo ""
log_info "请手动完成以下验证步骤："
echo ""
echo "  □  访问Staging URL确认应用可访问"
echo "  □  测试健康检查端点: /api/health"
echo "  □  验证用户注册和登录功能"
echo "  □  检查数据库连接正常"
echo "  □  验证Redis缓存功能"
echo "  □  查看Sentry错误监控（如已配置）"
echo "  □  检查Vercel Analytics数据"
echo "  □  运行核心功能Smoke测试"
echo ""

# ========================================
# 完成
# ========================================
log_step "部署流程完成"

log_success "Staging环境部署准备就绪！"
echo ""
log_info "下一步建议："
echo "  1. 查看STAGING_DEPLOYMENT_CHECKLIST.md完成剩余验证"
echo "  2. 配置自定义域名（如需要）"
echo "  3. 设置监控告警规则"
echo "  4. 执行完整的Smoke测试"
echo "  5. 观察24-48小时确保稳定性"
echo ""

log_info "相关文档："
echo "  - Staging部署清单: STAGING_DEPLOYMENT_CHECKLIST.md"
echo "  - 部署指南: DEPLOYMENT_GUIDE.md"
echo "  - 环境变量配置: .env.staging.example"
echo ""

log_success "🎉 部署脚本执行完毕！"
