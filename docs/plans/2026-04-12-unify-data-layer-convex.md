# 数据层统一：Prisma/Neon → Convex 渐进迁移 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 消灭 Prisma/Neon/Drizzle/Supabase 四轨并存，统一到 Convex 唯一后端

**Architecture:** 模块级渐进迁移——每个模块独立迁移，先写测试验证行为一致，再切换 singleton 实现。不搞 Repository 抽象层（YAGNI），直接利用已有的 11 个 Convex 实现和 292 个 Convex 函数。

**Tech Stack:** Next.js 14.2 + Convex + Clerk + TypeScript + Jest

---

## 迁移拓扑图

```
当前状态（四轨并存）：
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Prisma 52m │  NeonSQL 11r │  Drizzle  0  │  Supabase  1  │
│  67 文件引用  │  7 singleton  │   僵尸配置   │   僵尸迁移    │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
目标状态（Convex 唯一）：
┌──────────────────────────────────────────────────────────────┐
│  Convex 52 tables │ 292 functions │ 11 repo + 7 新 repo      │
│  所有 API 路由 → Convex │ 所有 Enum 本地化 │ Prisma 拆除      │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 0: 清理僵尸依赖

### Task 0.1: 删除 Drizzle 残留

**Files:**

- Delete: `drizzle.config.ts`
- Modify: `package.json` (移除 drizzle-orm, drizzle-kit)
- Test: `pnpm type-check`

**Step 1: 确认 Drizzle 零引用**

Run: `grep -r "drizzle" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"`
Expected: 0 results (已验证)

**Step 2: 删除 drizzle.config.ts**

```bash
rm drizzle.config.ts
```

**Step 3: 从 package.json 移除 drizzle 依赖**

在 `package.json` 中：

- 删除 `"drizzle-orm": "^0.45.1"` (dependencies)
- 删除 `"drizzle-kit": "^0.31.8"` (devDependencies)

**Step 4: 安装依赖验证**

Run: `pnpm install && pnpm type-check`
Expected: 安装成功 + 类型检查通过

**Step 5: Commit**

```bash
git add -A && git commit -m "chore: remove drizzle ORM (zero usage, dead dependency)"
```

---

### Task 0.2: 删除 Supabase 残留

**Files:**

- Delete: `src/__tests__/rpc/accept_family_invite.test.ts` (唯一引用 Supabase 的文件)
- Modify: `package.json` (移除 @supabase/supabase-js 如有)

**Step 1: 确认 Supabase 引用范围**

Run: `grep -r "supabase" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: 仅 1 个 test 文件引用

**Step 2: 删除 Supabase 测试文件**

```bash
rm -rf src/__tests__/rpc/
```

**Step 3: 清理 Supabase 相关依赖**

检查 `package.json` 中是否有 `@supabase/supabase-js` 依赖，如有则移除。

**Step 4: 验证**

Run: `pnpm test --passWithNoTests && pnpm type-check`
Expected: 测试通过 + 类型检查通过

**Step 5: Commit**

```bash
git add -A && git commit -m "chore: remove supabase client (legacy test, migrated to convex)"
```

---

### Task 0.3: 删除 Prisma 占位 Repository 实现

**Files:**

- Delete: `src/lib/repositories/implementations/prisma-task-repository.ts`
- Delete: `src/lib/repositories/implementations/prisma-shopping-list-repository.ts`
- Delete: `src/lib/repositories/implementations/prisma-family-repository.ts`

**Step 1: 确认这些文件都是占位实现（方法 throw "not implemented"）**

Run: `grep "not implemented" src/lib/repositories/implementations/prisma-*-repository.ts`
Expected: 3 个文件都包含 "not implemented"

**Step 2: 确认无其他文件引用这些占位实现**

Run: `grep -r "prisma-task-repository\|prisma-shopping-list-repository\|prisma-family-repository" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: 仅 import 自引用（0 外部引用，singleton 已切到 Convex）

**Step 3: 删除占位文件**

```bash
rm src/lib/repositories/implementations/prisma-task-repository.ts
rm src/lib/repositories/implementations/prisma-shopping-list-repository.ts
rm src/lib/repositories/implementations/prisma-family-repository.ts
```

**Step 4: 验证**

Run: `pnpm type-check && pnpm test`
Expected: 通过

**Step 5: Commit**

```bash
git add -A && git commit -m "chore: remove prisma placeholder repos (superseded by convex implementations)"
```

---

## Phase 1: Enum 解耦——让 67 个文件不再依赖 @prisma/client 取类型

### Task 1.1: 扩充 src/types/enums.ts 为 Prisma Enum 的唯一真相源

**Files:**

- Modify: `src/types/enums.ts` (确保包含所有 68 个 Prisma Enum)

**Step 1: 审计当前 enums.ts 已定义的枚举**

Run: `grep "^export enum\|^export type" src/types/enums.ts | wc -l`
Expected: 当前约有 100+ 定义

