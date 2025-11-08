<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

## 补充开发指南

### 常用开发命令

```bash
# 开发服务器
pnpm dev                  # 启动开发服务器

# 数据库操作 (Supabase)
pnpm db:generate         # 生成 Prisma 客户端
pnpm db:push            # 推送 schema 到 Supabase
pnpm db:migrate         # 创建并应用迁移
pnpm db:studio          # 打开 Prisma Studio GUI
pnpm db:seed            # 初始化数据库数据
pnpm db:test            # 测试数据库连接
pnpm supabase:test      # 测试 Supabase 连接

# 代码质量
pnpm lint               # 运行 ESLint
pnpm lint:fix           # 自动修复 ESLint 问题
pnpm format             # 格式化代码
pnpm type-check         # TypeScript 类型检查

# 测试
pnpm test               # 运行单元测试
pnpm test:watch         # 监听模式运行测试
pnpm test:coverage      # 运行测试并生成覆盖率报告
pnpm test:e2e           # 运行端到端测试

# 构建和部署
pnpm build:cloudflare   # 构建 Cloudflare Pages 版本
pnpm deploy             # 部署到 Cloudflare Pages (生产)
pnpm deploy:prod        # 部署到 Cloudflare Pages (生产)
pnpm cloudflare:deploy  # 使用脚本部署
pnpm check:deployment   # 检查部署状态
```

### 核心架构信息

**架构**: 纯 Cloudflare Pages + Supabase 架构（完全免费）

**技术栈**: 
- 前端: Next.js 15 (App Router + Static Export) + TypeScript 5.x + React 18
- UI: Tailwind CSS 4.x + shadcn/ui
- 状态: Zustand

**数据库与存储**: 
- 数据库: Supabase PostgreSQL (71 张表，免费 500MB)
- 文件存储: Supabase Storage (免费 1GB)
- ORM: Prisma 6.x

**认证**: NextAuth.js v5

**AI 服务**: OpenAI GPT-4 + Anthropic Claude

**部署**: Cloudflare Pages (全球 CDN + 边缘计算)

### 关键目录结构

```
src/
├── app/                 # Next.js App Router 页面和 API
│   ├── (auth)/         # 认证相关页面
│   ├── dashboard/      # 仪表板页面
│   └── api/            # 70+ API 端点
├── components/
│   ├── ui/            # shadcn/ui 基础组件
│   └── features/      # 业务功能组件
├── lib/
│   ├── services/      # AI、分析、预算等业务逻辑
│   ├── db/            # Prisma 客户端
│   └── utils/         # 工具函数
├── types/             # TypeScript 类型定义
└── hooks/             # 自定义 React hooks

prisma/
└── schema.prisma       # 数据库 Schema

openspec/
├── AGENTS.md          # OpenSpec 详细说明
├── project.md         # 项目规范
└── changes/           # 变更提案
```

### 环境变量配置 (参考 .env.example)

必需变量:
- `DATABASE_URL` - PostgreSQL 连接字符串
- `NEXTAUTH_SECRET` - 至少32字符
- `NEXTAUTH_URL` - 应用 URL

推荐变量:
- `USDA_API_KEY` - 营养数据库 API
- `OPENAI_API_KEY` - AI 服务
- `OPENROUTER_API_KEY` - Claude 集成

### 重要开发准则

1. **TypeScript Strict Mode** - 所有代码必须通过严格类型检查
2. **测试覆盖率** - 最低 25% 覆盖率要求
3. **API 开发** - 使用 Zod 验证输入，实现适当的错误处理
4. **AI 功能** - 注意速率限制和成本优化
5. **性能** - 使用 Prisma 查询优化，实现缓存策略
6. **安全性** - 基于角色的访问控制，输入验证

### 开发建议

- 修改数据库前先备份
- 实现 AI 功能时添加详细日志
- 遵循现有的组件和服务模式
- 为新功能编写单元测试
- 使用 Prisma Studio 进行数据库调试
- 复杂变更前先创建 OpenSpec 提案

### 常见故障排除

**数据库连接失败**:
- 检查 DATABASE_URL 格式
- 验证 PostgreSQL 是否运行
- 使用 `pnpm db:test` 测试连接

**构建失败**:
- 运行 `pnpm type-check` 检查类型错误
- 检查所有依赖是否安装
- 查看具体错误日志

**测试失败**:
- 检查环境变量是否配置
- 验证测试数据库初始化
- 检查异步测试的超时设置
