---
title: Convex 迁移交接
slug: convex-migration-handoff
summary: 记录 HearthBulter 数据层统一到 Convex 的当前进度、已完成内容、剩余工作、关键映射关系与下一步执行顺序，供后续继续迁移时直接接手。
---

## 背景

本次工作的目标是把 HearthBulter 的数据层从 **Prisma / Neon / Drizzle / Supabase 四轨并存**，统一为 **Convex 唯一后端**。

执行基线：

- 项目路径：`/Users/marovole/GitHub/HearthBulter`
- Plan 文件：`docs/plans/2026-04-12-unify-data-layer-convex.md`
- 验证命令：`pnpm type-check && pnpm test --passWithNoTests`
- 提交规范：`feat/refactor/chore(scope): description`

---

## 当前结论

这轮工作已经把迁移推进到 **Phase 3 后段**，核心基础结论如下：

- **Convex 已经是主数据面**，仓库层的 singleton 已切到 Convex。
- **大量 API 路由已迁移完成**。
- **剩余未完成部分** 集中在：
  - `src/app/api/members/[memberId]/` 下的 9 条路由
  - 5 个仍引用 `db/prisma` 的 service 文件
  - Prisma 类型残留
  - Prisma / Neon 基础设施清理
  - 最终全量验证

另外，用户最后明确要求：**停止开发，只输出 handoff 文档**。因此本轮在读完剩余文件、确认 Convex API 能力后，**没有继续落代码修改**。

---

## 已完成内容

### Phase 0

已完成以下清理：

- 删除 Drizzle 残留
- 删除 Supabase 残留
- 删除 Prisma 占位 repository

对应已有提交：

- `f7cc59c`
- `56a2fdc`
- `ee9d485`

### Phase 1

已完成 `@prisma/client` 到本地类型的主要迁移：

- **55 个文件** 从 `@prisma/client` 迁移到：
  - `@/types/enums`
  - `@/types/models`

对应提交：

- `cec1efd`
- `5296132`

### Phase 2

已完成：

- **所有 11 个 Repository singleton 切换到 Convex**

### Phase 3（已完成的大头）

以下路由已迁移完成：

- `src/app/api/dashboard/` 全部 5 条
- `src/app/api/ai/` 大部分路由
- `src/app/api/ecommerce/` 全部 7 条
- `src/app/api/instacart/` 全部 3 条
- `src/app/api/cron/` 1 条
- `src/app/api/analytics/anomalies/route.ts`
- `src/app/api/analytics/reports/route.ts`
- `src/app/api/analytics/reports/[id]/route.ts`
- `src/app/api/foods/search/route.ts`
- `src/app/api/foods/[id]/route.ts`
- `src/app/api/monitoring/route.ts`
- `src/app/api/ai/advice-history/route.ts`
- `src/app/api/tracking/reminders/route.ts`
- `src/app/api/user/preferences/route.ts`
- `src/app/api/invite/[code]/route.ts`
- `src/app/api/cleanup/expired-invitations/route.ts`

### 已补齐的 Convex 能力

#### `convex/schema.ts`

新增：

- `familyInvitations` 表

#### `convex/families.ts`

新增：

- `getInvitationByCode`
- `createInvitation`
- `updateInvitationStatus`
- `acceptInvitation`
- `cleanupExpiredInvitations`
- `countInvitationsByStatus`

#### `convex/health.ts`

新增：

- `getMedicalReportById`
- `createMedicalReport`
- `updateMedicalReport`
- `deleteMedicalReport`
- `createMedicalIndicator`
- `updateMedicalIndicator`
- `deleteManyMedicalIndicators`
- `listHealthRemindersByMember`
- `getHealthReminderByType`
- `createHealthReminder`
- `upsertHealthReminder`
- `deleteHealthReminder`

---

## 这轮额外完成的调查

本轮没有继续写代码，但把剩余迁移点全部梳理清楚了。

### 已读完的 9 条待迁移路由

- `src/app/api/members/[memberId]/goals/route.ts`
- `src/app/api/members/[memberId]/goals/[goalId]/route.ts`
- `src/app/api/members/[memberId]/allergies/[allergyId]/route.ts`
- `src/app/api/members/[memberId]/meal-plans/route.ts`
- `src/app/api/members/[memberId]/initialize/route.ts`
- `src/app/api/members/[memberId]/health-reminders/route.ts`
- `src/app/api/members/[memberId]/reports/route.ts`
- `src/app/api/members/[memberId]/reports/[reportId]/route.ts`
- `src/app/api/members/[memberId]/reports/[reportId]/compare/route.ts`