**Step 2: 从 prisma/schema.prisma 提取所有枚举定义**

比对 prisma/schema.prisma 中的 68 个 enum 与 src/types/enums.ts 中的定义：

- 确保值完全一致
- 确认没有缺失的枚举
- 特别检查：`FoodCategory`, `MealType`, `InventoryStatus`, `StorageLocation`, `NotificationType`, `BudgetPeriod`, `BudgetStatus`, `ShareContentType`, `SharePrivacyLevel`, `ScoreGrade`

**Step 3: 补充缺失的枚举定义**

对 prisma 中的每个 enum，如果 enums.ts 中缺失则补充，值必须与 prisma 完全一致。

**Step 4: 移除 enums.ts 底部的 placeholder 类型**

删除：

```typescript
export type PrismaClient = any;
export type Prisma = any;
export type Food = Record<string, unknown>;
```

这些是旧的兼容垫片，将逐步被真实类型替换。

**Step 5: 验证**

Run: `pnpm type-check`
Expected: 可能有类型错误，记录数量，下个 Task 处理

**Step 6: Commit**

```bash
git add src/types/enums.ts && git commit -m "refactor(types): make enums.ts the single source of truth for all 68 enums"
```

---

### Task 1.2: 迁移 Category B 文件（41 个仅引用 Enum 的文件）

**Files:**

- Modify: 41 个文件（见下文分组），将 `import { Xxx } from "@prisma/client"` 改为 `import { Xxx } from "@/types/enums"`

**迁移分组：**

#### 组 1: Services (7 文件)

| 文件                                             | 旧 import                                                 | 新 import       |
| ------------------------------------------------ | --------------------------------------------------------- | --------------- |
| `src/services/task-management.ts`                | `@prisma/client` → TaskCategory, TaskStatus, TaskPriority | `@/types/enums` |
| `src/services/shopping-list.ts`                  | `@prisma/client` → FoodCategory, ListStatus               | `@/types/enums` |
| `src/services/inventory-shopping-integration.ts` | `@prisma/client` → ListStatus                             | `@/types/enums` |
| `src/services/inventory-notification.ts`         | `@prisma/client` → NotificationType                       | `@/types/enums` |
| `src/services/inventory-recipe-integration.ts`   | `@prisma/client` → RecipeCategory                         | `@/types/enums` |
| `src/services/role-management.ts`                | `@prisma/client` → FamilyMemberRole                       | `@/types/enums` |
| `src/lib/permissions.ts`                         | `@prisma/client` → FamilyMemberRole                       | `@/types/enums` |

#### 组 2: Components (20 文件)

| 文件                                              | Enum import                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/social/ShareCard.tsx`             | ShareContentType, SharePrivacyLevel                              |
| `src/components/social/LeaderboardView.tsx`       | LeaderboardType, LeaderboardPeriod                               |
| `src/components/social/AchievementGallery.tsx`    | AchievementType, AchievementRarity                               |
| `src/components/inventory/InventoryList.tsx`      | InventoryStatus, StorageLocation                                 |
| `src/components/inventory/AddInventoryItem.tsx`   | StorageLocation                                                  |
| `src/components/budget/BudgetSetting.tsx`         | BudgetPeriod, FoodCategory                                       |
| `src/components/budget/BudgetStatusIndicator.tsx` | BudgetStatus, FoodCategory                                       |
| `src/components/budget/BudgetDashboard.tsx`       | BudgetStatus, FoodCategory, BudgetPeriod                         |
| `src/components/tracking/MealCheckIn.tsx`         | MealType                                                         |
| `src/components/meal-planning/WeeklyPlan.tsx`     | MealType, MealPlan, Meal, MealIngredient → 需额外定义 model 类型 |
| `src/components/meal-planning/SwapIngredient.tsx` | MealType                                                         |
| `src/components/meal-planning/MealCard.tsx`       | MealType                                                         |
| `src/components/reports/ReportList.tsx`           | MedicalReport, MedicalIndicator → 需定义 model 类型              |
| `src/components/reports/OcrResult.tsx`            | MedicalReport, MedicalIndicator, IndicatorStatus                 |
| `src/components/reports/CorrectionForm.tsx`       | MedicalIndicator, IndicatorStatus                                |
| `src/components/shopping/CategoryList.tsx`        | FoodCategory                                                     |
| `src/components/analytics/ReportViewer.tsx`       | ReportType                                                       |
| `src/components/analytics/HealthScoreCard.tsx`    | ScoreGrade                                                       |
| `src/app/dashboard/analytics/reports/page.tsx`    | ReportType                                                       |
| ... (更多)                                        |

#### 组 3: API Routes (4 文件)

| 文件                                       | Enum import      |
| ------------------------------------------ | ---------------- |
| `src/app/api/budget/savings-tips/route.ts` | SavingsType      |
| `src/app/api/analytics/anomalies/route.ts` | AnomalyStatus    |
| `src/app/api/analytics/reports/route.ts`   | ReportType       |
| `src/app/api/social/share/route.ts`        | ShareContentType |

#### 组 4: Types (2 文件)

| 文件                            | Enum import                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/types/wearable-devices.ts` | DeviceType, PlatformType, SyncStatus, DevicePermission, HealthDataType                         |
| `src/types/service-types.ts`    | FoodCategory, InventoryStatus, WasteReason, TaskStatus, NotificationType, NotificationPriority |

