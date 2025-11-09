# Prisma 到 Supabase 迁移任务清单

> 基于 CodeX 深度代码分析的分批迁移计划
>
> **总时间估算**：12-14 周（3 个月）
> **影响范围**：102 个 API 处理器，71 张数据表

---

## 阶段 0：基础设施准备（4-5 周）

### 0.1 Supabase 环境搭建（5 天）

- [ ] 0.1.1 创建 Supabase 项目（开发、测试、生产环境）
- [ ] 0.1.2 配置环境变量管理（`.env.development`, `.env.staging`, `.env.production`）
- [ ] 0.1.3 从 Prisma Schema 生成 Supabase 迁移脚本
- [ ] 0.1.4 同步 71 张数据表结构（含外键、索引、枚举类型）
- [ ] 0.1.5 导入种子数据（seed data）到开发环境
- [ ] 0.1.6 验证表结构完整性（运行自动化检查脚本）

**交付物**：
- ✅ Supabase 项目配置文档
- ✅ 迁移脚本集合（`supabase/migrations/`）
- ✅ 数据完整性验证报告

---

### 0.2 RPC 函数库开发（8-10 天）⚠️ 关键路径

#### 0.2.1 事务处理 RPC 函数

- [ ] 0.2.1.1 实现 `accept_family_invite` - 家庭邀请接受（事务）
  - 文件：`supabase/migrations/xxx_accept_family_invite.sql`
  - 测试：单元测试验证原子性、错误回滚
  - 引用：`src/app/api/invite/[code]/route.ts:189-245`

- [ ] 0.2.1.2 实现 `record_spending_tx` - 预算记账（事务）
  - 文件：`supabase/migrations/xxx_record_spending_tx.sql`
  - 测试：并发写入测试、预算金额一致性校验
  - 引用：`src/app/api/budget/record-spending/route.ts:1-78`

- [ ] 0.2.1.3 实现 `create_inventory_notifications_batch` - 库存通知批量创建（事务）
  - 文件：`supabase/migrations/xxx_create_inventory_notifications_batch.sql`
  - 测试：批量写入失败回滚、去重逻辑
  - 引用：`src/services/inventory-notification.ts:360-421`

- [ ] 0.2.1.4 实现 `update_shopping_list_item_atomic` - 购物清单原子更新（事务）
  - 文件：`supabase/migrations/xxx_update_shopping_list_item_atomic.sql`
  - 测试：竞态条件模拟、`SELECT FOR UPDATE` 锁验证
  - 引用：`src/app/api/shopping-lists/[id]/items/[itemId]/route.ts:24-101`

#### 0.2.2 分析查询 RPC 函数

- [ ] 0.2.2.1 实现 `fetch_advice_history` - AI 建议历史查询（聚合）
  - 文件：`supabase/migrations/xxx_fetch_advice_history.sql`
  - 优化：减少 JOIN 层级、分页优化、JSONB 压缩
  - 引用：`src/app/api/ai/advice-history/route.ts:5-159`

- [ ] 0.2.2.2 实现 `fetch_devices_for_sync` - 设备同步列表查询（关联）
  - 文件：`supabase/migrations/xxx_fetch_devices_for_sync.sql`
  - 优化：权限检查下推到 SQL、索引优化
  - 引用：`src/app/api/devices/sync/all/route.ts:30-150`

- [ ] 0.2.2.3 实现 `calculate_social_stats` - 社交统计计算（groupBy）
  - 文件：`supabase/migrations/xxx_calculate_social_stats.sql`
  - 优化：物化视图缓存、定时刷新策略
  - 引用：`src/app/api/social/stats/route.ts:31-114`

#### 0.2.3 辅助 RPC 函数

- [ ] 0.2.3.1 实现 `update_recipe_favorite_count` - 收藏计数更新
- [ ] 0.2.3.2 实现 `update_device_sync_status` - 设备同步状态更新
- [ ] 0.2.3.3 实现 `bulk_mark_notifications_read` - 批量标记通知已读

**交付物**：
- ✅ 10+ RPC 函数 SQL 文件
- ✅ 单元测试套件（Jest + Supabase 本地环境）
- ✅ 性能基准测试报告

---

### 0.3 类型生成与验证管道（3-4 天）

- [ ] 0.3.1 配置 `supabase gen types typescript` CI 流程
- [ ] 0.3.2 创建类型生成脚本（`scripts/generate-supabase-types.ts`）
- [ ] 0.3.3 建立 Zod schema 库（`src/schemas/supabase/`）
  - API 输入验证 schema
  - 复杂查询返回类型 schema
