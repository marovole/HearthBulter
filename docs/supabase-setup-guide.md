# Supabase 项目设置指南

> 本指南帮助你创建和配置 Supabase 项目，用于 Health Butler 的数据库迁移

## 📋 前置要求

- Supabase 账号（免费层即可）
- PostgreSQL 基础知识
- 访问项目代码仓库

---

## 步骤 1: 创建 Supabase 项目

### 1.1 开发环境

1. 访问 [Supabase Dashboard](https://app.supabase.com/)
2. 点击 "New Project"
3. 填写项目信息：
   - **Organization**: 选择你的组织（或创建新的）
   - **Name**: `health-butler-dev`
   - **Database Password**: 生成强密码（保存到密码管理器）
   - **Region**: 选择最近的区域（如 `Singapore (Southeast Asia)`）
   - **Pricing Plan**: Free（0 GB）
4. 点击 "Create new project"
5. 等待 2-3 分钟项目初始化

### 1.2 测试环境（可选）

重复上述步骤，创建名为 `health-butler-staging` 的项目。

### 1.3 生产环境

**⚠️ 生产环境应在测试稳定后再创建！**

建议配置：
- Name: `health-butler-prod`
- Region: 与用户最接近的区域
- Pricing Plan: 根据需求选择（Free 或 Pro）

---

## 步骤 2: 获取项目凭证

### 2.1 进入项目设置

1. 在项目 Dashboard 中，点击左侧菜单 "Settings"
2. 选择 "API"

### 2.2 复制必要的密钥

你会看到以下信息：

#### Project URL
```
https://xyzabc123.supabase.co
```
复制到 `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL`

#### API Keys

**anon / public key** (客户端使用)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
复制到 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**service_role key** (服务端使用，⚠️ 绝不能暴露给客户端)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
复制到 `SUPABASE_SERVICE_ROLE_KEY`

### 2.3 获取 JWT Secret

1. 在 "Settings" → "API" 中
2. 找到 "JWT Secret"
3. 复制到 `SUPABASE_JWT_SECRET`

---

## 步骤 3: 配置环境变量

### 3.1 创建 `.env.local` 文件

```bash
cp .env.example .env.local
```

### 3.2 填写 Supabase 配置

编辑 `.env.local`：

```bash
# Supabase (开发环境)
NEXT_PUBLIC_SUPABASE_URL="https://xyzabc123.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_JWT_SECRET="your-super-secret-jwt-secret-never-tell-anyone"

# Feature Flags（初始设置为 false）
ENABLE_SUPABASE="false"
ENABLE_DUAL_WRITE="false"
SUPABASE_PRIMARY="false"
```

### 3.3 创建多环境配置（可选）

**`.env.development`** - 开发环境
```bash
# 使用开发项目的凭证
NEXT_PUBLIC_SUPABASE_URL="https://dev-project.supabase.co"
# ...
```

**`.env.staging`** - 测试环境
```bash
# 使用测试项目的凭证
NEXT_PUBLIC_SUPABASE_URL="https://staging-project.supabase.co"
# ...
```

**`.env.production`** - 生产环境
```bash
# 使用生产项目的凭证
NEXT_PUBLIC_SUPABASE_URL="https://prod-project.supabase.co"
# ...
```

---

## 步骤 4: 运行数据库迁移

### 4.1 安装 Supabase CLI（可选）

```bash
npm install -g supabase
```

### 4.2 链接本地项目到 Supabase

```bash
supabase link --project-ref <your-project-id>
```

从项目 URL 中提取 `project-id`：
```
https://xyzabc123.supabase.co
          ↑
    project-id
```

### 4.3 运行迁移脚本

**方法 1: 使用 SQL Editor（推荐）**

1. 在 Supabase Dashboard 中，点击 "SQL Editor"
2. 点击 "New Query"
3. 复制并粘贴迁移文件内容：
   - `supabase/migrations/20251109T153239_prisma_to_supabase.sql`
4. 点击 "Run" 执行

**方法 2: 使用 CLI**

```bash
# 应用所有迁移
supabase db push

# 或逐个应用
psql $DATABASE_URL -f supabase/migrations/20251109T153239_prisma_to_supabase.sql
```

### 4.4 应用 RLS 策略和索引

```bash
# RLS 策略
psql $DATABASE_URL -f supabase/migrations/002_rls_policies.sql

# 性能索引
psql $DATABASE_URL -f supabase/migrations/003_performance_indexes.sql

# 预算分类列（如果需要）
psql $DATABASE_URL -f supabase/migrations/20251110_add_budget_category_columns.sql
```

### 4.5 应用 RPC 函数

```bash
# 家庭邀请
psql $DATABASE_URL -f supabase/migrations/rpc-functions/001_accept_family_invite.sql

# 预算记账
psql $DATABASE_URL -f supabase/migrations/rpc-functions/002_record_spending_tx.sql

# 库存通知
psql $DATABASE_URL -f supabase/migrations/rpc-functions/003_create_inventory_notifications_batch.sql

# 购物清单更新
psql $DATABASE_URL -f supabase/migrations/rpc-functions/004_update_shopping_list_item_atomic.sql
```

---

## 步骤 5: 验证设置

### 5.1 测试数据库连接

```bash
npm run supabase:test
```

或访问测试端点：
```
http://localhost:3000/api/test-supabase
```

预期响应：
```json
{
  "success": true,
  "message": "Supabase connection successful",
  "details": {
    "url": "https://xyzabc123.supabase.co",
    "tablesCount": 71
  }
}
```

### 5.2 验证表结构

在 Supabase Dashboard 中：
1. 点击 "Table Editor"
2. 检查是否有 71 张表
3. 随机检查几张表的列和类型

### 5.3 测试 RPC 函数

```bash
# 运行 RPC 函数测试
npm test src/__tests__/rpc/accept_family_invite.test.ts
```

### 5.4 验证 RLS 策略

在 SQL Editor 中运行：
```sql
-- 查看所有启用 RLS 的表
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- 应该返回 71 张表
```

---

## 步骤 6: 导入种子数据（可选）

### 6.1 准备种子数据脚本

```bash
# 使用提供的脚本
npm run db:seed
```

或手动创建测试数据：

```sql
-- 创建测试用户
INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
VALUES
  ('test-user-1', 'test@example.com', 'Test User', NOW(), NOW()),
  ('test-user-2', 'demo@example.com', 'Demo User', NOW(), NOW());

-- 创建测试家庭
INSERT INTO "Family" (id, name, "createdAt", "updatedAt")
VALUES ('test-family-1', 'Test Family', NOW(), NOW());

-- 关联用户到家庭
INSERT INTO "FamilyMember" (id, "userId", "familyId", role, "createdAt", "updatedAt")
VALUES
  ('test-member-1', 'test-user-1', 'test-family-1', 'ADMIN', NOW(), NOW()),
  ('test-member-2', 'test-user-2', 'test-family-1', 'MEMBER', NOW(), NOW());
```

---

## 步骤 7: 启用 Supabase（渐进式）

### 7.1 阶段 1: 只读测试

```bash
# .env.local
ENABLE_SUPABASE="true"
ENABLE_DUAL_WRITE="false"
SUPABASE_PRIMARY="false"
```

验证：
- 所有 Repository 可以读取 Supabase 数据
- Prisma 仍然处理所有写入

### 7.2 阶段 2: 双写模式

```bash
ENABLE_SUPABASE="true"
ENABLE_DUAL_WRITE="true"
SUPABASE_PRIMARY="false"
```

验证：
- 写入同时发送到 Prisma 和 Supabase
- 读取仍从 Prisma
- 检查数据一致性

### 7.3 阶段 3: Supabase 为主

```bash
ENABLE_SUPABASE="true"
ENABLE_DUAL_WRITE="true"
SUPABASE_PRIMARY="true"
```

验证：
- 读写都从 Supabase
- Prisma 作为备份
- 性能和稳定性

### 7.4 阶段 4: 完全切换

```bash
ENABLE_SUPABASE="true"
ENABLE_DUAL_WRITE="false"
SUPABASE_PRIMARY="true"
```

最终状态：
- ✅ 仅使用 Supabase
- ✅ Prisma 可以移除

---

## 常见问题

### Q1: 迁移失败，报错 "relation already exists"

**原因**: 表已经存在

**解决**:
1. 删除所有表：`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
2. 重新运行迁移

### Q2: RPC 函数调用返回 "function does not exist"

**原因**: RPC 函数未正确创建

**解决**:
1. 检查函数是否存在：`SELECT proname FROM pg_proc WHERE proname = 'accept_family_invite';`
2. 重新运行 RPC 函数迁移脚本

### Q3: 性能比 Prisma 慢

**原因**: HTTP 请求延迟

**解决**:
1. 启用 Supabase 连接池
2. 实现缓存层（Cloudflare KV）
3. 使用 RPC 函数减少往返次数

### Q4: RLS 策略阻止了合法请求

**原因**: 策略配置错误

**解决**:
1. 临时禁用 RLS：`ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;`
2. 检查策略：`SELECT * FROM pg_policies WHERE tablename = 'User';`
3. 修复策略后重新启用

---

## 安全检查清单

- [ ] Service Role Key 仅在服务端使用
- [ ] 生产环境密钥与开发环境不同
- [ ] RLS 策略在所有表上启用
- [ ] JWT Secret 足够复杂（≥32 字符）
- [ ] 数据库密码使用密码管理器保存
- [ ] `.env.local` 在 `.gitignore` 中
- [ ] 生产环境配置存储在安全的密钥管理服务（如 Vercel/Cloudflare Secrets）

---

## 下一步

完成 Supabase 设置后：

1. ✅ 更新任务状态：`0.1.1 创建 Supabase 项目` ✅
2. 继续 Sprint 1 下一个任务：导入种子数据
3. 开始 RPC 函数开发

---

## 参考资料

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase CLI 指南](https://supabase.com/docs/guides/cli)
- [PostgreSQL RPC 函数](https://supabase.com/docs/guides/database/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
