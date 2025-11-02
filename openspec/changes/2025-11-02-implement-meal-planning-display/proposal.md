# Proposal: Implement Meal Planning Display Functionality

## Why

食谱规划展示功能是Health Butler核心业务逻辑的前端呈现，虽然后端服务已经实现，但用户需要一个直观的界面来查看、交互和管理AI生成的食谱。完善的食谱展示界面对于用户接受和使用推荐食谱至关重要，是连接健康数据分析和实际饮食行为的关键桥梁。

## What Changes

- 创建AI生成的食谱展示界面（日视图、周视图、月视图）
- 实现食谱接受/修改功能（食材替换、份量调整）
- 添加营养信息可视化（营养成分图表、卡路里计算）
- 创建食谱详情页面（制作步骤、烹饪时间、难度）
- 实现食谱收藏和黑名单功能
- 添加食谱打印和分享功能
- 创建食材过敏提示和替代建议

## Impact

**Affected Specs**:
- `meal-planning` (MODIFIED - 添加前端展示界面)

**Affected Code**:
- `src/app/meal-planning/` - 食谱规划页面目录（新增）
  - `page.tsx` - 食谱规划主页面
  - `[id]/` - 食谱详情页面
  - `calendar/` - 日历视图
  - `favorites/` - 收藏食谱页面
- `src/components/meal-planning/` - 食谱规划组件目录（新增）
  - `MealCalendarView.tsx` - 日历视图组件
  - `RecipeCard.tsx` - 食谱卡片
  - `RecipeDetailModal.tsx` - 食谱详情弹窗
  - `NutritionChart.tsx` - 营养图表
  - `IngredientSubstitutes.tsx` - 食材替代
  - `RecipeActions.tsx` - 食谱操作按钮
  - `AllergyAlert.tsx` - 过敏提示
- `src/lib/services/meal-planner.ts` - 食谱规划服务（已存在）
- `src/lib/services/nutrition-calculator.ts` - 营养计算服务（已存在）
- `src/app/api/meal-plans/` - API路由（已存在）

**Breaking Changes**: 无

**Dependencies**:
- Recharts（图表库，已存在）
- date-fns（日期处理，已存在）
- 食谱规划引擎（已实现）
- 营养计算服务（已实现）

**Estimated Effort**: 4天开发 + 1天测试 + 1天UI/UX优化
