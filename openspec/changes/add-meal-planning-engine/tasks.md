# Implementation Tasks

## 1. Database Models
- [x] 1.1 创建MealPlan Prisma模型
- [x] 1.2 创建Meal模型（早中晚餐+加餐）
- [x] 1.3 创建MealIngredient模型（食材关联）
- [ ] 1.4 运行数据库迁移
- [x] 1.5 添加关系索引优化查询

## 2. Macro Calculator Service
- [x] 2.1 创建macro-calculator.ts服务
- [x] 2.2 实现TDEE计算（基于BMR和活动系数）
- [x] 2.3 实现目标热量调整（减重-400, 增肌+300）
- [x] 2.4 实现宏量分配（碳水/蛋白/脂肪比例）
- [ ] 2.5 编写计算逻辑单元测试

## 3. Meal Planning Engine
- [x] 3.1 创建meal-planner.ts核心引擎
- [x] 3.2 实现模板加载（早中晚餐模板库）
- [x] 3.3 实现过敏食材过滤
- [x] 3.4 实现营养平衡算法（匹配目标宏量）
- [x] 3.5 实现季节性食材优先
- [x] 3.6 添加随机性（避免重复菜单）

## 4. Meal Plan API
- [x] 4.1 实现POST /api/members/:id/meal-plans（生成食谱）
- [x] 4.2 实现GET /api/members/:id/meal-plans（查询历史食谱）
- [x] 4.3 实现PATCH /api/meal-plans/:id/meals/:mealId（替换单餐）
- [x] 4.4 实现DELETE /api/meal-plans/:id（删除食谱）
- [x] 4.5 实现GET /api/meal-plans/:id/nutrition（营养汇总）

## 5. Meal Templates
- [x] 5.1 创建早餐模板库（15-20个模板，实际18个）
- [x] 5.2 创建午餐模板库（20-30个模板，实际28个）
- [x] 5.3 创建晚餐模板库（20-30个模板，实际30个）
- [x] 5.4 创建加餐模板库（10-15个模板，实际15个）
- [x] 5.5 标注模板适用目标（减重/增肌/维持）

## 6. UI Components
- [ ] 6.1 创建食谱生成页（MealPlanGenerator.tsx）
- [ ] 6.2 创建7天食谱展示（WeeklyPlan.tsx）
- [ ] 6.3 创建单餐详情卡片（MealCard.tsx）
- [ ] 6.4 创建食材替换弹窗（SwapIngredient.tsx）
- [ ] 6.5 创建营养统计面板（NutritionSummary.tsx）

## 7. Testing
- [ ] 7.1 测试不同目标下的食谱生成（减重/增肌/维持）
- [ ] 7.2 测试过敏食材自动排除
- [ ] 7.3 测试营养计算准确性（误差<5%）
- [ ] 7.4 性能测试（生成7天食谱<3秒）
- [ ] 7.5 E2E测试（设定目标→生成食谱→查看详情）
