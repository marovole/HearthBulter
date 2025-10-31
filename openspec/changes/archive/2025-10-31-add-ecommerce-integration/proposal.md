# Proposal: Add E-commerce Integration

## Why

购物清单生成后，用户仍需手动打开各电商平台搜索、对比和下单，体验割裂且耗时。对接主流电商平台API（山姆、盒马、叮咚）可实现库存同步、价格比较、一键下单，完成从食谱到采购的自动化闭环。

## What Changes

- 对接山姆会员商店、盒马鲜生、叮咚买菜API
- 实现实时库存查询和SKU智能匹配
- 开发价格比较引擎（跨平台最优选择）
- 添加一键下单功能（含购物车管理）
- 实现平台配送时间和运费计算
- 开发平台账号绑定与授权管理
- 添加订单状态追踪和历史记录

## Impact

**Affected Specs**:
- `ecommerce-integration` (NEW)

**Affected Code**:
- `src/lib/services/ecommerce/` - 电商平台适配器（新增）
  - `sams-adapter.ts` - 山姆会员商店
  - `hema-adapter.ts` - 盒马鲜生
  - `dingdong-adapter.ts` - 叮咚买菜
- `src/lib/services/sku-matcher.ts` - SKU智能匹配
- `src/lib/services/price-comparator.ts` - 价格比较引擎
- `src/app/api/ecommerce/**` - 电商API路由
- `src/components/shopping/PlatformSelector.tsx` - 平台选择UI
- `src/components/shopping/OrderCheckout.tsx` - 下单界面
- Prisma Schema - 添加平台账号、订单记录模型

**Breaking Changes**: 无

**Dependencies**:
- 各平台开放API或SDK（需申请企业认证）
- OAuth 2.0 客户端库（用于平台授权）

**Estimated Effort**: 10天开发 + 3天集成测试 + 平台认证审核时间

**Risks**:
- 平台API可用性和稳定性依赖
- SKU匹配准确率（需机器学习优化）
- 平台政策变更风险
- 需企业认证资质

