# Cloudflare Pages + Supabase 迁移指南

本指南详细说明如何将 Health Butler 从当前架构迁移到 Cloudflare Pages + Supabase 混合架构。

## 📋 目录

1. [前置准备](#前置准备)
2. [Phase 1: 数据库迁移](#phase-1-数据库迁移)
3. [Phase 2: 认证系统迁移](#phase-2-认证系统迁移)
4. [Phase 3: API 路由迁移](#phase-3-api-路由迁移)
5. [Phase 4: 前端部署](#phase-4-前端部署)
6. [测试与验证](#测试与验证)
7. [回滚计划](#回滚计划)

---

## 前置准备

### 1. 创建 Supabase 项目

```bash
# 访问 https://supabase.com/dashboard
# 创建新项目并记录：
# - Project URL: https://xxxxx.supabase.co
# - Anon Key: eyJxxx...
# - Service Role Key: eyJxxx...
```

### 2. 创建 Cloudflare 账户

```bash
# 访问 https://dash.cloudflare.com/
# 创建账户并获取：
# - Account ID
# - API Token (Pages 权限)
```

### 3. 安装依赖

```bash
# 安装 Supabase CLI
npm install -g supabase

# 安装 Wrangler (Cloudflare CLI)
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 安装项目依赖
pnpm install
```

### 4. 配置环境变量

创建 `.env.local` 文件：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=<REDACTED>

# Cloudflare 配置
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# 应用配置
NEXT_PUBLIC_SITE_URL=https://your-domain.pages.dev
BUILD_TARGET=cloudflare

# 第三方 API（保持不变）
OPENAI_API_KEY=<REDACTED>
OPENROUTER_API_KEY=<REDACTED>
USDA_API_KEY=<REDACTED>
```

---

## Phase 1: 数据库迁移

### 步骤 1: 生成 Supabase Schema

```bash
# 从 Prisma Schema 生成 Supabase SQL
npx tsx scripts/generate-supabase-schema.ts

# 输出: supabase/migrations/xxx_prisma_to_supabase.sql
```

### 步骤 2: 应用 Schema 到 Supabase

```bash
# 方法 1: 使用 Supabase CLI
supabase db push

# 方法 2: 在 Supabase Dashboard 中手动执行
# 1. 打开 SQL Editor
# 2. 粘贴生成的 SQL
# 3. 点击 Run
```

### 步骤 3: 迁移数据

```bash
# 确保原数据库可访问
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# 运行迁移脚本
npx tsx scripts/migrate-data-to-supabase.ts

# 查看迁移报告
# ✅ 成功迁移的表和记录数
# ⚠️  失败的表和错误信息
```

### 步骤 4: 验证数据

```bash
# 在 Supabase Dashboard 中验证
# 1. 打开 Table Editor
# 2. 检查各表的记录数
# 3. 抽样检查数据准确性

# 或使用 SQL
SELECT
  schemaname,
  tablename,
  n_tup_ins as total_rows
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC;
```

### 步骤 5: 配置 Row-Level Security (RLS)

RLS 策略已在生成的 SQL 中包含，但需要根据业务逻辑调整：

```sql
-- 示例：用户只能访问自己家庭的数据
CREATE POLICY "Family members can view own family data"
ON family_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM families
    WHERE families.id = family_members.family_id
    AND (
      families.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM family_members fm
        WHERE fm.family_id = families.id
        AND fm.user_id = auth.uid()
      )
    )
  )
);
```

---

## Phase 2: 认证系统迁移

### 步骤 1: 更新认证配置

认证适配器已创建在 `src/lib/auth-supabase.ts`

### 步骤 2: 迁移用户数据到 Supabase Auth

```bash
# 创建迁移脚本
cat > scripts/migrate-auth-users.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function migrateAuthUsers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const users = await prisma.user.findMany();

  for (const user of users) {
    // 使用 Supabase Admin API 创建用户
    const { error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'temporary-password-' + Math.random(), // 临时密码
      email_confirm: true,
      user_metadata: {
        name: user.name,
        image: user.image,
        role: user.role,
      },
    });

    if (error) {
      console.error(`Failed to migrate user ${user.email}:`, error);
    } else {
      console.log(`Migrated user ${user.email}`);
    }
  }
}

migrateAuthUsers();
EOF

npx tsx scripts/migrate-auth-users.ts
```

### 步骤 3: 更新登录页面

```typescript
// src/app/auth/signin/page.tsx
import { supabaseAuth } from "@/lib/auth-supabase";

async function handleSignIn(email: string, password: string) {
  const { session, error } = await supabaseAuth.signIn({ email, password });

  if (error) {
    // 处理错误
    return;
  }

  // 登录成功，重定向
  router.push("/dashboard");
}
```

### 步骤 4: 更新中间件

```typescript
// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 保护需要认证的路由
  if (!session && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

---

## Phase 3: API 路由迁移

### 步骤 1: 理解迁移模式

**原 Next.js API Route:**

```typescript
// src/app/api/dashboard/overview/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  // ... 业务逻辑
}
```

**迁移后 Cloudflare Function:**

```typescript
// functions/api/v1/dashboard/overview.ts
export const onRequestGet = async (context) => {
  const middlewares = composeMiddlewares(cors, requireAuth);
  return middlewares(context, () => handleRequest(context));
};
```

### 步骤 2: 批量迁移 API

按优先级迁移 API 路由：

**P0 核心 API (立即迁移):**

- ✅ `/api/auth/*` - 认证相关
- ✅ `/api/dashboard/overview` - 仪表盘概览
- ✅ `/api/members/[id]/*` - 成员管理

**P1 重要 API:**

- `/api/health-data/*` - 健康数据
- `/api/meal-plans/*` - 饮食计划
- `/api/tracking/*` - 营养追踪

**P2 次要 API:**

- `/api/recipes/*` - 食谱管理
- `/api/shopping-lists/*` - 购物清单
- `/api/ai/*` - AI 功能

**P3 辅助 API:**

- `/api/analytics/*` - 数据分析
- `/api/social/*` - 社交分享
- `/api/notifications/*` - 通知系统

### 步骤 3: 迁移示例

```bash
# 创建迁移脚本
cat > scripts/migrate-api-route.sh << 'EOF'
#!/bin/bash

# 迁移单个 API 路由
# 用法: ./scripts/migrate-api-route.sh dashboard/overview

API_PATH=$1
SRC_FILE="src/app/api/${API_PATH}/route.ts"
DEST_FILE="functions/api/v1/${API_PATH}.ts"

if [ ! -f "$SRC_FILE" ]; then
  echo "Error: Source file not found: $SRC_FILE"
  exit 1
fi

# 创建目标目录
mkdir -p "$(dirname "$DEST_FILE")"

# 转换代码（需要手动调整）
echo "Converting $SRC_FILE to $DEST_FILE"
echo "Manual steps required:"
echo "1. Replace 'export async function GET' with 'export const onRequestGet'"
echo "2. Replace 'auth()' with 'requireAuth middleware'"
echo "3. Replace 'prisma' with 'supabase client'"
echo "4. Update import paths"
EOF

chmod +x scripts/migrate-api-route.sh
```

### 步骤 4: 更新服务层

将所有服务层的 Prisma 调用替换为 Supabase Adapter：

```typescript
// 旧代码
import { prisma } from "@/lib/db";
const member = await prisma.familyMember.findUnique({ where: { id } });

// 新代码
import { supabaseAdapter } from "@/lib/db/supabase-adapter";
const member = await supabaseAdapter.familyMember.findUnique({ where: { id } });
```

可以使用查找替换快速批量更新：

```bash
# 替换所有 prisma 导入
find src/lib/services -type f -name "*.ts" -exec sed -i '' \
  's/from.*@\/lib\/db.*/from "@\/lib\/db\/supabase-adapter"/g' {} +

# 替换 prisma 调用为 supabaseAdapter
find src/lib/services -type f -name "*.ts" -exec sed -i '' \
  's/prisma\./supabaseAdapter./g' {} +
```

---

## Phase 4: 前端部署

### 步骤 1: 更新 Next.js 配置

已在 `next.config.js` 中配置静态导出模式。

### 步骤 2: 构建静态资源

```bash
# 设置构建目标
export BUILD_TARGET=cloudflare

# 生成静态页面
pnpm build

# 检查输出目录
ls -la .next/
```

### 步骤 3: 部署到 Cloudflare Pages

```bash
# 方法 1: 使用 Wrangler CLI
wrangler pages deploy .next --project-name=hearthbutler

# 方法 2: 通过 Git 集成
# 1. 推送代码到 GitHub
# 2. 在 Cloudflare Dashboard 中连接仓库
# 3. 配置构建命令: pnpm build
# 4. 配置输出目录: .next
```

### 步骤 4: 配置环境变量

在 Cloudflare Pages Dashboard 中设置：

```
Settings > Environment Variables

Production:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY
- OPENAI_API_KEY
- OPENROUTER_API_KEY
- USDA_API_KEY

Preview:
(相同配置，使用测试环境值)
```

### 步骤 5: 配置自定义域名

```bash
# 在 Cloudflare Pages 中添加自定义域名
# 1. Custom domains > Add a custom domain
# 2. 输入域名: health-butler.com
# 3. 验证 DNS 记录
# 4. 等待 SSL 证书生成
```

---

## 测试与验证

### 1. 本地测试

```bash
# 启动本地开发服务器
pnpm dev

# 测试关键功能
# ✅ 用户注册/登录
# ✅ 仪表盘数据加载
# ✅ 健康数据记录
# ✅ 饮食计划生成
# ✅ AI 推荐功能
```

### 2. 预览环境测试

```bash
# 部署到预览环境
wrangler pages deploy .next --project-name=hearthbutler --env=preview

# 测试 URL: https://xxx.hearthbutler.pages.dev
```

### 3. 生产环境测试

在正式部署前，进行完整的端到端测试：

```bash
# 测试清单
- [ ] 用户认证流程
- [ ] 数据读取和写入
- [ ] API 性能（响应时间 < 500ms）
- [ ] 错误处理
- [ ] 安全性（RLS 策略）
- [ ] 移动端兼容性
- [ ] 跨浏览器测试
```

### 4. 性能测试

```bash
# 使用 Lighthouse
npx lighthouse https://your-domain.pages.dev --view

# 目标指标
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90
```

---

## 回滚计划

### 快速回滚

如果迁移后出现严重问题：

```bash
# 1. DNS 切换回 Vercel
# 在域名管理中将 CNAME 指向原 Vercel 部署

# 2. 数据库切换回原 PostgreSQL
# 更新 .env 中的 DATABASE_URL

# 3. 重新部署原版本
cd /path/to/backup
vercel --prod
```

### 数据回滚

```bash
# 如果需要回滚数据
# 1. 从备份恢复原 PostgreSQL
pg_restore -d hearthbutler backup.sql

# 2. 停用 Supabase 项目
# 在 Supabase Dashboard 中暂停项目
```

---

## 常见问题

### Q1: Prisma 查询在 Supabase Adapter 中不工作

**A:** 检查适配器是否支持该查询类型。复杂查询可能需要使用 Supabase RPC。

### Q2: Cloudflare Functions 超过 1MB 限制

**A:** 优化依赖，使用动态导入，或将大型逻辑移到边缘数据库函数。

### Q3: RLS 策略导致数据访问被拒绝

**A:** 检查策略定义，确保用户 ID 正确传递，使用 service_role key 调试。

### Q4: 静态导出后动态路由404

**A:** 确保在 `generateStaticParams` 中预生成所有路径，或使用客户端路由。

---

## 性能优化建议

### 1. 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_health_data_member_date
ON health_data(member_id, recorded_at DESC);

-- 启用查询缓存
ALTER TABLE family_members SET (
  autovacuum_enabled = true,
  autovacuum_vacuum_scale_factor = 0.1
);
```

### 2. API 缓存

```typescript
// 在 Cloudflare Functions 中使用 Cache API
const cache = caches.default;
const cachedResponse = await cache.match(request);

if (cachedResponse) {
  return cachedResponse;
}

const response = await generateResponse();
context.waitUntil(cache.put(request, response.clone()));
return response;
```

### 3. CDN 优化

```bash
# 在 Cloudflare 中配置
# 1. 启用 Brotli 压缩
# 2. 启用 HTTP/3
# 3. 配置缓存规则
# 4. 启用 Argo Smart Routing
```

---

## 支持资源

- [Supabase 文档](https://supabase.com/docs)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages)
- [Next.js 静态导出](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Prisma to Supabase 迁移指南](https://supabase.com/docs/guides/integrations/prisma)

---

## 迁移检查清单

- [ ] Supabase 项目已创建
- [ ] Cloudflare 账户已设置
- [ ] 环境变量已配置
- [ ] Schema 已迁移到 Supabase
- [ ] 数据已迁移并验证
- [ ] RLS 策略已配置
- [ ] 认证系统已迁移
- [ ] 核心 API 已迁移
- [ ] 服务层已更新
- [ ] 前端已构建为静态资源
- [ ] 部署到 Cloudflare Pages
- [ ] 自定义域名已配置
- [ ] 本地测试通过
- [ ] 预览环境测试通过
- [ ] 性能测试通过
- [ ] 安全审计通过
- [ ] 备份已创建
- [ ] 回滚计划已准备
- [ ] 监控已设置
- [ ] 文档已更新

---

**准备就绪后，开始迁移！** 🚀
