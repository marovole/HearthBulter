## MODIFIED Requirements

### Requirement: SKU Smart Matching
系统 SHALL 将购物清单中的抽象食材智能匹配到具体平台 SKU，使用 Supabase 查询 product_catalog、platform_products 表，创建 v_ecommerce_product_prices 视图优化匹配查询。

#### Scenario: 精确匹配
- **WHEN** 购物清单包含「山姆会员牌鸡胸肉1kg」
- **THEN**: 查询 Supabase product_catalog、platform_products 表，直接匹配到山姆 SKU 并显示置信度100%

#### Scenario: Fuzzy matching with multiple candidates
- **WHEN** 购物清单包含「鸡胸肉」
- **THEN**: 查询 Supabase 使用模糊匹配算法（ILIKE、SIMILARITY），返回多个候选 SKU（不同品牌、规格）供用户选择

#### Scenario: Manual correction mapping
- **WHEN** 用户选择某个 SKU 作为「鸡胸肉」的正确匹配
- **THEN**: 插入 Supabase sku_mappings 表记录该映射关系，后续自动应用该映射

#### Scenario: SKU cache hit
- **WHEN** 匹配「鸡蛋」这个高频食材
- **THEN**: 查询 Supabase v_ecommerce_product_prices 物化视图（每日刷新），确保匹配速度 <100ms

### Requirement: Real-time Inventory Query
系统 SHALL 实时查询各平台商品库存和价格信息，查询 Supabase platform_products 表并调用 PlatformAdapter，返回实时库存数据或使用 inventory_cache 降级。

#### Scenario: Real-time inventory query with SKUs
- **WHEN** 购物清单包含「鸡胸肉500g」
- **THEN**: 查询 Supabase 获取已匹配的 SKU 列表，调用 PlatformAdapter.queryInventory()，返回各平台库存

#### Scenario: Product out of stock across all platforms
- **WHEN** 某商品在所有平台均无库存
- **THEN**: 查询 Supabase 备选商品表（substitute_products），标记为「暂无库存」并推荐替代商品

#### Scenario: Query timeout handling
- **WHEN** 平台 API 响应超过5秒
- **THEN**: 查询 Supabase inventory_cache 表获取缓存数据（10分钟过期），跳过该平台并记录错误日志

### Requirement: Price Comparison Engine
系统 SHALL 对比各平台相同商品价格并推荐最优选择，使用 Supabase RPC 调用 Price Comparator 服务，查询 v_ecommerce_product_prices 视图优化价格对比。

#### Scenario: Cross-platform price comparison
- **WHEN** 用户查看「鸡胸肉」的购买选项
- **THEN**: 查询 Supabase v_ecommerce_product_prices 视图，显示各平台价格、运费、预计送达时间的对比表

#### Scenario: Comprehensive cost calculation
- **WHEN** 计算购物车总成本
- **THEN**: 查询 Supabase product_prices、shipping_rates、promotions 表，包含商品价格、运费、优惠券、满减等因素

#### Scenario: Best platform recommendation
- **WHEN** 用户点击「智能推荐」
- **THEN**: 查询 Supabase v_ecommerce_product_prices 视图，使用算法计算综合成本最低的平台组合（单平台 vs 多平台分单）

#### Scenario: Price change monitoring
- **WHEN** 商品价格发生变化（降价或涨价）
- **THEN**: 更新 Supabase price_history 表，发送价格变动通知给用户

### Requirement: One-Click Ordering
系统 SHALL 支持一键下单到已绑定的电商平台，使用 Supabase 事务（RPC 或 Edge Function）插入 orders、order_items 表，并调用 PlatformAdapter API 创建订单。

#### Scenario: Single platform ordering
- **WHEN** 用户选择全部商品从「山姆」购买并点击「下单」
- **THEN**: 插入 Supabase orders 表创建订单，调用 PlatformAdapter.createOrder()，返回订单号并更新订单状态

#### Scenario: Multi-platform split ordering
- **WHEN** 购物清单分布在多个平台
- **THEN**: 为每个平台分别插入 Supabase orders 表，创建订单，使用分布式事务确保一致性

#### Scenario: Order failure handling
- **WHEN** 某平台下单失败（库存不足、网络错误）
- **THEN**: 回滚 Supabase orders 表记录，更新订单状态为 failed，提示用户重试或更换平台

### Requirement: Order Tracking
系统 SHALL 记录订单历史并追踪配送状态，使用 Supabase 查询 orders、order_tracking 表，实时更新订单状态并触发 Webhook 通知用户。

#### Scenario: View order history
- **WHEN** 用户访问「我的订单」页面
- **THEN**: 查询 Supabase orders 表，显示所有订单及状态（待支付、配送中、已完成）

#### Scenario: Track delivery status
- **WHEN** 用户点击某订单详情
- **THEN**: 查询 Supabase order_tracking 表，显示实时配送状态和预计送达时间

#### Scenario: Order sync
- **WHEN** 平台订单状态变更（通过 Webhook 或轮询）
- **THEN**: 更新 Supabase orders 表的 status 字段，触发通知给用户

#### Scenario: Order analytics
- **WHEN** 查看订单统计
- **THEN**: 查询 Supabase orders 表，使用聚合函数统计订单数量、总金额、各平台分布