- [ ] 0.3.4 配置 TypeScript 严格模式验证
- [ ] 0.3.5 编写类型安全迁移检查清单

**交付物**：
- ✅ `src/types/supabase-generated.ts`
- ✅ Zod schema 库（20+ schemas）
- ✅ CI 自动化验证流程

---

### 0.4 服务抽象层重构（5 天）

#### 0.4.1 数据访问接口定义

- [ ] 0.4.1.1 创建 `BudgetRepository` 接口
  ```typescript
  // src/lib/db/repositories/budget-repository.interface.ts
  interface BudgetRepository {
    findBudgetById(id: string): Promise<Budget | null>;
    recordSpending(input: SpendingInput): Promise<Spending>;
    updateBudgetUsage(budgetId: string): Promise<void>;
  }
  ```

- [ ] 0.4.1.2 创建 `InventoryRepository` 接口
- [ ] 0.4.1.3 创建 `NotificationRepository` 接口
- [ ] 0.4.1.4 创建 `AnalyticsRepository` 接口

#### 0.4.2 Supabase Adapter 实现

- [ ] 0.4.2.1 实现 `SupabaseBudgetRepository`
  - 文件：`src/lib/db/repositories/supabase-budget.repository.ts`
  - 依赖：Supabase 客户端 + RPC 函数

- [ ] 0.4.2.2 实现 `SupabaseInventoryRepository`
  - 文件：`src/lib/db/repositories/supabase-inventory.repository.ts`

- [ ] 0.4.2.3 实现 `SupabaseNotificationRepository`
- [ ] 0.4.2.4 实现 `SupabaseAnalyticsRepository`

#### 0.4.3 服务重构为依赖注入

- [ ] 0.4.3.1 重构 `BudgetTracker` 接受 repository 参数
  - 引用：`src/lib/services/budget/budget-tracker.ts:1-12`
  - 移除 `new PrismaClient()` 实例化

- [ ] 0.4.3.2 重构 `InventoryTracker`
  - 引用：`src/services/inventory-tracker.ts:1-4`

- [ ] 0.4.3.3 重构 `InventoryNotificationService`
  - 引用：`src/services/inventory-notification.ts:1-6`

- [ ] 0.4.3.4 重构 `TrendAnalyzer`
  - 引用：`src/lib/services/analytics/trend-analyzer.ts:6-8`

**交付物**：
- ✅ 4 个 Repository 接口定义
- ✅ 4 个 Supabase Adapter 实现
- ✅ 重构后的服务层代码

---

### 0.5 双写验证框架（6-7 天）⚠️ 复杂度高

#### 0.5.1 核心框架开发

- [ ] 0.5.1.1 创建 Repository 装饰器（Dual Write Decorator）
  ```typescript
  // src/lib/db/dual-write-decorator.ts
  class DualWriteDecorator<T> implements Repository<T> {
    constructor(
      private prismaRepo: Repository<T>,
      private supabaseRepo: Repository<T>,
      private verifier: ResultVerifier
    ) {}

    async create(data: T): Promise<T> {
      const [prismaResult, supabaseResult] = await Promise.allSettled([
        this.prismaRepo.create(data),
        this.supabaseRepo.create(data)
      ]);

      await this.verifier.recordDiff(prismaResult, supabaseResult);
      return prismaResult.value; // Prisma 为主
    }
  }
  ```

- [ ] 0.5.1.2 实现结果比对器（ResultVerifier）
  - 使用 `fast-json-patch` 计算 diff
  - 忽略时间戳、顺序差异
  - 记录到 Cloudflare KV 或 Redis

- [ ] 0.5.1.3 实现 Feature Flag 管理
  - 环境变量：`ENABLE_DUAL_WRITE`, `ENABLE_SUPABASE_PRIMARY`
  - LaunchDarkly 集成（可选）

#### 0.5.2 验证和告警