#### 组 5: Tests (7 文件)

| 文件                                                   | Enum import                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `src/__tests__/api/api/notifications/route.test.ts`    | NotificationType, NotificationChannel, NotificationPriority       |
| `src/__tests__/api/inventory/items.test.ts`            | InventoryStatus, StorageLocation                                  |
| `src/__tests__/services/expiry-monitor.test.ts`        | InventoryStatus, StorageLocation                                  |
| `src/__tests__/social/share-generator.test.ts`         | ShareContentType (+ PrismaClient)                                 |
| `src/__tests__/lib/price-estimator.test.ts`            | FoodCategory                                                      |
| `src/__tests__/lib/list-generator.test.ts`             | FoodCategory, MealType                                            |
| `src/__tests__/integration/inventory-workflow.test.ts` | InventoryStatus, StorageLocation, RecipeCategory (+ PrismaClient) |

**Step 1: 创建 Prisma Model 类型映射文件**

Create: `src/types/models.ts`

将组件中使用的 Prisma Model 类型（MealPlan, Meal, MealIngredient, MedicalReport, MedicalIndicator, Food 等）从 Prisma 生成的类型迁移为本地接口定义。这些类型应与 Convex schema 中的表结构对齐。

```typescript
// src/types/models.ts — Prisma Model 类型的本地替代
// 与 Convex schema 保持一致

export interface MealPlan {
  id: string;
  memberId: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meal {
  id: string;
  mealPlanId: string;
  type: string; // MealType
  date: string;
  recipeId?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

// ... 其他 model 类型按需添加
```

**Step 2: 批量替换 import 路径**

对组 1-4 的所有文件，将 `from "@prisma/client"` 替换为 `from "@/types/enums"` 或 `from "@/types/models"`。

**Step 3: 逐文件验证**

Run: `pnpm type-check`
Expected: 类型错误减少。修复任何不兼容的类型定义。

**Step 4: 运行测试**

Run: `pnpm test`
Expected: 552 tests still pass

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor: decouple 41 files from @prisma/client enums to local types"
```

---

### Task 1.3: 迁移 Category C 文件（7 个同时用 PrismaClient + Enum 的文件）

**Files:**

- Modify: 7 文件 — 分离 Enum import 到 `@/types/enums`，保留 PrismaClient import

| 文件                                                    | 策略                                    |
| ------------------------------------------------------- | --------------------------------------- |
| `src/services/expiry-monitor.ts`                        | Enum → @/types/enums, PrismaClient 保留 |
| `src/services/inventory-sync.ts`                        | Enum → @/types/enums, PrismaClient 保留 |
| `src/services/inventory-analyzer.ts`                    | Enum → @/types/enums, PrismaClient 保留 |
| `src/__tests__/integration/notification-system.test.ts` | Enum → @/types/enums, PrismaClient 保留 |
| `src/__tests__/services/inventory-tracker.test.ts`      | Enum → @/types/enums, PrismaClient 保留 |
| `src/__tests__/social/share-generator.test.ts`          | Enum → @/types/enums, PrismaClient 保留 |
| `src/__tests__/integration/inventory-workflow.test.ts`  | Enum → @/types/enums, PrismaClient 保留 |

**Step 1: 对每个文件，拆分 import**

```typescript
// 之前
import { PrismaClient, InventoryItem, InventoryStatus, NotificationType } from "@prisma/client";

// 之后
import { PrismaClient } from "@prisma/client";
import { InventoryStatus, NotificationType } from "@/types/enums";
```

**Step 2: 运行类型检查**

Run: `pnpm type-check`
Expected: 通过

**Step 3: Commit**

```bash
git add -A && git commit -m "refactor: split enum imports from prisma client in 7 hybrid files"
```

---

## Phase 2: 核心模块迁移——切换 Neon → Convex Repository

### Task 2.1: 修复 meal-tracking 半成品迁移（立即可做）

> **这是最低垂的果实** — Convex 实现已存在，只需切换 singleton。

**Files:**

- Modify: `src/lib/repositories/meal-tracking-repository-singleton.ts`
- Delete: `src/lib/repositories/implementations/prisma-meal-tracking-repository.ts` (如有)

**Step 1: 写切换测试**

Create: `src/__tests__/repositories/meal-tracking-convex-switch.test.ts`

```typescript
import { getMealTrackingRepository } from "@/lib/repositories/meal-tracking-repository-singleton";

