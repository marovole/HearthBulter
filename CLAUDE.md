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

## CodeX MCP 协作规范

### 核心指令

在任何时刻，你必须思考当前过程可以如何与CodeX进行协作，如何调用CodeX为你提供的MCP工具作为你客观全面分析的保障。

其中你**务必执行**以下几个步骤：

**1. 需求分析与规划**
- 在对用户需求形成初步分析后，将用户需求、初始思路告知CodeX
- 要求其完善需求分析和实施计划
- 确保双方对需求理解一致

**2. 代码原型获取**
- 在实施具体编码任务前，**必须向CodeX索要代码实现原型**
- **要求CodeX仅给出unified diff patch，严禁对代码做任何真实修改**
- 在获取代码原型后，你**只能以此为逻辑参考，再次对代码修改进行重写**
- 形成企业生产级别、可读性极高、可维护性极高的代码后，才能实施具体编程修改任务

**3. 代码审查**
- 无论何时，只要完成切实编码行为后，**必须立即使用CodeX review代码改动和对应需求完成程度**
- 确保代码质量和需求完成度

**4. 批判性思维**
- CodeX只能给出参考，**你必须有自己的思考，甚至需要对CodeX的回答提出置疑**
- 尽信书则不如无书，你与CodeX的最终使命都是达成统一、全面、精准的意见
- 你们必须不断争辩已找到通向真理的唯一途径

### Codex Tool Invocation Specification

#### 1. 工具概述

CodeX MCP 提供了一个工具 `codex`，用于执行 AI 辅助的编码任务。该工具**通过 MCP 协议调用**，无需使用命令行。

#### 2. 工具参数

**必选**参数：
- `PROMPT` (string): 发送给 CodeX 的任务指令
- `cd` (Path): CodeX 执行任务的工作目录根路径

**可选**参数：
- `sandbox` (string): 沙箱策略，可选值：
  - `"read-only"` (默认): 只读模式，最安全
  - `"workspace-write"`: 允许在工作区写入
  - `"danger-full-access"`: 完全访问权限
- `SESSION_ID` (UUID | null): 用于继续之前的会话以与CodeX进行多轮交互，默认为 None（开启新会话）
- `skip_git_repo_check` (boolean): 是否允许在非 Git 仓库中运行，默认 False
- `return_all_messages` (boolean): 是否返回所有消息（包括推理、工具调用等），默认 False

**返回值**:
```typescript
{
  "success": true,
  "SESSION_ID": "uuid-string",
  "agent_messages": "agent回复的文本内容",
  "all_messages": []  // 仅当 return_all_messages=True 时包含
}
```

或失败时：
```typescript
{
  "success": false,
  "error": "错误信息"
}
```

#### 3. 使用方式

**开启新对话**:
- 不传 SESSION_ID 参数（或传 None）
- 工具会返回新的 SESSION_ID 用于后续对话

**继续之前的对话**:
- 将之前返回的 SESSION_ID 作为参数传入
- 同一会话的上下文会被保留

#### 4. 调用规范

**必须遵守**:
- 每次调用 CodeX 工具时，必须保存返回的 SESSION_ID，以便后续继续对话
- `cd` 参数必须指向存在的目录，否则工具会静默失败
- 严禁CodeX对代码进行实际修改，使用 `sandbox="read-only"` 以避免意外
- 要求CodeX仅给出unified diff patch即可

**推荐用法**:
- 如需详细追踪 CodeX 的推理过程和工具调用，设置 `return_all_messages=True`
- 对于精准定位、debug、代码原型快速编写等任务，优先使用 CodeX 工具
- 在获取代码原型后，进行独立思考和代码重写

#### 5. 注意事项

- **会话管理**: 始终追踪 SESSION_ID，避免会话混乱
- **工作目录**: 确保 `cd` 参数指向正确且存在的目录
- **错误处理**: 检查返回值的 `success` 字段，处理可能的错误
- **代码质量**: CodeX的建议仅供参考，最终代码需要经过你的独立思考和重写
- **协作原则**: 保持批判性思维，通过争辩达成统一、精准的意见

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
