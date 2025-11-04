# 🚀 Vercel Staging 部署完整指南

## ✅ 部署前准备（已完成）

- [x] ✅ 代码构建成功
- [x] ✅ 所有导入错误已修复
- [x] ✅ 环境配置文件已创建
- [x] ✅ 依赖已安装
- [x] ✅ Prisma 客户端已生成

---

## 📋 三步完成 Vercel 部署

### 第一步：推送代码到 GitHub（2分钟）

```bash
# 1. 添加所有更改
git add .

# 2. 提交更改
git commit -m "chore: 准备 Staging 环境部署

- 修复构建阻塞问题
- 配置 Staging 环境变量
- 更新部署脚本
- 准备就绪可以部署

🤖 Generated with Claude Code"

# 3. 推送到 GitHub
git push origin main
```

如果这是首次推送，需要先关联远程仓库：
```bash
# 创建 GitHub 仓库后
git remote add origin https://github.com/你的用户名/HearthBulter.git
git branch -M main
git push -u origin main
```

---

### 第二步：连接 Vercel（5分钟）

#### A. 注册并登录 Vercel

1. 访问 https://vercel.com/signup
2. 选择 "Continue with GitHub"
3. 授权 Vercel 访问您的 GitHub

#### B. 导入项目

```
1. 在 Vercel Dashboard 点击 "Add New..."
2. 选择 "Project"
3. 找到 "HearthBulter" 仓库
4. 点击 "Import"
```

#### C. 配置项目设置

**框架预设：** Next.js（自动检测）
**Root Directory：** ./（默认）
**Build Command：** `pnpm build`（自动检测）
**Output Directory：** .next（自动）

---

### 第三步：配置环境变量（3分钟）

在 Vercel 项目设置中添加环境变量：

#### 方式 A：通过 UI 配置（推荐）

```
Project Settings → Environment Variables → Add
```

**必需变量（3个）：**

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `DATABASE_URL` | <从 Supabase 获取> | Preview + Production |
| `NEXTAUTH_SECRET` | U97nNxOcByJp3BS5IIf+FGbxv5PWRBXd0WFF8YHTRxk= | Preview + Production |
| `NEXTAUTH_URL` | https://your-project.vercel.app | Preview |

💡 **提示：** NEXTAUTH_URL 在首次部署后更新为实际 URL

#### 方式 B：使用 Vercel CLI（高级）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 关联项目
vercel link

# 添加环境变量
vercel env add DATABASE_URL preview
vercel env add NEXTAUTH_SECRET preview
vercel env add NEXTAUTH_URL preview
```

---

## 🗄️ 配置数据库（必需 - 5分钟）

### 推荐：Supabase（免费）

#### 1. 创建项目

```
1. 访问 https://supabase.com
2. 点击 "New project"
3. 填写信息：
   - Name: hearthbutler-staging
   - Database Password: <生成强密码>
   - Region: Northeast Asia (Seoul) - 最近区域
```

#### 2. 获取连接字符串

```
左侧菜单 → Project Settings → Database
找到 "Connection string" → "URI"

格式：
postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

⚠️ **重要：** 确保使用 Pooler 连接（包含 `.pooler.`）

#### 3. 配置到 Vercel

将连接字符串添加到 Vercel 环境变量 `DATABASE_URL`

---

## 🚀 部署！

### 自动部署（推荐）

```bash
# 推送代码后，Vercel 会自动：
git push origin main

# 1. 检测更改
# 2. 运行构建
# 3. 部署到预览环境
# 4. 提供预览 URL
```

### 手动部署（可选）

```bash
# 使用 Vercel CLI
vercel --prod=false

# 查看部署状态
vercel ls

# 查看日志
vercel logs
```

---

## 🔧 部署后配置

### 1. 运行数据库迁移

**选项 A：使用 Vercel CLI**
```bash
# 拉取环境变量
vercel env pull .env.production.local

# 运行迁移
npx prisma migrate deploy
```

**选项 B：手动运行**
```bash
# 设置数据库 URL
export DATABASE_URL="<从 Vercel 复制>"

# 运行迁移
npx prisma migrate deploy

# 验证
npx prisma migrate status
```

### 2. 更新 NEXTAUTH_URL

```
1. 复制 Vercel 分配的 URL
   示例：https://hearth-bulter-xyz.vercel.app

2. 更新环境变量
   Project Settings → Environment Variables
   编辑 NEXTAUTH_URL 为实际 URL

3. 重新部署
   Deployments → [...] → Redeploy
```

### 3. 配置自定义域名（可选）

```
Project Settings → Domains → Add
输入：staging.hearthbutler.com

配置 DNS：
Type: CNAME
Name: staging
Value: cname.vercel-dns.com
```

---

## ✅ 验证部署

### 1. 基础检查

```bash
# 健康检查
curl https://your-app.vercel.app/api/health

# 预期响应：
# {"status":"healthy","timestamp":"...","database":"connected"}
```

