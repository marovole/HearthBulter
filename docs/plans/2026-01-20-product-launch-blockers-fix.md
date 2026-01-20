# HearthBulter 产品上线阻塞项修复计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复所有 P0 上线阻塞项，使产品可以在本周内安全上线。

**Architecture:** 本计划分三个核心任务：1) 修复测试 Mock 配置使 CI 变绿；2) 统一认证方案消除 Clerk/Supabase 双栈冲突；3) 清理 wrangler.toml 中的硬编码密钥。每个任务采用 TDD 方法，确保修改不破坏现有功能。

**Tech Stack:** Jest, TypeScript, Clerk SDK, Supabase Auth, Cloudflare Wrangler

---

## Task 1: 修复测试 Mock 配置

**Files:**

- Modify: `src/__tests__/mocks/prisma-client.js` (全文重写)
- Create: `src/__tests__/mocks/supabase-adapter.ts`
- Modify: `src/__tests__/setup.ts:16` (添加 mock 导入)
- Test: `src/__tests__/services/device-integration.test.ts`
- Test: `src/__tests__/services/notification-service.test.ts`

**问题根因:**
项目已从 Prisma 迁移到 Supabase Adapter (`src/lib/db/index.ts` 导出 `supabaseAdapter as prisma`)，但测试 mock 仍然是旧的 Prisma 格式，导致 `prisma.user`、`prisma.deviceConnection` 等为 `undefined`。

### Step 1: 创建 Supabase Adapter Mock

创建与 `supabaseAdapter` 结构匹配的 mock 文件。

```typescript
// src/__tests__/mocks/supabase-adapter.ts

/**
 * Supabase Adapter Mock for Testing
 *
 * 模拟 src/lib/db/supabase-adapter.ts 导出的 supabaseAdapter
 * 提供与生产代码相同的 API 结构
 */

// 创建可复用的 mock 方法生成器
const createMockMethods = () => ({
  findUnique: jest.fn().mockResolvedValue(null),
  findFirst: jest.fn().mockResolvedValue(null),
  findMany: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  upsert: jest.fn().mockResolvedValue({}),
  count: jest.fn().mockResolvedValue(0),
  groupBy: jest.fn().mockResolvedValue([]),
  aggregate: jest.fn().mockResolvedValue({}),
});

// 导出所有数据库表的 mock
export const mockPrisma = {
  // 用户相关
  user: createMockMethods(),
  family: createMockMethods(),
  familyMember: createMockMethods(),
  familyInvitation: createMockMethods(),

  // 健康数据相关
  healthData: createMockMethods(),
  healthGoal: createMockMethods(),
  healthReport: createMockMethods(),
  healthScore: createMockMethods(),
  healthAnomaly: createMockMethods(),

  // 设备相关
  deviceConnection: createMockMethods(),

  // 通知相关
  notification: createMockMethods(),
  notificationPreference: createMockMethods(),
  notificationLog: createMockMethods(),

  // 社交相关
  sharedContent: createMockMethods(),
  achievement: createMockMethods(),
  leaderboardEntry: createMockMethods(),

  // 库存相关
  inventoryItem: createMockMethods(),
  inventoryUsage: createMockMethods(),

  // 食谱相关
  recipe: createMockMethods(),
  meal: createMockMethods(),
  mealPlan: createMockMethods(),
  food: createMockMethods(),

  // 购物相关
  shoppingList: createMockMethods(),
  shoppingItem: createMockMethods(),
  budget: createMockMethods(),

  // AI 相关
  aiConversation: createMockMethods(),
  aiAdvice: createMockMethods(),

  // 事务支持
  $transaction: jest.fn((callback) => {
    if (typeof callback === "function") {
      return callback(mockPrisma);
    }
    return Promise.all(callback);
  }),

  // 连接管理
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

// 重置所有 mock 的辅助函数
export const resetAllMocks = () => {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === "object" && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === "function" && "mockClear" in method) {
          (method as jest.Mock).mockClear();
        }
      });
    }
  });
};

export default mockPrisma;
```