### 已读完的 5 个待迁移 services

- `src/lib/services/tracking/auxiliary-tracker.ts`
- `src/lib/services/tracking/streak-manager.ts`
- `src/services/shopping-list.ts`
- `src/services/role-management.ts`
- `src/services/task-management.ts`

### 已确认的 repository / client 基础设施

已确认这些文件的结构和接口：

- `src/lib/repositories/member-repository-singleton.ts`
- `src/lib/repositories/meal-plan-repository-singleton.ts`
- `src/lib/repositories/interfaces/member-repository.ts`
- `src/lib/convex-client.ts`

结论：

- `memberRepository.verifyMemberAccess(memberId, userId)` 已可直接替代各路由里重复的手写权限校验。
- `convexClient.query(...)` / `convexClient.mutation(...)` 已是稳定统一调用入口。
- `mealPlanRepository` 已经是 Convex 实现，`meal-plans/route.ts` 实际只剩鉴权逻辑未切。

---

## 剩余工作清单

### 1. 待迁移 API 路由（9 条）

```text
src/app/api/members/[memberId]/goals/route.ts
src/app/api/members/[memberId]/goals/[goalId]/route.ts
src/app/api/members/[memberId]/allergies/[allergyId]/route.ts
src/app/api/members/[memberId]/meal-plans/route.ts
src/app/api/members/[memberId]/initialize/route.ts
src/app/api/members/[memberId]/health-reminders/route.ts
src/app/api/members/[memberId]/reports/route.ts
src/app/api/members/[memberId]/reports/[reportId]/route.ts
src/app/api/members/[memberId]/reports/[reportId]/compare/route.ts
```

### 2. 待迁移 services（5 个）

```text
src/lib/services/tracking/auxiliary-tracker.ts
src/lib/services/tracking/streak-manager.ts
src/services/shopping-list.ts
src/services/role-management.ts
src/services/task-management.ts
```

### 3. Phase 4

- `src/lib/permissions.ts`
- `src/lib/middleware/permission-middleware.ts`

目标：去掉 Prisma 类型依赖，统一到本地 enum / model 类型。

### 4. Phase 5

删除或迁移：

- `src/lib/repositories/prisma/prisma-food-repository.ts`
- `src/lib/repositories/prisma/prisma-notification-repository.ts`
- `src/lib/db/neon-adapter.ts`
- `src/lib/db/neon-client.ts`
- `src/lib/db/database-optimization.ts`
- `src/lib/db/index-optimizer.ts`
- `src/lib/db/query-cache.ts`
- `src/lib/db/neon-rpc-helpers.ts`
- `src/lib/db/index.ts` 中所有 neon 导出
- `src/services/expiry-monitor.ts`
- `src/services/inventory-analyzer.ts`
- `src/services/inventory-sync.ts`
- `prisma/` 目录
- `supabase/` 目录

同时清理依赖：

- `@prisma/client`
- `prisma`
- `@neondatabase/serverless`

### 5. Phase 6

执行全量验证：

```bash
pnpm build
pnpm type-check
pnpm test
```

并处理：

- `convex-leaderboard-repository.ts` 里 3 个已知预存类型错误
- 项目内残余 `@ts-nocheck`

---

## 待迁移路由的明确做法

### 通用替换规则

这 9 条路由里最明显的坏味道是：

- 每个文件各写一套 `verifyMemberAccess` / `verifyGoalAccess` / `verifyAllergyAccess`
- 底层都在手动查：
  - member
  - family
  - admin member
  - self check

这套逻辑现在应该统一收敛到：

```ts
const { hasAccess, member } = await memberRepository.verifyMemberAccess(memberId, session.user.id);
```

也就是说，后续迁移时：

- **删掉每个路由文件本地的权限校验函数**
- **统一改成 `memberRepository.verifyMemberAccess(...)`**

### 关键 import 模式

```ts
import { convexClient, api } from "@/lib/convex-client";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";

type Id<TableName extends string> = string & { __tableName: TableName };
```

`meal-plans/route.ts` 还需要：

```ts
import { mealPlanRepository } from "@/lib/repositories/meal-plan-repository-singleton";
```

### `goals/route.ts`

现状：

- GET 已经用 `memberRepository.getHealthGoals(...)`
- POST 也已经用 `memberRepository.verifyMemberAccess(...)`
- 只剩一个动态 `neonAdapter.familyMember.findUnique(...)` 用来拿 `birthDate / gender / weight / height`