describe("meal-tracking repository", () => {
  it("should use ConvexMealTrackingRepository", () => {
    const repo = getMealTrackingRepository();
    expect(repo.constructor.name).toBe("ConvexMealTrackingRepository");
  });
});
```

**Step 2: 运行测试确认当前失败**

Run: `npx jest src/__tests__/repositories/meal-tracking-convex-switch.test.ts`
Expected: FAIL (当前是 NeonMealTrackingRepository)

**Step 3: 切换 singleton 实现**

修改 `src/lib/repositories/meal-tracking-repository-singleton.ts`：

```typescript
// 之前
import { NeonMealTrackingRepository } from "./implementations/neon-meal-tracking-repository";

// 之后
import { ConvexMealTrackingRepository } from "./implementations/convex-meal-tracking-repository";
```

将实例化从 `NeonMealTrackingRepository` 改为 `ConvexMealTrackingRepository`。

**Step 4: 运行测试确认通过**

Run: `npx jest src/__tests__/repositories/meal-tracking-convex-switch.test.ts`
Expected: PASS

**Step 5: 删除 Neon 实现**

```bash
rm src/lib/repositories/implementations/neon-meal-tracking-repository.ts
rm src/lib/repositories/implementations/prisma-meal-tracking-repository.ts
```

**Step 6: 全量验证**

Run: `pnpm type-check && pnpm test`
Expected: 通过

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(meal-tracking): switch repository from neon to convex (implementation already exists)"
```

---

### Task 2.2: 创建 Convex Device Repository + 切换 singleton

**Files:**

- Create: `src/lib/repositories/implementations/convex-device-repository.ts`
- Modify: `src/lib/repositories/device-repository-singleton.ts`
- Delete: `src/lib/repositories/implementations/neon-device-repository.ts`
- Delete: `src/lib/repositories/implementations/prisma-device-repository.ts`

**Step 1: 写接口测试**

Create: `src/__tests__/repositories/device-convex-repository.test.ts`

测试 Convex Device Repository 实现的 CRUD 接口：

- `listConnections(memberId)`
- `getConnectionById(id)`
- `getActiveByDeviceId(deviceId)`
- `createConnection(data)`
- `updateConnection(id, data)`

对应 Convex 模块：`convex/devices.ts` (7 个函数：listConnections, getById, getActiveByDeviceId, getActiveByDeviceAndMember, listActiveAutoSync, createConnection, updateConnection)

**Step 2: 运行测试确认失败**

Run: `npx jest src/__tests__/repositories/device-convex-repository.test.ts`
Expected: FAIL (ConvexDeviceRepository not found)

**Step 3: 实现 ConvexDeviceRepository**

基于 `convex/devices.ts` 的 7 个函数，创建适配 Repository 接口的实现类。
参考 `convex-meal-tracking-repository.ts` 的模式：通过 `convexClient.query/mutation` 调用 Convex 函数。

```typescript
// src/lib/repositories/implementations/convex-device-repository.ts
import { getConvexClient, api } from "@/lib/convex-client";

export class ConvexDeviceRepository implements IDeviceRepository {
  async listConnections(memberId: string) {
    const client = getConvexClient();
    return client.query(api.devices.listConnections, { memberId });
  }
  // ... 其他方法映射到 convex/devices.ts
}
```

**Step 4: 运行测试确认通过**

**Step 5: 切换 singleton**

修改 `device-repository-singleton.ts` 从 `NeonDeviceRepository` → `ConvexDeviceRepository`

**Step 6: 删除 Neon + Prisma 实现**

**Step 7: 全量验证 + Commit**

```bash
git add -A && git commit -m "feat(devices): migrate repository from neon to convex"
```

---

### Task 2.3: 创建 Convex Food Repository + 切换 singleton

**Files:**

- Create: `src/lib/repositories/implementations/convex-food-repository.ts`
- Modify: `src/lib/repositories/food-repository-singleton.ts`
- Delete: `src/lib/repositories/implementations/neon-food-repository.ts`
- Delete: `src/lib/repositories/implementations/prisma-food-repository.ts` (如有)

**Step 1: 写接口测试**

测试 CRUD：

- `searchFoods(query, category?, limit?, offset?)`
- `getFoodById(id)`
- `getFoodsByIds(ids)`
- `getFoodsByCategory(category)`

Convex 模块：`convex/budget.ts` 包含 food 相关查询（getFoods, getFoodById, getFoodsByIds, getFoodsByCategory, getAffordableFoods, getPopularFoods, getRecentPurchases）

**Step 2-7: 同 Task 2.2 模式**

---

### Task 2.4: 创建 Convex Health Repository + 切换 singleton

**Files:**

