<p align="center">
  <img src="public/logo.svg" alt="Health Butler Logo" width="120" height="120" />
</p>

<h1 align="center">🩺 Health Butler（健康管家）</h1>

<p align="center">
  <strong>基于健康数据与电商库存的动态饮食引擎</strong>
</p>

<p align="center">
  <a href="https://hearthbulter.pages.dev">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/marovole/HearthBulter/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/marovole/HearthBulter/ci.yml?branch=main&style=flat-square&logo=github-actions&label=CI%2FCD" alt="CI/CD Status" />
  </a>
  <a href="https://hearthbulter.pages.dev">
    <img src="https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-orange?style=flat-square&logo=cloudflare" alt="Cloudflare Pages" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/Next.js-14.2.32-black?style=flat-square&logo=next.js" alt="Next.js" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" alt="React" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/TypeScript-5.6+-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License" />
  </a>
</p>

<p align="center">
  <a href="#-核心特性">核心特性</a> •
  <a href="#-技术架构">技术架构</a> •
  <a href="#-部署状态">部署状态</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-项目结构">项目结构</a> •
  <a href="#-开发指南">开发指南</a>
</p>

---

> 💡 **让个人与家庭的健康管理从「主观感性」走向「客观数据驱动」**

**Health Butler** 是一个开源的家庭健康管理平台，通过 AI 营养规划、智能食谱生成和电商自动采购，帮助家庭建立可持续的健康管理习惯。项目采用 **Cloudflare Pages + Supabase** 的 Serverless 架构，实现**完全免费**部署。

---

## 📊 部署状态

