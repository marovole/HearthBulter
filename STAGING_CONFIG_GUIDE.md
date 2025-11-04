# 🚀 Staging 环境快速配置指南

## 最小配置（15分钟）

### 1. 数据库配置 (5分钟)

**推荐：Supabase（免费）**

```bash
# 1. 注册并创建项目
https://supabase.com → Start your project

# 2. 获取连接字符串
Project Settings → Database → Connection string → URI

# 格式示例：
DATABASE_URL="postgresql://postgres.[项目ID]:[密码]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
```

### 2. 生成认证密钥 (1分钟)

```bash
# 在终端运行
openssl rand -base64 32

# 输出示例（复制保存）：
# U97nNxOcByJp3BS5IIf+FGbxv5PWRBXd0WFF8YHTRxk=
```

### 3. Vercel 部署 (5分钟)

```bash
# 1. 推送代码到 GitHub
git remote add origin <your-repo-url>
git push -u origin main

# 2. 访问 Vercel
https://vercel.com/new

# 3. Import 您的 GitHub 仓库

# 4. 添加环境变量：
#    Project Settings → Environment Variables → Add
```

**必需变量（3个）：**

| 变量名 | 值 | 获取方式 |
|--------|-----|----------|
| `DATABASE_URL` | postgresql://... | 从 Supabase 复制 |
| `NEXTAUTH_SECRET` | 随机字符串 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | https://your-app.vercel.app | Vercel 自动分配 |

### 4. 运行数据库迁移 (4分钟)

**选项 A：使用 Vercel CLI**
```bash
# 安装 Vercel CLI
npm i -g vercel

# 拉取环境变量
vercel env pull .env.local

# 运行迁移
npx prisma migrate deploy
```

**选项 B：手动运行**
```bash
# 在本地配置 DATABASE_URL（临时）
export DATABASE_URL="<从Vercel复制>"

# 运行迁移
npx prisma migrate deploy
```

---

## 完整配置（30分钟，推荐）

### 额外服务配置

#### Redis 缓存（强烈推荐 - 提升性能 50%+）

**Upstash Redis（免费）**

```bash
# 1. 访问 Upstash
https://console.upstash.com

# 2. 创建新数据库
Name: hearthbutler-staging
Type: Regional
Region: 选择离 Vercel 区域最近的

# 3. 获取配置
REST API → 复制以下两个值：

UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# 4. 添加到 Vercel 环境变量
```

#### 错误监控（强烈推荐 - 快速发现问题）

**Sentry（免费）**

```bash
# 1. 注册 Sentry
https://sentry.io/signup/

# 2. 创建项目
Platform: Next.js
Project name: hearthbutler-staging

# 3. 获取 DSN
Settings → Client Keys (DSN) → 复制

NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
SENTRY_ENVIRONMENT="staging"

# 4. 添加到 Vercel 环境变量
```

#### AI 功能（可选）

**OpenAI API**

```bash
# 1. 获取 API Key
https://platform.openai.com/api-keys

# 2. 创建新密钥
Name: HearthBulter Staging
Permissions: All

# 3. 配置环境变量
OPENAI_API_KEY="sk-..."

# 💡 成本控制：
# - 设置使用限额 $10/月
# - 使用 gpt-3.5-turbo（比 gpt-4 便宜10倍）
```

---

## 部署验证清单

部署完成后，验证以下功能：

### 基础验证 ✅

```bash
# 1. 健康检查
curl https://your-app.vercel.app/api/health

# 预期响应：
# {"status":"healthy","timestamp":"..."}

# 2. 访问首页
# 应该正常显示无错误

# 3. 测试用户注册/登录
# 创建测试账号验证认证流程
```

### 数据库验证 ✅

```bash
# 在 Vercel Terminal 或本地
npx prisma studio

# 检查：
# - 表结构正确
# - 可以创建/读取数据
```

### 性能验证 ✅

```bash
# 检查 Vercel Analytics
Project → Analytics

# 查看：
# - 页面加载时间 < 3s
# - API 响应时间 < 500ms
```

---

## 环境变量完整清单