- Create: `src/lib/repositories/implementations/convex-health-repository.ts`
- Modify: `src/lib/repositories/health-repository-singleton.ts`
- Delete: `src/lib/repositories/implementations/neon-health-repository.ts`
- Delete: `src/lib/repositories/implementations/prisma-health-repository.ts` (如有)

**Convex 模块：** `convex/health.ts` (20 个函数)
**Convex Analytics 模块：** `convex/analytics.ts` (25 个函数，覆盖 healthScore, healthReport, healthAnomaly, dailyNutritionTarget, auxiliaryTracking, trackingStreak)

**Step 1-7: 同 Task 2.2 模式**

---

### Task 2.5: 创建 Convex Leaderboard Repository + 切换 singleton

**Files:**

- Create: `src/lib/repositories/implementations/convex-leaderboard-repository.ts`
- Modify: `src/lib/repositories/leaderboard-repository-singleton.ts`
- Delete: `src/lib/repositories/implementations/neon-leaderboard-repository.ts`
- Delete: `src/lib/repositories/implementations/prisma-leaderboard-repository.ts` (如有)

**Convex 模块：** `convex/leaderboards.ts` (9 个函数)

**⚠️ 注意：** Neon 实现中有 5 条 raw SQL 聚合查询（AVG weight, heart_rate, blood_pressure 等），需要确认 Convex leaderboards 是否已有等效实现，或是否需要添加 Convex action 来做服务端聚合。

**Step 1-7: 同 Task 2.2 模式**

---

### Task 2.6: 创建 Convex Meal-Plan Repository + 切换 singleton

**Files:**

- Create: `src/lib/repositories/implementations/convex-meal-plan-repository.ts`
- Modify: `src/lib/repositories/meal-plan-repository-singleton.ts`
- Delete: `src/lib/repositories/implementations/neon-meal-plan-repository.ts`
- Delete: `src/lib/repositories/implementations/prisma-meal-plan-repository.ts` (如有)

**Convex 模块：** `convex/meals.ts` (16 个函数)

**Step 1-7: 同 Task 2.2 模式**

---

### Task 2.7: 创建 Convex Feedback Repository + 切换 singleton

**Files:**

- Create: `src/lib/repositories/implementations/convex-feedback-repository.ts`
- Modify: `src/lib/repositories/feedback-repository-singleton.ts`
- Delete: `src/lib/repositories/implementations/neon-feedback-repository.ts`
- Delete: `src/lib/repositories/implementations/prisma-feedback-repository.ts` (如有)

**⚠️ 注意：** Neon 实现中调用了 Supabase 存储过程 `sp_ai_feedback_stats`。需要将此逻辑迁移到 Convex action，或在 Convex 中用聚合查询替代。

**Step 1-7: 同 Task 2.2 模式**

---

## Phase 3: 功能模块迁移——切换直接 Prisma 调用的 API 路由

### Task 3.1: 迁移 Dashboard 残留 Prisma 调用（3 条路由）

**Files:**

- Modify: `src/app/api/dashboard/data/route.ts`
- Modify: `src/app/api/dashboard/overview/route.ts`
- Modify: `src/app/api/dashboard/weekly-report/route.ts`

**Step 1: 写集成测试**

对每个路由的 GET/POST 行为写测试，确保切换后响应格式不变。

**Step 2: 将 `prisma.familyMember.findUnique` 替换为 Convex 调用**

```typescript
// 之前
const member = await prisma.familyMember.findUnique({ where: { id: memberId } });

// 之后
const member = await convexClient.query(api.members.getById, { memberId });
```

**Step 3: 验证 + Commit**

```bash
git add -A && git commit -m "refactor(dashboard): replace prisma calls with convex queries"
```

---

### Task 3.2: 迁移 AI Report 路由（2 条）

**Files:**

- Modify: `src/app/api/ai/generate-report/route.ts`
- Modify: `src/app/api/ai/optimize-recipe/route.ts`

**Step 1: 写测试**

**Step 2: 迁移**

`generate-report` 当前遍历 8 个 Prisma 模型（familyMember, healthReport, aiAdvice, healthScore, dailyNutritionTarget, auxiliaryTracking, healthData, mealLog）。需要映射到对应的 Convex 查询：

- familyMember → `api.members.getById`
- healthData → `api.health.listHealthData`
- healthScore → `api.analytics.getHealthScore`
- dailyNutritionTarget → `api.analytics.getDailyNutritionTarget`
- auxiliaryTracking → `api.analytics.getAuxiliaryTracking`
- healthReport → `api.analytics.listHealthReports`
- aiAdvice → 需在 Convex 中创建（见 Phase 4）
- mealLog → `api.tracking.getTodayMealLogs` / `api.tracking.getMealLogHistory`

`optimize-recipe` 用到 familyMember + aiAdvice。

**Step 3: 验证 + Commit**

---

### Task 3.3: 迁移 Ecommerce 路由（7 条）

**Files:**

