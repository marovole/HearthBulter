# Proposal: Develop Shopping List Feature

## Why

购物清单功能是Health Butler闭环体验的关键一环，它将AI推荐的食谱转化为实际可执行的采购任务。用户需要一个智能的购物清单系统，能够根据接受的食谱自动生成清单，匹配电商平台，并提供一键购买功能。完善的购物清单功能对提升用户体验和实现商业化价值至关重要。

## What Changes

- 根据接受的食谱自动生成购物清单
- 实现食材与电商平台的SKU匹配
- 添加一键购买功能（对接叮咚买菜等平台）
- 创建购物清单管理界面（清单列表、编辑、分享）
- 实现智能食材聚合和去重逻辑
- 添加价格比较和预算控制功能
- 创建购物提醒和清单完成状态追踪

## Impact

**Affected Specs**:
- `shopping-list-generation` (MODIFIED - 添加前端界面和电商集成)

**Affected Code**:
- `src/app/shopping-list/` - 购物清单页面目录（新增）
  - `page.tsx` - 购物清单主页面
  - `[id]/` - 具体清单详情页面
  - `checkout/` - 结算页面
- `src/components/shopping-list/` - 购物清单组件目录（新增）
  - `ShoppingListCard.tsx` - 购物清单卡片
  - `IngredientItem.tsx` - 食材项目组件
  - `PriceComparison.tsx` - 价格比较组件
  - `EcommerceIntegration.tsx` - 电商平台集成
  - `OneClickPurchase.tsx` - 一键购买组件
  - `BudgetTracker.tsx` - 预算追踪
  - `ListShare.tsx` - 清单分享
- `src/lib/services/list-generator.ts` - 清单生成服务（已存在）
- `src/lib/services/sku-matcher.ts` - SKU匹配服务（已存在）
- `src/lib/services/ecommerce/` - 电商服务目录（新增）
- `src/app/api/shopping-lists/` - API路由（已存在）

**Breaking Changes**: 无

**Dependencies**:
- 电商平台API（叮咚买菜、盒马等）
- 食谱规划数据（已实现）
- SKU匹配服务（已实现）
- 支付集成（待实现）

**Estimated Effort**: 5天开发 + 2天测试 + 1天UI/UX优化
