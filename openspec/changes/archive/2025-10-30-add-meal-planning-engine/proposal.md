# Proposal: Add Meal Planning Engine

## Why

食谱规划是Health Butler的核心业务能力。基于成员健康数据和营养目标自动生成个性化食谱，是实现"数据驱动饮食管理"愿景的关键功能。MVP阶段采用模板化方案，后续迭代引入AI优化。

## What Changes

- 实现基于模板的7天食谱生成算法
- 创建宏量营养素精确计算服务
- 实现食材替换和过敏排除逻辑
- 添加季节性食材优先推荐
- 创建食谱展示和编辑UI

## Impact

**Affected Specs**:
- `meal-planning` (NEW)

**Affected Code**:
- `src/lib/services/meal-planner.ts` - 食谱生成引擎
- `src/lib/services/macro-calculator.ts` - 营养计算
- `src/app/api/meal-plans/**` - 食谱管理API
- `prisma/schema.prisma` - MealPlan, Meal, MealIngredient模型

**Breaking Changes**: 无

**Dependencies**:
- 依赖nutrition-database（食物数据）
- 依赖family-profile-management（成员目标）

**Estimated Effort**: 6天开发 + 2天测试
