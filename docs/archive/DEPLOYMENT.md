# 🚀 HearthBulter 部署指南

**部署平台**: Cloudflare Pages  
**数据库**: Supabase PostgreSQL (免费 500MB)  
**架构**: JAMstack + Serverless Functions

---

## 📋 快速开始

### 前提条件

- ✅ Cloudflare 账号 (免费)
- ✅ Supabase 项目已创建 (参考 `SUPABASE_MIGRATION_SUCCESS.md`)
- ✅ GitHub 仓库已推送

### 一键部署

1. **访问 Cloudflare Pages**  
   https://dash.cloudflare.com/pages

2. **连接 GitHub 仓库**
   - 点击 "Create a project"
   - 选择 "Connect to Git"
   - 授权并选择 `HearthBulter` 仓库

3. **配置构建**

   ```
   项目名称: hearthbulter
   生产分支: main
   构建命令: pnpm build:cloudflare
   构建输出目录: .open-next
   ```

4. **添加环境变量**  
   参考下方 [环境变量配置](#环境变量配置) 章节

5. **部署**  
   点击 "Save and Deploy"

---

## ⚙️ 环境变量配置

### 必需变量

在 Cloudflare Pages → 项目设置 → Environment variables 中添加：

#### Supabase 数据库

```env
# 数据库连接 (Transaction Pooler - 端口 6543)
DATABASE_URL=postgresql://postgres.ppmliptjvzurewsiwswb:gNXLh3QTXVAX58yy@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

# Supabase API
NEXT_PUBLIC_SUPABASE_URL=https://ppmliptjvzurewsiwswb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=<REDACTED>
```

#### NextAuth 认证

```env
# 生成密钥: openssl rand -base64 32
NEXTAUTH_SECRET=<REDACTED>-generated-secret-here
NEXTAUTH_URL=https://hearthbulter.pages.dev
```

#### 应用配置

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://hearthbulter.pages.dev
NEXT_PUBLIC_ALLOWED_ORIGINS=https://hearthbulter.pages.dev
```

### 可选变量

```env
# Redis 缓存 (Upstash)
UPSTASH_REDIS_REST_URL=https://teaching-eagle-34132.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# USDA 营养数据 API
USDA_API_KEY=<REDACTED>

# OpenAI API
OPENAI_API_KEY=<REDACTED>

# OpenRouter API (Claude)
OPENROUTER_API_KEY=<REDACTED>
```

**环境选择**:

- Production ✅
- Preview ✅ (推荐，用于测试)

---

## 📦 构建配置

### package.json 脚本

```json
{
  "scripts": {
    "build:cloudflare": "prisma generate && next build && npx @opennextjs/cloudflare build",
    "deploy": "pnpm cloudflare:deploy",
    "deploy:prod": "pnpm cloudflare:deploy production"
  }
}
```

### wrangler.toml

Cloudflare Workers 配置已包含在 `wrangler.toml` 文件中。

---

## 🗄️ Supabase 配置

### 1. 数据库 Schema

数据库已包含 71 张表，已通过 `pnpm db:push` 应用。

### 2. Storage 配置

创建 Storage Bucket 用于文件存储：

1. 访问 Supabase Dashboard → Storage
2. 创建新 Bucket: `medical-reports`
3. 配置访问策略:

   ```sql
   -- 允许认证用户上传
   CREATE POLICY "Users can upload own files"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

   -- 允许认证用户读取自己的文件
   CREATE POLICY "Users can read own files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

---

## 🔄 自动部署

### GitHub 集成

Cloudflare Pages 已自动配置 GitHub 集成：

- ✅ 推送到 `main` 分支 → 自动部署到生产
- ✅ 创建 Pull Request → 自动创建预览部署
- ✅ 推送到其他分支 → 创建预览部署

### 手动部署

```bash
# 方式 1: 使用 Wrangler CLI
npm i -g wrangler
wrangler pages deploy .open-next --project-name=hearthbulter

# 方式 2: 使用项目脚本
pnpm deploy
pnpm deploy:prod
```

---

## 🧪 部署验证

### 健康检查

访问: `https://hearthbulter.pages.dev/api/health`

预期响应:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-11-08T..."
}
```

### 功能测试

- [ ] 首页加载
- [ ] 用户注册
- [ ] 用户登录
- [ ] Dashboard 访问
- [ ] 数据库读写

---

## 📊 监控和日志

### Cloudflare Dashboard

1. 访问: https://dash.cloudflare.com
2. 选择项目 → HearthBulter
3. 查看:
   - **Analytics**: 流量统计
   - **Functions logs**: 函数日志
   - **Build logs**: 构建日志

### Supabase Dashboard

1. 访问: https://supabase.com/dashboard/project/ppmliptjvzurewsiwswb
2. 查看:
   - **Logs**: 数据库查询日志
   - **Performance**: 性能指标
   - **API**: API 使用情况

---

## 🔧 故障排除

### 问题 1: 构建失败

**检查**:

- `pnpm build:cloudflare` 本地是否成功
- Cloudflare Pages 构建日志
- 环境变量是否正确配置

**解决**:

```bash
# 本地测试构建
pnpm build:cloudflare

# 检查输出目录
ls -la .open-next
```

### 问题 2: 数据库连接失败

**检查**:

- `DATABASE_URL` 使用 Transaction Pooler (端口 6543)
- Supabase 项目状态正常
- 密码是否正确

**解决**:

```bash
# 测试连接
pnpm supabase:test
```

### 问题 3: 文件上传失败

**检查**:

- Supabase Storage Bucket `medical-reports` 已创建
- RLS 策略已配置
- `SUPABASE_SERVICE_KEY` 已设置

---

## 🚀 性能优化

### 已启用的优化

✅ Cloudflare CDN 全球加速  
✅ Prisma 连接池 (Transaction Pooler)  
✅ Next.js 静态优化  
✅ 图片自动优化 (WebP/AVIF)  
✅ Gzip/Brotli 压缩

### 推荐的额外优化

```env
# 启用 Redis 缓存
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 🔒 安全建议

### 已实施

✅ 环境变量加密存储  
✅ HTTPS 强制启用  
✅ CORS 配置  
✅ CSP 策略

### 推荐配置

1. **启用 Supabase RLS**

   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ```

2. **配置 IP 白名单** (可选)
   在 Cloudflare Pages → Settings → Security

3. **启用 WAF** (Web Application Firewall)
   Cloudflare Dashboard → Security → WAF

---

## 📖 相关文档

- **Supabase 配置**: `SUPABASE_MIGRATION_SUCCESS.md`
- **快速开始**: `QUICK_START_CLOUDFLARE_SUPABASE.md`
- **架构说明**: `README_CLOUDFLARE_SUPABASE.md`
- **环境变量**: `.env.production.example`

---

## ✅ 部署检查清单

部署前:

- [ ] Supabase 项目已创建并配置
- [ ] 数据库 Schema 已应用 (71 张表)
- [ ] Storage Bucket 已创建
- [ ] 环境变量已准备

部署后:

- [ ] 应用可访问
- [ ] 健康检查通过
- [ ] 用户可注册登录
- [ ] 数据库连接正常
- [ ] 文件上传功能正常

---

## 🎉 完成

您的 **HearthBulter 健康管家** 应用现已部署到 Cloudflare Pages！

**应用 URL**: https://hearthbulter.pages.dev  
**数据库**: Supabase PostgreSQL  
**总成本**: 🎁 完全免费！

**需要帮助？**

- Cloudflare 文档: https://developers.cloudflare.com/pages
- Supabase 文档: https://supabase.com/docs
- 项目 Issues: https://github.com/marovole/HearthBulter/issues