替换方式：

```ts
const memberDetails = await convexClient.query(api.members.getById, {
  memberId: memberId as Id<"familyMembers">,
});
```

然后继续保留：

- BMR 计算
- TDEE 计算
- targetDate 计算

### `goals/[goalId]/route.ts`

现状：

- 本地 `verifyGoalAccess` 里仍然用 `neonAdapter` 手写鉴权
- GET / PATCH / DELETE 都依赖它

迁移原则：

1. 先用 `memberRepository.verifyMemberAccess(memberId, session.user.id)` 鉴权
2. 再用：

```ts
convexClient.query(api.health.getGoalById, { goalId: goalId as Id<"healthGoals"> });
```

3. 手动校验 goal 是否属于当前 `memberId`
4. PATCH 改为：

```ts
convexClient.mutation(api.health.updateGoal, { ... })
```

5. DELETE 改为：

```ts
convexClient.mutation(api.health.deleteGoal, { goalId: ... })
```

### `allergies/[allergyId]/route.ts`

与 goals 的迁移套路完全一致：

- 鉴权改成 `memberRepository.verifyMemberAccess`
- 读取改成 `api.health.getAllergyById`
- 更新改成 `api.health.updateAllergy`
- 删除改成 `api.health.deleteAllergy`

### `meal-plans/route.ts`

现状：

- GET 已经走 `mealPlanRepository.listMealPlans(...)`
- POST 的业务生成逻辑也在 repository / service 层
- 仅剩本地 `verifyMemberAccess` 还在走 `neonAdapter`

迁移时只要：

- 删除本地 `verifyMemberAccess`
- 改成 `memberRepository.verifyMemberAccess`

### `initialize/route.ts`

现状：

- 两个 handler 都只是做权限检查，然后调：
  - `checkIfMemberNeedsInitialization(memberId)`
  - `initializeMemberHealthData(memberId)`

迁移时同样只改权限检查逻辑即可。

### `health-reminders/route.ts`

替换关系：

```ts
neonAdapter.healthReminder.findMany
→ convexClient.query(api.health.listHealthRemindersByMember, { memberId })

neonAdapter.healthReminder.upsert
→ convexClient.mutation(api.health.upsertHealthReminder, { ... })
```

注意：

- 当前路由响应里会把 `daysOfWeek` 做 `JSON.parse`
- Convex 侧 `daysOfWeek` 存的是字符串，仍要保持同样的兼容转换

### `reports/route.ts`

这是 9 条里最复杂的一条。

主要操作包括：

- 创建 medical report
- 上传文件到 `FileStorageService`
- OCR
- 解析指标
- 回写 report / indicators
- GET 查询分页列表

替换关系：

```ts
medicalReport.create        → api.health.createMedicalReport
medicalReport.update        → api.health.updateMedicalReport
medicalReport.delete        → api.health.deleteMedicalReport
medicalIndicator.create     → api.health.createMedicalIndicator
medicalIndicator.findMany   → api.health.listIndicatorsByReport
medicalReport.findMany      → api.health.listMedicalReportsByMember
medicalReport.count         → 先 list 再 length
```

注意：

- `processOCR(...)` 内部也要一起迁移，不能只改 route handler。
- 创建 report 后，如果上传文件失败，当前逻辑会把刚建的 report 删除；Convex 下同样调用 `deleteMedicalReport`。

### `reports/[reportId]/route.ts`

替换关系：

```ts
get report                  → api.health.getMedicalReportById
get indicators              → api.health.listIndicatorsByReport
update report               → api.health.updateMedicalReport
update indicator            → api.health.updateMedicalIndicator
delete report               → api.health.deleteMedicalReport
delete indicators           → listIndicatorsByReport → deleteManyMedicalIndicators
```

### `reports/[reportId]/compare/route.ts`

这是另一个复杂点。

难点不在鉴权，而在“找上一份报告”的查询。

原 Neon 逻辑是：

- 按 memberId 查所有 report
- 排除当前 report
- 若当前 report 有 `reportDate`，只取 `reportDate < currentReport.reportDate`
- 按 `reportDate desc, createdAt desc`
- 取 1 条

当前 Convex **没有专门的 previous-report 查询函数**，因此临时策略应是：

1. 调：

```ts
const reports = await convexClient.query(api.health.listMedicalReportsByMember, {
  memberId: memberId as Id<"familyMembers">,
  limit: 100,
});
```

