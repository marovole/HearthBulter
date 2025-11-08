# 🚀 快速开始：Cloudflare + Supabase 混合架构

本指南帮助你快速开始使用 Cloudflare Pages + Supabase 混合架构部署 Health Butler。

## ⚡ 5 分钟快速部署

### 1️⃣ 创建 Supabase 项目（2 分钟）

```bash
# 访问 https://supabase.com/dashboard
# 点击 "New Project"
# 填写项目信息：
#   - Name: health-butler
#   - Database Password: (强密码)
#   - Region: 选择最近的地区

# 等待项目创建完成，然后获取：
# Settings > API
#   - URL: https://xxxxx.supabase.co
#   - anon public: eyJxxx... (公钥)
#   - service_role: eyJxxx... (私钥，保密)
```

### 2️⃣ 初始化数据库（1 分钟）

```bash
# 在本地项目中
cd /path/to/HearthBulter

# 生成 Supabase Schema
npx tsx scripts/generate-supabase-schema.ts

# 在 Supabase Dashboard 中
# 1. 打开 SQL Editor
# 2. 复制 supabase/migrations/xxx_prisma_to_supabase.sql 的内容
# 3. 点击 "Run" 执行

# 或使用 CLI
supabase db push
```

### 3️⃣ 配置环境变量（30 秒）

```bash
# 复制示例配置
cp .env.cloudflare .env.local

# 编辑 .env.local，填入你的 Supabase 凭据
vim .env.local

# 必填项
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...
```

### 4️⃣ 部署到 Cloudflare（1.5 分钟）

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 构建项目
BUILD_TARGET=cloudflare pnpm build

# 部署
wrangler pages deploy .next --project-name=hearthbutler

# 完成！访问提供的 URL
# https://xxx.pages.dev
```

---

## 📝 详细步骤

### 前置要求

- ✅ Node.js 20+
- ✅ pnpm 8+
- ✅ Git
- ✅ Supabase 账户
- ✅ Cloudflare 账户

### 完整配置

#### 1. 环境变量完整列表

```bash
# ========== Supabase 配置 ==========
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...

# ========== Cloudflare 配置 ==========
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# ========== 应用配置 ==========
NEXT_PUBLIC_SITE_URL=https://hearthbutler.pages.dev
BUILD_TARGET=cloudflare
NODE_ENV=production

# ========== 第三方 API ==========
OPENAI_API_KEY=sk-xxx
OPENROUTER_API_KEY=xxx
USDA_API_KEY=xxx

# ========== 可选配置 ==========
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 2. 数据迁移（如果有现有数据）

```bash
# 设置原数据库连接
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# 运行迁移脚本
npx tsx scripts/migrate-data-to-supabase.ts

# 查看迁移报告
# 成功迁移的表和记录数会显示在控制台
```

#### 3. 配置 Cloudflare Pages

```bash
# 在 Cloudflare Dashboard 中
# 1. Pages > Create a project
# 2. Connect to Git (连接你的 GitHub/GitLab)
# 3. 选择 HearthBulter 仓库
# 4. 配置构建设置：
#    - Build command: pnpm build
#    - Build output directory: .next
#    - Root directory: (留空)
#    - Environment variables: (添加上面的环境变量)
# 5. Save and Deploy
```

#### 4. 自定义域名

```bash
# 在 Cloudflare Pages 中
# Custom domains > Add a custom domain
# 输入: health-butler.com
# 
# 在域名 DNS 设置中添加 CNAME 记录：
# Name: @
# Target: hearthbutler.pages.dev
# Proxy: Enabled (橙色云朵)
```

---

## 🔧 开发工作流

### 本地开发

```bash
# 启动开发服务器（使用 Supabase）
pnpm dev

# 访问 http://localhost:3000
```

### 预览部署

```bash
# 提交到 Git
git add .
git commit -m "Update feature"
git push

# Cloudflare 会自动构建预览环境
# 访问 https://xxx.hearthbutler.pages.dev
```

### 生产部署

```bash
# 合并到主分支
git checkout main
git merge develop
git push

# Cloudflare 会自动部署到生产环境
# 访问 https://hearthbutler.pages.dev
# 或你的自定义域名
```

---

## 📊 当前架构（纯 Cloudflare + Supabase）

