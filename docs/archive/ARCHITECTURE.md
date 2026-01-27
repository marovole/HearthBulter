# 🏗️ HearthBulter 架构说明

**架构类型**: 纯 Cloudflare Pages + Supabase 架构  
**更新日期**: 2025-11-08  
**版本**: v2.0 (Cloudflare Migration)

---

## 📐 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                  用户浏览器 / 移动设备                         │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare 全球 CDN 网络                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Cloudflare Pages (静态资源托管)              │   │
│  │  - Next.js 静态导出 (HTML/CSS/JS)                    │   │
│  │  - 全球边缘节点缓存                                  │   │
│  │  - 自动 SSL/TLS                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Cloudflare Functions (无服务器 API)          │   │
│  │  - API 端点处理                                      │   │
│  │  - 边缘计算                                          │   │
│  │  - 自动扩展                                          │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
┌──────────────────┐    ┌──────────────────────┐
│  Supabase 平台   │    │   第三方 API 服务    │
│                  │    │                      │
│ ┌──────────────┐ │    │ - OpenAI GPT-4      │
│ │ PostgreSQL   │ │    │ - USDA FoodData     │
│ │ (71 张表)    │ │    │ - OCR 服务          │
│ │ 500MB 免费   │ │    │ - 微信支付          │
│ └──────────────┘ │    └──────────────────────┘
│                  │
│ ┌──────────────┐ │
│ │   Storage    │ │
│ │ (文件存储)   │ │
│ │ 1GB 免费     │ │
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │     Auth     │ │
│ │  (认证服务)  │ │
│ └──────────────┘ │
└──────────────────┘
```

---

## 🎯 架构特点

### 1. 静态优先 (Static First)

```
Next.js App → Static Export → Cloudflare Pages
```

**优势**:

- ⚡ 极快的首屏加载
- 🌐 全球 CDN 加速
- 💰 零成本静态托管
- 🔒 天然防 DDoS

**实现**:

```javascript
// next.config.js
export default {
  output: "export", // 静态导出模式
  trailingSlash: false,
};
```

### 2. 边缘计算 (Edge Computing)

```
API 请求 → Cloudflare Functions → 边缘节点处理
```

**优势**:

- 🚀 低延迟响应
- 🔄 自动扩展
- 💵 按使用付费（免费额度充足）

**实现**:

```typescript
// functions/api/health.ts
export async function onRequest(context) {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "content-type": "application/json" },
  });
}
```

### 3. Serverless 数据库

```
应用 → Prisma ORM → Supabase PostgreSQL
```

**优势**:

- 🎁 免费 500MB 数据库
- 🔧 自动备份和扩展
- 🔌 连接池管理
- 📊 实时监控

**连接配置**:

```env
# Transaction Pooler (生产环境 - 高性能)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres

# Session Pooler (开发环境 - 支持 DDL)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:5432/postgres
```

---

## 📦 技术栈详解

### 前端层

| 技术                | 版本   | 用途                  |
| ------------------- | ------ | --------------------- |
| **Next.js**         | 15.0+  | React 框架 + 静态导出 |
| **React**           | 18.3+  | UI 库                 |
| **TypeScript**      | 5.6+   | 类型安全              |
| **Tailwind CSS**    | 4.x    | 样式框架              |
| **shadcn/ui**       | Latest | UI 组件库             |
| **Zustand**         | 5.0+   | 状态管理              |
| **React Hook Form** | 7.x    | 表单管理              |
| **Zod**             | 3.x    | Schema 验证           |

### 数据层

| 技术                 | 版本   | 用途               |
| -------------------- | ------ | ------------------ |
| **Supabase**         | Latest | 后端即服务 (BaaS)  |
| **PostgreSQL**       | 16     | 关系型数据库       |
| **Prisma**           | 6.x    | ORM + 类型生成     |
| **Supabase Storage** | Latest | 对象存储 (S3 兼容) |

### API 层

| 技术                     | 版本   | 用途         |
| ------------------------ | ------ | ------------ |
| **Cloudflare Functions** | Latest | 无服务器函数 |
| **NextAuth.js**          | 5.x    | 认证授权     |
| **OpenAI**               | 4.x    | AI 营养建议  |
| **USDA API**             | -      | 营养数据     |

### 部署层

| 服务                 | 用途                 | 免费额度               |
| -------------------- | -------------------- | ---------------------- |
| **Cloudflare Pages** | 静态托管 + Functions | 无限请求，500次构建/月 |
| **Supabase**         | 数据库 + 存储        | 500MB 数据库，1GB 存储 |
| **GitHub Actions**   | CI/CD                | 2000分钟/月            |

---

## 🗄️ 数据库架构

### 表结构概览 (71 张表)

```
用户和认证 (5 张表)
├── users                    # 用户账户
├── families                 # 家庭
├── family_members           # 家庭成员
├── family_invitations       # 家庭邀请
└── user_consents            # 用户同意协议