2. 在路由层 client-side 过滤：
   - 排除当前 report
   - 过滤合法日期
   - 排序
   - 取第一条

如果后续觉得这块会常用，再单独补一个 Convex query。

---

## 待迁移 services 的明确做法

### 1. `src/lib/services/tracking/auxiliary-tracker.ts`

现状问题：

- 仍用 `db.auxiliaryTracking.*`
- 还会更新 `db.familyMember.weight / bmi`
- 文件顶部有 `@ts-nocheck`

额外关键发现：

- 现有 `convex/analytics.ts` 的 `upsertAuxiliaryTracking` **字段不完整**。
- 它目前只覆盖：
  - `exerciseMinutes`
  - `sleepHours`
  - `sleepQuality`
  - `waterIntake`
  - `steps`
  - `standingHours`

**缺失字段**：

- `waterTarget`
- `caloriesBurned`
- `exerciseType`
- `weight`
- `bodyFat`

结论：

- 这个 service **不能直接机械替换**。
- 需要先扩展 `convex/analytics.ts` 的 `upsertAuxiliaryTracking` 参数与 schema，再迁移 service。

### 2. `src/lib/services/tracking/streak-manager.ts`

现状：

- `trackingStreak` 可迁移到 `api.analytics.getTrackingStreak / upsertTrackingStreak`
- 但文件还依赖：
  - `db.mealLog.count`
  - `db.dailyNutritionTarget.findMany`
  - `db.familyMember.findMany(... include trackingStreak)`

也就是说：

- 它不是单点迁移
- 要么补 Convex 聚合 query
- 要么重写为多次 Convex query + 本地组装

这也是个需要先做接口设计的点。

### 3. `src/services/shopping-list.ts`

现状：

- 文件 **884 行**，非常肥
- 深度依赖 Prisma 关系查询和 include
- 同时还写 activity log

虽然 `convex/shoppingLists.ts` 已有基础函数：

- `list`
- `getById`
- `update`
- `updateItem`
- `complete`
- `deleteList`
- `createShare`

但仍然缺少当前 service 所需的一些高阶能力：

- 以 family 维度聚合 list / item
- 创建 shopping item
- assign item
- purchase item
- delete item
- activity logging 兼容
- 与 family member / food 的组合视图

结论：

- 这不是简单替换，应该拆成：
  - 查询能力补齐
  - item mutation 补齐
  - activity 策略决定

### 4. `src/services/role-management.ts`

现状：

- 直接依赖 `prisma.familyMember` / `prisma.family`
- 同时依赖：
  - `isFamilyCreator`
  - `isFamilyAdmin`

如果继续迁移，需要先确认：

- `src/lib/permissions.ts` 是否已经能脱离 Prisma Client 参数
- Convex 是否已有足够的 family / member query 支撑管理员判断、批量角色调整、groupBy 统计

### 5. `src/services/task-management.ts`

现状：

- 文件 **825 行**
- 深度依赖：
  - `prisma.task`
  - comments include
  - assignee / creator include
  - activity logging

虽然 `convex/tasks.ts` 已经有：

- `list`
- `getById`
- `create`
- `update`
- `updateStatus`
- `assign`
- `softDelete`
- `stats`

但当前 service 还需要：

- comments 关联数据
- creator / assignee 展开
- more permission-aware views
- `getMyTasks`

结论：

- 能迁，但不是立刻无脑替换。
- 最好先补齐 Convex 读模型。

---

## 已确认的 Convex API 能力清单

### `convex/health.ts`

已确认可用：

- `listGoals`
- `getGoalById`
- `createGoal`
- `updateGoal`
- `deleteGoal`
- `listAllergies`
- `getAllergyById`
- `createAllergy`
- `updateAllergy`
- `deleteAllergy`
- `listMedicalReportsByMember`
- `listIndicatorsByReport`
- `getMedicalReportById`
- `createMedicalReport`
- `updateMedicalReport`
- `deleteMedicalReport`
- `createMedicalIndicator`
- `updateMedicalIndicator`
- `deleteManyMedicalIndicators`
- `listHealthRemindersByMember`
- `getHealthReminderByType`
- `createHealthReminder`
- `upsertHealthReminder`
- `deleteHealthReminder`

### `convex/families.ts`

已确认可用：

- `getById`
- `listMembers`
- `getMemberById`
- `isUserFamilyMember`
- `getUserFamilyRole`
- invitation 相关函数整套能力

### `convex/members.ts`

已确认可用：

