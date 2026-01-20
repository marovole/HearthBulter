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

### Redis 连接失败

确保同时设置了 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`。
