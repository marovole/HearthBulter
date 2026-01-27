# Health Butler - Cloudflare Pages + Supabase 版本

> 🚀 基于 Cloudflare Pages 和 Supabase 的高性能健康管理平台

## 🎯 新架构优势

### 性能提升

- ⚡ **全球 CDN**: 275+ 个边缘节点
- 🚀 **边缘计算**: API 就近执行
- 💾 **智能缓存**: 静态资源自动优化
- 📊 **实时同步**: Supabase Realtime

### 成本降低

- 💰 **免费额度**: Cloudflare 100k 请求/天
- 💸 **Supabase 免费层**: 500MB 数据库
- 📉 **按需计费**: 无最低费用
- 🎁 **估算成本**: $0-25/月

### 开发体验

- 🔄 **自动部署**: Git push 触发
- 🔍 **预览环境**: 每个 PR
- 📈 **内置分析**: 免费监控
- 🛡️ **DDoS 防护**: 自带安全

---

## 📦 新增命令

### Supabase 相关

```bash
# 生成 Supabase Schema
pnpm supabase:generate-schema

# 迁移数据到 Supabase
pnpm supabase:migrate-data

# 测试 Supabase 连接
pnpm supabase:test
```

### Cloudflare 部署

```bash
# 部署到生产环境
pnpm cloudflare:deploy

# 部署到预览环境
pnpm cloudflare:deploy:staging

# 部署到开发环境
pnpm cloudflare:deploy:dev
```

---

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.cloudflare .env.local

# 编辑 .env.local，填入你的凭据
```

### 2. Supabase 设置

```bash
# 2.1 创建 Supabase 项目
# 访问 https://supabase.com/dashboard
# 创建项目并获取 URL 和 API Keys

# 2.2 生成并应用 Schema
pnpm supabase:generate-schema

# 2.3 在 Supabase Dashboard 中执行生成的 SQL
# supabase/migrations/xxx_prisma_to_supabase.sql

# 2.4 测试连接
pnpm supabase:test
```

### 3. 本地开发

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

### 4. 部署到 Cloudflare

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署
pnpm cloudflare:deploy
```

---

## 📖 详细文档

### 核心文档

- [**快速开始指南**](./QUICK_START_CLOUDFLARE_SUPABASE.md) - 5 分钟快速部署
- [**完整迁移指南**](./CLOUDFLARE_SUPABASE_MIGRATION_GUIDE.md) - 详细迁移步骤
- [**实施总结**](./IMPLEMENTATION_SUMMARY.md) - 技术实现细节

### 配置指南

- [Cloudflare 设置](./docs/CLOUDFLARE_SETUP_GUIDE.md)
- [Supabase 设置](./docs/SUPABASE_SETUP_GUIDE.md)
- [生产环境检查](./docs/PRODUCTION_CHECKLIST.md)

---

## 🏗️ 架构对比

### 旧架构（Vercel）

```
Next.js App
├── Vercel Edge Functions
├── Prisma ORM
├── PostgreSQL (自管理)
└── NextAuth.js
```

**成本**: ~$50-100/月

### 新架构（Cloudflare + Supabase）

```
Cloudflare Pages (前端)
├── Pages Functions (API)
└── Supabase
    ├── PostgreSQL
    ├── Auth
    ├── Storage
    └── Realtime
```

**成本**: ~$0-25/月

---

## 🛠️ 技术栈

### 前端

- **框架**: Next.js 15 (静态导出)
- **UI**: React 18 + Tailwind CSS 4
- **组件**: shadcn/ui
- **状态**: Zustand
- **部署**: Cloudflare Pages

### 后端

- **API**: Cloudflare Pages Functions
- **数据库**: Supabase PostgreSQL
- **认证**: Supabase Auth
- **存储**: Supabase Storage
- **实时**: Supabase Realtime

### 开发工具

- **TypeScript**: 5.6
- **包管理**: pnpm 8+
- **代码质量**: ESLint + Prettier
- **测试**: Jest + Playwright

---

## 📊 迁移清单

- [x] Supabase Schema 生成工具
- [x] 数据迁移脚本
- [x] Prisma 兼容适配器
- [x] Supabase Auth 适配器
- [x] Cloudflare Functions 中间件
- [x] API 迁移模板
- [x] 部署脚本
- [x] 测试工具
- [x] 完整文档

