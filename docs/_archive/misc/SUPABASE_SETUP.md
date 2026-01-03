# Supabase 项目配置信息

## ✅ 项目已创建成功

**项目名称**: health-butler  
**项目ID**: rnzkgukzkxgjtyidgafl  
**区域**: ap-southeast-1 (新加坡)  
**状态**: ACTIVE_HEALTHY  
**数据库版本**: PostgreSQL 17.6.1

---

## 🔗 连接信息

**Supabase URL**: `https://rnzkgukzkxgjtyidgafl.supabase.co`

**Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuemtndWt6a3hnanR5aWRnYWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTM3OTMsImV4cCI6MjA3NzM2OTc5M30.cBflYsdsBPY6IwnYA3byp1gjZK551YkpCaav7AnCjJ0`

---

## 🔑 获取数据库密码

1. 访问 Supabase Dashboard: https://supabase.com/dashboard/project/rnzkgukzkxgjtyidgafl
2. 进入 **Settings** → **Database**
3. 找到 **Connection string** 部分
4. 点击 **"Reset database password"**（如果还没有设置）
5. 复制连接字符串或记录密码

**数据库连接格式**:

```
postgresql://postgres:[YOUR-PASSWORD]@db.rnzkgukzkxgjtyidgafl.supabase.co:5432/postgres
```

---

## 📝 环境变量配置

### 本地开发环境 (.env.local)

```env
# Supabase Database
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.rnzkgukzkxgjtyidgafl.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars-please-change"

# Supabase (可选，用于直接集成)
NEXT_PUBLIC_SUPABASE_URL="https://rnzkgukzkxgjtyidgafl.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuemtndWt6a3hnanR5aWRnYWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTM3OTMsImV4cCI6MjA3NzM2OTc5M30.cBflYsdsBPY6IwnYA3byp1gjZK551YkpCaav7AnCjJ0"

# USDA API
USDA_API_KEY="your-usda-api-key"

# Redis (可选，推荐使用 Upstash)
# REDIS_URL="your-upstash-redis-url"

# Google OAuth (可选)
# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Vercel 生产环境

在 Vercel Dashboard → Project Settings → Environment Variables 中添加相同的变量。

---

## 🚀 下一步操作

1. **获取数据库密码**
   - 访问 https://supabase.com/dashboard/project/rnzkgukzkxgjtyidgafl/settings/database
   - 重置或查看数据库密码

2. **配置环境变量**
   - 创建 `.env.local` 文件
   - 填入 `DATABASE_URL`（包含密码）

3. **运行数据库迁移**

   ```bash
   pnpm prisma db push
   # 或
   pnpm prisma migrate dev --name init
   ```

4. **运行种子数据（可选）**

   ```bash
   pnpm prisma db seed
   ```

5. **测试连接**
   ```bash
   pnpm dev
   ```

---

## 📊 项目状态

- ✅ 项目已创建
- ✅ 数据库已就绪
- ⏳ 等待数据库密码配置
- ⏳ 等待运行迁移

---

## 🔗 有用链接

- **项目 Dashboard**: https://supabase.com/dashboard/project/rnzkgukzkxgjtyidgafl
- **数据库设置**: https://supabase.com/dashboard/project/rnzkgukzkxgjtyidgafl/settings/database
- **API 文档**: https://rnzkgukzkxgjtyidgafl.supabase.co/rest/v1/