```
Cloudflare Pages (前端 + 静态资源)
├── Next.js Static Export
├── Cloudflare Functions (无服务器 API)
└── 全球 CDN 边缘节点

Supabase (后端服务)
├── PostgreSQL (71 张表)
├── Storage (文件存储)
├── Auth (认证服务)
└── Realtime (实时数据)

第三方服务
├── OpenAI GPT-4 (AI 营养建议)
├── USDA API (营养数据库)
└── OCR 服务 (体检报告识别)
```

**成本**: 约 $0-25/月（免费额度通常足够）

---

## 🎯 关键优势

### 性能提升

- ⚡ **全球 CDN**: Cloudflare 在 275+ 个城市有节点
- 🚀 **边缘计算**: API 在用户附近执行
- 💾 **智能缓存**: 自动缓存静态资源
- 📊 **实时数据**: Supabase Realtime 订阅

### 成本降低

- 💰 **免费额度**: Cloudflare 100k 请求/天免费
- 💸 **Supabase 免费层**: 500MB 数据库 + 1GB 存储
- 📉 **无服务器**: 按需付费，无最低费用

### 开发体验

- 🔄 **自动部署**: Git push 自动触发
- 🔍 **预览环境**: 每个 PR 都有独立环境
- 📈 **内置分析**: Cloudflare Analytics 免费
- 🛡️ **DDoS 防护**: Cloudflare 自带防护

---

## 🔍 故障排查

### 问题 1: 构建失败

```bash
# 检查环境变量
wrangler pages deployment list

# 查看构建日志
# Cloudflare Dashboard > Pages > 项目 > Deployments > 点击失败的部署
```

### 问题 2: API 404

```bash
# 确保 API 已迁移到 functions/ 目录
ls -la functions/api/v1/

# 检查路由命名
# functions/api/v1/dashboard/overview.ts
# 对应 URL: /api/v1/dashboard/overview
```

### 问题 3: 数据库连接失败

```bash
# 测试 Supabase 连接
npx tsx scripts/test-supabase-connection.js

# 检查 RLS 策略
# 在 Supabase Dashboard > Authentication > Policies
```

### 问题 4: 认证失败

```bash
# 检查 JWT 密钥配置
# Supabase Dashboard > Settings > API

# 验证认证配置
npx tsx -e "
import { checkAuthConfiguration } from './src/lib/auth-supabase';
console.log(checkAuthConfiguration());
"
```

---

## 📚 学习资源

### 官方文档

- [Supabase 文档](https://supabase.com/docs)
- [Cloudflare Pages](https://developers.cloudflare.com/pages)
- [Next.js 静态导出](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

### 视频教程

- [Supabase 速成课程](https://www.youtube.com/watch?v=zBZgdTb-dns)
- [Cloudflare Pages 入门](https://www.youtube.com/watch?v=NG4UTvXsYLU)

### 社区支持

- [Supabase Discord](https://discord.supabase.com)
- [Cloudflare Discord](https://discord.gg/cloudflaredev)

---

## ✅ 部署检查清单

部署前确认：

- [ ] Supabase 项目已创建
- [ ] 数据库 Schema 已应用
- [ ] RLS 策略已配置
- [ ] 环境变量已设置
- [ ] 本地测试通过
- [ ] 构建成功（无错误）
- [ ] API 路由已迁移
- [ ] 认证流程正常
- [ ] 自定义域名已配置（可选）
- [ ] SSL 证书已生成（自动）

部署后验证：

- [ ] 首页加载正常
- [ ] 用户注册/登录功能
- [ ] 仪表盘数据显示
- [ ] API 响应时间 < 500ms
- [ ] 移动端显示正常
- [ ] 跨浏览器兼容性

---

## 🆘 获取帮助

遇到问题？

1. 查看 [完整迁移指南](./CLOUDFLARE_SUPABASE_MIGRATION_GUIDE.md)
2. 检查 [故障排查章节](#故障排查)
3. 提交 GitHub Issue
4. 联系技术支持

---

## 🎉 部署成功！

恭喜！你已成功部署 Health Butler 到 Cloudflare Pages + Supabase。

**下一步**:

1. 配置自定义域名
2. 设置监控和告警
3. 优化性能（CDN 缓存）
4. 配置备份策略
5. 邀请用户测试

享受你的新架构带来的性能提升和成本降低！ 🚀