- Modify: `src/app/api/ecommerce/products/search/route.ts`
- Modify: `src/app/api/ecommerce/compare/route.ts`
- Modify: `src/app/api/ecommerce/cart/route.ts`
- Modify: `src/app/api/ecommerce/orders/route.ts`
- Modify: `src/app/api/ecommerce/orders/[orderId]/route.ts`
- Modify: `src/app/api/ecommerce/match/route.ts`
- Modify: `src/app/api/ecommerce/auth/[platform]/route.ts`

**Convex 模块：** `convex/ecommerce.ts` (13 个函数) 已覆盖大部分操作。

**Step 1-3: 同 Task 3.1 模式**

---

### Task 3.4: 迁移 Instacart 路由（3 条）

**Files:**

- Modify: `src/app/api/instacart/auth/route.ts`
- Modify: `src/app/api/instacart/cart/route.ts`
- Modify: `src/app/api/instacart/checkout/route.ts`

**⚠️ 注意：** 需要先在 Convex 中创建 `oAuthState` 和 `instacartCart` 表（见 Phase 4 Task 4.1, 4.2）。

**Step 1-3: 同 Task 3.1 模式**

---

### Task 3.5: 迁移 Cron/Smart-Trigger 路由（1 条）

**Files:**

- Modify: `src/app/api/cron/smart-trigger/route.ts`
- Modify: `src/lib/services/smart-trigger/trigger-engine.ts`

**⚠️ 注意：** 需要先在 Convex 中创建 `smartTriggerLog` 和 `userBehaviorPattern` 表（见 Phase 4 Task 4.3）。

---

### Task 3.6: 迁移剩余 neonAdapter 直连路由（~20 条）

**Files:**

- `src/app/api/members/[memberId]/goals/` — 2 条路由
- `src/app/api/members/[memberId]/reports/` — 3 条路由
- `src/app/api/members/[memberId]/allergies/[allergyId]/route.ts`
- `src/app/api/members/[memberId]/health-reminders/route.ts`
- `src/app/api/members/[memberId]/meal-plans/route.ts`
- `src/app/api/members/[memberId]/initialize/route.ts`
- `src/app/api/invite/[code]/route.ts`
- `src/app/api/foods/search/route.ts`
- `src/app/api/foods/[id]/route.ts`
- `src/app/api/analytics/` — 3 条路由
- `src/app/api/cleanup/expired-invitations/route.ts`
- `src/app/api/tracking/reminders/route.ts`
- `src/app/api/user/preferences/route.ts`
- `src/app/api/monitoring/route.ts`
- `src/app/api/ai/advice-history/route.ts`

**策略：** 逐路由将 `neonAdapter.xxx.findMany()` 替换为对应的 Convex 调用。大多数已有对应 Convex 函数。

---

## Phase 4: 补全 Convex 缺失表（14 个 Prisma 独有 Model）

### Task 4.1: 在 Convex 中添加 OAuthState + InstacartCart 表

**Files:**

- Modify: `convex/schema.ts`
- Create: `convex/instacart.ts` (或扩展现有 ecommerce.ts)

**Step 1: 定义 Convex 表**

```typescript
// convex/schema.ts 新增
oAuthStates: defineTable({
  state: v.string(),
  userId: v.string(),
  platform: v.string(),
  redirectUri: v.string(),
  expiresAt: v.number(),
}).index("by_state", ["state"]),

instacartCarts: defineTable({
  userId: v.string(),
  cartId: v.string(),
  retailerId: v.string(),
  checkoutUrl: v.optional(v.string()),
  deepLink: v.optional(v.string()),
  items: v.optional(v.any()),
  mealPlanId: v.optional(v.string()),
  status: v.string(),
  expiresAt: v.optional(v.number()),
}).index("by_user", ["userId"]),
```

**Step 2: 实现 CRUD mutation/query**

**Step 3: 写测试验证**

---

### Task 4.2: 在 Convex 中添加 AI 相关表（aiAdvice, aiConversation, promptTemplate）

**Files:**

- Modify: `convex/schema.ts`
- Create: `convex/ai.ts`

**Step 1: 定义 3 张 AI 表**

```typescript
aiAdvice: defineTable({
  memberId: v.string(),
  type: v.string(),
  content: v.any(),
  prompt: v.string(),
  tokens: v.number(),
  feedback: v.optional(v.any()),
}).index("by_member", ["memberId"]),

aiConversations: defineTable({
  memberId: v.string(),
  title: v.string(),
  messages: v.any(),
  status: v.string(),
  tokens: v.number(),
}).index("by_member", ["memberId"]),

promptTemplates: defineTable({
  name: v.string(),
  type: v.string(),
  template: v.string(),
  version: v.number(),
  parameters: v.optional(v.any()),
  isActive: v.boolean(),
}).index("by_type", ["type"]),
```

**Step 2: 实现 CRUD + 测试**

