# 🚀 快速部署参考卡片

## 当前状态：✅ 代码已推送到 GitHub

```
仓库地址：https://github.com/marovole/HearthBulter
最新提交：f60fcec - 添加 Staging 环境部署配置
```

---

## 📝 Vercel 环境变量（复制粘贴）

### 必需变量

```bash
# 1. NEXTAUTH_SECRET
U97nNxOcByJp3BS5IIf+FGbxv5PWRBXd0WFF8YHTRxk=

# 2. DATABASE_URL
（从 Supabase 获取后填入）

# 3. NEXTAUTH_URL
（部署后 Vercel 会提供，可先留空）
```

---

## 🔗 快速链接

| 服务 | 链接 | 用途 |
|------|------|------|
| **Vercel 新建项目** | https://vercel.com/new | 部署平台 |
| **Neon 数据库** ⭐ | https://console.neon.tech/signup | PostgreSQL 数据库（推荐）|
| **Vercel Neon 集成** | https://vercel.com/integrations/neon | 一键集成数据库 |
| **GitHub 仓库** | https://github.com/marovole/HearthBulter | 代码仓库 |

---

## 📋 配置步骤清单

### Step 1: Vercel 配置（5分钟）
- [ ] 访问 https://vercel.com/new
- [ ] 使用 GitHub 登录
- [ ] 搜索并导入 "HearthBulter" 项目
- [ ] 确认框架预设为 Next.js

### Step 2: 添加环境变量
- [ ] NEXTAUTH_SECRET: `U97nNxOcByJp3BS5IIf+FGbxv5PWRBXd0WFF8YHTRxk=`
- [ ] DATABASE_URL: （下一步通过 Neon 集成自动配置）
- [ ] NEXTAUTH_URL: （暂时留空）

### Step 3: Neon 数据库（3分钟）⭐ 推荐
- [ ] **方式 A（最简单）**：Vercel → Integrations → 搜索 "Neon" → Add Integration
  - 自动创建数据库并配置 DATABASE_URL
  - **无需手动操作！**

- [ ] **方式 B（手动）**：访问 https://console.neon.tech/signup
  - 创建项目："hearthbutler-staging"
  - 选择区域：Singapore（最近区域）
  - 复制 Pooled Connection String
  - 回到 Vercel 填入 DATABASE_URL

### Step 4: 部署
- [ ] 在 Vercel 点击 "Deploy"
- [ ] 等待构建完成（约5分钟）
- [ ] 获取部署 URL
- [ ] 更新 NEXTAUTH_URL 为实际 URL

### Step 5: 数据库迁移
- [ ] 运行：`npx prisma migrate deploy`
- [ ] 验证数据库表已创建

### Step 6: 验证
- [ ] 访问：`https://your-app.vercel.app/api/health`
- [ ] 测试用户注册功能
- [ ] 测试用户登录功能

---

## 💾 Supabase 数据库配置详情

### 项目设置
```
Project Name: hearthbutler-staging
Organization: <您的组织>
Region: Northeast Asia (Seoul) - ap-northeast-1
```

### 获取连接字符串
```
1. 左侧菜单 → Project Settings (⚙️)
2. Database 标签
3. Connection string → URI
4. 选择 "Transaction" 模式 - Pooler
5. 复制完整字符串

格式示例：
postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

⚠️ **重要：** 确保使用 Pooler 连接（URL 中包含 `.pooler.`）

---

## 🔐 安全提示

- ✅ NEXTAUTH_SECRET 已安全生成（32字符）
- ✅ .env.staging 已排除在 Git 之外
- ⚠️ 不要在公开场合分享 DATABASE_URL
- ⚠️ 定期更换 Supabase 数据库密码

---

## ⏱️ 预计时间

| 步骤 | 时间 |
|------|------|
| Vercel 配置 | 3分钟 |
| Supabase 设置 | 5分钟 |
| 首次部署 | 5分钟 |
| 数据库迁移 | 2分钟 |
| **总计** | **15分钟** |

---

## 🆘 常见问题

### Q: 部署失败怎么办？
查看 Vercel 部署日志：
1. Deployments → [失败的部署]
2. Building → 展开日志
3. 查找错误信息

### Q: DATABASE_URL 格式是什么？
```
postgresql://user:password@host:port/database

示例：
postgresql://postgres.abc123:mypassword@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

### Q: 如何运行数据库迁移？
```bash
# 方式1：使用 Vercel CLI
npm i -g vercel
vercel env pull .env.local
npx prisma migrate deploy

# 方式2：手动设置
export DATABASE_URL="<从Vercel复制>"
npx prisma migrate deploy
```

---

## 📞 获取帮助

遇到问题？告诉我：
- 哪一步卡住了
- 错误信息是什么
- 截图（如果有的话）

我会立即帮您解决！

---

**创建时间：** 2025-11-04
**版本：** v1.0
**状态：** ✅ 准备部署
