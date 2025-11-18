# Complete Supabase Primary Switch Proposal

## Why

当前 Health Butler 项目已完成 Cloudflare-Supabase 混合架构的基础设施建设（86/130 任务，62% 完成），但仍处于 **Prisma 双写模式**，导致以下问题：

### 1. Cloudflare Workers 技术限制
- **Prisma 不兼容**：Prisma 需要文件系统访问才能加载查询引擎，但 Cloudflare Workers 是完全无文件系统的边缘计算环境
- **当前部署状态**：Cloudflare Pages 已成功部署（https://e11f876f.hearthbulter.pages.dev），但所有数据库操作失败
- **Health Check API 报错**：`/api/health` 返回 `{"database":"disconnected"}` 因为无法初始化 Prisma Client

### 2. 双写模式维护成本高
- **15 个 Repository 单例**：每个都包含复杂的双写装饰器逻辑
- **Feature Flags 管理复杂**：需要维护 `ENABLE_SUPABASE`, `ENABLE_DUAL_WRITE`, `SUPABASE_PRIMARY` 三个配置
- **数据一致性风险**：双写期间可能出现数据不同步

### 3. 基础设施已就绪
- ✅ **Repository 模式完整实现**：4 个核心 Repository (Budget, Notification, Analytics, Recommendation)
- ✅ **事务 RPC 函数已验证**：4 个 RPC 函数通过 P0 安全审查（`accept_family_invite`, `record_spending_tx` 等）
- ✅ **类型系统完善**：Supabase 类型生成管道和 Zod 验证已建立
- ✅ **Service Container 架构**：依赖注入框架已搭建

**时机已成熟**，应立即完成从双写模式到 Supabase 作为唯一主数据库的切换。

---

## What Changes

### 核心变更

#### 1. Repository 层完全切换（15 个文件）
**移除双写装饰器**，Repository 单例直接返回 Supabase 实现：

```typescript
// 修改前
@dualWrite(enableDualWrite, supabasePrimary)
export function getTaskRepository(): ITaskRepository {
  const prismaRepo = new PrismaTaskRepository(prisma);
  const supabaseRepo = new SupabaseTaskRepository(supabase);
  return enableSupabase ? supabaseRepo : prismaRepo;
}

// 修改后
export function getTaskRepository(): ITaskRepository {
  return new SupabaseTaskRepository(supabase);
}
```

**影响的 Repository**（src/lib/repositories/）：
- family-repository-singleton.ts
- task-repository-singleton.ts
- shopping-list-repository-singleton.ts
- recipe-repository-singleton.ts
- member-repository-singleton.ts
- budget-repository-singleton.ts
- inventory-repository-singleton.ts
- meal-plan-repository-singleton.ts
- device-repository-singleton.ts
- leaderboard-repository-singleton.ts
- health-repository-singleton.ts
- feedback-repository-singleton.ts
- food-repository-singleton.ts
- meal-tracking-repository-singleton.ts
- notification-repository-singleton.ts（✅ 已切换）

#### 2. Health Check API 快速修复（1 个文件）
**修改**: `src/app/api/health/route.ts`

```typescript
// 从 Prisma 测试
await prisma.$queryRaw`SELECT 1`;

// 改为 Supabase 测试
const { error } = await supabase.from('users').select('id').limit(1);
```

#### 3. 创建 Supabase RPC 函数（8 个）
**新建**: `supabase/migrations/002_create_rpc_functions.sql`

| RPC 函数名 | 用途 | 事务操作 |
|-----------|------|---------|
| `update_inventory_tx` | 库存更新（原子性） | ✅ |
| `create_meal_log_tx` | 用餐记录创建 + 健康数据更新 | ✅ |
| `batch_mark_notifications_read` | 批量标记通知已读 | ❌ |
| `calculate_health_score` | 计算健康分数 | ❌ |
| `get_family_dashboard_stats` | 家庭仪表板统计 | ❌ |
| `get_recipe_recommendations` | 食谱推荐（基于健康目标） | ❌ |
| `process_achievement_unlock` | 成就解锁（事务） | ✅ |
| `record_spending_tx` | 预算记账（✅ 已存在） | ✅ |

#### 4. 创建 Supabase Views（5 个）
**新建**: `supabase/migrations/003_create_views.sql`

| View 名称 | 用途 | 聚合类型 |
|----------|------|---------|
| `v_health_statistics` | 健康数据统计（平均体重、总步数等） | AVG, SUM, COUNT |
| `v_budget_summary` | 预算汇总（按类别） | SUM, GROUP BY |
| `v_recipe_ratings` | 食谱评分统计 | AVG, COUNT |
| `v_family_activity_feed` | 家庭活动流（最近活动） | JOIN, ORDER BY |
| `v_inventory_expiring_soon` | 即将过期库存 | WHERE, ORDER BY |

#### 5. 配置更新
**修改**:
- `src/config/feature-flags.ts` - 移除双写 Feature Flags
- `.env.example` - 注释 Prisma 环境变量，保留作为文档

### 保留但不使用

**保留 Prisma 作为备用**：
- `prisma/schema.prisma` - 保留用于 Schema 管理和数据库迁移
- `src/lib/db/index.ts` - 保留 Prisma Client 配置（环境变量切换即可恢复）
- `package.json` - 保留 Prisma 依赖（用于 CLI 工具）

---

## Impact

### 影响的规范
1. **data-access** (MODIFIED) - 数据访问层从双写切换到单一 Supabase 数据源
2. **database-operations** (ADDED) - 新增 RPC 函数和 Views 规范

### 影响的代码模块

| 模块 | 文件数 | 修改类型 | 风险等级 |
|------|--------|---------|---------|
| Repository 单例 | 15 | 移除装饰器 | 🟢 低 |
| API Routes | 1 (health) | 重写测试逻辑 | 🟢 低 |
| Supabase 迁移 | 2 (RPC + Views) | 新建 SQL | 🟡 中 |
| 配置文件 | 2 | 更新 Flags | 🟢 低 |

### 用户影响
- **无感知变更**：API 接口契约保持不变
- **性能提升**：Supabase HTTP API 在边缘环境性能优于 Prisma（无冷启动）
- **功能完整性**：所有功能通过 RPC 和 Views 保持完整

### 时间估算
- **总工时**：约 3.5 小时
- **测试验证**：30 分钟
- **部署**：10 分钟
- **风险缓冲**：1 小时
- **总计**：~5 小时（1 个工作日）

### 回滚策略
1. **环境变量切换**：重新启用 `DATABASE_URL` 和双写 Flags
2. **代码保留**：Prisma 配置和依赖完整保留 4 周
3. **即时回滚**：Cloudflare Pages 支持一键回滚到上一版本
4. **数据一致性**：已迁移数据无损，Supabase 保留所有历史

---

## Related Changes

**依赖**: `add-cloudflare-supabase-hybrid-architecture` (86/130 tasks)
- 本提案基于混合架构提案的基础设施（Repository 模式、Service Container、RPC 函数）
- 可以视为混合架构提案的 **Phase 1 关键里程碑**

**后续计划**: 完成本提案后，可继续 102 个 API 端点的渐进式迁移（Phase 1-5）。

---

**提案创建日期**: 2025-11-17
**预期完成日期**: 2025-11-18
**负责人**: Claude Code + Ronn Huang