---

### Task 4.3: 在 Convex 中添加 SmartTrigger + UserBehaviorPattern 表

**Files:**

- Modify: `convex/schema.ts`
- Create: `convex/smartTrigger.ts`

**Step 1: 定义 2 张表 + CRUD**

```typescript
smartTriggerLogs: defineTable({
  userId: v.string(),
  triggerType: v.string(),
  triggerScore: v.number(),
  factors: v.any(),
  triggered: v.boolean(),
  mealPlanId: v.optional(v.string()),
  emailSent: v.optional(v.boolean()),
  cooldownUntil: v.optional(v.number()),
}).index("by_user", ["userId"]),

userBehaviorPatterns: defineTable({
  userId: v.string(),
  preferredShoppingDay: v.optional(v.string()),
  averageOrderInterval: v.optional(v.number()),
  lastOrderDate: v.optional(v.string()),
  typicalOrderSize: v.optional(v.number()),
  preferredRetailers: v.optional(v.any()),
  dietaryPatterns: v.optional(v.any()),
}).index("by_user", ["userId"]),
```

---

### Task 4.4: 在 Convex 中添加社交扩展表（communityPost, communityComment, familyGoal, comment）

**Files:**

- Modify: `convex/schema.ts`
- Create: `convex/community.ts`

**Step 1: 定义 4 张表 + CRUD**

注意：这些功能（社区）可能是低优先级，如果当前无 API 路由使用，可以延后。

---

## Phase 5: Prisma 拆除

### Task 5.1: 删除所有 Prisma Repository 实现

**Files:**

- Delete: `src/lib/repositories/implementations/prisma-*.ts` (剩余 ~8 个)
- Delete: `src/lib/repositories/prisma/` (prisma-notification-repository.ts, prisma-food-repository.ts)

**Step 1: 确认零引用**

Run: `grep -r "prisma-.*-repository\|PrismaClient\|@prisma/client" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v __tests__`

**Step 2: 删除文件**

**Step 3: 验证**

---

### Task 5.2: 删除 Prisma 服务层

**Files:**

- Delete: `src/services/expiry-monitor.ts` (如已迁移到 Convex)
- Delete: `src/services/inventory-sync.ts` (如已迁移)
- Delete: `src/services/inventory-analyzer.ts` (如已迁移)
- Delete: `src/lib/db/neon-adapter.ts`
- Delete: `src/lib/db/neon-client.ts`
- Delete: `src/lib/db/neon-rpc-helpers.ts`
- Delete: `src/lib/db/database-optimization.ts`
- Delete: `src/lib/db/index-optimizer.ts`
- Delete: `src/lib/db/query-cache.ts`
- Modify: `src/lib/db/index.ts` (清理导出)

**⚠️ 前置条件：** Phase 2-4 全部完成，所有路由和服务已切到 Convex。

---

### Task 5.3: 删除 Prisma 包依赖

**Files:**

- Modify: `package.json` — 移除 `@prisma/client`, `prisma`
- Modify: `package.json` — 移除 `@neondatabase/serverless`
- Delete: `prisma/` 目录
- Delete: `supabase/` 目录

**Step 1: 确认零引用**

Run: `grep -r "@prisma/client\|prisma generate\|neonAdapter\|@neondatabase" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`

**Step 2: 移除依赖**

**Step 3: 删除目录**

```bash
rm -rf prisma/
rm -rf supabase/
```

**Step 4: 清理 package.json scripts**

移除：

```json
"db:generate": "prisma generate",
"db:push": "prisma db push",
"db:migrate": "prisma migrate dev",
"db:studio": "prisma studio"
```

**Step 5: 验证**

Run: `pnpm install && pnpm type-check && pnpm test`
Expected: 全部通过

**Step 6: Commit**

```bash
git add -A && git commit -m "chore: remove prisma, neon, and supabase — convex is now the sole backend"
```

---

### Task 5.4: 清理陈旧 Git 分支

**Step 1: 列出已合并的本地分支**

Run: `git branch --merged main`

**Step 2: 批量删除已合并的本地分支**

```bash
git branch --merged main | grep -v "main\|*" | xargs git branch -d
```

**Step 3: 清理远程追踪**

```bash
git remote prune origin
```

---

## Phase 6: 全量验证

### Task 6.1: 端到端烟雾测试

**Step 1: 构建检查**

Run: `pnpm build`
Expected: 构建成功

**Step 2: 全量测试**

Run: `pnpm test`
Expected: 所有测试通过

**Step 3: Lint 修复**

Run: `pnpm lint:fix && pnpm lint`
Expected: 0 errors

**Step 4: 类型检查**

Run: `pnpm type-check`
Expected: 0 errors

---

### Task 6.2: 测试覆盖率提升到 30%

**目标：** 从 4.7% 提升到 30%，聚焦核心路径：

