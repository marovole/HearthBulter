# ✅ HearthBulter 部署检查清单

**部署日期**: 2025-11-08  
**目标**: 首次部署到 Cloudflare Pages + Supabase

---

## 📋 Phase 1: 清理 Vercel 引用 ✅ 已完成

- [x] 修复 `.env.production` 文件头部注释
- [x] 清理 `.env.staging` 中的 Vercel 引用
- [x] 验证无残留 Vercel 配置

---

## 📋 Phase 2: 配置 Supabase Storage ⚠️ 需要手动操作

### 步骤 2.1: 创建 Storage Bucket

1. **访问 Supabase Dashboard**  
   https://supabase.com/dashboard/project/ppmliptjvzurewsiwswb/storage

2. **点击 "New bucket"**

3. **配置 Bucket**:

   ```
   Name: medical-reports
   Public bucket: ❌ 取消勾选（保持私有）
   File size limit: 10 MB
   Allowed MIME types: application/pdf, image/jpeg, image/png, image/jpg
   ```

4. **点击 "Create bucket"**

### 步骤 2.2: 配置 RLS 策略

1. **访问 SQL Editor**  
   https://supabase.com/dashboard/project/ppmliptjvzurewsiwswb/sql/new

2. **执行以下 SQL**:

```sql
-- 允许认证用户上传自己的文件
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许认证用户读取自己的文件
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许认证用户删除自己的文件
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

3. **点击 "Run"** 执行 SQL

### 步骤 2.3: 验证配置

**本地测试**:

```bash
pnpm supabase:test
```

**预期输出**: ✅ 所有测试通过

- [ ] Storage Bucket 已创建
- [ ] RLS 策略已配置
- [ ] 本地测试通过

---

## 📋 Phase 3: 提交代码到 GitHub ⚠️ 准备就绪

### 当前状态

```
待提交文件: 94 个
├── 修改: 21 个
├── 删除: 18 个
└── 新增: 55 个
```

### 执行命令

```bash
# 1. 暂存所有更改
git add .

# 2. 创建提交
git commit -m "feat: 完成 Cloudflare Pages + Supabase 架构迁移

- 完全移除 Vercel 依赖和配置（21 个文件）
- 迁移到纯 Cloudflare Pages + Supabase 架构
- 文件存储从 @vercel/blob 迁移到 Supabase Storage
- 更新所有文档和架构说明
- 数据库: Supabase PostgreSQL (71 张表)
- 部署成本: 完全免费

主要更改:
- 删除 18 个 Vercel 相关文件和配置
- 移除 @vercel/blob 依赖
- 更新 next.config.js 为 Cloudflare 配置
- 实现 Supabase Storage 集成
- 创建 ARCHITECTURE.md 完整架构文档
- 创建 DEPLOYMENT.md 部署指南
- 更新 README.md 和 CLAUDE.md

技术栈:
- 前端: Next.js 15 Static Export + Cloudflare Pages
- 数据库: Supabase PostgreSQL (71 张表)
- 存储: Supabase Storage
- API: Cloudflare Functions
- 成本: $0/月（完全免费）

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# 3. 推送到 GitHub
git push origin main
```

- [ ] 代码已暂存
- [ ] 提交已创建
- [ ] 已推送到 GitHub

---

## 📋 Phase 4: 配置 Cloudflare Pages ⚠️ 需要手动操作

### 步骤 4.1: 创建项目

1. **访问 Cloudflare Pages**  
   https://dash.cloudflare.com/pages

2. **点击 "Create a project"**

3. **选择 "Connect to Git"**

4. **授权 GitHub**（如果还未授权）

5. **选择仓库**: `marovole/HearthBulter`

6. **点击 "Begin setup"**

### 步骤 4.2: 配置构建设置

**基础配置**:

```
Project name: hearthbulter
Production branch: main
```

**构建配置**:

```
Framework preset: Next.js
Build command: pnpm build:cloudflare
Build output directory: .open-next
Root directory: (留空)
```

**Node.js 版本**:

- 添加环境变量: `NODE_VERSION` = `20`

### 步骤 4.3: 配置环境变量

**重要**: 每个变量都要单独添加，选择 **Production** 和 **Preview** 环境

#### 必需变量（共 8 个）:

1. **DATABASE_URL**

   ```
   postgresql://postgres.ppmliptjvzurewsiwswb:gNXLh3QTXVAX58yy@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

2. **NEXT_PUBLIC_SUPABASE_URL**

   ```
   https://ppmliptjvzurewsiwswb.supabase.co
   ```

3. **NEXT_PUBLIC_SUPABASE_ANON_KEY**

   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxpcHRqdnp1cmV3c2l3c3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODQ0MzEsImV4cCI6MjA3ODE2MDQzMX0.r1_kuC6ekX1u1omuxjdf4c7ZQ_e70ciqwKGGqK6mkP0
   ```

4. **SUPABASE_SERVICE_KEY**

   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxpcHRqdnp1cmV3c2l3c3diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjU4NDQzMSwiZXhwIjoyMDc4MTYwNDMxfQ.BhFu9dKvNwaNX1GIIpheCGcm7DLgTKj7qNGh4-xgylA
   ```