| 环境         | 状态      | URL                                                      | 说明                           |
| ------------ | --------- | -------------------------------------------------------- | ------------------------------ |
| **生产环境** | ✅ 运行中 | [hearthbulter.pages.dev](https://hearthbulter.pages.dev) | 主站点，自动从 `main` 分支部署 |
| **预览环境** | ✅ 可用   | `*.hearthbulter.pages.dev`                               | 每个 PR 自动生成预览链接       |
| **数据库**   | ✅ 在线   | Supabase PostgreSQL                                      | 71 张数据表，500MB 免费配额    |
| **CI/CD**    | ✅ 激活   | GitHub Actions                                           | 7 个 Job 自动化流水线          |

### CI/CD 流水线

```
Push to main → 代码质量检查 → TypeScript 类型检查 → 单元测试 → 构建检查 → 安全审计 → 自动部署
```

| Job                | 说明                       | 超时  |
| ------------------ | -------------------------- | ----- |
| `quality-check`    | ESLint + Prettier 格式检查 | 10min |
| `type-check`       | TypeScript 类型检查        | 10min |
| `test`             | Jest 单元测试 + 覆盖率报告 | 15min |
| `build`            | Next.js 产物构建           | 20min |
| `cloudflare-build` | Cloudflare Pages 构建测试  | 25min |
| `security`         | npm audit 安全审计         | 10min |
| `final-check`      | 最终状态汇总               | -     |

---

## ✨ 核心特性

### 👨‍👩‍👧‍👦 家庭档案管理

- **多成员档案**: 支持家庭成员独立健康档案（性别、年龄、身高、体重、健康目标）
- **健康目标设定**: 减重/增肌/维持/疾病管理等个性化目标
- **过敏与禁忌**: 食材过敏记录，智能避开不适宜食材
- **家庭邀请系统**: 安全的邀请链接机制，家人协同管理健康

### 🧬 健康数据追踪

- **全面健康指标**: 体重、体脂、血压、血糖、心率、睡眠等数据记录
- **体检报告 OCR**: Tesseract.js 智能识别体检报告，自动提取关键指标
- **可穿戴设备同步**: Apple HealthKit、华为健康 SDK 数据自动同步
- **健康评分系统**: 基于多维度指标计算综合健康评分
- **异常检测**: AI 智能识别健康数据异常波动

### 🍎 营养数据库

- **USDA 数据对接**: 5000+ 食物营养成分数据库
- **宏量营养素**: 精确计算碳水、蛋白质、脂肪及热量
- **微量营养素**: 维生素、矿物质摄入追踪
- **食物搜索**: 智能搜索与自定义食物添加

### 🍱 智能食谱规划

- **AI 食谱生成**: 基于健康目标、库存食材、家庭偏好智能生成食谱
- **周期食谱计划**: 支持 7 天/30 天食谱自动规划
- **食谱管理**: 食谱收藏、评分、评论功能
- **膳食追踪**: 每日餐饮记录，营养摄入实时追踪
- **智能替代**: 根据库存自动推荐食材替代方案

### 🛒 智能购物系统

- **一键生成清单**: 根据食谱计划和库存自动生成购物清单
- **SKU 智能匹配**: 自动匹配电商平台商品编码
- **价格对比**: 多平台价格比较，优选采购方案
- **预算管理**: 购物预算设定与支出追踪
- **去重优化**: 智能合并相同食材需求

### 📦 库存管理系统

- **食材库存追踪**: 实时记录家庭食材库存
- **保质期提醒**: 临期食材预警，减少浪费
- **消耗记录**: 食材使用历史追踪
- **浪费日志**: 记录食材浪费情况，优化采购决策

### 📊 数据分析与报告

- **健康趋势分析**: 可视化体重、体脂、营养摄入变化趋势
- **营养分析报告**: 详细营养摄入报告，识别营养缺口
- **周报生成**: 自动生成每周健康总结报告
- **成本分析**: 食品采购成本分析与优化建议

### 🤖 AI 智能服务

- **AI 健康顾问**: 智能对话，解答健康与营养问题
- **个性化推荐**: 基于健康数据与偏好智能推荐食谱和食材
- **AI 食谱优化**: 根据营养目标自动调整食谱配比
- **健康洞察**: AI 分析健康数据，提供个性化改善建议

### 🏆 社交与激励

- **成就系统**: 健康里程碑徽章，激励持续管理
- **排行榜**: 家庭成员健康数据对比与排名
- **成果分享**: 健康成就社交分享（可配置隐私）
- **社区互动**: 健康心得分享与交流

### 🔔 智能通知系统

- **多渠道通知**: 应用内推送、邮件通知
- **个性化设置**: 按类型、按时间精细化通知偏好
- **重要提醒**: 食材过期、服药提醒、健康目标提醒

### 📱 设备同步

- **Apple Health**: iOS 设备健康数据无缝同步
- **华为健康**: Android 设备健康数据集成
- **数据去重**: 智能合并多源数据，避免重复记录

---

## 🏗️ 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                       用户浏览器 / 移动设备                            │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ HTTPS (TLS 1.3)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Cloudflare 全球边缘网络 (300+ PoPs)                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            Cloudflare Pages (静态托管 + Functions)            │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────────┐   │   │
│  │  │  Static Assets  │  │  Edge Functions (API Routes)   │   │   │
│  │  │  HTML/CSS/JS    │  │  - 认证授权                      │   │   │
│  │  │  全球 CDN 缓存   │  │  - API 处理                      │   │   │
│  │  │  自动 Brotli    │  │  - 边缘计算                      │   │   │
│  │  └─────────────────┘  └─────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Supabase 平台   │   │  Upstash Redis   │   │  第三方 API 服务  │
│                  │   │                  │   │                  │
│ ┌──────────────┐ │   │ ┌──────────────┐ │   │ • OpenAI GPT-4  │
│ │ PostgreSQL   │ │   │ │ Session/Cache │ │   │ • USDA FoodData │
│ │ (71 张数据表) │ │   │ │ Rate Limit   │ │   │ • Tesseract OCR │
│ │ 500MB 免费   │ │   │ └──────────────┘ │   │ • 微信支付       │
│ └──────────────┘ │   └──────────────────┘   └──────────────────┘
│                  │
│ ┌──────────────┐ │
│ │   Storage    │ │
│ │ (文件存储)    │ │
│ │ 1GB 免费     │ │
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │   Auth       │ │
│ │ (认证服务)    │ │
│ └──────────────┘ │
└──────────────────┘
```

### 技术栈详情

<table>
<tr>
<td valign="top" width="50%">

#### 🎨 前端技术

| 技术                | 版本    | 用途                  |
| ------------------- | ------- | --------------------- |
| **Next.js**         | 14.2.32 | React 框架 + 静态导出 |
| **React**           | 18.3.1  | UI 渲染库             |
| **TypeScript**      | 5.6+    | 类型安全              |
| **Tailwind CSS**    | 3.4.18  | 原子化 CSS            |
| **shadcn/ui**       | Latest  | Radix UI 组件库       |
| **Zustand**         | 5.0+    | 轻量状态管理          |
| **React Hook Form** | 7.53+   | 表单处理              |
| **Zod**             | 3.23+   | Schema 验证           |
| **Framer Motion**   | 12.23+  | 动画效果              |
| **Recharts**        | 3.3+    | 数据可视化            |

</td>
<td valign="top" width="50%">

#### ⚙️ 后端技术

| 技术                     | 版本   | 用途           |
| ------------------------ | ------ | -------------- |
| **Cloudflare Functions** | Latest | Serverless API |
| **Prisma**               | 6.0+   | ORM + 类型生成 |
| **NextAuth.js**          | 4.24+  | 认证授权       |
| **Supabase**             | 2.80+  | BaaS 平台      |
| **PostgreSQL**           | 16     | 关系型数据库   |
| **Upstash Redis**        | 1.35+  | 边缘缓存       |
| **OpenAI**               | 6.7+   | AI 服务        |
| **Tesseract.js**         | 6.0+   | OCR 识别       |
| **Jose**                 | 6.1+   | JWT 处理       |
| **Nodemailer**           | 7.0+   | 邮件服务       |

</td>
</tr>
</table>

### 数据库架构

项目使用 **71 张 PostgreSQL 数据表**，按功能域组织：

| 功能域         | 表数量 | 核心表                                                                               |
| -------------- | ------ | ------------------------------------------------------------------------------------ |
| **用户和认证** | 5      | `users`, `families`, `family_members`, `family_invitations`, `user_consents`         |
| **健康数据**   | 15     | `health_data`, `health_goals`, `health_reports`, `health_scores`, `health_anomalies` |
| **营养和食谱** | 20     | `foods`, `meals`, `meal_plans`, `meal_logs`, `recipes`, `daily_nutrition_targets`    |
| **购物和预算** | 10     | `shopping_lists`, `shopping_items`, `budgets`, `price_histories`                     |
| **库存管理**   | 4      | `inventory_items`, `inventory_usages`, `waste_logs`, `orders`                        |
| **协作和社区** | 12     | `tasks`, `activities`, `community_posts`, `achievements`, `leaderboard_entries`      |
| **通知系统**   | 4      | `notifications`, `notification_preferences`, `notification_logs`                     |
| **AI 和分析**  | 3      | `ai_conversations`, `ai_advice`, `prompt_templates`                                  |

---

## 🎯 项目状态

### 模块开发进度

| 模块              | 状态      | 完成度 | 说明                                 |
| ----------------- | --------- | ------ | ------------------------------------ |
| 🔐 认证授权       | 🟢 已完成 | 100%   | NextAuth.js + JWT + OAuth (多提供商) |
| 👨‍👩‍👧‍👦 家庭档案管理   | 🟢 已完成 | 100%   | 成员信息、健康目标、过敏史、邀请系统 |
| 📊 健康数据管理   | 🟢 已完成 | 100%   | 体重/血压/血糖等指标 + 趋势可视化    |
| 🤖 AI 健康顾问    | 🟢 已完成 | 100%   | 智能对话 + 营养建议 + 健康洞察       |
| 🍎 营养数据库     | 🟢 已完成 | 90%    | USDA 食物数据对接 + 自定义食物管理   |
| 🍱 食谱规划引擎   | 🟢 已完成 | 85%    | AI 生成 + 周期计划 + 收藏评分        |
| 🛒 购物清单生成   | 🟢 已完成 | 80%    | 智能提取 + SKU 匹配 + 价格对比       |
| 📦 库存管理       | 🟢 已完成 | 80%    | 库存追踪 + 保质期提醒 + 消耗记录     |
| 🔔 通知系统       | 🟢 已完成 | 90%    | 多渠道推送 + 个性化偏好              |
| 📱 可穿戴设备同步 | 🟢 已完成 | 75%    | Apple HealthKit + 华为健康 SDK       |
| 📊 数据分析与报告 | 🟢 已完成 | 70%    | 健康趋势 + 营养分析 + 周报生成       |
| 📄 体检报告 OCR   | 🟢 已完成 | 70%    | Tesseract.js 识别 + 指标提取         |
| 🛍️ 电商集成       | 🟡 进行中 | 60%    | SKU 匹配 + 价格估算 + 电商服务       |
| 🏆 社交与激励     | 🟢 已完成 | 75%    | 成就徽章 + 排行榜 + 成果分享         |
| 📈 推荐系统       | 🟢 已完成 | 70%    | 个性化食谱 + 购物推荐 + 智能替代     |
| 📊 预算管理       | 🟢 已完成 | 70%    | 预算设定 + 支出追踪 + 成本分析       |

**图例**: 🟢 已完成 (80-100%) | 🟡 进行中 (20-79%) | 🔴 未开始 (0-19%)

### 代码统计

| 指标            | 数量     | 说明                |
| --------------- | -------- | ------------------- |
| **API 端点**    | 154+     | 完整的后端 API 覆盖 |
| **服务模块**    | 40+      | 核心业务逻辑服务    |
| **数据表**      | 71       | PostgreSQL 数据库表 |
| **Schema 代码** | 2400+ 行 | Prisma 数据模型定义 |
| **React 组件**  | 180+     | UI 组件 + 业务组件  |
| **代码模块**    | 260+     | 工具函数与库模块    |

---

## 💰 成本分析

本项目采用**完全免费**的 Serverless 架构部署：

| 服务                     | 免费额度                 | 我们的用量     | 状态    |
| ------------------------ | ------------------------ | -------------- | ------- |
| **Cloudflare Pages**     | 无限请求 / 500 次构建/月 | ~50 次构建/月  | ✅ 免费 |
| **Cloudflare Functions** | 100,000 请求/天          | ~1,000 请求/天 | ✅ 免费 |
| **Supabase PostgreSQL**  | 500MB                    | ~50MB          | ✅ 免费 |
| **Supabase Storage**     | 1GB                      | ~100MB         | ✅ 免费 |
| **Supabase Auth**        | 50,000 MAU               | ~100 用户      | ✅ 免费 |
| **GitHub Actions**       | 2,000 分钟/月            | ~200 分钟/月   | ✅ 免费 |
| **Upstash Redis**        | 10,000 请求/天           | ~500 请求/天   | ✅ 免费 |

**预计月成本**: **$0** (完全在免费额度内)

---

## 🚀 快速开始

### 前置要求

- **Node.js** 20.0+ LTS
- **pnpm** 8.0+ (推荐) 或 npm
- **PostgreSQL** 16+ (或使用 Supabase)

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/marovole/HearthBulter.git
cd HearthBulter

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入必要的配置

# 4. 生成 Prisma Client
pnpm db:generate

# 5. 启动开发服务器
pnpm dev
```

访问 `http://localhost:3000` 查看应用。

### 环境变量配置

<details>
<summary>📋 点击展开完整环境变量列表</summary>

```env
# ========== 必需配置 ==========

# 数据库连接 (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres

# NextAuth.js 配置
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters
NEXTAUTH_URL=http://localhost:3000  # 生产环境: https://your-domain.com

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# ========== 可选配置 ==========

# USDA 营养数据 API
USDA_API_KEY=your-usda-api-key

# Redis 缓存 (Upstash)
UPSTASH_REDIS_REST_URL=https://[ref].upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# OAuth 登录
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI 服务 (OpenAI)
OPENAI_API_KEY=your-openai-api-key

# 错误追踪 (Sentry)
SENTRY_DSN=your-sentry-dsn
```

</details>

---

## 📂 项目结构

```
HearthBulter/
├── .github/
│   └── workflows/          # GitHub Actions CI/CD
│       ├── ci.yml          # 主 CI 流水线
│       └── code-review.yml # 代码审查
├── prisma/
│   ├── schema.prisma       # 数据库 Schema (71 张表, 2400+ 行)
│   ├── seed.ts             # 种子数据脚本
│   └── migrations/         # 数据库迁移
├── public/                 # 静态资源
├── scripts/                # 构建和部署脚本 (100+ 脚本)
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # 认证页面
│   │   ├── api/            # API Routes
│   │   ├── dashboard/      # 仪表盘
│   │   ├── health-data/    # 健康数据
│   │   ├── meal-planning/  # 餐饮规划
│   │   ├── onboarding/     # 用户引导
│   │   └── shopping-list/  # 购物清单
│   ├── components/         # React 组件 (180+ 组件)
│   │   ├── ui/             # shadcn/ui 基础组件
│   │   └── features/       # 业务功能组件
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 核心库 (260+ 模块)
│   │   ├── db/             # Prisma Client
│   │   ├── services/       # 业务逻辑服务
│   │   └── utils/          # 工具函数
│   ├── schemas/            # Zod 验证 Schema
│   ├── services/           # 服务层
│   └── types/              # TypeScript 类型定义
├── supabase/               # Supabase 配置
├── tests/                  # 测试文件
│   ├── unit/               # 单元测试
│   └── e2e/                # E2E 测试
├── functions/              # Cloudflare Functions
├── middleware.ts           # Next.js 中间件
├── next.config.js          # Next.js 配置
├── tailwind.config.ts      # Tailwind 配置
├── wrangler.toml           # Cloudflare Wrangler 配置
└── package.json            # 项目依赖 (70+ 包)
```

---

## 🧪 开发指南

### 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器

# 代码质量
pnpm lint             # ESLint 检查
pnpm lint:fix         # ESLint 自动修复
pnpm format           # Prettier 格式化
pnpm type-check       # TypeScript 类型检查

# 测试
pnpm test             # 运行单元测试
pnpm test:watch       # Watch 模式
pnpm test:coverage    # 生成覆盖率报告
pnpm test:e2e         # E2E 测试

# 数据库
pnpm db:generate      # 生成 Prisma Client
pnpm db:push          # 推送 Schema 变更
pnpm db:migrate       # 运行迁移
pnpm db:studio        # 打开 Prisma Studio

# 部署
pnpm build:cloudflare # Cloudflare Pages 构建
pnpm deploy:cloudflare # 部署到 Cloudflare
```

### 代码审查

项目集成了自动化代码审查系统：

**审查维度**:

- 🔍 **复杂度分析**: 检测函数圈复杂度
- 🛡️ **类型安全**: 检查 TypeScript 类型覆盖
- 🔒 **安全扫描**: SQL 注入、XSS 等漏洞检测
- 🎨 **代码风格**: 统一命名规范
- ⚡ **性能优化**: 识别潜在性能问题

```bash
pnpm review           # 运行代码审查
pnpm review:report    # 生成审查报告
```

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构（不是新功能也不是 bug 修复）
perf: 性能优化
test: 添加测试
chore: 构建过程或辅助工具变动
```

---

## 🛣️ Roadmap

### MVP 阶段 ✅ (已完成)

- [x] 项目初始化 + 架构设计
- [x] Cloudflare Pages + Supabase 部署
- [x] 用户认证 (邮箱 + Google + GitHub OAuth)
- [x] 家庭档案管理 + 邀请系统
- [x] 健康数据录入与可视化
- [x] 营养数据库对接 (USDA)
- [x] AI 食谱生成引擎
- [x] 购物清单生成 + SKU 匹配
- [x] 库存管理系统
- [x] AI 健康顾问对话
- [x] 体检报告 OCR 识别
- [x] 可穿戴设备数据同步 (Apple HealthKit + 华为健康)

### 阶段 2 (进行中)

- [ ] 电商 API 深度集成（山姆/盒马/叮咚买菜）
- [ ] 高级营养分析报告
- [ ] 家庭健康趋势预测
- [ ] 食谱分享社区
- [ ] 多人协作食谱编辑

### 阶段 3 (规划中)

- [ ] 医疗机构合作（体检中心 API）
- [ ] 商业化（订阅制 + 电商返佣）
- [ ] 智能家居设备集成
- [ ] 微信小程序

### 阶段 4 (愿景)

- [ ] 企业健康管理解决方案
- [ ] 营养师在线咨询服务
- [ ] 跨境电商食品采购

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献流程

1. **Fork** 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 **Pull Request**

### 开发规范

- 🔍 所有 PR 必须通过 CI 检查
- 📝 核心功能需要编写单元测试（覆盖率 >80%）
- 📖 重要功能需要更新文档
- 💬 使用中文或英文提交 Issue

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 👨‍💻 作者

**Ronn Huang** - [GitHub](https://github.com/marovole)

---

## 🙏 致谢

感谢以下开源项目和服务：

- [Next.js](https://nextjs.org/) - React 全栈框架
- [Cloudflare Pages](https://pages.cloudflare.com/) - 边缘部署平台
- [Supabase](https://supabase.com/) - 开源 Firebase 替代
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库
- [Prisma](https://www.prisma.io/) - 下一代 ORM
- [USDA FoodData Central](https://fdc.nal.usda.gov/) - 营养数据 API

---

<p align="center">
  <strong>⭐ 如果这个项目对你有帮助，请给我们一个 Star！</strong>
</p>

<p align="center">
  Made with ❤️ in China
</p>
