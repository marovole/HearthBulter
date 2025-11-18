## Why

当前系统使用 Prisma + AWS RDS PostgreSQL 作为数据库层。为了降低运维成本、提升边缘计算能力和地理分布性能，同时利用 Supabase 的实时订阅和存储功能，需要将数据库访问层从 Prisma 迁移到原生 Supabase PostgreSQL 解决方案。

## What Changes

### 架构变更
- **数据库连接层**: 从 Prisma ORM 迁移到 Supabase PostgreSQL + @supabase/supabase-js
- **部署平台**: 从 AWS RDS 迁移到 Supabase 托管 PostgreSQL
- **访问方式**: 通过 Supabase Client 直接操作数据库，弃用 Prisma ORM 查询

### 受影响的 Specs
- **ecommerce-integration**: SKU Matcher、Price Comparator 服务需重构为 Supabase 查询
- **health-analytics-reporting**: Trend Analyzer 服务需迁移至 Supabase
- **social-sharing**: Leaderboard 和 Achievements API 需重构权限验证逻辑
- **nutrition-tracking**: 营养计算和食物查询 API 需迁移
- **data-access-layer**: 新增数据库访问层规范（原 Prisma 模式）

### **BREAKING CHANGES**
- Prisma Schema 文件保留作为数据库 Schema 管理，但应用层不再使用 Prisma Client
- API 查询语法变更：从 Prisma ORM 语法改为原生 SQL 或 Supabase Query Builder
- 环境变量：DATABASE_URL 格式变更为 Supabase Connection String

## Impact

### 受影响的 Code
- `src/lib/db/prisma.client.ts`: 废弃，替换为 Supabase Client
- `src/app/api/**/*.ts`: 7+ API 端点需要重构查询逻辑（ecommerce/*, analytics/trends, social/leaderboard, social/achievements, foods/calculate-nutrition）
- `src/lib/services/*`: 服务层重构（SKU Matcher、Price Comparator、Trend Analyzer）
- `src/lib/repositories/*`: 如果使用，需要重命名为 Supabase 适配器

### 新增 Code
- `src/lib/db/supabase.client.ts`: Supabase Client 初始化
- `supabase/migrations/*`: Supabase Migration SQL 文件
- `supabase/functions/*`: Edge Functions（如需复杂业务逻辑）
- Supabase Views: v_family_member_stats, v_social_leaderboard, v_ecommerce_prices, v_nutrition_summary, v_analytics_trends

### 性能考虑
- 查询性能：初期可能存在回归风险，通过创建 Supabase Views 和本地缓存优化
- 边缘计算：Supabase 边缘网络提供更低延迟（全球 CDN）
- 成本优化：从 AWS RDS 付费实例迁移到 Supabase 免费套餐（初期）

### 测试影响
- 所有依赖数据库的单元测试需要重构
- 集成测试环境需要配置 Supabase 测试数据库
- E2E 测试无需修改（API 接口保持不变）
