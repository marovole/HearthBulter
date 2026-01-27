# 🚀 Cloudflare Pages 部署指南

## 概述

本指南详细说明如何将 HearthBulter (健康管家) 应用从 Vercel 迁移到 Cloudflare Pages。

## 迁移原因

- **解决 Edge Function 大小限制**: 从 1.05MB 优化到 < 500KB
- **降低部署成本**: Cloudflare Pages 更优���的定价
- **提升全球性能**: 利用 Cloudflare 的边缘网络
- **简化架构**: 统一中间件，优化依赖结构

## 预迁移检查清单

### ✅ 完成的优化工作

1. **中间件重构**
   - ✅ 合并根目录和 `src/middleware.ts` 文件
   - ✅ 移除重量级依赖 (Prisma, bcryptjs, 安全审计模块)
   - ✅ 创建轻量级认证中间件 (< 250 行)
   - ✅ 添加内置速率限制和安全头

2. **认证流程优化**
   - ✅ 创建 `/api/auth/session` 端点
   - ✅ 将数据库查询从 middleware 移至 API 路由
   - ✅ 保持 NextAuth 集成

3. **Cloudflare 适配器**
   - ✅ 安装 `@opennextjs/cloudflare` 适配器
   - ✅ 创建 `wrangler.toml` 配置文件
   - ✅ 添加 `build:cloudflare` 脚本

## Cloudflare Pages 部署步骤

### 步骤 1: 创建 Cloudflare Pages 项目

1. **登录 Cloudflare Dashboard**
   - ��问 https://dash.cloudflare.com/
   - 登录您的账户

2. **创建新 Pages 项目**
   - 左侧菜单 → Pages → Create application
   - 选择 "Connect to Git"

3. **连接 GitHub 仓库**
   - 选择 GitHub 账户
   - 搜索并选择 "HearthBulter" 仓库
   - 授权 Cloudflare 访问仓库

### 步骤 2: 配构建设置

1. **基本设置**

   ```
   Framework preset: Next.js
   Build command: npm run build:cloudflare
   Build output directory: .vercel/output/static
   Root directory: /
   ```

2. **Node.js 版本**
   - 设置 Node.js 版本: `20.x`
   - 包管理器: `npm`

### 步骤 3: 环境变量配置

在 Cloudflare Pages 项目设置中添加以下环境变量：

#### 必需的环境变量

```bash
# 数据库连接
DATABASE_URL="postgresql://neondb_owner:npg_PoBYp7z0fOjC@ep-snowy-silence-ad5majbd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# NextAuth 配置
NEXTAUTH_SECRET=<REDACTED>"U97nNxOcByJp3BS5IIf+FGbxv5PWRBXd0WFF8YHTRxk="
NEXTAUTH_URL="https://your-app.pages.dev"

# CORS 配置
NEXT_PUBLIC_ALLOWED_ORIGINS="https://your-app.pages.dev"

# 环境设置
NODE_ENV="production"
```

#### 可选的环境变量

```bash
# Google OAuth (如果使用)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# 其他服务配置
```

### 步骤 4: 部署配置

1. **首次部署**
   - 点击 "Save and Deploy"
   - 等待构建完成 (约 3-5 分钟)

2. **构建设置优化**
   ```bash
   # Cloudflare 构建命令
   npm run build:cloudflare
   ```

### 步骤 5: 域名配置

1. **使用 Cloudflare 域名**
   - 默认: `your-app.pages.dev`
   - 可配置自定义域名

2. **设置自定义域名**
   - Pages 项目 → Custom domains
   - 添加您的域名
   - 配置 DNS 记录

## 验证部署

### 功能检查清单

- [ ] **主页加载**: 访问首页正常显示
- [ ] **用户注册**: 新用户注册功能正常
- [ ] **用户登录**: 现有用户登录成功
- [ ] **仪表盘**: 登录后能访问仪表盘
- [ ] **API 端点**: 所有 API 路由响应正常
- [ ] **数据库操作**: 数据读写功能正常