### Step 2: 更新 prisma-client.js mock

```javascript
// src/__tests__/mocks/prisma-client.js

/**
 * Prisma Client Mock - 兼容 Supabase Adapter
 *
 * 项目已迁移到 Supabase，此文件提供向后兼容的 mock
 */

const { mockPrisma } = require("./supabase-adapter");

// 导出与 @prisma/client 相同的结构
const PrismaClient = jest.fn().mockImplementation(() => mockPrisma);

// 导出枚举代理（用于 Prisma 枚举类型）
const enumProxy = new Proxy(
  {},
  {
    get: (_target, prop) => String(prop),
  },
);

module.exports = new Proxy(
  { PrismaClient, ...mockPrisma },
  {
    get: (target, prop) => (prop in target ? target[prop] : enumProxy),
  },
);
```

### Step 3: 更新 db/index mock

在 `src/__tests__/setup.ts` 顶部添加 mock：

```typescript
// 在 src/__tests__/setup.ts 文件最顶部（第 1 行之前）添加：

// Mock database layer BEFORE any imports
jest.mock("@/lib/db", () => {
  const { mockPrisma } = require("./mocks/supabase-adapter");
  return {
    prisma: mockPrisma,
    db: mockPrisma,
    getDB: jest.fn().mockResolvedValue(mockPrisma),
    getPrismaClient: jest.fn().mockResolvedValue(mockPrisma),
    testDatabaseConnection: jest.fn().mockResolvedValue(true),
    ensureDatabaseConnection: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock("@/lib/db/supabase-adapter", () => {
  const { mockPrisma } = require("./mocks/supabase-adapter");
  return {
    supabaseAdapter: mockPrisma,
    SupabaseClientManager: {
      getInstance: jest.fn(),
    },
    testDatabaseConnection: jest.fn().mockResolvedValue(true),
    ensureDatabaseConnection: jest.fn().mockResolvedValue(undefined),
  };
});
```

### Step 4: 运行测试验证修复

Run: `pnpm test src/__tests__/services/device-integration.test.ts --verbose`

Expected: 之前失败的 15 个测试现在应该通过（或显示不同的错误，不再是 `undefined` 相关）

### Step 5: 运行 notification-service 测试验证

Run: `pnpm test src/__tests__/services/notification-service.test.ts --verbose`

Expected: 之前失败的 12 个测试现在应该通过

### Step 6: 修复 rateLimiter mock

`social/share/[token]/route.test.ts` 还有 `rateLimiter.checkLimit is not a function` 错误。

在 `src/__tests__/setup.ts` 添加：

```typescript
// Mock rate limiter
jest.mock("@/lib/security/rate-limiter", () => ({
  rateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 100 }),
    resetLimit: jest.fn().mockResolvedValue(undefined),
  },
}));
```

### Step 7: 运行完整测试套件

Run: `pnpm test --verbose 2>&1 | head -100`

Expected: 失败数量从 38 显著减少

### Step 8: 提交修复

```bash
git add src/__tests__/mocks/supabase-adapter.ts src/__tests__/mocks/prisma-client.js src/__tests__/setup.ts
git commit -m "fix(tests): update mocks to match Supabase adapter migration

- Create new supabase-adapter.ts mock with all table models
- Update prisma-client.js to use new mock structure
- Add db/index and rate-limiter mocks to setup.ts
- Fixes 38 failing tests due to undefined prisma models"
```

---

## Task 2: 统一认证方案 (Clerk 优先)

**Files:**

- Modify: `src/lib/auth.ts` (创建统一入口)
- Modify: `src/lib/auth-supabase.ts:auth()` (改为从 Clerk 读取)
- Modify: `src/app/api/*/route.ts` (确保使用统一的 auth)
- Test: `src/__tests__/auth/unified-auth.test.ts`

**问题根因:**

- `layout.tsx` 使用 `<ClerkProvider>` (Clerk 管理 UI 层认证)
- API 路由使用 `auth()` from `@/lib/auth-supabase.ts` (Supabase 管理后端认证)
- 两套系统的 session 可能不同步

