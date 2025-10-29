# Implementation Tasks

## 1. Database Models
- [ ] 1.1 创建ShoppingList Prisma模型
- [ ] 1.2 创建ShoppingItem模型
- [ ] 1.3 添加ListStatus枚举（待采购/进行中/已完成）
- [ ] 1.4 运行数据库迁移

## 2. List Generator Service
- [ ] 2.1 创建list-generator.ts服务
- [ ] 2.2 实现食材提取（从MealPlan提取所有食材）
- [ ] 2.3 实现食材聚合（同类食材合并，如鸡胸肉700g = 7天×100g）
- [ ] 2.4 实现自动分类（蔬菜/肉类/谷物/调料）
- [ ] 2.5 添加保质期标注（叶菜3天、肉类7天等）

## 3. Budget Control
- [ ] 3.1 创建price-estimator.ts服务
- [ ] 3.2 实现成本估算（基于历史价格或默认价格）
- [ ] 3.3 实现预算检查（超预算时提示）
- [ ] 3.4 记录实际花费（采购完成后录入）

## 4. Shopping List API
- [ ] 4.1 实现POST /api/meal-plans/:id/shopping-list（生成清单）
- [ ] 4.2 实现GET /api/shopping-lists（查询清单）
- [ ] 4.3 实现PATCH /api/shopping-lists/:id/items/:itemId（标记已购）
- [ ] 4.4 实现PATCH /api/shopping-lists/:id/complete（完成采购）
- [ ] 4.5 实现DELETE /api/shopping-lists/:id（删除清单）

## 5. UI Components
- [ ] 5.1 创建购物清单展示（ShoppingListView.tsx）
- [ ] 5.2 创建分类列表（CategoryList.tsx）
- [ ] 5.3 创建打卡复选框（CheckboxItem.tsx）
- [ ] 5.4 创建预算显示（BudgetTracker.tsx）
- [ ] 5.5 添加打印/分享功能

## 6. Testing
- [ ] 6.1 测试食材聚合准确性（无遗漏、无重复）
- [ ] 6.2 测试分类逻辑
- [ ] 6.3 测试预算计算
- [ ] 6.4 E2E测试（生成食谱→生成清单→打卡→完成）