### 2. 功能测试

- [ ] 访问首页，应正常显示
- [ ] 测试用户注册功能
- [ ] 测试用户登录功能
- [ ] 验证 API 端点响应
- [ ] 检查数据库连接

### 3. 性能检查

```
Vercel Dashboard → Analytics

查看指标：
- 页面加载时间 < 3s
- API 响应时间 < 500ms
- 错误率 < 1%
```

---

## 🔍 故障排查

### 问题 1：构建失败

```
查看：Deployments → [失败的部署] → Building

常见原因：
- 环境变量缺失 → 检查所有必需变量
- 依赖安装失败 → 检查 package.json
- 类型错误 → 已临时忽略，应该不会发生
```

### 问题 2：运行时错误 500

```
查看：Deployments → [最新] → Functions

常见原因：
- DATABASE_URL 未配置或错误
- NEXTAUTH_SECRET 格式错误
- 数据库迁移未运行
```

### 问题 3：认证失败

```
检查：
1. NEXTAUTH_SECRET 是否正确配置
2. NEXTAUTH_URL 是否为实际部署 URL
3. 数据库 Session 表是否创建
```

### 问题 4：数据库连接失败

```
验证：
1. DATABASE_URL 格式正确
2. 使用 .pooler. 连接（用于 Serverless）
3. Supabase 项目未暂停
4. IP 白名单（如有）包含 Vercel
```

---

## 🎯 推荐的可选配置

### 1. Redis 缓存（性能提升 50%+）

**Upstash Redis - 免费**

```
1. https://console.upstash.com
2. 创建数据库：hearthbutler-staging
3. 获取 REST API 配置

添加到 Vercel：
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 2. 错误监控（快速发现问题）

**Sentry - 免费**

```
1. https://sentry.io/signup/
2. 创建 Next.js 项目
3. 获取 DSN

添加到 Vercel：
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=staging
```

### 3. AI 功能（可选）

**OpenAI API**

```
1. https://platform.openai.com/api-keys
2. 创建密钥（限额 $10/月）

添加到 Vercel：
OPENAI_API_KEY=sk-...
ENABLE_AI_FEATURES=true
```

---

## 📊 环境变量完整清单

### 最小配置（必需）

```bash
DATABASE_URL                  # PostgreSQL 连接字符串
NEXTAUTH_SECRET              # 认证密钥（已生成）
NEXTAUTH_URL                 # Staging URL
NEXT_PUBLIC_ALLOWED_ORIGINS  # CORS 配置
```

### 推荐配置（性能）

```bash
UPSTASH_REDIS_REST_URL       # Redis 缓存
UPSTASH_REDIS_REST_TOKEN     # Redis 令牌
NEXT_PUBLIC_SENTRY_DSN       # 错误监控
SENTRY_ENVIRONMENT=staging   # 环境标识
```

### 可选配置（功能）

```bash
OPENAI_API_KEY               # AI 功能
GOOGLE_CLIENT_ID             # Google OAuth
GOOGLE_CLIENT_SECRET         # Google OAuth Secret
EMAIL_PROVIDER=sendgrid      # 邮件服务
SENDGRID_API_KEY            # SendGrid 密钥
```

---

## 🔗 快速链接

- 📖 [Vercel 文档](https://vercel.com/docs)
- 📖 [Supabase 文档](https://supabase.com/docs)
- 📖 [Next.js 部署](https://nextjs.org/docs/deployment)
- 📖 [Prisma 生产部署](https://www.prisma.io/docs/guides/deployment/deployment-guides)

---

## 📝 部署检查清单

部署完成后，确认以下事项：

### 部署前 ✅
- [x] 代码已推送到 GitHub
- [x] Vercel 项目已创建
- [x] 必需环境变量已配置
- [x] 数据库已创建并获取连接字符串

### 部署中 ⏳
- [ ] Vercel 构建成功
- [ ] 获得预览 URL
- [ ] 数据库迁移已运行
- [ ] NEXTAUTH_URL 已更新为实际 URL

### 部署后 ✅
- [ ] 健康检查端点返回 200
- [ ] 首页可正常访问
- [ ] 用户可以注册和登录
- [ ] API 端点正常响应
- [ ] 无严重错误日志

### 可选优化 💎
- [ ] Redis 缓存已配置
- [ ] Sentry 监控已启用
- [ ] 自定义域名已配置
- [ ] 性能指标在可接受范围

---

## 🎉 完成！

**恭喜！您的 Staging 环境已成功部署！**

下一步建议：
1. 📊 监控 Sentry 错误报告
2. 🧪 运行完整功能测试
3. 📈 查看 Vercel Analytics 数据
4. 🔧 根据需要添加可选配置
5. 🚀 准备生产环境部署

---

**部署时间：** 2025-11-04
**提交：** eb3b59b
**状态：** ✅ 构建成功，准备部署