**解决方案:** 让 `auth()` 函数从 Clerk 的 `currentUser()` 获取用户信息，统一认证源。

### Step 1: 编写统一认证的测试

```typescript
// src/__tests__/auth/unified-auth.test.ts

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Clerk
jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
  auth: jest.fn(),
}));

import { currentUser, auth as clerkAuth } from "@clerk/nextjs/server";
import { auth, getAuthUser } from "@/lib/auth";

describe("Unified Auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("auth()", () => {
    it("should return session from Clerk when user is authenticated", async () => {
      const mockClerkUser = {
        id: "clerk_user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "Test",
        lastName: "User",
        imageUrl: "https://example.com/avatar.jpg",
      };

      (currentUser as jest.Mock).mockResolvedValue(mockClerkUser);

      const session = await auth();

      expect(session).not.toBeNull();
      expect(session?.user.id).toBe("clerk_user_123");
      expect(session?.user.email).toBe("test@example.com");
    });

    it("should return null when user is not authenticated", async () => {
      (currentUser as jest.Mock).mockResolvedValue(null);

      const session = await auth();

      expect(session).toBeNull();
    });
  });

  describe("getAuthUser()", () => {
    it("should return AuthUser object from Clerk session", async () => {
      const mockClerkUser = {
        id: "clerk_user_456",
        emailAddresses: [{ emailAddress: "user@test.com" }],
        firstName: "John",
        lastName: "Doe",
        imageUrl: null,
      };

      (currentUser as jest.Mock).mockResolvedValue(mockClerkUser);

      const user = await getAuthUser();

      expect(user).toEqual({
        id: "clerk_user_456",
        email: "user@test.com",
        name: "John Doe",
        image: null,
        role: "user",
      });
    });
  });
});
```

### Step 2: 运行测试确认失败

Run: `pnpm test src/__tests__/auth/unified-auth.test.ts --verbose`

Expected: FAIL (因为 `@/lib/auth` 尚未创建)

### Step 3: 创建统一认证模块

```typescript
// src/lib/auth.ts

/**
 * 统一认证模块 - Clerk 为主认证源
 *
 * 所有 API 路由和服务器端代码应使用此模块获取用户信息。
 * Clerk 管理认证状态，此模块提供与原 NextAuth 兼容的 API。
 */

import { currentUser, auth as clerkAuth } from "@clerk/nextjs/server";

// 兼容 NextAuth 的用户类型
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
}

// 兼容 NextAuth 的会话类型
export interface AuthSession {
  user: AuthUser;
  expires: string;
}

/**
 * 获取当前认证会话
 *
 * @returns AuthSession 或 null（未登录时）
 */
export async function auth(): Promise<AuthSession | null> {
  try {
    const user = await currentUser();

    if (!user) {
      return null;
    }

    const authUser = mapClerkUserToAuthUser(user);

    return {
      user: authUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

/**
 * 获取当前认证用户
 *
 * @returns AuthUser 或 null
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * 获取用户 ID（便捷方法）
 */
export async function getUserId(): Promise<string | null> {
  const user = await getAuthUser();
  return user?.id ?? null;
}

/**
 * 要求认证 - 如果未登录则抛出错误
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized: Authentication required");
  }

  return session;
}

/**
 * 将 Clerk 用户对象映射为 AuthUser
 */
function mapClerkUserToAuthUser(clerkUser: any): AuthUser {
  const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  return {
    id: clerkUser.id,
    email: primaryEmail,
    name: fullName,
    image: clerkUser.imageUrl ?? null,
    role: "user", // 默认角色，可以从 Clerk metadata 扩展
  };
}

// 向后兼容导出
export { auth as getServerSession };
```

### Step 4: 运行测试确认通过

Run: `pnpm test src/__tests__/auth/unified-auth.test.ts --verbose`

Expected: PASS

### Step 5: 更新 auth-supabase.ts 使用 Clerk

修改 `src/lib/auth-supabase.ts`，让 `auth()` 函数代理到新的统一认证模块：

