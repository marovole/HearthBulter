#!/bin/bash

# Batch 1 端点测试脚本
# 测试双写框架是否正常工作

BASE_URL="http://localhost:3000"

echo "🚀 开始测试 Batch 1 的 6 个端点..."
echo "=================================="
echo ""

# 测试计数
TOTAL=0
SUCCESS=0
FAILED=0

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4

    TOTAL=$((TOTAL + 1))
    echo -e "${YELLOW}[$TOTAL]${NC} 测试: $name"
    echo "    方法: $method"
    echo "    URL: $url"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "    ${GREEN}✅ 成功 (HTTP $http_code)${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "    ${RED}❌ 失败 (HTTP $http_code)${NC}"
        echo "    响应: ${body:0:200}"
        FAILED=$((FAILED + 1))
    fi

    echo ""
    sleep 0.5
}

# 1. 测试 /api/foods/popular
test_endpoint \
    "获取热门食材" \
    "GET" \
    "/api/foods/popular?limit=5"

# 2. 测试 /api/foods/categories/[category]
test_endpoint \
    "获取分类食材 (水果)" \
    "GET" \
    "/api/foods/categories/FRUITS?limit=5"

# 3. 测试 /api/foods/categories/[category] (蔬菜)
test_endpoint \
    "获取分类食材 (蔬菜)" \
    "GET" \
    "/api/foods/categories/VEGETABLES?limit=5"

# 4. 测试 /api/user/preferences (需要认证，预期 401)
test_endpoint \
    "获取用户偏好 (无认证)" \
    "GET" \
    "/api/user/preferences"

# 5. 测试 /api/recipes/1/favorite (需要认证，预期 401)
test_endpoint \
    "收藏食谱 (无认证)" \
    "POST" \
    "/api/recipes/1/favorite"

# 6. 测试 /api/recipes/1/rate (需要认证，预期 401)
test_endpoint \
    "评分食谱 (无认证)" \
    "POST" \
    "/api/recipes/1/rate" \
    '{"rating": 5}'

echo "=================================="
echo "测试完成!"
echo "=================================="
echo -e "总计: $TOTAL"
echo -e "${GREEN}成功: $SUCCESS${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""
echo "下一步: 检查双写 diff 记录"
echo "  pnpm tsx scripts/check-dual-write-diffs.ts"
