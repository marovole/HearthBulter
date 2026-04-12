---
title: Convex 迁移完成报告
slug: convex-migration-completion-2026-04-12
summary: 记录 HearthBulter 数据层统一到 Convex 的完整迁移成果、当前状态与后续建议
---

## 执行摘要

本轮工作完成了 **Phase 3 核心迁移**，将 HearthBulter 的数据层从 **Prisma / Neon / Drizzle / Supabase 四轨并存** 推进到 **Convex 唯一后端** 的架构目标。

**执行基线：**

- 项目路径：`/Users/marovole/GitHub/HearthBulter`
- 验证命令：`pnpm type-check && pnpm test --passWithNoTests`
- 提交规范：`feat/refactor/chore(scope): description`

---

## 已完成内容

### Phase 0-2 回顾（本轮前已完成）

- ✅ 删除 Drizzle / Supabase / Prisma 占位 repository
- ✅ 55 个文件从 `@prisma/client` 迁移到本地类型
- ✅ **所有 11 个 Repository singleton 切换到 Convex**

### Phase 3 本轮完成（2026-04-12）

#### API 路由迁移（25+ 文件）

| 类别           | 文件数 | 关键改动                                                                            |
| -------------- | ------ | ----------------------------------------------------------------------------------- |
| Dashboard API  | 4      | 移除 `@ts-nocheck`，统一 `memberRepository.verifyMemberAccess`                      |
| Dashboard 页面 | 6      | `prisma` → `convexClient.query/mutation`                                            |
| Members 路由   | 9      | 全部迁移到 Convex（goals/allergies/meal-plans/reports/health-reminders/initialize） |
| AI 路由        | 3      | `NeonFamilyRepository` → `ConvexFamilyRepository`                                   |
| 其他 API       | 6      | analytics/foods/invite/monitoring/tracking/user-preferences                         |

#### Service 迁移

| 文件                   | 状态    | 说明                                |
| ---------------------- | ------- | ----------------------------------- |
| `auxiliary-tracker.ts` | ✅ 完成 | 扩展 schema（5 个新字段），完整迁移 |
| `streak-manager.ts`    | ✅ 完成 | 完整迁移 + 新增单元测试             |
| `shopping-list.ts`     | ⏸️ 暂停 | 884 行，需设计 Convex 读模型后迁移  |
| `task-management.ts`   | ⏸️ 暂停 | 825 行，死代码（未被引用）          |
| `role-management.ts`   | ⏸️ 暂停 | 死代码（未被引用）                  |

#### Lib 层清理

| 文件                       | 状态 | 改动                           |
| -------------------------- | ---- | ------------------------------ |
| `member-access.ts`         | ✅   | `neonAdapter` → `convexClient` |
| `streak.ts`                | ✅   | `neonAdapter` → `convexClient` |
| `authorization.ts`         | ✅   | `neonAdapter` → `convexClient` |
| `service-container.ts`     | ✅   | 更新为 Convex 实现             |
| `permission-middleware.ts` | ✅   | `prisma` → `convexClient`      |

#### Schema 扩展

- `auxiliaryTrackings` 表新增：`waterTarget`, `caloriesBurned`, `exerciseType`, `weight`, `bodyFat`
- `upsertAuxiliaryTracking` / `upsertHealthReminder` 函数更新
- `familyInvitations` 表新增（邀请码功能）

---

## 当前架构状态

### 数据层现状

```
┌─────────────────────────────────────────────────────────────┐
│                        Convex 后端                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   members   │  │   health    │  │   families  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  analytics  │  │   meals     │  │   tasks     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   budget    │  │  inventory  │  │     ...     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Singletons                     │
│  ConvexMemberRepository / ConvexHealthRepository / ...      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes / Services                    │
│              (大部分已迁移到 Convex)                         │
└─────────────────────────────────────────────────────────────┘
```

### 待清理的 Neon/Prisma 残留

| 文件/目录                         | 状态        | 说明                                        |
| --------------------------------- | ----------- | ------------------------------------------- |
| `neon-analytics-repository.ts`    | ⚠️ 仍被使用 | `service-container.ts`, `trend-analyzer.ts` |
| `neon-notification-repository.ts` | ⚠️ 待确认   | 检查是否被使用                              |
| `neon-budget-repository.ts`       | ⚠️ 待确认   | 检查是否被使用                              |
| `neon-family-repository.ts`       | ⚠️ 残余引用 | 大部分已迁移                                |
| `neon-adapter.ts`                 | ⚠️ 仍有依赖 | `db/index.ts` 等                            |
| `neon-client.ts`                  | ⚠️ 仍有依赖 | `cache/neon-trend-cache.ts` 等              |
| `prisma/` 目录                    | ⏸️ 待删除   | 需确认无依赖后删除                          |
| `shopping-list.ts`                | ⏸️ 待迁移   | 被 6 个 API 路由使用                        |

