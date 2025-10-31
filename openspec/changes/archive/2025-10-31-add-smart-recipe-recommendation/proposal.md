# Proposal: Add Smart Recipe Recommendation

## Why

当前食谱生成基于固定模板，缺乏个性化和动态适配。智能推荐系统可根据电商库存、季节食材、价格波动、用户口味偏好、历史评价动态推荐食谱，提升用户满意度和执行率。

## What Changes

- 开发多因素推荐引擎（库存、价格、季节、偏好、营养）
- 实现协同过滤算法（基于相似用户推荐）
- 添加内容过滤（基于食材属性推荐）
- 开发食材智能替换系统（过敏、预算、口味）
- 实现食谱评分和反馈系统
- 添加食谱收藏和历史记录
- 开发「换一批」功能（保持营养目标不变）
- 实现推荐理由解释（为什么推荐这个食谱）

## Impact

**Affected Specs**:
- `smart-recipe-recommendation` (NEW)
- `meal-planning` (MODIFIED - 集成推荐引擎)

**Affected Code**:
- `src/lib/services/recommendation/` - 推荐引擎（新增）
  - `recommendation-engine.ts` - 推荐主引擎
  - `collaborative-filter.ts` - 协同过滤
  - `content-filter.ts` - 内容过滤
  - `ingredient-substitution.ts` - 食材替换
- `src/lib/services/recipe-scorer.ts` - 食谱评分器
- `src/app/api/recommendations/**` - 推荐API路由
- `src/components/recipes/` - 食谱组件（扩展）
  - `RecommendedRecipes.tsx` - 推荐食谱列表
  - `RecipeRatingWidget.tsx` - 评分组件
  - `SubstituteIngredient.tsx` - 食材替换
  - `RecipeHistory.tsx` - 历史记录
- Prisma Schema - 添加RecipeRating, RecipeFavorite, UserPreference模型

**Breaking Changes**: 无

**Dependencies**:
- 机器学习库（可选）：`ml-js/collaborative-filtering`

**Estimated Effort**: 7天开发 + 2天测试 + 1天算法调优

**Risks**:
- 冷启动问题（新用户无历史数据）
- 推荐准确率需持续优化