---

## 🔧 开发工作流

### 本地开发

```bash
# 启动开发服务器
pnpm dev

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

### 测试

```bash
# 单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# 测试覆盖率
pnpm test:coverage
```

### 部署

```bash
# 预览部署（自动）
git push origin feature-branch
# Cloudflare 自动创建预览

# 生产部署
pnpm cloudflare:deploy
```

---

## 📁 项目结构

```
HearthBulter/
├── src/
│   ├── app/                    # Next.js 页面
│   ├── components/             # React 组件
│   ├── lib/
│   │   ├── auth-supabase.ts   # Supabase Auth 适配器
│   │   └── db/
│   │       └── supabase-adapter.ts  # Supabase 数据适配器
│   └── types/
│       └── supabase-database.ts     # Supabase 类型定义
├── functions/                  # Cloudflare Functions
│   ├── api/                   # API 路由
│   ├── middleware/            # 中间件
│   └── utils/                 # 工具函数
├── scripts/
│   ├── generate-supabase-schema.ts   # Schema 生成
│   ├── migrate-data-to-supabase.ts   # 数据迁移
│   ├── test-supabase-connection.js   # 连接测试
│   └── deploy-cloudflare-supabase.sh # 部署脚本
├── supabase/
│   └── migrations/            # SQL 迁移文件
├── docs/                      # 文档
├── wrangler.toml             # Cloudflare 配置
└── next.config.js            # Next.js 配置
```

---

## 🔍 常见问题

### Q: 如何从 Vercel 迁移到 Cloudflare？

**A**: 按照 [完整迁移指南](./CLOUDFLARE_SUPABASE_MIGRATION_GUIDE.md) 分阶段执行。

### Q: 现有数据会丢失吗？

**A**: 不会。使用 `pnpm supabase:migrate-data` 安全迁移所有数据。

### Q: 迁移需要多长时间？

**A**:

- 基础设施：1-2 天
- 数据迁移：1 天
- API 迁移：3-5 天
- 总计：5-8 天

### Q: 如何回滚？

**A**: 保留 Vercel 部署作为备份，DNS 可快速切换。详见 [回滚计划](./CLOUDFLARE_SUPABASE_MIGRATION_GUIDE.md#回滚计划)。

### Q: 成本真的能降低吗？

**A**: 是的。Cloudflare 和 Supabase 的免费额度通常足够中小型应用使用。

---

## 📈 性能指标

### 目标

- Lighthouse Performance: > 90
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- API Response Time: < 500ms

### 优化策略

- ✅ 静态资源 CDN 分发
- ✅ 边缘函数就近执行
- ✅ 数据库查询优化
- ✅ 智能缓存策略

---

## 🆘 获取帮助

### 文档资源

- [Supabase 文档](https://supabase.com/docs)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages)
- [Next.js 文档](https://nextjs.org/docs)

### 社区支持

- [Supabase Discord](https://discord.supabase.com)
- [Cloudflare Discord](https://discord.gg/cloudflaredev)

### 问题反馈

- GitHub Issues
- 技术支持邮箱

---

## 📝 更新日志

### v0.2.0 (2025-11-08)

- ✨ 新增 Cloudflare Pages + Supabase 支持
- ✨ 新增数据迁移工具
- ✨ 新增 Supabase Auth 适配器
- ✨ 新增 Cloudflare Functions 框架
- 📚 完整的迁移文档
- 🔧 自动化部署脚本

### v0.1.x

- 基于 Vercel + Prisma 的原始实现

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## 🙏 致谢

- [Supabase](https://supabase.com) - 开源 Firebase 替代方案
- [Cloudflare](https://cloudflare.com) - 全球 CDN 和边缘计算
- [Next.js](https://nextjs.org) - React 框架
- [Prisma](https://prisma.io) - ORM 框架

---

## 🚀 开始使用

准备好开始了吗？

1. 阅读 [**快速开始指南**](./QUICK_START_CLOUDFLARE_SUPABASE.md)
2. 按照步骤配置环境
3. 部署你的第一个版本
4. 享受性能提升和成本降低！

**祝你部署顺利！** 🎉