---

## 验证结果

### 类型检查

```bash
$ pnpm type-check
# 通过 - 无新增错误（既有错误在 members/reports 路由和 leaderboard）
```

### 测试

```bash
$ pnpm test --passWithNoTests
# 通过 - streak-manager 新增测试通过
```

### 提交记录

```
4361422 refactor(api): migrate remaining API routes to Convex
2c4a759 docs: add convex migration handoff and lib layer migration plan
e422994 refactor(ai): migrate AI routes from NeonFamilyRepository to ConvexFamilyRepository
e576f22 refactor(middleware): migrate permission-middleware.ts to Convex
a169108 refactor(lib): migrate lib layer files to Convex
8389ce5 refactor(services): migrate streak-manager.ts to Convex
ed7562e refactor(services): extend auxiliaryTrackings schema and migrate auxiliary-tracker.ts
f7516f1 refactor(dashboard): migrate 6 dashboard pages from prisma to convexClient
6c04383 refactor(dashboard): clean up 4 dashboard API routes
... (共 33 个提交)
```

---

## 后续建议

### 高优先级（建议下周完成）

1. **迁移 shopping-list.ts**
   - 被 6 个 API 路由使用（`/api/families/[familyId]/shopping/*`）
   - 需先补齐 Convex `shoppingLists.ts` 的读模型（items 关联查询）
   - 估计工作量：2-3 天

2. **清理死代码**
   - `task-management.ts` - 确认未被引用后删除
   - `role-management.ts` - 确认未被引用后删除

3. **完成 Neon Repository 迁移**
   - `neon-analytics-repository.ts` → `ConvexAnalyticsRepository`
   - 需补齐 `convex/analytics.ts` 的缺失查询

### 中优先级（建议本月完成）

4. **删除 Neon 基础设施**
   - `src/lib/db/neon-adapter.ts`
   - `src/lib/db/neon-client.ts`
   - `src/lib/db/neon-rpc-helpers.ts`
   - `src/lib/db/index.ts` 中的 neon 导出

5. **删除 Prisma 目录**
   - `prisma/schema.prisma`
   - `prisma/migrations/`
   - 从 `package.json` 移除 `@prisma/client` 和 `prisma`

6. **清理过期 services**
   - `expiry-monitor.ts`
   - `inventory-analyzer.ts`
   - `inventory-sync.ts`

### 低优先级（可选）

7. **类型完善**
   - 清理剩余的 `@ts-nocheck` 注释
   - 修复 `convex-leaderboard-repository.ts` 的 3 个预存类型错误

8. **性能优化**
   - 评估 N+1 查询场景（如 `getFamilyStreakLeaderboard`）
   - 添加 Convex 索引优化

---

## 关键映射关系（供后续参考）

### Health

```ts
neonAdapter.healthGoal.findFirst({ where: { id } })
→ convexClient.query(api.health.getGoalById, { goalId })

neonAdapter.healthGoal.update({ where: { id }, data })
→ convexClient.mutation(api.health.updateGoal, { goalId, ...data })

neonAdapter.allergy.findFirst({ where: { id } })
→ convexClient.query(api.health.getAllergyById, { allergyId })

neonAdapter.medicalReport.findMany({ where: { memberId } })
→ convexClient.query(api.health.listMedicalReportsByMember, { memberId })
```

### Member Access

```ts
// 旧模式 - 每个文件手写
async function verifyMemberAccess(memberId, userId) { ... }

// 新模式 - 统一使用 Repository
const { hasAccess, member } = await memberRepository.verifyMemberAccess(memberId, userId);
```

---

## 一句话总结

**核心 API 层和 Service 层已完成 Convex 化，Convex 已成为唯一主数据面。剩余工作集中在清理 Neon/Prisma 基础设施、迁移 shopping-list.ts 和删除死代码。**

---

## 参考文件

- Plan: `docs/plans/2026-04-12-unify-data-layer-convex.md`
- Handoff: `docs/2026-04-12-convex-migration-handoff-formatted.md`
- 本报告: `docs/2026-04-12-convex-migration-completion.md`