1. **Auth 路径** — signup → signin → session
2. **Health 路径** — add data → list → trends → anomaly detection
3. **Meal Planning 路径** — generate → view → update → delete
4. **Shopping 路径** — create list → add items → complete
5. **Convex Repository 层** — 每个 Convex repo 的 CRUD 测试

**Step 1: 为每个核心路径写集成测试**

**Step 2: 运行覆盖率**

Run: `pnpm test:coverage`
Expected: ≥ 30%

---

### Task 6.3: 更新项目文档

**Files:**

- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Step 1: 更新技术栈描述**

移除所有 Prisma/Neon/Supabase/Drizzle 引用，声明 Convex 为唯一后端。

**Step 2: 更新开发命令**

移除 `db:generate`, `db:push`, `db:migrate`, `db:studio` 命令描述。

**Step 3: 更新依赖说明**

添加 Convex 开发命令（`npx convex dev`, `npx convex deploy` 等）。

---

## 迁移检查清单

| Phase | Task | 描述                          | 前置依赖  | 估算时间 |
| ----- | ---- | ----------------------------- | --------- | -------- |
| 0     | 0.1  | 删除 Drizzle                  | 无        | 10 min   |
| 0     | 0.2  | 删除 Supabase 测试            | 无        | 10 min   |
| 0     | 0.3  | 删除 Prisma 占位 repo         | 无        | 10 min   |
| 1     | 1.1  | 充实 enums.ts                 | Phase 0   | 30 min   |
| 1     | 1.2  | 迁移 41 个 Enum-only 文件     | 1.1       | 1 hr     |
| 1     | 1.3  | 迁移 7 个 Enum+Client 文件    | 1.2       | 20 min   |
| 2     | 2.1  | meal-tracking singleton 切换  | Phase 1   | 15 min   |
| 2     | 2.2  | Device repo 创建+切换         | 2.1       | 1 hr     |
| 2     | 2.3  | Food repo 创建+切换           | 2.2       | 1 hr     |
| 2     | 2.4  | Health repo 创建+切换         | 2.3       | 1.5 hr   |
| 2     | 2.5  | Leaderboard repo 创建+切换    | 2.4       | 1.5 hr   |
| 2     | 2.6  | Meal-plan repo 创建+切换      | 2.5       | 1 hr     |
| 2     | 2.7  | Feedback repo 创建+切换       | 2.6       | 1 hr     |
| 3     | 3.1  | Dashboard 3 路由迁移          | Phase 2   | 30 min   |
| 3     | 3.2  | AI 2 路由迁移                 | 3.1 + 4.2 | 1 hr     |
| 3     | 3.3  | Ecommerce 7 路由迁移          | 3.1       | 1.5 hr   |
| 3     | 3.4  | Instacart 3 路由迁移          | 3.3 + 4.1 | 1 hr     |
| 3     | 3.5  | Cron 1 路由迁移               | 3.4 + 4.3 | 30 min   |
| 3     | 3.6  | ~20 neonAdapter 直连路由迁移  | 3.1       | 3 hr     |
| 4     | 4.1  | OAuthState + InstacartCart 表 | Phase 2   | 1 hr     |
| 4     | 4.2  | AI 3 表                       | 4.1       | 1.5 hr   |
| 4     | 4.3  | SmartTrigger 2 表             | 4.2       | 1 hr     |
| 4     | 4.4  | 社区 4 表                     | 4.3       | 1.5 hr   |
| 5     | 5.1  | 删除 Prisma repo 实现         | Phase 3+4 | 20 min   |
| 5     | 5.2  | 删除 Neon 服务层              | 5.1       | 20 min   |
| 5     | 5.3  | 删除 Prisma 包+目录           | 5.2       | 20 min   |
| 5     | 5.4  | 清理 Git 分支                 | 5.3       | 10 min   |
| 6     | 6.1  | E2E 烟雾测试                  | Phase 5   | 1 hr     |
| 6     | 6.2  | 覆盖率提升 30%                | 6.1       | 4 hr     |
| 6     | 6.3  | 文档更新                      | 5.3       | 30 min   |

**总估算：~24 小时工作量**

---

## 风险与缓解

| 风险                                         | 缓解策略                                                         |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Convex 函数行为与 Prisma/Neon 不一致         | 每个 repo 切换前写对比测试，确保响应格式一致                     |
| neonAdapter.raw SQL 聚合无法在 Convex 中复制 | 用 Convex action + http action 做服务端聚合，或迁移到客户端计算  |
| 数据丢失（Prisma 表有数据但 Convex 表为空）  | 迁移前做数据同步脚本（convex/migrations.ts 已有 insertXxx 函数） |
| Cloudflare Workers 构建体积限制              | 删除 Prisma 后 bundle size 将显著减少（Prisma engine 占 ~30MB）  |
| 迁移中断导致系统不可用                       | 渐进式迁移保证每个模块可独立回滚                                 |
