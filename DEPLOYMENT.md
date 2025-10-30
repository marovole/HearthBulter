# 部署指南：Supabase + Vercel

## 🎯 推荐方案：Supabase + Vercel

这是最佳组合，无需修改代码，完全兼容。

---

## 📋 部署步骤

### 步骤 1: 创建 Supabase 项目

1. 访问 https://supabase.com/dashboard
2. 创建新项目
3. 获取数据库连接字符串：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### 步骤 2: 更新 Prisma Schema

将 `prisma/schema.prisma` 中的 `provider` 从 `sqlite` 改为 `postgresql`：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 步骤 3: 配置环境变量

创建 `.env.production` 或在 Supabase Dashboard 设置：

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"

# USDA API
USDA_API_KEY="your-usda-api-key"

# Redis (可选，推荐使用 Upstash)
REDIS_URL="your-upstash-redis-url"

# Google OAuth (可选)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 步骤 4: 运行数据库迁移

```bash
# 设置 DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 推送到 Supabase
pnpm prisma db push

# 或创建迁移
pnpm prisma migrate dev --name init
pnpm prisma migrate deploy
```

### 步骤 5: 部署到 Vercel

1. 访问 https://vercel.com
2. 导入 GitHub 仓库
3. 在项目设置中添加环境变量
4. 部署自动开始

或在本地使用 CLI：

```bash
npm i -g vercel
vercel
```

---

## 🔄 Cloudflare Pages 部署（可选）

如果你仍想使用 Cloudflare：

### 限制

- ⚠️ 需要将数据库改为 Supabase 或 PlanetScale
- ⚠️ 某些 Node.js API 可能需要调整
- ⚠️ Redis 需要外部服务（Upstash）

### 配置

创建 `wrangler.toml`：

```toml
name = "health-butler"
compatibility_date = "2024-01-01"

[env.production]
vars = { NODE_ENV = "production" }
```

---

## 📊 对比表

| 特性 | Supabase + Vercel | Cloudflare Pages |
|------|-------------------|------------------|
| Next.js 15 支持 | ✅ 完全支持 | ✅ 支持 |
| Prisma 兼容性 | ✅ 完全兼容 | ⚠️ Edge Runtime 限制 |
| PostgreSQL | ✅ 内置 | ❌ 需要外部 |
| 免费额度 | ✅ 充足 | ✅ 充足 |
| 部署难度 | ✅ 简单 | ⚠️ 中等 |
| 性能 | ✅ 优秀 | ✅ 极佳（全球CDN） |

---

## 🚀 快速开始

我已经准备好迁移脚本，需要我帮你：

1. ✅ 更新 Prisma Schema 为 PostgreSQL
2. ✅ 创建迁移脚本
3. ✅ 配置环境变量示例

