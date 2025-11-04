# 🐘 Neon PostgreSQL 数据库配置指南

## 为什么选择 Neon？

✅ **免费额度充足**：500MB 存储，无项目数量限制
✅ **Serverless 架构**：自动扩缩容，按需付费
✅ **Vercel 原生集成**：一键连接，无需手动配置
✅ **性能优秀**：全球 CDN，低延迟连接

---

## 🚀 方式 A：通过 Vercel 集成（最简单 - 3分钟）

### 1. 在 Vercel 中添加 Neon 集成

```
1. 访问您的 Vercel 项目
2. 点击 "Integrations" 标签
3. 搜索 "Neon"
4. 点击 "Add Integration"
5. 选择您的项目 "HearthBulter"
6. 点击 "Continue" → "Add Integration"
```

### 2. 创建数据库

集成后会自动：
- ✅ 创建 Neon 数据库
- ✅ 配置 DATABASE_URL 到 Vercel 环境变量
- ✅ 设置连接池

**无需手动操作！**

---

## 🛠️ 方式 B：手动配置（完全控制 - 5分钟）

### 1. 注册 Neon 账号

访问：https://console.neon.tech/signup

选择：
- **Sign up with GitHub**（推荐，一键注册）
- 或使用邮箱注册

### 2. 创建新项目

```
1. 点击 "Create a project"
2. 填写信息：
   - Project name: hearthbutler-staging
   - PostgreSQL version: 16（最新稳定版）
   - Region: Singapore（离您最近）
   - Compute size: 0.25 vCPU（免费额度）

3. 点击 "Create project"
```

### 3. 获取连接字符串

项目创建后，您会看到：

```bash
Connection Details
------------------
Database: neondb
Host: ep-xxx-xxx.ap-southeast-1.aws.neon.tech
User: your-username

Connection string (Pooled):
postgresql://your-username:your-password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**重要**：复制 **Pooled connection string**（用于 Serverless 环境）

### 4. 添加到 Vercel 环境变量

```
1. 进入 Vercel 项目 → Settings → Environment Variables
2. 添加新变量：
   - Name: DATABASE_URL
   - Value: postgresql://your-username:your-password@...（粘贴上面复制的）
   - Environment: Preview + Production
3. 点击 "Save"
```

---

## ✅ 验证连接

### 方式 1：使用 Vercel CLI

```bash
# 拉取环境变量
vercel env pull .env.local

# 测试连接
npx prisma db push
```

### 方式 2：在本地测试

```bash
# 临时设置环境变量
export DATABASE_URL="postgresql://your-username:your-password@..."

# 运行迁移
npx prisma migrate deploy

# 验证成功
npx prisma studio
```

---

## 🔧 数据库迁移

连接成功后，运行迁移创建表结构：

```bash
# 确保 DATABASE_URL 已设置
npx prisma migrate deploy

# 检查迁移状态
npx prisma migrate status

# 预期输出：
# ✓ All migrations have been applied successfully
```

---

## 📊 Neon vs Supabase 对比

| 特性 | Neon | Supabase |
|------|------|----------|
| 免费项目数 | **无限制** | 2 个 |
| 存储空间 | 500MB | 500MB |
| 数据传输 | 5GB/月 | 2GB/月 |
| Serverless | ✅ 原生支持 | ⚠️ 需要 Pooler |
| Vercel 集成 | ✅ 一键集成 | ✅ 支持 |
| 管理界面 | 简洁快速 | 功能更丰富 |

**结论**：Neon 更适合 Serverless 部署，Supabase 提供更多后端服务（认证、存储等）

---

## 🎯 推荐配置

### 连接字符串格式

```bash
# ✅ 推荐：使用 Pooled connection（Serverless 必需）
DATABASE_URL="postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require"

# ❌ 不推荐：Direct connection（不适合 Serverless）
# postgresql://user:pass@ep-xxx.aws.neon.tech:5432/neondb
```

### Prisma 配置优化

确保 `prisma/schema.prisma` 包含：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Neon 优化配置
  directUrl = env("DIRECT_DATABASE_URL") // 可选，用于迁移
}
```

---

## 🔍 常见问题

### Q1: 连接超时怎么办？

```bash
# 症状：prisma migrate deploy 超时
# 解决：确保使用 Pooled connection string
# 检查：URL 中应该包含连接池参数
```

### Q2: SSL 错误？

```bash
# 症状：SSL connection error
# 解决：在连接字符串末尾添加 ?sslmode=require
DATABASE_URL="postgresql://...?sslmode=require"
```

### Q3: 如何查看数据库？

```
方式 1：Neon Console
- 访问 https://console.neon.tech
- 进入项目 → SQL Editor
- 运行查询查看数据

方式 2：Prisma Studio
- 本地运行：npx prisma studio
- 浏览器打开 http://localhost:5555
```

### Q4: 免费额度够用吗？

```
Staging 环境完全够用：
✅ 存储：500MB（中小型应用足够）
✅ 计算：0.25 vCPU（测试环境足够）
✅ 传输：5GB/月（一般不会超）

生产环境建议：
- 升级到 Pro Plan（$19/月）
- 或继续使用 Neon 免费版 + CDN 缓存
```

---

## 📋 快速操作检查清单

部署前确认：

- [ ] Neon 项目已创建
- [ ] 获得 Pooled connection string
- [ ] DATABASE_URL 已添加到 Vercel
- [ ] 连接字符串包含 `?sslmode=require`
- [ ] 已运行 `npx prisma migrate deploy`
- [ ] 数据库表已成功创建
- [ ] 可以通过 Prisma Studio 查看数据

---

## 🔗 有用的链接

- 📖 [Neon 文档](https://neon.tech/docs)
- 📖 [Vercel + Neon 集成](https://vercel.com/integrations/neon)
- 📖 [Prisma + Neon 指南](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-neon)
- 🆘 [Neon Discord 社区](https://discord.gg/neon)

---

## ⏱️ 预计完成时间

| 方式 | 时间 |
|------|------|
| **方式 A（Vercel 集成）** | **3分钟** ⭐ 推荐 |
| 方式 B（手动配置） | 5分钟 |

---

## 🎉 下一步

数据库配置完成后：

1. ✅ 触发 Vercel 重新部署
2. ✅ 验证健康检查：`/api/health`
3. ✅ 测试用户注册登录
4. ✅ 查看 Neon Console 确认数据写入

---

**创建时间**：2025-11-04
**状态**：✅ 准备配置
**推荐方式**：方式 A（Vercel 集成）
