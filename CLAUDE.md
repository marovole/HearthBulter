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

## 开发命令

```bash
# 开发
pnpm dev                  # 启动开发服务器
pnpm build                # 构建生产版本
pnpm build:cloudflare     # 构建 Cloudflare Pages 版本

# 代码质量
pnpm lint                 # ESLint 检查
pnpm lint:fix             # 自动修复
pnpm type-check           # TypeScript 类型检查
pnpm format               # Prettier 格式化

# 测试
pnpm test                 # 运行所有测试
pnpm test -- path/to/file # 运行单个测试文件
pnpm test -- -t "name"    # 运行匹配名称的测试
pnpm test:watch           # 监听模式
pnpm test:coverage        # 覆盖率报告
pnpm test:e2e             # E2E 测试

# 部署
pnpm deploy               # 部署到 Cloudflare Pages
pnpm deploy:prod          # 部署到生产环境
pnpm check:deployment     # 检查部署状态
```

## 技术栈

**架构**: Cloudflare Pages + Convex + Clerk (Serverless, 完全免费)

**前端**:

- Next.js 14.2.32 (App Router)
- React 18.3 + TypeScript 5.6+
- Tailwind CSS 3.4.18 + shadcn/ui
- Zustand 5.0 (状态管理)
- Framer Motion (动画)

**后端**:

- Convex (实时数据库 + 后端函数，`convex/` 目录)
- Clerk 6.x (认证，NextAuth 已迁移)
- OpenAI GPT-4 + OpenRouter (AI 服务)

**部署**: Cloudflare Pages (全球 CDN + Edge Functions)

## 目录结构

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # 160+ API 端点
│   ├── dashboard/      # 仪表板页面
│   └── (auth)/         # 认证页面
├── components/
│   ├── ui/             # shadcn/ui 基础组件
│   └── features/       # 业务功能组件
├── lib/
│   ├── services/       # 106+ 业务服务
│   ├── db/             # 数据库抽象层（指向 Convex）
│   └── utils/          # 工具函数
├── schemas/            # Zod 验证 Schema
└── types/              # TypeScript 类型

convex/                 # Convex 数据库模块（当前主数据源）
openspec/               # 规范驱动开发 (变更提案)
```

## 环境变量

必需:

- `NEXT_PUBLIC_CONVEX_URL` - Convex 实时数据库 URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk 公钥
- `CLERK_SECRET_KEY` - Clerk 密钥

可选:

- `USDA_API_KEY` - 营养数据库 API
- `OPENAI_API_KEY` - AI 服务
- `OPENROUTER_API_KEY` - OpenRouter 集成
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - 边缘缓存

## 开发准则

1. **TypeScript Strict Mode** - 所有代码必须通过严格类型检查
2. **数据层** - 数据读写通过 `convex/` 目录的 mutation/query
3. **API 开发** - 使用 Zod 验证输入，统一错误处理格式
4. **变更管理** - 复杂变更先创建 OpenSpec 提案

## 故障排除

**Convex 连接失败**: 检查 `NEXT_PUBLIC_CONVEX_URL` 格式，验证 Convex Dashboard 状态

**构建失败**: 运行 `pnpm type-check` 检查类型错误

**测试失败**: 检查环境变量配置，验证异步测试超时设置