- [ ] 0.5.2.1 创建 diff 记录表（Supabase）
  ```sql
  CREATE TABLE dual_write_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_endpoint TEXT NOT NULL,
    operation TEXT NOT NULL,
    prisma_result JSONB,
    supabase_result JSONB,
    diff JSONB,
    severity TEXT, -- 'info', 'warning', 'error'
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] 0.5.2.2 实现告警触发逻辑
  - 错误率 > 1%：PagerDuty 告警
  - 数据不一致：Slack 通知 + 记录详情

- [ ] 0.5.2.3 编写自动对账脚本
  - Nightly job：比对 Prisma 与 Supabase 关键数据
  - 预算金额、收藏计数、库存数量

#### 0.5.3 回滚机制

- [ ] 0.5.3.1 实现补偿脚本（Supabase → Prisma 同步）
- [ ] 0.5.3.2 实现 Feature Flag 快速切换流程
- [ ] 0.5.3.3 编写回滚操作手册

**交付物**：
- ✅ 双写装饰器框架
- ✅ diff 记录和告警系统
- ✅ 自动对账脚本
- ✅ 回滚操作手册

---

### 0.6 性能基线和监控（3-4 天）

- [ ] 0.6.1 使用 k6 编写性能测试脚本
  - 测试场景：低风险 CRUD、事务端点、分析查询
  - 记录 P50/P95/P99 延迟基线

- [ ] 0.6.2 配置 Supabase Log Drain
  - 导出到 Grafana/Datadog

- [ ] 0.6.3 配置 Cloudflare Workers 日志
  - Tail logs、Analytics Dashboard

- [ ] 0.6.4 建立 Grafana 监控仪表盘
  - API 成功率
  - Supabase error rate
  - 双写 diff 数量
  - RPC 延迟
  - 关键业务指标（预算剩余、通知发送量）

**交付物**：
- ✅ k6 性能测试套件
- ✅ Grafana 仪表盘配置
- ✅ 性能基线报告

---

## 里程碑：基础设施完成评审

**验收标准**：
- ✅ 所有 RPC 函数通过单元测试
- ✅ 类型生成 CI 流程正常运行
- ✅ 双写框架能够记录和比对结果
- ✅ 性能基线测试完成

**时间点**：第 4-5 周末

---

## 阶段 1：Batch 1 - 低风险 CRUD 试点（1-2 周）

### 前置条件
- ✅ 基础设施准备完成
- ✅ 不依赖服务重构（直接 API 迁移）

### 1.1 API 迁移（6 个端点）

- [ ] 1.1.1 迁移 `auth/register`
  - 文件：`src/app/api/auth/register/route.ts:1-48`
  - Prisma 操作：`user.findUnique`, `user.create`
  - Supabase 等价：`.from('user').select().eq()`, `.insert()`
  - 测试：新邮箱返回 200，重复邮箱返回 409

- [ ] 1.1.2 迁移 `foods/popular`
  - 文件：`src/app/api/foods/popular/route.ts:1-40`
  - Prisma 操作：`food.findMany` + sort
  - Supabase 等价：`.from('food').order('popularity')`
  - 测试：响应排序正确、数量对比

- [ ] 1.1.3 迁移 `foods/categories/[category]`
  - 文件：`src/app/api/foods/categories/[category]/route.ts`
  - Prisma 操作：`findMany` + `count`
  - Supabase 等价：`.select(*, { count: 'exact' }).eq().range()`
  - 测试：分类过滤、分页、计数一致性

- [ ] 1.1.4 迁移 `user/preferences`
  - 文件：`src/app/api/user/preferences/route.ts`
  - Prisma 操作：`userPreference.upsert`
  - Supabase 等价：`.upsert()`
  - 测试：首次创建、更新覆盖、JSON 字段解析

- [ ] 1.1.5 迁移 `recipes/[id]/favorite`
  - 文件：`src/app/api/recipes/[id]/favorite/route.ts:4-118`
  - Prisma 操作：`recipeFavorite.create` + `recipe.update`
  - Supabase 等价：`.insert()` + RPC `update_recipe_favorite_count`
  - 测试：收藏/取消收藏、计数更新、唯一约束

- [ ] 1.1.6 迁移 `recipes/[id]/rate`
  - 文件：`src/app/api/recipes/[id]/rate/route.ts`
  - Prisma 操作：`recipeRating.upsert`, `recipe.update`
  - Supabase 等价：`.upsert()` + 聚合查询
  - 测试：评分创建/更新、平均分计算

### 1.2 验证策略

- [ ] 1.2.1 开启双写模式（Prisma 为主）
- [ ] 1.2.2 运行 Playwright E2E 回归测试
- [ ] 1.2.3 监控双写 diff 数量（目标 < 5 个差异/天）
- [ ] 1.2.4 监控错误率（目标 < 0.1%）
- [ ] 1.2.5 抽样人工验证 diff（检查 100 个请求）

### 1.3 切换策略

- [ ] 1.3.1 双写运行 3 天无严重问题
- [ ] 1.3.2 切换为 Supabase 为主（Feature Flag）
- [ ] 1.3.3 Prisma 降级为影子写（持续 7 天）
- [ ] 1.3.4 移除 Prisma 代码路径

**交付物**：
- ✅ 6 个 API 迁移完成
- ✅ E2E 测试全部通过
- ✅ 双写验证报告

---

## 阶段 2：Batch 2 - 通知系统（2 周）

### 前置条件
- ✅ Batch 1 完成
- ✅ `NotificationManager` Supabase Adapter 就绪

### 2.1 API 迁移（5 个端点）

- [ ] 2.1.1 迁移 `/notifications`（GET/POST）
  - 引用：`src/app/api/notifications/route.ts:8-144`
  - 服务层：`NotificationManager.createNotification`
  - 测试：列表查询、创建通知、去重逻辑

- [ ] 2.1.2 迁移 `/notifications/preferences`
  - 引用：`src/app/api/notifications/preferences/route.ts:1-40`
  - 操作：`notificationPreference.upsert`

- [ ] 2.1.3 迁移 `/notifications/templates`
  - 引用：`src/app/api/notifications/templates/route.ts:7-140`
  - 服务层：`TemplateEngine`

- [ ] 2.1.4 迁移 `/notifications/[id]`
  - 引用：`src/app/api/notifications/[id]/route.ts:7-33`
  - 操作：`notification.findUnique`, `notification.delete`

- [ ] 2.1.5 迁移 `/notifications/read`
  - 引用：`src/app/api/notifications/read/route.ts:7-43`
  - 操作：`notification.update`, `notification.updateMany`

### 2.2 Supabase Realtime 集成

- [ ] 2.2.1 配置通知 Channel
- [ ] 2.2.2 实现前端实时订阅
- [ ] 2.2.3 测试推送延迟（目标 < 2 秒）

### 2.3 验证策略

- [ ] 2.3.1 模板渲染对比（Prisma vs Supabase）
- [ ] 2.3.2 批量通知创建压力测试
- [ ] 2.3.3 Realtime 推送测试

**交付物**：
- ✅ 通知系统完整迁移
- ✅ Realtime 功能验证

---

## 阶段 3：Batch 3 - 家庭/购物/库存 CRUD（2-3 周）

### 前置条件
- ✅ Batch 2 完成
- ✅ `InventoryTracker` Supabase Adapter 就绪

### 3.1 家庭管理（3 个端点）

- [ ] 3.1.1 迁移 `/families`（GET/POST）
  - 引用：`src/app/api/families/route.ts`

- [ ] 3.1.2 迁移 `/families/[familyId]/members`
  - 引用：`src/app/api/families/[familyId]/members/route.ts`

- [ ] 3.1.3 迁移家庭权限检查逻辑

### 3.2 购物清单（5 个端点）

- [ ] 3.2.1 迁移 `/shopping-lists`
  - 引用：`src/app/api/shopping-lists/route.ts`

- [ ] 3.2.2 迁移 `/shopping-lists/[id]`（DELETE/PATCH）
  - 引用：`src/app/api/shopping-lists/[id]/route.ts`

- [ ] 3.2.3 迁移 `/shopping-lists/[id]/complete`
- [ ] 3.2.4 迁移 `/shopping-lists/[id]/share`
- [ ] 3.2.5 迁移 `/shopping-lists/[id]/items/[itemId]`
  - ⚠️ 使用 RPC `update_shopping_list_item_atomic` 避免竞态

### 3.3 库存管理（只读端点）

- [ ] 3.3.1 迁移 `/inventory/items`（GET）
  - 引用：`src/app/api/inventory/items/route.ts:1-98`
  - 服务层：`inventoryTracker.getItems`

- [ ] 3.3.2 迁移 `/inventory/items/[id]`（GET）
  - 引用：`src/app/api/inventory/items/[id]/route.ts:1-105`

### 3.4 验证策略

- [ ] 3.4.1 UAT（用户验收测试）- 家庭协作场景
- [ ] 3.4.2 并发写入测试（购物清单竞态条件）
- [ ] 3.4.3 抽样数据一致性检查

**交付物**：
- ✅ 家庭/购物/库存 CRUD 迁移完成
- ✅ UAT 通过

---

## 阶段 4：Batch 4 - 财务/通知写路径（3 周）⚠️ 高风险

### 前置条件
- ✅ Batch 3 完成
- ✅ 所有 RPC 函数部署到生产
- ✅ `BudgetTracker` Supabase Adapter 就绪

### 4.1 预算管理（4 个端点）

- [ ] 4.1.1 迁移 `/budget/current`
  - 引用：`src/app/api/budget/current/route.ts:5-55`
  - 服务层：`budgetTracker.getCurrentBudget`

- [ ] 4.1.2 迁移 `/budget/set`
  - 引用：`src/app/api/budget/set/route.ts:5-118`

- [ ] 4.1.3 迁移 `/budget/record-spending` ⚠️ 关键
  - 引用：`src/app/api/budget/record-spending/route.ts:1-78`
  - 使用 RPC：`record_spending_tx`
  - 测试：事务回滚、金额一致性、并发写入

- [ ] 4.1.4 迁移 `/budget/spending-history`
  - 引用：`src/app/api/budget/spending-history/route.ts:1-112`

### 4.2 库存通知（写路径）

- [ ] 4.2.1 迁移 `/inventory/notifications`（POST）
  - 引用：`src/app/api/inventory/notifications/route.ts:1-88`
  - 使用 RPC：`create_inventory_notifications_batch`

### 4.3 通知批量操作

- [ ] 4.3.1 迁移 `/notifications/batch`
  - 引用：`src/app/api/notifications/batch/route.ts:7-200`
  - 测试：批量写入失败处理、部分成功场景

### 4.4 家庭邀请（事务）

- [ ] 4.4.1 迁移 `/invite/[code]`
  - 引用：`src/app/api/invite/[code]/route.ts:189-245`
  - 使用 RPC：`accept_family_invite`
  - 测试：原子性、错误回滚、并发接受

### 4.5 验证策略

- [ ] 4.5.1 RPC 函数单元测试（100% 覆盖率）
- [ ] 4.5.2 财务对账脚本（每日运行）
  - 验证：`budget.used_amount === SUM(spending.amount)`
- [ ] 4.5.3 灰度发布
  - 10% 流量（1 天）
  - 50% 流量（2 天）
  - 100% 流量（评估后）
- [ ] 4.5.4 事务失败模拟测试

**交付物**：
- ✅ 财务/通知写路径迁移完成
- ✅ 对账脚本报告无异常
- ✅ 灰度发布验证通过

---

## 阶段 5：Batch 5 - AI/Analytics/Devices（3-4 周）⚠️ 性能敏感

### 前置条件
- ✅ Batch 4 完成
- ✅ 性能基线建立
- ✅ Cloudflare KV 缓存集成
- ✅ 预计算/缓存方案上线

### 5.1 AI 端点（4 个）

- [ ] 5.1.1 迁移 `/ai/advice-history`
  - 引用：`src/app/api/ai/advice-history/route.ts:5-159`
  - 使用 RPC：`fetch_advice_history`
  - 优化：Edge Cache（60s TTL）

- [ ] 5.1.2 迁移 `/ai/analyze-health`
- [ ] 5.1.3 迁移 `/ai/chat`
- [ ] 5.1.4 迁移 `/ai/feedback`

### 5.2 Analytics 端点

- [ ] 5.2.1 迁移 `/analytics/trends`
  - 引用：`src/app/api/analytics/trends/route.ts:3-48`
  - 服务层：`TrendAnalyzer.analyzeTrends`
  - 优化：继续使用 `trendData` 表缓存

- [ ] 5.2.2 迁移 `/social/stats`
  - 引用：`src/app/api/social/stats/route.ts:31-114`
  - 使用 RPC：`calculate_social_stats`
  - 优化：物化视图（每小时刷新）

### 5.3 设备同步

- [ ] 5.3.1 迁移 `/devices/sync/all`
  - 引用：`src/app/api/devices/sync/all/route.ts:30-150`
  - 使用 RPC：`fetch_devices_for_sync`
  - 优化：KV 缓存待同步设备列表

### 5.4 性能优化

- [ ] 5.4.1 实现多级缓存
  - L1: Cloudflare KV（60s TTL）
  - L2: Supabase `trendData` 表
  - L3: Materialized View

- [ ] 5.4.2 压缩 JSONB 字段（`messages` 字段只保留最近 5 条）
- [ ] 5.4.3 配置 Edge Cache `Cache-Control` 头

### 5.5 验证策略

- [ ] 5.5.1 性能对比测试（Prisma vs Supabase）
  - 目标：P95 延迟不超过 Prisma 的 120%
- [ ] 5.5.2 缓存命中率监控（目标 > 70%）
- [ ] 5.5.3 分流流量测试
  - 10% 流量（性能评估）
  - 50% 流量（稳定性验证）
  - 100% 流量（正式切换）

**交付物**：
- ✅ AI/Analytics 迁移完成
- ✅ 性能达标报告
- ✅ 缓存策略文档

---

## 阶段 6：清理和优化（2-3 周）

### 6.1 代码清理

- [ ] 6.1.1 移除所有 Prisma 代码路径
- [ ] 6.1.2 移除 `@prisma/client` 依赖
- [ ] 6.1.3 删除双写验证框架代码
- [ ] 6.1.4 清理未使用的环境变量

### 6.2 文档更新

- [ ] 6.2.1 更新 API 文档
- [ ] 6.2.2 更新开发者指南
- [ ] 6.2.3 编写迁移总结报告

### 6.3 性能优化

- [ ] 6.3.1 根据监控数据优化 RPC 函数
- [ ] 6.3.2 调整缓存策略
- [ ] 6.3.3 数据库索引优化

### 6.4 稳定化

- [ ] 6.4.1 监控 2 周无严重问题
- [ ] 6.4.2 修复发现的边缘情况 bug
- [ ] 6.4.3 性能调优

**交付物**：
- ✅ Prisma 完全移除
- ✅ 迁移总结报告
- ✅ 优化后的性能指标

---

## 关键指标监控（全过程）

### API 层指标
- 成功率（目标 > 99.9%）
- P95 延迟（目标 < 200ms）
- 错误率（目标 < 0.1%）

### 数据层指标
- Supabase error rate（目标 < 0.5%）
- 双写 diff 数量（验证期目标 < 10/天）
- RPC 平均延迟（目标 < 100ms）

### 业务指标
- 预算金额一致性（100%）
- 收藏/评分计数准确性（100%）
- 通知发送成功率（> 99%）
- 设备同步成功率（> 95%）

---

## 里程碑总结

| 里程碑 | 时间点 | 关键交付物 | 验收标准 |
|--------|--------|-----------|---------|
| M0: 基础设施完成 | 第 4-5 周 | RPC 函数、双写框架、监控 | 所有基础组件测试通过 |
| M1: Batch 1 完成 | 第 6-7 周 | 6 个低风险 API | 双写验证无严重问题 |
| M2: Batch 2 完成 | 第 8-9 周 | 通知系统 | Realtime 功能正常 |
| M3: Batch 3 完成 | 第 10-12 周 | 家庭/购物/库存 | UAT 通过 |
| M4: Batch 4 完成 | 第 13-15 周 | 财务/事务端点 | 对账脚本无异常 |
| M5: Batch 5 完成 | 第 16-19 周 | AI/Analytics | 性能达标 |
| M6: 项目收尾 | 第 20-22 周 | Prisma 移除、文档 | 2 周稳定运行 |

---

## 风险缓解措施

### 技术风险
| 风险 | 影响 | 缓解措施 | 负责人 |
|------|------|---------|--------|
| RPC 函数 bug | High | 100% 单元测试覆盖 + 事务回滚测试 | 数据工程 |
| 性能退化 | Medium | 性能基线 + 多级缓存 + 分流测试 | SRE |
| 数据不一致 | High | 双写验证 + 自动对账 + 实时告警 | 后端 + SRE |
| 类型安全丢失 | Medium | Zod 验证 + TypeScript 严格模式 | 前端 + 后端 |

### 进度风险
- **RPC 开发延期**：预留 2-3 天缓冲时间
- **Batch 4 复杂度高**：提前 1 周开始准备，必要时延长至 4 周
- **性能优化时间不足**：Batch 5 可根据实际情况调整优先级

### 回滚计划
- Feature Flag 可在 5 分钟内切换回 Prisma
- 保留 Prisma 代码至少 2 周
- 补偿脚本可在 1 小时内修复数据不一致

---

**批准签字**：

- [ ] 技术负责人：___________ 日期：___________
- [ ] 产品负责人：___________ 日期：___________
- [ ] 项目经理：___________ 日期：___________
