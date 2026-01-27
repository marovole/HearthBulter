# HearthButler 架构升级行动计划

## Supabase → Convex.dev 迁移 + 代码质量修复

**创建日期**: 2026-01-14
**目标完成**: 分阶段实施
**优先级**: P0 (架构核心变更)

---

## 目录

1. [执行摘要](#执行摘要)
2. [为什么选择 Convex](#为什么选择-convex)
3. [当前问题与 Convex 解决方案](#当前问题与-convex-解决方案)
4. [分阶段实施计划](#分阶段实施计划)
5. [Schema 迁移指南](#schema-迁移指南)
6. [API 重构策略](#api-重构策略)
7. [风险评估与缓解](#风险评估与缓解)
8. [验收标准](#验收标准)

---

## 执行摘要

### 当前状态

| 组件     | 现状                              | 问题                           |
| -------- | --------------------------------- | ------------------------------ |
| 数据库   | Supabase PostgreSQL               | 手动适配器 1078 行，类型不安全 |
| ORM      | Prisma (仅 Schema) + 自定义适配器 | 双重实现，维护困难             |
| 实时同步 | 未实现                            | 需手动 WebSocket               |
| 类型安全 | 弱 (`any` 滥用)                   | 构建时检查被禁用               |

### 目标状态

| 组件     | 目标                 | 收益                          |
| -------- | -------------------- | ----------------------------- |
| 数据库   | Convex               | 端到端类型安全，实时同步内置  |
| ORM      | Convex Schema        | TypeScript 原生，自动生成类型 |
| 实时同步 | Convex Subscriptions | 零配置实时更新                |
| 类型安全 | 强类型               | 编译时捕获错误                |

### 预期收益

1. **删除 ~2000 行代码**: 移除 `supabase-adapter.ts`、Prisma 运行时依赖
2. **消除 SQL 注入风险**: Convex 使用类型安全的查询 API
3. **自动类型安全**: 从 Schema 到 UI 的端到端类型
4. **实时功能**: 无需额外配置的实时数据同步
5. **简化部署**: 无需管理数据库连接池

---

## 为什么选择 Convex

### Convex vs Supabase 对比

| 特性     | Supabase              | Convex               | HearthButler 收益  |
| -------- | --------------------- | -------------------- | ------------------ |
| 数据模型 | 关系型 (PostgreSQL)   | 文档型 + 关系支持    | 更灵活的 JSON 数据 |
| 类型安全 | 需要 Prisma/其他 ORM  | 原生 TypeScript      | 消除 `any` 类型    |
| 实时同步 | 需要手动订阅          | 自动响应式           | 简化健康数据同步   |
| 函数     | Edge Functions (Deno) | TypeScript Functions | 统一技术栈         |
| 文件存储 | Supabase Storage      | Convex File Storage  | 统一 API           |
| 认证     | Supabase Auth         | 集成 Clerk/Auth.js   | 保持 NextAuth      |

### Convex 核心优势

```typescript
// Convex: 类型安全的查询
export const getInventoryItems = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    // 返回类型自动推断，无需 `any`
    return await ctx.db
      .query("inventoryItems")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
  },
});

// 对比当前 Supabase 适配器
// src/lib/db/supabase-adapter.ts - 1078 行复杂逻辑
```

---

## 当前问题与 Convex 解决方案

### 问题 1: SupabaseAdapter SQL 注入风险 (P0)

**当前代码** (`src/lib/db/supabase-adapter.ts:471-481`):

```typescript
// 手动构建过滤器字符串 - 风险较高
private buildFilterExpressions(where: Record<string, unknown>): string[] {
  // 需要 escapeFilterValue 来防止注入
}
```

**Convex 解决方案**:

```typescript
// convex/inventoryItems.ts
export const search = query({
  args: {
    memberId: v.id("familyMembers"),
    status: v.optional(v.union(v.literal("FRESH"), v.literal("EXPIRING"))),
  },
  handler: async (ctx, { memberId, status }) => {
    let query = ctx.db
      .query("inventoryItems")
      .withIndex("by_member", (q) => q.eq("memberId", memberId));

    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }
    return await query.collect();
  },
});
// ✅ 无 SQL 字符串拼接，类型安全的过滤器
```

---

### 问题 2: `any` 类型滥用 (P1)

**当前问题文件**:

- `src/lib/db/supabase-adapter.ts` - keysToCamelCase, keysToSnakeCase
- `src/app/api/dashboard/overview/route.ts` - member: any
- `src/lib/services/ai/recipe-optimizer.ts` - recipe: any

**Convex 解决方案**:

```typescript
// convex/schema.ts - 类型自动生成
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  inventoryItems: defineTable({
    memberId: v.id("familyMembers"),
    foodId: v.id("foods"),
    quantity: v.number(),
    unit: v.string(),
    status: v.union(v.literal("FRESH"), v.literal("EXPIRING"), v.literal("EXPIRED")),
    expiryDate: v.optional(v.number()), // timestamp
  })
    .index("by_member", ["memberId"])
    .index("by_food", ["foodId"])
    .index("by_expiry", ["expiryDate"]),
});

// 自动生成: Doc<"inventoryItems"> 类型
// 无需手动定义接口，无需 `any`
```

---

### 问题 3: 构建时类型检查被禁用 (P0)

**当前配置** (`next.config.js`):

```javascript
typescript: {
  ignoreBuildErrors: true,  // ⚠️ 危险
},
```

**Convex 解决方案**: 迁移完成后，重新启用类型检查

```javascript
typescript: {
  ignoreBuildErrors: false,  // ✅ 安全
},
```

---

### 问题 4: 缺少数据库索引 (P1)

**当前问题**: `deletedAt`, 外键字段缺少索引

**Convex 解决方案**:

```typescript
// convex/schema.ts
familyMembers: defineTable({
  familyId: v.id("families"),
  userId: v.optional(v.id("users")),
  deletedAt: v.optional(v.number()),
  // ...
})
  .index("by_family", ["familyId"])
  .index("by_user", ["userId"])
  .index("by_deleted", ["deletedAt"])
  .index("by_family_active", ["familyId", "deletedAt"]), // 复合索引
```

---

### 问题 5: API 响应格式不一致 (P2)

**Convex 解决方案**: 统一的错误处理和响应格式

```typescript
// convex/lib/response.ts
export function apiSuccess<T>(data: T) {
  return { success: true as const, data };
}

export function apiError(message: string, code?: string) {
  throw new ConvexError({ message, code });
}

// convex/inventoryItems.ts
export const create = mutation({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("inventoryItems", args);
    return apiSuccess({ id });
  },
});
```

---

## 分阶段实施计划

### 阶段 0: 准备工作 (Week 1)

#### 0.1 环境设置

```bash
# 安装 Convex
pnpm add convex

# 初始化 Convex 项目
npx convex dev
```

#### 0.2 保留 NextAuth 认证

Convex 支持与 NextAuth 集成，无需更换认证方案。

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.AUTH_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

#### 0.3 创建 Convex Provider

```typescript
// src/components/providers/ConvexClientProvider.tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

---

### 阶段 1: Schema 迁移 (Week 2-3)

#### 1.1 核心模型优先级

| 优先级 | 模型组     | 表数量 | 依赖关系                                       |
| ------ | ---------- | ------ | ---------------------------------------------- |
| P0     | 用户与家庭 | 4      | User, Family, FamilyMember, FamilyInvitation   |
| P1     | 健康数据   | 8      | HealthData, HealthGoal, HealthScore, etc.      |
| P2     | 食品与库存 | 5      | Food, InventoryItem, InventoryUsage, etc.      |
| P3     | 餐饮计划   | 6      | MealPlan, Meal, MealLog, Recipe, etc.          |
| P4     | 电商与预算 | 6      | Order, Budget, Spending, etc.                  |
| P5     | 社区与通知 | 8      | Notification, CommunityPost, Achievement, etc. |

#### 1.2 Schema 转换示例

**从 Prisma**:

```prisma
model InventoryItem {
  id              String           @id @default(cuid())
  memberId        String
  foodId          String
  quantity        Float
  status          InventoryStatus  @default(FRESH)
  expiryDate      DateTime?

  @@index([memberId])
  @@index([foodId])
}
```

**到 Convex**:

```typescript
// convex/schema.ts
inventoryItems: defineTable({
  memberId: v.id("familyMembers"),
  foodId: v.id("foods"),
  quantity: v.number(),
  status: v.union(
    v.literal("FRESH"),
    v.literal("EXPIRING"),
    v.literal("EXPIRED"),
    v.literal("LOW_STOCK"),
    v.literal("OUT_OF_STOCK")
  ),
  expiryDate: v.optional(v.number()),
  // Convex 自动生成 _id 和 _creationTime
})
  .index("by_member", ["memberId"])
  .index("by_food", ["foodId"])
  .index("by_status", ["status"])
  .index("by_expiry", ["expiryDate"]),
```

#### 1.3 数据迁移脚本

```typescript
// scripts/migrate-to-convex.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

async function migrateInventoryItems() {
  // 1. 从 Supabase 读取数据
  const { data: items } = await supabase.from("inventory_items").select("*");

  // 2. 批量插入到 Convex
  for (const item of items) {
    await client.mutation(api.migrations.insertInventoryItem, {
      memberId: item.member_id, // 需要映射到新 ID
      foodId: item.food_id,
      quantity: item.quantity,
      status: item.status,
      expiryDate: item.expiry_date ? new Date(item.expiry_date).getTime() : undefined,
    });
  }
}
```

---

### 阶段 2: API 层重构 (Week 4-5)

#### 2.1 移除 Next.js API Routes，使用 Convex Functions

**当前** (`src/app/api/inventory/items/route.ts`):

```typescript
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const member = await verifyMemberAccess(session);
  const items = await inventoryRepository.findByMemberId(member.id);
  return NextResponse.json({ success: true, data: items });
}
```

**Convex** (`convex/inventoryItems.ts`):

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, { memberId }) => {
    // 认证通过 Convex Auth 自动处理
    return await ctx.db
      .query("inventoryItems")
      .withIndex("by_member", (q) => q.eq("memberId", memberId))
      .collect();
  },
});

export const create = mutation({
  args: {
    memberId: v.id("familyMembers"),
    foodId: v.id("foods"),
    quantity: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inventoryItems", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

#### 2.2 前端调用更新

**当前**:

```typescript
const response = await fetch("/api/inventory/items");
const { data } = await response.json();
```

**Convex**:

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function InventoryList({ memberId }) {
  // 自动实时更新！
  const items = useQuery(api.inventoryItems.list, { memberId });
  const createItem = useMutation(api.inventoryItems.create);

  if (items === undefined) return <Loading />;

  return (
    <ul>
      {items.map(item => <InventoryCard key={item._id} item={item} />)}
    </ul>
  );
}
```

---

### 阶段 3: 清理与优化 (Week 6)

#### 3.1 删除的文件

```
DELETE:
├── src/lib/db/supabase-adapter.ts          (1078 行)
├── src/lib/db/supabase-client.ts
├── src/lib/repositories/implementations/
│   ├── supabase-inventory-repository.ts
│   ├── supabase-meal-plan-repository.ts
│   └── ...
├── src/app/api/                            (大部分路由)
│   ├── inventory/
│   ├── meal-plans/
│   └── ...
└── prisma/                                  (仅保留作为参考)
    └── schema.prisma
```

#### 3.2 保留的 API Routes

某些端点仍需保留为 Next.js API Routes:

- `/api/auth/*` - NextAuth 认证
- `/api/webhooks/*` - 第三方 Webhook
- `/api/cron/*` - 定时任务触发器

#### 3.3 重新启用类型检查

```javascript
// next.config.js
module.exports = {
  typescript: {
    ignoreBuildErrors: false, // ✅ 重新启用
  },
  eslint: {
    ignoreDuringBuilds: false, // ✅ 重新启用
  },
};
```

---

### 阶段 4: 高级功能迁移 (Week 7-8)

#### 4.1 AI 服务集成

```typescript
// convex/ai/healthAnalysis.ts
import { action } from "../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

export const analyzeHealth = action({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, { memberId }) => {
    // 获取健康数据
    const healthData = await ctx.runQuery(api.healthData.getRecent, {
      memberId,
    });

    // 调用 OpenAI
    const openai = new OpenAI();
    const analysis = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        /* ... */
      ],
    });

    // 存储分析结果
    await ctx.runMutation(api.aiAdvice.create, {
      memberId,
      type: "HEALTH_ANALYSIS",
      content: analysis.choices[0].message.content,
    });

    return analysis;
  },
});
```

#### 4.2 实时健康数据同步

```typescript
// 前端: 自动实时更新
function HealthDashboard({ memberId }) {
  // 当数据库有变化时自动更新 UI
  const healthData = useQuery(api.healthData.getRecent, { memberId });
  const anomalies = useQuery(api.healthAnomalies.getActive, { memberId });

  return (
    <div>
      <HealthMetrics data={healthData} />
      {anomalies?.length > 0 && <AnomalyAlerts alerts={anomalies} />}
    </div>
  );
}
```

#### 4.3 文件存储迁移

```typescript
// convex/files.ts
import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: { storageId: v.id("_storage"), memberId: v.id("familyMembers") },
  handler: async (ctx, { storageId, memberId }) => {
    return await ctx.db.insert("medicalReports", {
      fileId: storageId,
      memberId,
      status: "PENDING",
    });
  },
});
```

---

## Schema 迁移指南

### 完整 Schema 结构 (核心表)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// 共享验证器
const softDelete = {
  deletedAt: v.optional(v.number()),
};

const timestamps = {
  createdAt: v.number(),
  updatedAt: v.number(),
};

export default defineSchema({
  // ==================== 用户与家庭 ====================
  users: defineTable({
    email: v.string(),
    emailVerified: v.optional(v.number()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
    ...softDelete,
    ...timestamps,
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  families: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
    creatorId: v.id("users"),
    ...softDelete,
    ...timestamps,
  })
    .index("by_creator", ["creatorId"])
    .index("by_invite_code", ["inviteCode"]),

  familyMembers: defineTable({
    name: v.string(),
    gender: v.union(v.literal("MALE"), v.literal("FEMALE"), v.literal("OTHER")),
    birthDate: v.number(),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
    role: v.union(v.literal("ADMIN"), v.literal("MEMBER"), v.literal("GUEST")),
    ...softDelete,
    ...timestamps,
  })
    .index("by_family", ["familyId"])
    .index("by_user", ["userId"])
    .index("by_family_active", ["familyId", "deletedAt"]),

  // ==================== 健康数据 ====================
  healthData: defineTable({
    memberId: v.id("familyMembers"),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    measuredAt: v.number(),
    source: v.string(),
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_date", ["memberId", "measuredAt"]),

  healthGoals: defineTable({
    memberId: v.id("familyMembers"),
    goalType: v.union(
      v.literal("LOSE_WEIGHT"),
      v.literal("GAIN_MUSCLE"),
      v.literal("MAINTAIN"),
      v.literal("IMPROVE_HEALTH")
    ),
    targetWeight: v.optional(v.number()),
    currentWeight: v.optional(v.number()),
    startDate: v.number(),
    targetDate: v.optional(v.number()),
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("COMPLETED"),
      v.literal("PAUSED"),
      v.literal("CANCELLED")
    ),
    progress: v.number(),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_status", ["status"]),

  // ==================== 食品与库存 ====================
  foods: defineTable({
    name: v.string(),
    nameEn: v.optional(v.string()),
    aliases: v.array(v.string()), // 原 JSON String 改为数组
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    category: v.string(),
    tags: v.array(v.string()), // 原 JSON String 改为数组
    source: v.union(v.literal("USDA"), v.literal("LOCAL"), v.literal("USER_SUBMITTED")),
    verified: v.boolean(),
    ...timestamps,
  })
    .index("by_category", ["category"])
    .index("by_name", ["name"])
    .searchIndex("search_foods", { searchField: "name" }), // 全文搜索

  inventoryItems: defineTable({
    memberId: v.id("familyMembers"),
    foodId: v.id("foods"),
    quantity: v.number(),
    unit: v.string(),
    originalQuantity: v.number(),
    purchaseDate: v.number(),
    purchasePrice: v.optional(v.number()), // 注意: Convex 使用 number，存储分为单位避免精度问题
    expiryDate: v.optional(v.number()),
    storageLocation: v.string(),
    status: v.string(),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_food", ["foodId"])
    .index("by_expiry", ["expiryDate"])
    .index("by_member_status", ["memberId", "status"]),

  // ==================== AI 服务 ====================
  aiAdvice: defineTable({
    memberId: v.id("familyMembers"),
    type: v.string(),
    content: v.any(), // JSON 内容
    prompt: v.optional(v.string()),
    tokens: v.number(),
    feedback: v.optional(v.any()),
    generatedAt: v.number(),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_type", ["type"]),

  // ... 其余 60+ 表按相同模式转换
});
```

### 关键转换规则

| Prisma 类型             | Convex 类型               | 说明            |
| ----------------------- | ------------------------- | --------------- |
| `String @id`            | 自动 `_id`                | Convex 自动生成 |
| `DateTime`              | `v.number()`              | Unix 时间戳     |
| `Float`                 | `v.number()`              | 货币建议存储分  |
| `Json`                  | `v.any()` 或 `v.object()` | 根据结构选择    |
| `String @default("[]")` | `v.array(v.string())`     | 使用原生数组    |
| `Enum`                  | `v.union(v.literal(...))` | 类型安全枚举    |
| `Relation`              | `v.id("tableName")`       | 显式外键        |
| `@@index`               | `.index()`                | 链式定义        |

---

## API 重构策略

### 当前 API 端点分类

| 分类      | 端点数 | 处理方式                     |
| --------- | ------ | ---------------------------- |
| CRUD 操作 | ~50    | 迁移到 Convex Query/Mutation |
| AI 服务   | ~8     | 迁移到 Convex Action         |
| 认证      | ~5     | 保留 NextAuth API Routes     |
| Webhook   | ~3     | 保留 Next.js API Routes      |
| 文件上传  | ~4     | 迁移到 Convex Storage        |

### Convex 函数类型选择

```
┌─────────────────────────────────────────────────────────────────┐
│                     Convex 函数类型指南                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Query (查询)                                                   │
│  ├── 只读操作                                                   │
│  ├── 自动缓存                                                   │
│  └── 实时订阅支持                                                │
│                                                                 │
│  Mutation (变更)                                                │
│  ├── 写入操作                                                   │
│  ├── 事务性保证                                                 │
│  └── 乐观更新支持                                                │
│                                                                 │
│  Action (动作)                                                  │
│  ├── 外部 API 调用 (OpenAI, 第三方服务)                          │
│  ├── 非确定性操作                                                │
│  └── 不支持实时订阅                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 风险评估与缓解

### 高风险项

| 风险         | 影响 | 缓解措施                               |
| ------------ | ---- | -------------------------------------- |
| 数据迁移丢失 | 严重 | 分批迁移，保留 Supabase 只读备份 30 天 |
| ID 映射错误  | 严重 | 创建 ID 映射表，迁移后验证关系完整性   |
| 性能回归     | 中等 | 迁移前后进行性能基准测试               |
| 功能遗漏     | 中等 | 创建功能检查清单，逐一验证             |

### 回滚计划

```
阶段 1-2 期间:
├── Supabase 保持运行
├── 新功能使用 Convex
└── 旧功能保持 Supabase

阶段 3 后:
├── Supabase 设为只读
├── 保留 30 天作为备份
└── 确认无问题后完全关闭
```

---

## 验收标准

### 阶段 1 完成标准

- [ ] Convex 项目初始化完成
- [ ] 核心 Schema (User, Family, FamilyMember) 迁移完成
- [ ] 数据迁移脚本验证通过
- [ ] 类型检查通过 (核心模块)

### 阶段 2 完成标准

- [ ] 50% API 端点迁移到 Convex
- [ ] 前端使用 Convex hooks
- [ ] 实时数据同步功能验证

### 阶段 3 完成标准

- [ ] `supabase-adapter.ts` 删除
- [ ] `next.config.js` 重新启用类型检查
- [ ] 构建通过，无类型错误
- [ ] 端到端测试通过

### 阶段 4 完成标准

- [ ] AI 服务迁移完成
- [ ] 文件存储迁移完成
- [ ] 性能基准达标 (响应时间 ≤ 原系统)
- [ ] Supabase 完全下线

---

## 附录

### 参考资源

- [Convex 官方文档](https://docs.convex.dev/)
- [Convex + Next.js 快速开始](https://docs.convex.dev/quickstart/nextjs)
- [Convex Schema 设计](https://docs.convex.dev/database/schemas)
- [Convex + NextAuth 集成](https://docs.convex.dev/auth)

### 依赖变更

**添加**:

```json
{
  "convex": "^1.x.x"
}
```

**移除**:

```json
{
  "@supabase/supabase-js": "^2.80.0",
  "@prisma/client": "^6.0.0",
  "@prisma/adapter-neon": "^6.19.0",
  "@neondatabase/serverless": "^1.0.2",
  "prisma": "^6.0.0"
}
```

### 环境变量更新

**添加**:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-deploy-key
```

**移除**:

```env
DATABASE_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

_行动计划创建: 2026-01-14_
_预计完成: 8 周_
_负责团队: 全栈开发_
