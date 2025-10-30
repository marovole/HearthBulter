# Proposal: Add Shopping List Generator

## Why

购物清单生成将食谱转化为可执行的采购任务，是闭环的关键一步。自动提取食材、去重、分类，大幅降低用户执行成本。后续可对接电商API实现一键下单。

## What Changes

- 实现从食谱自动提取食材功能
- 创建食材聚合和去重逻辑
- 实现分类和保质期标注
- 添加预算控制和成本估算
- 创建购物清单UI和打卡功能

## Impact

**Affected Specs**:
- `shopping-list-generation` (NEW)

**Affected Code**:
- `src/lib/services/list-generator.ts` - 清单生成
- `src/app/api/shopping-lists/**` - 清单管理API
- `prisma/schema.prisma` - ShoppingList, ShoppingItem模型
- `src/components/shopping/**` - 清单UI

**Breaking Changes**: 无

**Dependencies**:
- 依赖meal-planning（食谱数据）
- 依赖nutrition-database（食材信息）

**Estimated Effort**: 3天开发 + 1天测试