```typescript
// 在 src/lib/auth-supabase.ts 文件顶部添加：

// 重新导出统一认证 - 所有 auth() 调用现在使用 Clerk
export { auth, getAuthUser, requireAuth, getUserId } from "./auth";
export type { AuthUser, AuthSession } from "./auth";
```

### Step 6: 验证 API 路由可以正常工作

Run: `pnpm type-check`

Expected: 无类型错误

### Step 7: 提交统一认证修复

```bash
git add src/lib/auth.ts src/lib/auth-supabase.ts src/__tests__/auth/unified-auth.test.ts
git commit -m "feat(auth): unify authentication to use Clerk as primary source

- Create src/lib/auth.ts with Clerk-based auth functions
- Update auth-supabase.ts to re-export from unified module
- Add comprehensive tests for unified auth
- Maintains backward compatibility with existing API routes"
```

---

## Task 3: 清理 wrangler.toml 硬编码密钥

**Files:**

- Modify: `wrangler.toml` (移除敏感值)
- Create: `docs/deployment/cloudflare-secrets.md` (文档)

**问题:** `wrangler.toml` 中包含硬编码的 API keys 和 URLs，虽然 `NEXT_PUBLIC_*` 变量设计上是公开的，但最佳实践是将所有环境变量集中管理。

### Step 1: 备份当前 wrangler.toml

Run: `cp wrangler.toml wrangler.toml.backup`

Expected: 创建备份文件

### Step 2: 创建清理后的 wrangler.toml

```toml
# wrangler.toml
# Cloudflare Pages + Supabase 混合架构配置文件
# 适配 Next.js 15 静态导出 + Supabase 后端
#
# ⚠️ 重要: 敏感变量已移至 Cloudflare Dashboard Secrets
# 参见: docs/deployment/cloudflare-secrets.md

pages_build_output_dir = ".open-next"

name = "hearthbutler-supabase"

# 兼容性设置 - 启用 Node.js 兼容性
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat", "nodejs_als"]

# 生产环境配置
[env.production]
name = "hearthbutler-supabase-prod"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat", "nodejs_als"]

# 生产环境 KV
[[env.production.kv_namespaces]]
binding = "CACHE_KV"
id = "dd47f27d131a466db34838dd247df983"

# Preview 环境配置
[env.preview]
name = "hearthbutler-supabase-preview"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat", "nodejs_als"]

# 预览环境 KV
[[env.preview.kv_namespaces]]
binding = "CACHE_KV"
id = "3416fc31333f449194c9e8e3c00fafec"

# 非敏感环境变量（公开配置）
[vars]
NODE_ENV = "production"

# 生产环境变量
[env.production.vars]
NODE_ENV = "production"
NEXT_PUBLIC_SITE_URL = "https://healthbutler.life"
NEXT_PUBLIC_ALLOWED_ORIGINS = "https://healthbutler.life"

# Preview 环境变量
[env.preview.vars]
NODE_ENV = "preview"
NEXT_PUBLIC_SITE_URL = "https://preview.hearthbulter.pages.dev"
NEXT_PUBLIC_ALLOWED_ORIGINS = "https://preview.hearthbulter.pages.dev"

# ============================================================
# 以下变量必须通过 Cloudflare Dashboard 或 wrangler secret 设置:
#
# 必需 (生产环境):
# - DATABASE_URL
# - SUPABASE_SERVICE_KEY
# - CLERK_SECRET_KEY
# - UPSTASH_REDIS_REST_TOKEN
# - NEXTAUTH_SECRET (如果仍需要)
#
# 公开变量 (也需要设置):
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# ============================================================
```

### Step 3: 创建部署文档

````markdown
<!-- docs/deployment/cloudflare-secrets.md -->

# Cloudflare Pages 密钥配置指南

本文档说明如何在 Cloudflare Pages 中配置 HearthBulter 的环境变量。

## 配置方式

### 方式 1: Cloudflare Dashboard (推荐)

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Workers & Pages → hearthbutler-supabase
3. 点击 Settings → Environment variables
4. 分别为 Production 和 Preview 环境添加变量