### 必需（核心功能）

```bash
DATABASE_URL="postgresql://..."           # PostgreSQL 连接
NEXTAUTH_SECRET="<32字符随机字符串>"      # 认证密钥
NEXTAUTH_URL="https://..."                # Staging URL
NEXT_PUBLIC_ALLOWED_ORIGINS="https://..." # CORS 配置
```

### 推荐（性能与监控）

```bash
# Redis 缓存
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# 错误监控
NEXT_PUBLIC_SENTRY_DSN="https://..."
SENTRY_ENVIRONMENT="staging"

# 环境标识
NODE_ENV="staging"
```

### 可选（功能增强）

```bash
# AI 功能
OPENAI_API_KEY="sk-..."
ENABLE_AI_FEATURES="true"

# OAuth 登录
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# 邮件服务
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="..."

# 功能开关
ENABLE_SOCIAL_SHARING="true"
DEBUG_MODE="true"
```

---

## 常见问题

### Q1: 数据库连接失败

```bash
# 检查 DATABASE_URL 格式
# 确保使用 Pooler 连接（包含 .pooler.）
# 正确：postgresql://postgres.[id]:[pass]@...[.pooler].supabase.com...
# 错误：postgresql://postgres.[id]:[pass]@...supabase.com...（缺少pooler）
```

### Q2: NEXTAUTH_SECRET 错误

```bash
# 症状：登录失败或 JWT 错误
# 解决：确保密钥至少 32 字符
openssl rand -base64 32  # 生成新密钥

# 在 Vercel 重新配置环境变量后需要重新部署：
vercel --prod=false
```

### Q3: 页面报 500 错误

```bash
# 1. 查看 Vercel 日志
Project → Deployments → [最新部署] → Function Logs

# 2. 检查 Sentry 错误报告
# 3. 验证环境变量是否正确配置
```

### Q4: 构建失败

```bash
# 常见原因：
# 1. 环境变量缺失 → 检查所有必需变量
# 2. 数据库迁移失败 → 手动运行 prisma migrate deploy
# 3. 类型错误 → 查看构建日志，当前已临时忽略

# 查看构建日志：
Vercel → Deployments → [失败的部署] → Building → 展开日志
```

---

## 部署后操作

### 1. 配置自定义域名（可选）

```bash
# Vercel → Project → Settings → Domains
# 添加：staging.hearthbutler.com
# 配置 DNS CNAME 记录指向 cname.vercel-dns.com
```

### 2. 设置告警通知

```bash
# Sentry 告警规则
Sentry → Alerts → Create Alert Rule
- 错误率 > 1% 立即通知
- 新错误类型立即通知
```

### 3. 性能监控

```bash
# Vercel Analytics
# 自动启用，无需配置

# 检查指标：
# - Real Experience Score (RES)
# - Core Web Vitals
# - 页面加载时间
```

---

## 快速命令参考

```bash
# 本地开发
npm run dev                     # 启动开发服务器
npm run build                   # 生产构建测试

# 数据库
npx prisma generate            # 生成客户端
npx prisma migrate deploy      # 部署迁移
npx prisma studio             # 可视化管理

# Vercel 部署
git push origin main           # 自动触发部署
vercel --prod=false           # 手动部署到预览
vercel logs                   # 查看日志

# 测试
npm test                      # 运行测试
npm run lint                  # 代码检查
```

---

## 支持资源

- 📖 [Vercel 文档](https://vercel.com/docs)
- 📖 [Supabase 文档](https://supabase.com/docs)
- 📖 [Upstash Redis 文档](https://docs.upstash.com/redis)
- 📖 [Next.js 15 文档](https://nextjs.org/docs)
- 📖 [Prisma 文档](https://www.prisma.io/docs)

---

**配置完成时间估计：**
- ⚡ 最小配置：15分钟
- 🚀 推荐配置：30分钟
- 💎 完整配置：45分钟

**当前项目状态：**
- ✅ 代码构建成功
- ✅ 所有导入错误已修复
- ✅ 准备就绪可以部署

🎉 **准备开始配置！**