### 性能测试

1. **页面加载速度**
   - 首页: < 2 秒
   - 仪表盘: < 3 秒

2. **API 响应时间**
   - 认证端点: < 500ms
   - 数据端点: < 1 秒

## 故障排除

### 常见问题

#### 1. 构建失败

**问题**: 构建过程中出现错误

```bash
Error: Build failed
```

**解决方案**:

- 检查 Node.js 版本 (需要 20.x)
- 检查环境变量配置
- 查看构建日志中的具体错误

#### 2. 中间件错误

**问题**: 页面显示中间件错误

```bash
Error: Middleware execution failed
```

**解决方案**:

- 检查 `middleware.ts` 文件语法
- 验证 NextAuth 配置
- 查看边缘函数日志

#### 3. 数据库连接失败

**问题**: 无法连接到 Neon 数据库

```bash
Error: Database connection failed
```

**解决方案**:

- 验证 `DATABASE_URL` 环境变量
- 检查 Neon 项目状态
- 确认 IP 白名单设置

#### 4. 认证问题

**问题**: 用户无法登录或 session 失效

```bash
Error: Authentication failed
```

**解决方案**:

- 检查 `NEXTAUTH_SECRET` 配置
- 验证 `NEXTAUTH_URL` 设置
- 检查回调 URL 配置

### 调试工具

1. **Cloudflare Logs**
   - Dashboard → Pages → 您的项目 → Logs
   - 实时查看应用日志

2. **本地测试**
   ```bash
   # 本地运行 Cloudflare 版本
   npm run build:cloudflare
   npx wrangler pages dev .vercel/output/static
   ```

## 性能优化

### 已实施的优化

1. **中间件优化**
   - 大小从 1.05MB 减少到 ~250 行代码
   - 移除重量级依赖
   - 使用内置速率限制

2. **图片优化**
   - 配置 Next.js Image 优化
   - 支持 WebP/AVIF 格式

3. **缓存策略**
   - 静态资源缓存
   - API 响应缓存

### 进一步优化建议

1. **启用 Cloudflare 缓存**
   - 配置页面规则
   - 设置缓存 TTL

2. **使用 Cloudflare KV**
   - 存储会话数据
   - 缓存常用数据

## 成本对比

### Vercel (Hobby Plan)

- **费用**: $0/月
- **限制**: Edge Function 1MB
- **问题**: 中间件大小超限

### Cloudflare Pages (Free Plan)

- **费用**: $0/月
- **优势**: 无 Edge Function 大小限制
- **包含**: 500 次构建/月，20,000 请求/天

### Cloudflare Pages (Pro Plan)

- **费用**: $20/月
- **优势**: 无限构建，100 万请求/天
- **适用**: 生产环境

## 回滚计划

如果 Cloudflare 部署出现问题：

1. **保留 Vercel 配置**
   - Vercel 项目保持不变
   - 代码已备份在 GitHub

2. **快速回滚步骤**
   - 修改 DNS 指向 Vercel
   - 重新部署到 Vercel
   - 验证功能正常

3. **问题修复后重新部署**
   - 修复 Cloudflare 配置问题
   - 重新执行部署流程
   - 切换回 Cloudflare

## 后续维护

### 定期任务

1. **监控性能**
   - 检查页面加载速度
   - 监控 API 响应时间
   - 查看错误率

2. **更新依赖**
   - 定期更新 Next.js 版本
   - 更新 Cloudflare 适配器
   - 检查安全更新

3. **备份策略**
   - 定期备份数据库
   - 保持代码同步
   - 文档更新

## 支持资源

- **Cloudflare Pages 文档**: https://developers.cloudflare.com/pages/
- **OpenNext 文档**: https://opennext.js.org/cloudflare
- **Next.js 文档**: https://nextjs.org/docs
- **问题反馈**: GitHub Issues

---

**创建时间**: 2025-11-04
**版本**: v1.0
**维护者**: HearthBulter 开发团队
