#!/bin/bash

# ============================================================================
# 性能对比测试自动化脚本
# ============================================================================
#
# 功能:
# 1. 自动切换 Feature Flag 模式
# 2. 运行 k6 性能测试
# 3. 生成对比报告
#
# 使用方式:
# ```bash
# chmod +x scripts/performance/run-comparison.sh
# ./scripts/performance/run-comparison.sh
# ```
# ============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-test-token}"
REPORT_DIR="./performance-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ============================================================================
# 辅助函数
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 未安装,请先安装: $2"
        exit 1
    fi
}

# 切换 Feature Flag
switch_mode() {
    local mode=$1
    log_info "切换到 $mode 模式..."

    case $mode in
        "prisma")
            pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
                --dual-write=off \
                --primary=prisma
            ;;
        "supabase")
            pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
                --dual-write=off \
                --primary=supabase
            ;;
        "dual-write-prisma")
            pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
                --dual-write=on \
                --primary=prisma
            ;;
        "dual-write-supabase")
            pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
                --dual-write=on \
                --primary=supabase
            ;;
        *)
            log_error "未知模式: $mode"
            exit 1
            ;;
    esac

    # 等待缓存刷新
    log_info "等待 Feature Flag 缓存刷新(10秒)..."
    sleep 10
}

# 运行性能测试
run_test() {
    local mode=$1
    local output_file="$REPORT_DIR/${TIMESTAMP}_${mode}.json"

    log_info "运行 $mode 模式性能测试..."

    MODE="$mode" BASE_URL="$BASE_URL" AUTH_TOKEN="$AUTH_TOKEN" \
        k6 run --out json="$output_file" scripts/performance/k6-comparison-test.js

    if [ $? -eq 0 ]; then
        log_success "$mode 测试完成,报告: $output_file"
    else
        log_error "$mode 测试失败"
        return 1
    fi
}

# 生成对比报告
generate_comparison_report() {
    log_info "生成对比报告..."

    local report_file="$REPORT_DIR/${TIMESTAMP}_comparison.md"

    cat > "$report_file" << EOF
# 性能对比测试报告

**生成时间**: $(date)
**测试环境**: $BASE_URL
**报告目录**: $REPORT_DIR

## 测试模式

1. **Prisma 模式**: 单写,仅使用 Prisma
2. **Supabase 模式**: 单写,仅使用 Supabase
3. **双写-Prisma 为主**: 双写模式,Prisma 结果返回
4. **双写-Supabase 为主**: 双写模式,Supabase 结果返回

## 性能指标

EOF

    # 提取各模式的性能数据
    for mode in prisma supabase dual-write-prisma dual-write-supabase; do
        local json_file="$REPORT_DIR/${TIMESTAMP}_${mode}.json"

        if [ -f "$json_file" ]; then
            echo "### ${mode^^} 模式" >> "$report_file"
            echo "" >> "$report_file"

            # 使用 jq 提取关键指标(如果安装了 jq)
            if command -v jq &> /dev/null; then
                echo "**延迟 (ms)**:" >> "$report_file"
                echo "- P50: $(jq -r '.metrics.latency.p50 // "N/A"' "$json_file")" >> "$report_file"
                echo "- P95: $(jq -r '.metrics.latency.p95 // "N/A"' "$json_file")" >> "$report_file"
                echo "- P99: $(jq -r '.metrics.latency.p99 // "N/A"' "$json_file")" >> "$report_file"
                echo "- 平均: $(jq -r '.metrics.latency.avg // "N/A"' "$json_file")" >> "$report_file"
                echo "" >> "$report_file"

                echo "**请求统计**:" >> "$report_file"
                echo "- 总请求数: $(jq -r '.metrics.requests.total // "N/A"' "$json_file")" >> "$report_file"
                echo "- 成功: $(jq -r '.metrics.requests.success // "N/A"' "$json_file")" >> "$report_file"
                echo "- 失败: $(jq -r '.metrics.requests.failure // "N/A"' "$json_file")" >> "$report_file"
                echo "- 错误率: $(jq -r '.metrics.errors.rate // "N/A"' "$json_file")" >> "$report_file"
                echo "" >> "$report_file"
            else
                echo "*需要安装 jq 以自动提取数据*" >> "$report_file"
                echo "" >> "$report_file"
            fi
        fi
    done

    cat >> "$report_file" << EOF

## 结论和建议

TODO: 根据上述数据分析性能差异,提供迁移建议。

## 原始数据

完整的 JSON 报告位于: $REPORT_DIR/

EOF

    log_success "对比报告已生成: $report_file"
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    echo ""
    echo "=========================================="
    echo "  性能对比测试自动化脚本"
    echo "=========================================="
    echo ""

    # 检查依赖
    log_info "检查依赖..."
    check_command "k6" "https://k6.io/docs/getting-started/installation/"
    check_command "pnpm" "npm install -g pnpm"
    check_command "ts-node" "pnpm install -g ts-node"

    # 创建报告目录
    mkdir -p "$REPORT_DIR"

    # 保存当前 Feature Flag 状态(用于恢复)
    log_info "保存当前 Feature Flag 状态..."
    local original_mode_file="$REPORT_DIR/.original_mode_${TIMESTAMP}.txt"
    pnpm ts-node scripts/dual-write/toggle-feature-flags.ts > "$original_mode_file"

    # 测试所有模式
    local modes=("prisma" "supabase" "dual-write-prisma" "dual-write-supabase")

    for mode in "${modes[@]}"; do
        echo ""
        log_info "========== 测试 $mode 模式 =========="

        switch_mode "$mode"
        run_test "$mode"

        # 短暂休息
        sleep 5
    done

    # 生成对比报告
    echo ""
    generate_comparison_report

    # 提示恢复原始模式
    echo ""
    log_warning "测试完成! 请手动恢复到原始 Feature Flag 模式。"
    log_info "原始模式信息保存在: $original_mode_file"

    echo ""
    log_success "所有测试完成! 报告位于: $REPORT_DIR"
}

# 运行主流程
main