- `getById`
- `getByClerkInFamily`
- `listByClerkId`
- `listAccessibleByClerkId`
- `verifyAccess`
- `listAll`

其中最重要的是：

```ts
api.members.verifyAccess(memberId, clerkId);
```

它已经把：

- 是否是创建者
- 是否是本人
- 是否是同家庭管理员

全部封装好了。

### `convex/analytics.ts`

已确认可用：

- `getAuxiliaryTracking`
- `listAuxiliaryTrackings`
- `upsertAuxiliaryTracking`
- `getTrackingStreak`
- `upsertTrackingStreak`
- `getHealthReportById`
- `getHealthReportsByMember`
- `createHealthReport`
- `countMealLogs`
- `groupMealLogsByDate`

但再次强调：`auxiliaryTracking` 目前字段不够。

### `convex/tasks.ts`

已确认可用：

- `list`
- `getById`
- `create`
- `update`
- `updateStatus`
- `assign`
- `softDelete`
- `stats`

### `convex/shoppingLists.ts`

已确认可用：

- `list`
- `getById`
- `update`
- `updateItem`
- `complete`
- `deleteList`
- `createShare`

---

## 关键映射关系

### Health Goal

```ts
neonAdapter.healthGoal.findFirst({ where: { id } })
→ convexClient.query(api.health.getGoalById, { goalId })

neonAdapter.healthGoal.update({ where: { id }, data })
→ convexClient.mutation(api.health.updateGoal, { goalId, ...data })

neonAdapter.healthGoal.update({ where: { id }, data: { deletedAt } })
→ convexClient.mutation(api.health.deleteGoal, { goalId })
```

### Allergy

```ts
neonAdapter.allergy.findFirst({ where: { id } })
→ convexClient.query(api.health.getAllergyById, { allergyId })

neonAdapter.allergy.update({ where: { id }, data })
→ convexClient.mutation(api.health.updateAllergy, { allergyId, ...data })

neonAdapter.allergy.update({ data: { deletedAt } })
→ convexClient.mutation(api.health.deleteAllergy, { allergyId })
```

### Health Reminder

```ts
neonAdapter.healthReminder.findMany({ where: { memberId } })
→ convexClient.query(api.health.listHealthRemindersByMember, { memberId })

neonAdapter.healthReminder.upsert(...)
→ convexClient.mutation(api.health.upsertHealthReminder, { ... })
```

### Medical Report / Indicator

```ts
neonAdapter.medicalReport.create(...)
→ convexClient.mutation(api.health.createMedicalReport, { ... })

neonAdapter.medicalReport.findFirst(...)
→ convexClient.query(api.health.getMedicalReportById, { reportId })

neonAdapter.medicalReport.findMany(...)
→ convexClient.query(api.health.listMedicalReportsByMember, { memberId, limit })

neonAdapter.medicalReport.update(...)
→ convexClient.mutation(api.health.updateMedicalReport, { reportId, ... })

neonAdapter.medicalReport.delete / soft delete
→ convexClient.mutation(api.health.deleteMedicalReport, { reportId })

neonAdapter.medicalIndicator.findMany(...)
→ convexClient.query(api.health.listIndicatorsByReport, { reportId })

neonAdapter.medicalIndicator.create(...)
→ convexClient.mutation(api.health.createMedicalIndicator, { reportId, ... })

neonAdapter.medicalIndicator.update(...)
→ convexClient.mutation(api.health.updateMedicalIndicator, { indicatorId, ... })

neonAdapter.medicalIndicator.deleteMany(...)
→ listIndicatorsByReport → deleteManyMedicalIndicators
```

### Member Access

```ts
手写 verifyMemberAccess / verifyGoalAccess / verifyAllergyAccess
→ memberRepository.verifyMemberAccess(memberId, userId)
```

---

## 关键风险与注意事项

### 1. `grep -rl "neonAdapter"` 有误报

之前已确认：

- dashboard 下有若干路由只是 **注释里提到 `neonAdapter`**
- 实际逻辑已经迁移完成

所以后续做全局扫描时，不要只看 grep 命中数量，要打开文件确认。

### 2. `api.families.getUserFamilyRole` 的 `userId` 不是 clerkId

它需要的是：

- `v.id("users")`

不是 Clerk 的字符串 userId。

如果手上只有 clerkId：

- 先用 `api.members.getByClerkInFamily`
- 或 `api.members.listByClerkId`

更简单的办法仍然是：

- 直接用 `api.members.verifyAccess`
- 或 `memberRepository.verifyMemberAccess`

### 3. `auxiliaryTracking` 还没补齐字段