健康数据 (15 张表)
├── health_data              # 健康指标
├── health_goals             # 健康目标
├── health_reminders         # 健康提醒
├── health_reports           # 健康报告
├── health_scores            # 健康评分
├── health_anomalies         # 异常检测
├── medical_reports          # 医疗报告
├── medical_indicators       # 医疗指标
├── allergies                # 过敏史
├── dietary_preferences      # 饮食偏好
├── tracking_streaks         # 打卡记录
├── trend_data               # 趋势数据
├── auxiliary_trackings      # 辅助追踪
├── device_connections       # 设备连接
└── wearable_data            # 可穿戴数据

营养和食谱 (20 张表)
├── foods                    # 食物数据库
├── meals                    # 餐食
├── meal_ingredients         # 餐食成分
├── meal_plans               # 饮食计划
├── meal_logs                # 饮食记录
├── meal_log_foods           # 记录食物
├── food_photos              # 食物照片
├── daily_nutrition_targets  # 营养目标
├── recipes                  # 食谱
├── recipe_ingredients       # 食谱配料
├── recipe_instructions      # 烹饪步骤
├── recipe_favorites         # 收藏
├── recipe_views             # 浏览记录
├── recipe_ratings           # 评分
├── ingredient_substitutions # 配料替代
├── quick_templates          # 快速模板
└── template_foods           # 模板食物

购物和预算 (10 张表)
├── shopping_lists           # 购物清单
├── shopping_items           # 购物项目
├── shopping_list_shares     # 清单分享
├── budgets                  # 预算
├── spendings                # 支出
├── price_histories          # 价格历史
├── savings_recommendations  # 省钱建议
├── budget_alerts            # 预算提醒
├── platform_accounts        # 平台账户
└── platform_products        # 平台商品

库存管理 (4 张表)
├── inventory_items          # 库存项目
├── inventory_usages         # 库存使用
├── waste_logs               # 浪费记录
└── orders                   # 订单

协作和社区 (12 张表)
├── tasks                    # 任务
├── activities               # 活动
├── comments                 # 评论
├── family_goals             # 家庭目标
├── shared_contents          # 共享内容
├── share_tracking           # 分享追踪
├── leaderboard_entries      # 排行榜
├── community_posts          # 社区帖子
├── community_comments       # 社区评论
├── achievements             # 成就
├── _ParticipatedGoals       # 目标参与（关联表）
└── _AchievementShares       # 成就分享（关联表）

通知系统 (4 张表)
├── notifications            # 通知
├── notification_preferences # 通知偏好
├── notification_logs        # 通知日志
└── notification_templates   # 通知模板

