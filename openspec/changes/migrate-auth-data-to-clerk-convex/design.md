## Context

当前系统同时存在 NextAuth、Prisma、Supabase 与部分 Convex 代码，导致身份认证与数据访问路径不一致，运维与开发成本上升。目标是统一身份为 Clerk，统一数据为 Convex。

## Goals / Non-Goals

- Goals:
  - 以 Clerk 作为唯一认证与会话来源（含 Google OAuth）。
  - 以 Convex 作为唯一运行时数据源（Queries/Mutations）。
  - 移除 Supabase 与 Prisma 的运行时依赖与 API 路由。
  - 保持现有业务能力与 API 行为一致。
- Non-Goals:
  - 不在此变更中引入新的业务功能。
  - 不进行 UI 风格重构。

## Decisions

- Decision: 使用 Clerk 替换 NextAuth，采用 Clerk middleware 与 webhook 同步用户资料。
  - Alternatives considered: 保留 NextAuth 作为兼容层（Rejected: 增加复杂度）。
- Decision: 使用 Convex 作为运行时数据层，逐模块替换 Prisma/Supabase 访问。
  - Alternatives considered: 仅迁移认证（Rejected: 无法达成“完整迁移”目标）。
- Decision: 使用 Convex Storage 作为唯一文件存储，替换 Supabase Storage。
  - Notes: 在 Convex 表中保存 storageId + 元数据；对外使用 Convex 生成的可访问 URL。
- Decision: 基于 Convex 表实现分布式限流，替代进程内内存限流。
  - Notes: 使用滑动窗口或固定窗口计数，确保多实例一致性。

## Risks / Trade-offs

- 风险: 大量服务与 API 依赖 Prisma/Supabase → 迁移工作量巨大。
  - 缓解: 按模块迁移并建立验收清单，确保每个模块可回归。
- 风险: 旧数据兼容与迁移。
  - 缓解: 明确迁移脚本与回滚策略，先双写后切换。
- 风险: Convex Storage 替换后，历史文件 URL 可能需要迁移或兼容处理。
  - 缓解: 保留旧 URL 只读访问，新增文件走 Convex，逐步补迁移脚本。
- 风险: 限流改为远程存储会引入额外延迟。
  - 缓解: 对高频端点做本地短路缓存，控制调用频率。

## Migration Plan

1. 认证层迁移到 Clerk（前端/中间件/API 认证入口）。
2. Convex schema 与用户模型对齐（clerkId 作为主身份键）。
3. 逐模块替换 Prisma/Supabase 仓储与服务层为 Convex Functions。
4. 清理 Supabase/Prisma 依赖、脚本与配置。
5. 全量回归测试与性能验证。

## Module Mapping (Convex 替换清单)

- Family/Member: Convex `families`, `familyMembers`, `users` queries/mutations
- Inventory/Shopping: Convex `inventoryItems`, `inventoryUsage`, `shoppingLists`, `shoppingItems`
- Health/Analytics: Convex `healthData`, `healthReports`, `healthScores`, `anomalies`, `trends`
- Meal Planning: Convex `mealPlans`, `meals`, `mealIngredients`, `nutritionTargets`
- Notifications: Convex `notifications`, `notificationPreferences`, `notificationLogs`
- Social Sharing: Convex `sharedContents`, `shareTracking`, `achievements`, `leaderboards`
- E-commerce: Convex `orders`, `platformAccounts`, `platformProducts`, `priceHistories`
- Devices/Wearables: Convex `deviceConnections`, `deviceSyncs`, `healthData`

## Open Questions

- 是否需要双写/回滚期？若需要，保留多久？
- 是否需要一次性迁移全部历史数据到 Convex？
- 历史文件（体检报告、食物照片）是否需要迁移到 Convex Storage，还是保持只读兼容？
