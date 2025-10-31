# Proposal: Add Ingredient Inventory Management

## Why

用户采购食材后，缺乏有效管理导致重复购买、食材过期浪费。开发食材库存管理系统，追踪已有食材、保质期、使用情况，避免浪费并优化采购决策。

## What Changes

- 开发食材库存录入和管理
- 实现自动库存同步（从订单自动添加）
- 添加保质期追踪和过期提醒
- 开发食材使用记录（与打卡联动）
- 实现库存不足预警
- 添加智能采购建议（基于库存和食谱）
- 开发食材分类管理（冷藏、冷冻、常温）
- 实现库存历史和浪费分析

## Impact

**Affected Specs**:
- `ingredient-inventory` (NEW)
- `shopping-list-generation` (MODIFIED - 考虑现有库存)
- `nutrition-tracking` (MODIFIED - 自动扣减库存)

**Affected Code**:
- `src/lib/services/inventory/` - 库存管理（新增）
  - `inventory-tracker.ts` - 库存追踪
  - `expiry-monitor.ts` - 过期监控
  - `usage-recorder.ts` - 使用记录
  - `waste-analyzer.ts` - 浪费分析
- `src/app/api/inventory/**` - 库存API路由
- `src/components/inventory/` - 库存组件（新增）
  - `InventoryList.tsx` - 库存列表
  - `ExpiryAlert.tsx` - 过期提醒
  - `AddInventoryItem.tsx` - 添加库存
  - `InventoryStats.tsx` - 库存统计
- Prisma Schema - 添加InventoryItem, InventoryUsage, WasteLog模型

**Breaking Changes**: 无

**Dependencies**:
- 条形码扫描（可选）：`react-webcam` + 条码识别API

**Estimated Effort**: 5天开发 + 2天测试

**Risks**:
- 用户手动录入积极性（需降低操作成本）
- 保质期数据准确性