AI 和分析 (3 张表)
├── ai_conversations         # AI 对话
├── ai_advice                # AI 建议
└── prompt_templates         # 提示模板
```

### 核心表设计示例

**users (用户表)**:

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  password      TEXT,
  role          user_role DEFAULT 'USER',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**health_data (健康数据表)**:

```sql
CREATE TABLE health_data (
  id              TEXT PRIMARY KEY,
  member_id       TEXT NOT NULL REFERENCES family_members(id),
  date            DATE NOT NULL,
  weight          DECIMAL(5,2),
  body_fat        DECIMAL(4,2),
  muscle_mass     DECIMAL(5,2),
  bmr             INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 数据流

### 1. 用户注册流程

```
用户输入 → NextAuth.js → Supabase PostgreSQL
                ↓
        创建 family_members
                ↓
        初始化 health_goals
                ↓
        返回 JWT Token
```

### 2. 健康数据同步

```
可穿戴设备 → API Webhook → Cloudflare Functions
                              ↓
                    验证并处理数据
                              ↓
                   Prisma ORM → Supabase
                              ↓
                    更新 health_data 表
                              ↓
                   触发 AI 分析 (异步)
```

### 3. 食谱生成

```
用户请求 → Cloudflare Functions → 读取用户健康数据
                                      ↓
                              调用 OpenAI API
                                      ↓
                              生成个性化食谱
                                      ↓
                         匹配 foods 数据库
                                      ↓
                         保存到 meal_plans
                                      ↓
                         返回食谱给用户
```

### 4. 文件上传 (体检报告)

```
用户上传 PDF/图片 → Cloudflare Functions
                         ↓
              Supabase Storage (保存原文件)
                         ↓
              调用 OCR API (识别文字)
                         ↓
              AI 解析医疗指标
                         ↓
              保存到 medical_reports
                         ↓
              更新 health_data
```

---

## 🔐 安全架构

### 1. 认证授权

```
NextAuth.js (JWT) + Supabase Auth
```

**实现**:

- Session 基于 JWT
- HttpOnly Cookie 防 XSS
- CSRF Token 保护
- Rate Limiting

### 2. 数据访问控制

```
Row Level Security (RLS) 策略
```

**示例策略**:

```sql
-- 用户只能访问自己的健康数据
CREATE POLICY "Users can view own health data"
ON health_data FOR SELECT
USING (
  member_id IN (
    SELECT id FROM family_members
    WHERE family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid()
    )
  )
);
```

### 3. API 安全

- ✅ HTTPS Only
- ✅ CORS 配置
- ✅ CSP Headers
- ✅ Rate Limiting
- ✅ Input Validation (Zod)

---

## 📊 性能优化

### 1. 静态生成 (SSG)

```typescript
// 页面预渲染
export default function HomePage() {
  // 静态页面，CDN 缓存
}
```

### 2. 数据库优化

```typescript
// Prisma 查询优化
const data = await prisma.healthData.findMany({
  where: { memberId },
  select: {
    id: true,
    weight: true,
    date: true,
  }, // 只查询需要的字段
  take: 30, // 限制结果数
  orderBy: { date: "desc" },
});
```

### 3. 连接池

```env
# Transaction Pooler - 高性能查询
DATABASE_URL=...pooler.supabase.com:6543/postgres
```

### 4. CDN 缓存

- 静态资源自动缓存
- Edge 节点全球分布
- 自动 Gzip/Brotli 压缩

---

## 🚀 部署架构

### CI/CD 流程

```
开发者提交代码
      ↓
GitHub Push
      ↓
GitHub Actions (可选)
├── 运行测试
├── 类型检查
└── 代码质量检查
      ↓
Cloudflare Pages 自动检测
      ↓
自动构建 (pnpm build:cloudflare)
      ↓
部署到 Cloudflare 边缘网络
      ↓
自动 HTTPS 配置
      ↓
生产环境上线 🎉
```

### 环境管理

| 环境     | Git 分支   | 域名                            | 数据库               |
| -------- | ---------- | ------------------------------- | -------------------- |
| **生产** | main       | hearthbulter.pages.dev          | Supabase Production  |
| **预览** | feature/\* | [branch].hearthbulter.pages.dev | Supabase Production  |
| **开发** | -          | localhost:3000                  | Supabase Development |

---

## 💰 成本分析

### 免费额度（每月）

| 服务                     | 免费额度            | 超出成本       |
| ------------------------ | ------------------- | -------------- |
| **Cloudflare Pages**     | 无限请求，500次构建 | 免费           |
| **Cloudflare Functions** | 100,000 请求/天     | $0.50/百万请求 |
| **Supabase 数据库**      | 500MB               | $25/月 (8GB)   |
| **Supabase 存储**        | 1GB                 | $0.021/GB      |
| **Supabase 带宽**        | 2GB                 | $0.09/GB       |
| **GitHub Actions**       | 2000 分钟           | $0.008/分钟    |

**预估月成本**: $0 (完全在免费额度内)

---

## 📈 可扩展性

### 水平扩展

- ✅ Cloudflare Pages 自动扩展
- ✅ Supabase 连接池管理
- ✅ 无状态函数设计

### 垂直扩展

- ⬆️ Supabase 升级到 Pro ($25/月)
- ⬆️ Cloudflare 升级到 Pro ($20/月)

### 未来架构演进

1. **微服务化** (如需要):
   - 拆分 AI 服务到独立 Cloudflare Worker
   - 使用 Cloudflare Queue 实现异步任务

2. **多区域部署**:
   - Supabase 多区域复制
   - Cloudflare 已自动全球部署

3. **缓存层**:
   - Cloudflare KV (边缘缓存)
   - Upstash Redis (会话缓存)

---

## 🔍 监控和日志

### 应用监控

- **Cloudflare Analytics**: 流量、性能
- **Supabase Dashboard**: 数据库查询、慢查询
- **Sentry**: 错误追踪（可选）

### 日志系统

```typescript
// Cloudflare Functions 日志
console.log("[INFO]", "User logged in", { userId });

// Supabase 自动日志
// Dashboard → Logs → Postgres Logs
```

---

## 📚 相关文档

- **部署指南**: `DEPLOYMENT.md`
- **迁移报告**: `CLOUDFLARE_MIGRATION_COMPLETE.md`
- **Supabase 配置**: `SUPABASE_MIGRATION_SUCCESS.md`
- **开发指南**: `CLAUDE.md`
- **快速开始**: `QUICK_START_CLOUDFLARE_SUPABASE.md`

---

## ✅ 架构优势总结

✅ **完全免费** - Cloudflare + Supabase 免费额度充足  
✅ **全球加速** - Cloudflare 300+ 边缘节点  
✅ **自动扩展** - 无需管理服务器  
✅ **开发友好** - 本地开发体验好  
✅ **类型安全** - TypeScript + Prisma  
✅ **安全可靠** - RLS + JWT + HTTPS  
✅ **易于维护** - 少量依赖，简单架构

---

**更新**: 2025-11-08 - 完成从 Vercel 到 Cloudflare Pages 的迁移
