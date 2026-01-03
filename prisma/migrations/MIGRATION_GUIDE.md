# Health Butler vNext v0.3.0 - 数据库迁移指南

## 概述

此迁移添加了 **管家收件箱** 和 **每日复盘** 功能所需的数据模型。

**迁移 ID**: `20260102_add_health_butler_vnext_models`
**创建日期**: 2026-01-02

---

## 迁移内容

### 1. 扩展 `tasks` 表

| 字段               | 类型      | 说明                                    |
| ------------------ | --------- | --------------------------------------- |
| `metadata`         | JSONB     | 存储任务依据、评分、跳过原因等          |
| `actionUrl`        | TEXT      | 快速操作链接（如购物清单页面）          |
| `estimatedMinutes` | INTEGER   | 预计耗时（分钟）                        |
| `skipReason`       | TEXT      | 跳过原因                                |
| `skippedAt`        | TIMESTAMP | 跳过时间                                |
| `relatedItemId`    | TEXT      | 关联项ID（如库存ID、健康记录ID）        |
| `relatedItemType`  | TEXT      | 关联项类型（INVENTORY, HEALTH_DATA 等） |

### 2. 创建 `daily_reviews` 表

| 字段              | 类型      | 说明          |
| ----------------- | --------- | ------------- |
| `id`              | TEXT (PK) | 主键          |
| `familyId`        | TEXT (FK) | 家庭ID        |
| `memberId`        | TEXT (FK) | 成员ID        |
| `reviewDate`      | TIMESTAMP | 复盘日期      |
| `totalTasks`      | INTEGER   | 总任务数      |
| `completedTasks`  | INTEGER   | 已完成任务数  |
| `skippedTasks`    | INTEGER   | 已跳过任务数  |
| `overdueTasks`    | INTEGER   | 逾期任务数    |
| `summary`         | TEXT      | AI 生成的摘要 |
| `keyAchievements` | TEXT      | 关键成就      |
| `deviations`      | JSONB     | 偏差分析      |
| `tomorrowActions` | JSONB     | 明日建议行动  |

### 3. 新增索引

- `tasks_relatedItemId_idx` - 关联项查询优化
- `tasks_skippedAt_idx` - 跳过任务查询优化
- `daily_reviews_familyId_idx` - 家庭复盘查询
- `daily_reviews_memberId_idx` - 成员复盘查询
- `daily_reviews_reviewDate_idx` - 日期查询优化
- `daily_reviews_member_review_date_unique_idx` - 唯一约束（防止重复复盘）

---

## 应用迁移

### 方式一：Prisma Migrate（推荐）

适用于本地开发环境。

```bash
# 1. 确保 .env.local 中配置了 DATABASE_URL
# DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:5432/postgres"

# 2. 应用迁移
pnpm prisma migrate deploy

# 3. 重新生成 Prisma Client
pnpm prisma generate
```

### 方式二：Supabase SQL Editor（推荐生产环境）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目：`ppmliptjvzurewsiwswb`
3. 进入 **SQL Editor**
4. 复制并执行 `migration.sql` 文件内容

### 方式三：psql 命令行

```bash
psql $DATABASE_URL < prisma/migrations/20260102_add_health_butler_vnext_models/migration.sql
```

---

## 验证迁移

### 检查表结构

```sql
-- 检查 tasks 表新字段
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('metadata', 'actionUrl', 'estimatedMinutes', 'skipReason', 'skippedAt', 'relatedItemId', 'relatedItemType');

-- 检查 daily_reviews 表
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'daily_reviews';
```

### 使用 Prisma Studio

```bash
pnpm prisma studio
```

打开 `http://localhost:5555` 查看数据模型。

---

## 回滚迁移

```sql
-- 删除 daily_reviews 表
DROP TABLE IF EXISTS "daily_reviews" CASCADE;

-- 删除 tasks 表新字段
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "actionUrl";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "estimatedMinutes";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "skipReason";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "skippedAt";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "relatedItemId";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "relatedItemType";

-- 删除索引
DROP INDEX IF EXISTS "tasks_relatedItemId_idx";
DROP INDEX IF EXISTS "tasks_skippedAt_idx";
```

---

## 获取 Supabase DATABASE_URL

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目
3. 进入 **Settings > Database**
4. 找到 **Connection string > URI**
5. 格式：`postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:5432/postgres`

**提示**: 密码是在项目创建时设置的，可以在 Settings > Database 中重置。

---

## 故障排除

### 错误: "relation already exists"

表示表已存在，可能是之前应用过迁移。检查是否需要回滚后重新应用。

### 错误: "column already exists"

表示字段已存在，可以跳过此迁移或手动检查字段是否正确。

### 错误: "foreign key constraint cannot be implemented"

确保 `families` 和 `family_members` 表已存在且结构正确。

---

## 下一步

迁移完成后，可以开始使用新功能：

1. 访问 `/dashboard/inbox` 查看管家收件箱
2. 配置 Cloudflare Cron Triggers 实现定时任务
3. 测试任务完成/跳过功能