这是 services 迁移前必须处理的问题。

### 4. `shopping-list.ts` 与 `task-management.ts` 不是“小修”

这两个文件又大又重，包含：

- 关系查询
- include 展开
- activity logging
- 权限逻辑

后续最好分两步：

1. 先补 Convex 查询模型
2. 再迁移 service 层

### 5. 已知预存类型错误

`convex-leaderboard-repository.ts` 有 **3 个预存类型错误**，本轮不要求修。

---

## 推荐的继续执行顺序

### 方案 A：最稳

1. 先迁移 9 条 `members/[memberId]` 路由
2. 跑：

```bash
pnpm type-check
pnpm test --passWithNoTests
```

3. 再补 `convex/analytics.ts` 中 `auxiliaryTracking` 缺失字段
4. 迁移 `auxiliary-tracker.ts`
5. 视情况补 `tracking-streak` / `shopping-list` / `task-management` 所需读模型
6. 再迁移 4 个重 service
7. Phase 4 → Phase 5 → Phase 6

### 方案 B：最快清路由

如果当前目标只是尽快拔掉 API 层的 `neonAdapter`：

1. 立即迁移 9 条 members 路由
2. 暂时不动 5 个 service
3. 先把路由层完成并验证
4. 然后再集中设计 service 层所需的 Convex 读模型

我更推荐 **方案 A**，因为它把“简单替换”和“需要补 Convex 能力”的部分拆开了，风险更低。

---

## 如果下一个人要立刻继续，第一步该做什么

第一步不要再全局乱扫，直接从这里开始：

### Step 1

迁移这 5 条最直接的路由：

- `goals/route.ts`
- `goals/[goalId]/route.ts`
- `allergies/[allergyId]/route.ts`
- `meal-plans/route.ts`
- `initialize/route.ts`

因为它们主要只是：

- 去掉 `neonAdapter`
- 换成 `memberRepository.verifyMemberAccess`
- 加少量 `convexClient.query/mutation`

### Step 2

再迁：

- `health-reminders/route.ts`

### Step 3

最后单独处理三个 reports 路由：

- `reports/route.ts`
- `reports/[reportId]/route.ts`
- `reports/[reportId]/compare/route.ts`

因为这三条逻辑最复杂，应该放到最后，避免把简单活和复杂活搅在一起。

---

## 本轮实际停下的位置

本轮已经做到：

- 读完所有剩余 9 条路由
- 读完所有剩余 5 个 service
- 确认 `memberRepository` 接口与 `convexClient` 用法
- 梳理完成可用 Convex API 清单
- 梳理清楚每个待迁移文件的替换路线

本轮没有继续做的事：

- **没有修改任何上述待迁移文件**
- **没有提交新的代码变更**
- **没有执行新的验证命令**

原因很简单：用户明确要求 **停止开发，只写 handoff 文档**。

---

## 参考文件

### Plan / 关键文档

- `docs/plans/2026-04-12-unify-data-layer-convex.md`
- `docs/2026-04-12-convex-migration-handoff-formatted.md`

### Convex 相关

- `convex/schema.ts`
- `convex/health.ts`
- `convex/families.ts`
- `convex/members.ts`
- `convex/analytics.ts`
- `convex/tasks.ts`
- `convex/shoppingLists.ts`

### Repository / Client

- `src/lib/convex-client.ts`
- `src/lib/repositories/member-repository-singleton.ts`
- `src/lib/repositories/meal-plan-repository-singleton.ts`
- `src/lib/repositories/interfaces/member-repository.ts`

### 下一步优先文件

- `src/app/api/members/[memberId]/goals/route.ts`
- `src/app/api/members/[memberId]/goals/[goalId]/route.ts`
- `src/app/api/members/[memberId]/allergies/[allergyId]/route.ts`
- `src/app/api/members/[memberId]/meal-plans/route.ts`
- `src/app/api/members/[memberId]/initialize/route.ts`
- `src/app/api/members/[memberId]/health-reminders/route.ts`
- `src/app/api/members/[memberId]/reports/route.ts`
- `src/app/api/members/[memberId]/reports/[reportId]/route.ts`
- `src/app/api/members/[memberId]/reports/[reportId]/compare/route.ts`

---

## 一句话总结

**仓库层和大量路由已经完成 Convex 化，接下来只剩 members 路由收尾、几个重 service 的读模型补齐、以及 Prisma / Neon 尾巴清理。路由层能继续快推，service 层要先补能力再动刀。**
