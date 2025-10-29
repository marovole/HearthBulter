# Project Context

## Purpose

**Health Butler（健康管家）** 是一个基于健康数据与电商库存的动态饮食引擎，旨在让个人与家庭的健康管理从「主观感性」走向「客观数据驱动」。

**核心目标**:
- 根据体检数据与健康目标定制个性化食谱
- 通过AI营养引擎自动计算宏量/微量营养素分配
- 对接电商平台实现食材采购自动化
- 建立健康数据闭环（体检→食谱→执行→复盘→优化）
- 将健康管理融入日常家庭系统，减少认知负担

## Tech Stack

### 前端
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5.x
- **UI库**: React 18, Tailwind CSS 4.x, shadcn/ui
- **状态管理**: React Context + Zustand
- **表单**: React Hook Form + Zod验证
- **图表**: Recharts / Chart.js

### 后端
- **运行时**: Node.js 20+ LTS
- **框架**: Next.js API Routes / tRPC (根据需要选择)
- **ORM**: Prisma 6.x
- **数据库**: PostgreSQL 16
- **认证**: NextAuth.js v5 (Auth.js)
- **文件存储**: AWS S3 / Vercel Blob

### AI/ML
- **LLM**: OpenAI GPT-4 / Anthropic Claude (营养规划)
- **OCR**: Tesseract.js / Azure OCR (体检单识别)
- **营养数据**: USDA FoodData Central API

### 部署与监控
- **托管**: Vercel (前端+边缘函数) + AWS RDS (数据库)
- **CI/CD**: GitHub Actions
- **监控**: Vercel Analytics + Sentry
- **日志**: Pino / Winston

## Project Conventions

### Code Style

**通用规范**:
- 使用 **ESLint** + **Prettier** 统一代码格式
- 配置: `eslint-config-next` + `eslint-config-prettier`
- 提交前自动格式化: Husky + lint-staged

**命名规范**:
- **组件**: PascalCase (`UserProfileCard.tsx`)
- **函数/变量**: camelCase (`calculateMacros()`, `userId`)
- **常量**: UPPER_SNAKE_CASE (`MAX_FAMILY_MEMBERS`)
- **文件**: kebab-case (`health-data-service.ts`)
- **数据库表**: snake_case (`family_members`, `health_records`)

**TypeScript规范**:
- 严格模式: `"strict": true` in `tsconfig.json`
- 优先使用 `interface` 定义对象类型（API响应、组件Props）
- 优先使用 `type` 定义联合类型和工具类型
- 避免 `any`，必要时使用 `unknown` + 类型守卫
- 导出类型: `export type { UserProfile }`

**React规范**:
- 函数组件 + Hooks (禁用class组件)
- Server Component优先（Next.js App Router）
- 客户端组件明确标注 `'use client'`
- Props解构 + TypeScript类型定义
- 自定义Hook前缀 `use-` (`useHealthData.ts`)

### Architecture Patterns

**分层架构** (Layered Architecture):

```
┌─────────────────────────────────┐
│  Presentation Layer (UI)        │  Next.js页面/组件
├─────────────────────────────────┤
│  API Layer (Routes)             │  Next.js API Routes / tRPC
├─────────────────────────────────┤
│  Business Logic Layer           │  Services (营养计算、食谱生成)
├─────────────────────────────────┤
│  Data Access Layer              │  Prisma repositories
├─────────────────────────────────┤
│  Database Layer                 │  PostgreSQL
└─────────────────────────────────┘
```

**目录结构**:
```
src/
├── app/                   # Next.js App Router 页面
│   ├── (auth)/           # 认证相关页面
│   ├── dashboard/        # 主仪表盘
│   └── api/              # API路由
├── components/           # React组件
│   ├── ui/              # shadcn/ui基础组件
│   └── features/        # 业务组件
├── lib/                  # 工具函数和配置
│   ├── db/              # Prisma客户端
│   ├── services/        # 业务逻辑服务
│   └── utils/           # 通用工具
├── types/               # TypeScript类型定义
├── hooks/               # 自定义React Hooks
└── middleware.ts        # Next.js中间件
```

**核心模式**:
- **Repository Pattern**: 数据访问抽象（Prisma封装）
- **Service Pattern**: 业务逻辑封装（营养计算、食谱生成）
- **Factory Pattern**: 食谱生成器（不同目标不同策略）
- **Observer Pattern**: 健康数据变化触发食谱更新

**数据模型规范**:
- 使用Prisma Schema定义所有数据模型
- 外键关系明确标注（`@relation`）
- 时间戳字段: `createdAt`, `updatedAt`（自动管理）
- 软删除: `deletedAt` (可选字段)
- 敏感数据加密: 使用应用层加密（AES-256-GCM）

### Testing Strategy

**测试金字塔**:
```
       ┌─────────┐
       │   E2E   │  10% - Playwright (关键用户流程)
       └─────────┘
      ┌───────────┐
      │Integration│  30% - API集成测试
      └───────────┘
    ┌───────────────┐
    │  Unit Tests   │  60% - Jest (业务逻辑、工具函数)
    └───────────────┘
```

**工具选择**:
- **单元测试**: Jest + Testing Library
- **E2E测试**: Playwright
- **API测试**: Supertest (或Playwright API Testing)
- **覆盖率**: 核心业务逻辑 >80%

**测试命名**:
```typescript
describe('营养计算服务', () => {
  describe('calculateMacros()', () => {
    it('应该根据体重和目标正确计算宏量营养素', () => {
      // 测试逻辑
    })

    it('当目标为减重时，应该降低碳水比例', () => {
      // 测试逻辑
    })
  })
})
```

