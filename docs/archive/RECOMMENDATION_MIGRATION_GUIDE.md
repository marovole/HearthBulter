# 推荐系统数据库迁移指南

## 概述

本文档记录了推荐系统相关数据库迁移的执行步骤和验证方法。

## 迁移文件

- **迁移文件**: `prisma/migrations/update_recommendation_migrations.sql`
- **创建时间**: 2025-10-31
- **目标**: 确保推荐系统相关表结构和索引正确创建

## 迁移内容

### 1. 清理遗留表结构

- 删除 PascalCase 命名的遗留表（如果存在）
- 包括: `RecipeRating`, `RecipeFavorite`, `RecipeView`, `IngredientSubstitution`, `UserPreference`

### 2. 创建枚举类型

- `Difficulty`: EASY, MEDIUM, HARD
- `RecipeCategory`: MAIN_DISH, SIDE_DISH, SOUP, SALAD, DESSERT, SNACK, BREAKFAST, BEVERAGE, SAUCE, OTHER
- `RecipeStatus`: DRAFT, PUBLISHED, ARCHIVED, DELETED
- `CostLevel`: LOW, MEDIUM, HIGH
- `SubstitutionType`: ALLERGY, STOCK_OUT, BUDGET, PREFERENCE, NUTRITION, SEASONAL
- `SpiceLevel`: NONE, LOW, MEDIUM, HIGH, EXTREME
- `SweetnessLevel`: NONE, LOW, MEDIUM, HIGH, EXTREME
- `SaltinessLevel`: LOW, MEDIUM, HIGH, EXTREME
- `DietaryType`: OMNIVORE, VEGETARIAN, VEGAN, PESCETARIAN, KETO, PALEO, MEDITERRANEAN, LOW_FODMAP, CUSTOM

### 3. 创建核心表

- `recipes`: 食谱主表
- `recipe_ingredients`: 食谱食材关联表
- `recipe_instructions`: 食谱制作步骤表
- `recipe_ratings`: 食谱评分表
- `recipe_favorites`: 食谱收藏表
- `recipe_views`: 食谱浏览记录表
- `ingredient_substitutions`: 食材替换表
- `user_preferences`: 用户偏好表

### 4. 创建索引

- 为所有查询频繁的字段创建索引
- 为外键关系创建索引
- 为唯一约束创建索引

## 执行步骤

### 前置条件

1. 确保数据库连接正常
2. 备份数据库（生产环境必须）
3. 确认 Prisma schema 与迁移文件一致

### 执行迁移

#### 方法一: 使用 Prisma Migrate (推荐)

```bash
# 检查迁移状态
npx prisma migrate status

# 应用迁移
npx prisma migrate deploy

# 验证迁移结果
npx prisma migrate status
```

#### 方法二: 直接执行 SQL

```bash
# 使用 psql 执行迁移文件
psql $DATABASE_URL -f prisma/migrations/update_recommendation_migrations.sql
```

#### 方法三: 使用 Prisma Push (开发环境)

```bash
# 同步 schema 到数据库
npx prisma db push
```

## 验证方法

### 1. 检查表结构

```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'recipes', 'recipe_ingredients', 'recipe_instructions',
  'recipe_ratings', 'recipe_favorites', 'recipe_views',
  'ingredient_substitutions', 'user_preferences'
);

-- 检查表结构
\d recipes
\d recipe_ingredients
-- ... 其他表
```

### 2. 检查索引

```sql
-- 检查索引是否创建成功
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'recipes', 'recipe_ingredients', 'recipe_instructions',
  'recipe_ratings', 'recipe_favorites', 'recipe_views',
  'ingredient_substitutions', 'user_preferences'
);
```

### 3. 检查外键约束

```sql
-- 检查外键约束
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

### 4. 使用 Prisma 验证

```bash
# 生成 Prisma Client (验证 schema)
npx prisma generate

# 检查数据库状态
npx prisma db pull
npx prisma generate
```

## 故障排除

### 常见错误

#### 1. P1001: 无法连接数据库

**原因**: 数据库连接配置错误或数据库服务不可用
**解决**:

- 检查 `DATABASE_URL` 环境变量
- 确认数据库服务运行状态
- 检查网络连接和防火墙设置

#### 2. 表已存在错误

**原因**: 迁移文件幂等性处理不当
**解决**:

- 使用 `IF NOT EXISTS` 语法
- 检查现有表结构，必要时手动删除

#### 3. 外键约束失败

**原因**: 引用的表不存在或数据不一致
**解决**:

- 确保所有引用的表都已创建
- 检查数据完整性
- 使用 `ADD CONSTRAINT IF NOT EXISTS`

#### 4. 权限不足

**原因**: 数据库用户权限不够
**解决**:

- 确认用户有 CREATE、ALTER 权限
- 联系数据库管理员授权

### 回滚方法

#### 方法一: 使用 Prisma 回滚

```bash
# 回滚到上一个迁移
npx prisma migrate reset
```

#### 方法二: 手动回滚

```sql
-- 删除创建的表
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS ingredient_substitutions CASCADE;
DROP TABLE IF EXISTS recipe_views CASCADE;
DROP TABLE IF EXISTS recipe_favorites CASCADE;
DROP TABLE IF EXISTS recipe_ratings CASCADE;
DROP TABLE IF EXISTS recipe_instructions CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;

-- 删除枚举类型
DROP TYPE IF EXISTS "DietaryType";
DROP TYPE IF EXISTS "SaltinessLevel";
DROP TYPE IF EXISTS "SweetnessLevel";
DROP TYPE IF EXISTS "SpiceLevel";
DROP TYPE IF EXISTS "SubstitutionType";
DROP TYPE IF EXISTS "CostLevel";
DROP TYPE IF EXISTS "RecipeStatus";
DROP TYPE IF EXISTS "RecipeCategory";
DROP TYPE IF EXISTS "Difficulty";
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Database Migration

on:
  push:
    paths:
      - "prisma/migrations/**"
      - "prisma/schema.prisma"

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run database migration
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Verify migration
        run: npx prisma migrate status
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 监控和维护

### 1. 性能监控

- 监控查询性能
- 检查索引使用情况
- 定期分析慢查询日志

### 2. 数据完整性

- 定期检查外键约束
- 验证数据一致性
- 监控表大小增长

### 3. 备份策略

- 迁移前必须备份
- 定期全量备份
- 测试恢复流程

## 联系方式

如有问题，请联系:

- 数据库管理员
- 开发团队
- DevOps 团队

---

**注意**: 本文档应与实际迁移执行情况同步更新。每次迁移后请更新执行状态和结果。
