## 1. 类型定义准备

- [x] 1.1 审计所有 `any` 使用位置，分类整理
- [x] 1.2 在 `src/types/` 创建缺失的类型定义文件
- [x] 1.3 定义 `TaskWhereCondition`, `TaskUpdateData` 接口
- [x] 1.4 定义 `InventoryItemWithRelations` 类型
- [x] 1.5 定义 `ActivityMetadata` 联合类型

## 2. Services 层重构

- [x] 2.1 重构 `task-management.ts` 中的 `any` 类型
- [x] 2.2 重构 `inventory-analyzer.ts` 中的 `any` 类型
- [x] 2.3 重构 `inventory-notification.ts` 中的 `any` 类型
- [x] 2.4 重构 `shopping-list.ts` 中的 `any` 类型
- [x] 2.5 重构 `expiry-monitor.ts` 中的 `any` 类型

## 3. Lib Services 层重构

- [x] 3.1 重构 `lib/services/budget/*.ts` 中的 `any` 类型
  - [x] cost-optimizer.ts - 4 处 any
  - [x] spending-analyzer.ts - 5 处 any
  - [x] economic-mode.ts - 20+ 处 any
  - [x] savings-recommender.ts - 5 处 any
  - [x] price-analyzer.ts - 15+ 处 any
  - [x] budget-tracker.ts - 1 处 any
- [ ] 3.2 重构 `lib/services/tracking/*.ts` 中的 `any` 类型 (未在本阶段范围内)
- [ ] 3.3 重构 `lib/services/notification/*.ts` 中的 `any` 类型 (未在本阶段范围内)

## 4. Repository 层重构

- [~] 4.1-4.3 跳过 - Supabase 客户端与 Prisma 类型兼容性需要 `as any`

## 5. 验证与测试

- [~] 5.1 运行 `pnpm type-check` - 存在预先存在的类型错误，budget 服务文件已重构
- [ ] 5.2 运行 `pnpm lint` 检查代码规范
- [ ] 5.3 运行 `pnpm test` 确保测试通过
- [x] 5.4 更新相关类型导出 - 在 service-types.ts 中添加了 Budget 相关类型