### 方式 2: Wrangler CLI

```bash
# 设置生产环境 secrets
wrangler pages secret put DATABASE_URL --project-name=hearthbulter
wrangler pages secret put SUPABASE_SERVICE_KEY --project-name=hearthbulter
wrangler pages secret put CLERK_SECRET_KEY --project-name=hearthbulter
wrangler pages secret put UPSTASH_REDIS_REST_TOKEN --project-name=hearthbulter
```
````

## 必需变量清单

### 🔐 Secrets (敏感，不能公开)

| 变量名                     | 描述                           | 获取位置                                 |
| -------------------------- | ------------------------------ | ---------------------------------------- |
| `DATABASE_URL`             | Supabase PostgreSQL 连接字符串 | Supabase Dashboard → Settings → Database |
| `SUPABASE_SERVICE_KEY`     | Supabase 服务角色密钥          | Supabase Dashboard → Settings → API      |
| `CLERK_SECRET_KEY`         | Clerk 后端密钥                 | Clerk Dashboard → API Keys               |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis 访问令牌         | Upstash Console → Redis → REST API       |
| `NEXTAUTH_SECRET`          | 会话签名密钥                   | `openssl rand -base64 32` 生成           |

### 🌐 Public Variables (可公开)

| 变量名                              | 描述              | 示例值                      |
| ----------------------------------- | ----------------- | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | Supabase 项目 URL | `https://xxx.supabase.co`   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase 匿名密钥 | `eyJhbGciOi...`             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 前端密钥    | `pk_live_...`               |
| `NEXT_PUBLIC_SITE_URL`              | 网站 URL          | `https://healthbutler.life` |

## 验证配置

部署后运行以下检查：

```bash
# 检查环境变量是否正确加载
curl https://healthbutler.life/api/health
```

预期响应：

```json
{
  "status": "ok",
  "database": "connected",
  "auth": "configured"
}
```

## 故障排查

### 数据库连接失败

检查 `DATABASE_URL` 格式：

```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 认证失败

确保 `CLERK_SECRET_KEY` 与 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 来自同一 Clerk 项目。

````

### Step 4: 验证配置文件语法

Run: `wrangler pages deploy .open-next --project-name=hearthbulter --dry-run 2>&1 | head -20`

Expected: 无配置语法错误

### Step 5: 提交清理

```bash
git add wrangler.toml docs/deployment/cloudflare-secrets.md
git commit -m "security: remove hardcoded secrets from wrangler.toml

- Move NEXT_PUBLIC_SUPABASE_ANON_KEY to Cloudflare Secrets
- Move UPSTASH_REDIS_REST_URL to Cloudflare Secrets
- Add comprehensive deployment documentation
- Document all required environment variables"
````

---

## Task 4: 最终验证

### Step 1: 运行完整测试套件

Run: `pnpm test 2>&1 | tail -30`

Expected: 所有 P0 相关测试通过

### Step 2: 运行类型检查

Run: `pnpm type-check`

Expected: 无错误

### Step 3: 运行 lint

Run: `pnpm lint 2>&1 | grep -c "error"`

Expected: 0 (无 error，可能有 warnings)

### Step 4: 尝试构建

Run: `pnpm build 2>&1 | tail -20`

Expected: 构建成功

### Step 5: 最终提交

```bash
git add -A
git commit -m "chore: complete P0 blocker fixes for production launch

Summary of fixes:
- ✅ Fixed 38 failing tests by updating Supabase adapter mocks
- ✅ Unified authentication to use Clerk as primary source
- ✅ Removed hardcoded secrets from wrangler.toml
- ✅ Added deployment documentation

Ready for soft launch."
```

---

## 执行完成检查清单

- [ ] Task 1: 测试 Mock 修复 - 38 个失败测试恢复
- [ ] Task 2: 认证统一 - Clerk 作为唯一认证源
- [ ] Task 3: Secrets 清理 - wrangler.toml 无硬编码密钥
- [ ] Task 4: 最终验证 - 构建和测试全部通过

**预计总耗时:** 2-3 小时