**测试要求**:
- 所有业务逻辑服务必须有单元测试
- 关键用户流程必须有E2E测试覆盖
- API端点必须有集成测试
- CI/CD中强制运行测试，失败则阻止合并

### Git Workflow

**分支策略** (GitHub Flow简化版):

- **`main`**: 生产分支，始终可部署
- **`feature/*`**: 功能开发分支（如 `feature/add-meal-planner`）
- **`fix/*`**: Bug修复分支（如 `fix/nutrition-calculation`）
- **`chore/*`**: 非功能性修改（如 `chore/update-deps`）

**工作流程**:
1. 从 `main` 创建新分支
2. 本地开发 + 提交
3. 推送到远程并创建 Pull Request
4. CI/CD自动运行测试
5. Code Review通过后合并到 `main`
6. 自动部署到生产环境（Vercel）

**提交规范** (Conventional Commits):
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type类型**:
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式（不影响逻辑）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具配置

**示例**:
```
feat(meal-planner): add 7-day meal plan generation

Implement template-based meal planning algorithm that calculates
macro distribution based on user health goals.

Closes #123
```

**Pre-commit检查**:
- ESLint + Prettier自动修复
- TypeScript类型检查
- 单元测试（仅affected files）

## Domain Context

**健康管理领域知识**:

**宏量营养素 (Macronutrients)**:
- **碳水化合物 (Carbs)**: 4 kcal/g，主要能量来源
- **蛋白质 (Protein)**: 4 kcal/g，肌肉修复与维持
- **脂肪 (Fat)**: 9 kcal/g，激素合成与营养吸收

**微量营养素 (Micronutrients)**:
- 维生素（A, B群, C, D, E, K）
- 矿物质（钙, 铁, 锌, 镁等）

**基础代谢率 (BMR) 计算** - Mifflin-St Jeor公式:
- 男性: `BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 + 5`
- 女性: `BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 - 161`

**每日总能量消耗 (TDEE)**:
- `TDEE = BMR × 活动系数` (1.2 - 2.0)

**健康目标调整**:
- **减重**: TDEE - 300~500 kcal/天
- **增肌**: TDEE + 200~400 kcal/天
- **维持**: TDEE

**体检指标解读**:
- **血脂**: 总胆固醇 <5.2 mmol/L, LDL <3.4 mmol/L
- **血糖**: 空腹 3.9-6.1 mmol/L
- **肝功能**: ALT <40 U/L, AST <40 U/L

**营养数据库标准**:
- 使用 USDA FoodData Central (美国农业部食物数据库)
- 中国食物成分表（作为补充）
- 营养素精度: 保留1-2位小数

## Important Constraints

**数据隐私与合规**:
- 遵循 **GDPR** (通用数据保护条例) 和 **HIPAA** (健康保险可携带和责任法案)
- 用户健康数据必须获得明确授权才能访问
- 敏感数据加密存储: **AES-256-GCM** 算法
- 用户可随时导出或删除个人健康档案
- 数据保留期限: 账户注销后30天内完全删除

**性能要求**:
- 页面首次加载 (FCP): <1.5s
- 交互响应 (INP): <200ms
- 食谱生成延迟: <3s
- 支持并发: 1000+ 用户同时在线

**技术限制**:
- **数据库**: PostgreSQL单实例（MVP阶段），后续考虑读写分离
- **文件上传**: 单文件 <10MB（体检报告PDF/图片）
- **API速率限制**: 每用户 100 req/min（防滥用）

**外部API依赖**:
- USDA API免费额度: 1000 req/hour
- OCR服务成本: 按页计费
- LLM调用成本: 优化prompt降低token消耗

**预算约束** (MVP阶段):
- Vercel Hobby Plan: $0/月（后续升级Pro）
- AWS RDS: <$50/月
- 外部API: <$100/月

## External Dependencies

**必需服务**:

1. **USDA FoodData Central API**
   - 用途: 食物营养成分数据查询
   - 认证: API Key (免费)
   - 文档: https://fdc.nal.usda.gov/api-guide.html

2. **OCR服务** (选型中)
   - 候选: Tesseract.js (开源) / Azure OCR / AWS Textract
   - 用途: 体检报告结构化识别

3. **OpenAI API / Anthropic Claude API**
   - 用途: 食谱生成、营养建议（后期功能）
   - 认证: API Key
   - 成本优化: 使用缓存 + prompt工程

4. **NextAuth.js Providers**
   - 支持: Google OAuth, Apple Sign-in
   - 用途: 用户认证

**可选集成** (Roadmap):

5. **电商平台API** (阶段2)
   - 山姆会员商店API (待确认可用性)
   - 盒马鲜生API (需企业认证)
   - 叮咚买菜API (合作洽谈中)

6. **可穿戴设备SDK** (阶段3)
   - Apple HealthKit (iOS)
   - Huawei Health SDK (Android)
   - Google Fit API (Android)

7. **体检机构API** (阶段4)
   - 美年大健康、爱康国宾等（需商务合作）

**第三方库依赖管理**:
- 使用 Renovate Bot 自动检测依赖更新
- 主要依赖锁定小版本（如 `^15.0.0` → `~15.0.0`）
- 安全漏洞自动扫描: Snyk / GitHub Dependabot

---

**最后更新**: 2025-10-29
**维护者**: Ronn Huang