5. **NEXTAUTH_SECRET**

   ```
   4oHRfQeVZU4XKnaBKWvnnMYkuG4p1VXGOX6Zz5S6XtQ=
   ```

6. **NEXTAUTH_URL**

   ```
   https://hearthbulter.pages.dev
   ```

   ⚠️ **注意**: 首次部署后可能需要更新为实际域名

7. **NODE_ENV**

   ```
   production
   ```

8. **NEXT_PUBLIC_SITE_URL**
   ```
   https://hearthbulter.pages.dev
   ```

#### 可选变量（2 个）:

9. **UPSTASH_REDIS_REST_URL** (可选 - Redis 缓存)

   ```
   https://teaching-eagle-34132.upstash.io
   ```

10. **UPSTASH_REDIS_REST_TOKEN** (可选)
    ```
    AYVUAAIncDJlNTBmMjlkMDBhMDY0MTU1OWQ2YmVjM2Q2N2Y2MmI3ZHAyMzQxMzI
    ```

### 步骤 4.4: 开始部署

1. **点击 "Save and Deploy"**

2. **等待构建**（约 3-5 分钟）

3. **观察构建日志**

**预期流程**:

```
Installing dependencies...
Running build command: pnpm build:cloudflare
✓ Build completed successfully
Deploying to Cloudflare's global network...
✓ Deployment complete
```

- [ ] 项目已创建
- [ ] 构建配置已完成
- [ ] 环境变量已添加（8-10 个）
- [ ] 首次部署已触发

---

## 📋 Phase 5: 验证部署 ⚠️ 部署后执行

### 步骤 5.1: 基础验证

1. **访问应用**  
   URL: https://hearthbulter.pages.dev

2. **检查首页**
   - [ ] 页面正常加载
   - [ ] 样式显示正确
   - [ ] 无 JavaScript 错误（F12 控制台）

### 步骤 5.2: 健康检查

**访问**: https://hearthbulter.pages.dev/api/health

**预期响应**:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-11-08T..."
}
```

- [ ] 健康检查返回 200
- [ ] 数据库状态为 "connected"

### 步骤 5.3: 功能测试

**注册测试**:

1. 访问 `/register`
2. 创建测试账户
3. 检查是否成功

**登录测试**:

1. 访问 `/login`
2. 登录测试账户
3. 访问 Dashboard

**数据验证**:

1. 登录 Supabase Dashboard
2. 查看 `users` 表
3. 确认有新用户记录

- [ ] 用户可以注册
- [ ] 用户可以登录
- [ ] Dashboard 可访问
- [ ] 数据库有记录

---

## 📋 Phase 6: 部署后配置（可选）

### 更新域名（如果需要）

如果 Cloudflare 分配的域名不是 `hearthbulter.pages.dev`:

1. 获取实际域名
2. 更新环境变量:
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_ALLOWED_ORIGINS`
3. 重新部署

### 配置自定义域名（可选）

1. Cloudflare Pages → Settings → Custom domains
2. 添加您的域名
3. 配置 DNS
4. 更新环境变量

### 启用 Analytics（可选）

1. Cloudflare Pages → Analytics
2. 启用 Web Analytics

- [ ] 域名已确认
- [ ] 自定义域名已配置（如果需要）
- [ ] Analytics 已启用

---

## 🎯 最终验证清单

**部署成功标准**:

- [ ] ✅ 应用可通过 HTTPS 访问
- [ ] ✅ 健康检查通过
- [ ] ✅ 用户可注册登录
- [ ] ✅ Dashboard 正常显示
- [ ] ✅ 数据库读写正常
- [ ] ✅ 无明显错误

**文档更新**:

- [ ] 更新 PROJECT_STATUS.md 部署状态
- [ ] 更新 README.md 生产 URL
- [ ] 创建部署成功报告

---

## 📞 故障排除

### 问题：构建失败

**检查**:

- 构建日志中的错误信息
- 环境变量是否正确
- `pnpm build:cloudflare` 本地是否成功

**解决**:

```bash
# 本地测试构建
pnpm build:cloudflare
```

### 问题：数据库连接失败

**检查**:

- DATABASE_URL 是否正确（端口 6543）
- Supabase 项目状态
- 环境变量是否在 Cloudflare 配置

**解决**:

```bash
# 测试连接
pnpm supabase:test
```

### 问题：页面 404

**原因**: 可能是构建输出目录配置错误

**解决**:

- 确认 Build output directory 设置为 `.open-next`
- 检查构建日志是否生成了 .open-next 目录

---

## 📝 部署记录

**开始时间**: **\*\***\_**\*\***  
**完成时间**: **\*\***\_**\*\***  
**部署 URL**: **\*\***\_**\*\***  
**遇到的问题**: **\*\***\_**\*\***  
**解决方案**: **\*\***\_**\*\***

---

**准备好了吗？按照清单逐步执行！**
