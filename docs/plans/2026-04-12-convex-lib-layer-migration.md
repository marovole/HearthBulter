# Convex Lib Layer Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将指定的 lib 层工具、中间件与容器从 neon/prisma 访问方式迁移为 Convex 客户端访问。

**Architecture:** 保持现有函数签名与返回契约不变，仅替换数据访问实现与必要的类型适配。通过最小化改动（局部类型断言 + 保持错误语义）降低回归风险，并补充单元测试验证关键授权与连续打卡行为。

**Tech Stack:** TypeScript, Next.js App Router, Convex (`convexClient` + `api`), Jest

### Task 1: 先写失败测试覆盖迁移行为

**Files:**

- Modify: `src/__tests__/lib/security/authorization.test.ts`
- Create: `src/__tests__/lib/utils/member-access.test.ts`
- Create: `src/__tests__/lib/utils/streak.test.ts`

**Step 1: 写授权中间件失败测试（Convex mock）**

为 `requireFamilyMembership` / `requireAdmin` / `requireOwnership` / `requireFamilyAccess` 增加基于 `@/lib/convex-client` 的调用与权限判断断言。

**Step 2: 写 member-access 失败测试**

覆盖 `verifyMemberAccess(memberId, userId)` 的 Convex 查询路径与 hasAccess 计算。

**Step 3: 写 streak 失败测试**

覆盖 `updateStreakDays(memberId)` 在“今日有数据 + 昨日有/无数据 + reminder upsert”场景下的行为。

**Step 4: 运行失败测试确认 RED**

Run: `npx jest src/__tests__/lib/security/authorization.test.ts src/__tests__/lib/utils/member-access.test.ts src/__tests__/lib/utils/streak.test.ts`

Expected: 失败（当前实现仍依赖 neonAdapter 或行为不匹配）。

### Task 2: 迁移 util 与 middleware 到 Convex

**Files:**

- Modify: `src/lib/utils/member-access.ts`
- Modify: `src/lib/utils/streak.ts`
- Modify: `src/lib/middleware/authorization.ts`

**Step 1: 迁移 member-access**

替换 `neonAdapter` 为 `convexClient + api`，引入 `Id<TableName>` 类型别名，按成员→家庭→用户家庭成员关系计算访问权限。

**Step 2: 迁移 streak**

替换 `neonAdapter` 为 Convex 查询/变更；保留原有连续打卡核心规则；进行 timestamp 日期窗口判断。

**Step 3: 迁移 authorization**

移除 `@ts-nocheck`，替换 neon 查询为 Convex API 查询；保持对资源类型权限判断的外部契约（返回结构、错误消息语义）。

### Task 3: 迁移 service container 引用实现

**Files:**

- Modify: `src/lib/container/service-container.ts`

**Step 1: 移除 @ts-nocheck 并更新 Repository 实现导入**

将已存在 Convex 实现（notification/budget/family）替换为 Convex 版本；保留仍仅有 Neon 的实现。

**Step 2: 保持容器结构与 API 不变**

确保 `ServiceContainer` 对外方法签名不变，避免调用方回归。

### Task 4: 让测试通过并执行类型验证

**Files:**

- Verify only

**Step 1: 运行目标测试（GREEN）**

Run: `npx jest src/__tests__/lib/security/authorization.test.ts src/__tests__/lib/utils/member-access.test.ts src/__tests__/lib/utils/streak.test.ts`

Expected: PASS

**Step 2: 运行类型检查**

Run: `pnpm type-check`

Expected: 无新增错误（允许保留仓库已知历史错误）。
