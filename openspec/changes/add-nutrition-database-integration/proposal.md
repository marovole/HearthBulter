# Proposal: Add Nutrition Database Integration

## Why

营养数据库是食谱生成和营养计算的数据基础，必须在食谱规划功能之前实现。对接USDA API提供权威营养数据，同时建立本地缓存降低成本。

## What Changes

- 对接USDA FoodData Central API
- 建立本地食物数据库（支持中文）
- 实现食物搜索和查询功能
- 添加营养计算工具
- 实现缓存策略（Redis + 数据库）

## Impact

**Affected Specs**:
- `nutrition-database` (NEW)

**Affected Code**:
- `src/lib/services/usda-service.ts` - USDA API集成
- `src/lib/services/nutrition-calculator.ts` - 营养计算
- `src/app/api/foods/**` - 食物查询API
- `prisma/schema.prisma` - Food模型

**Breaking Changes**: 无

**Dependencies**:
- USDA API Key (免费申请)
- Redis (缓存)

**Estimated Effort**: 3天开发 + 1天测试
