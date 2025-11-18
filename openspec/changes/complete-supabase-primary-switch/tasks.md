# Implementation Tasks

## 0. 前置准备（5 分钟）
- [ ] 0.1 确认混合架构基础设施已完成（Repository、RPC 函数、类型系统）
- [ ] 0.2 备份当前 `.env` 配置
- [ ] 0.3 确认 Cloudflare Pages 环境变量已配置（DATABASE_URL, NEXTAUTH_*, SUPABASE_*）

## 1. 快速修复 - Health Check API（10 分钟）
- [ ] 1.1 修改 `src/app/api/health/route.ts`
  - [ ] 1.1.1 移除 `import { testDatabaseConnection } from '@/lib/db'`
  - [ ] 1.1.2 添加 `import { createClient } from '@supabase/supabase-js'`
  - [ ] 1.1.3 重写 `testDatabaseConnection` 逻辑使用 Supabase Client
  - [ ] 1.1.4 更新错误处理逻辑

- [ ] 1.2 本地测试
  - [ ] 1.2.1 运行 `pnpm dev`
  - [ ] 1.2.2 访问 `http://localhost:3000/api/health`
  - [ ] 1.2.3 验证返回 `{"database": "connected"}`

## 2. 创建 Supabase RPC 函数（1 小时）
- [ ] 2.1 创建 `supabase/migrations/002_create_rpc_functions.sql`

- [ ] 2.2 实现 `update_inventory_tx` RPC
  - [ ] 2.2.1 参数定义：`p_item_id`, `p_quantity_change`, `p_user_id`
  - [ ] 2.2.2 事务逻辑：更新 `inventory_items.quantity` + 创建 `inventory_notifications`
  - [ ] 2.2.3 使用 `FOR UPDATE NOWAIT` 防止并发冲突
  - [ ] 2.2.4 添加 `SET search_path = public, pg_temp` 安全保护

- [ ] 2.3 实现 `create_meal_log_tx` RPC
  - [ ] 2.3.1 参数定义：`p_meal_data` (JSONB), `p_health_data_update` (JSONB)
  - [ ] 2.3.2 事务逻辑：插入 `meal_logs` + 更新 `health_data`
  - [ ] 2.3.3 验证外键关系（`recipe_id`, `family_member_id`）

- [ ] 2.4 实现 `batch_mark_notifications_read` RPC
  - [ ] 2.4.1 参数定义：`p_notification_ids` (UUID[]), `p_user_id`
  - [ ] 2.4.2 批量更新：`UPDATE notifications SET is_read = true WHERE id = ANY(p_notification_ids)`
  - [ ] 2.4.3 权限验证：仅更新当前用户的通知

- [ ] 2.5 实现 `calculate_health_score` RPC
  - [ ] 2.5.1 参数定义：`p_family_member_id`, `p_date_range` (INTERVAL)
  - [ ] 2.5.2 查询逻辑：聚合 `health_data` 表（体重、睡眠、步数等）
  - [ ] 2.5.3 计算公式：加权平均（体重达标 30% + 睡眠质量 40% + 运动量 30%）
  - [ ] 2.5.4 返回类型：JSONB `{"score": 85, "breakdown": {...}}`

- [ ] 2.6 实现 `get_family_dashboard_stats` RPC
  - [ ] 2.6.1 参数定义：`p_family_id`
  - [ ] 2.6.2 查询逻辑：JOIN 多个表（`family_members`, `tasks`, `health_data`, `budget`）
  - [ ] 2.6.3 返回统计：成员数、待办任务数、本周健康评分、预算使用率
  - [ ] 2.6.4 返回类型：JSONB

- [ ] 2.7 实现 `get_recipe_recommendations` RPC
  - [ ] 2.7.1 参数定义：`p_family_member_id`, `p_goal_type`, `p_limit` (INT)
  - [ ] 2.7.2 查询逻辑：基于健康目标筛选食谱（`recipes` JOIN `health_goals`）
  - [ ] 2.7.3 排序：按匹配度（营养比例接近目标）+ 评分
  - [ ] 2.7.4 返回类型：TABLE（recipe_id, title, match_score）

- [ ] 2.8 实现 `process_achievement_unlock` RPC
  - [ ] 2.8.1 参数定义：`p_family_member_id`, `p_achievement_type`
  - [ ] 2.8.2 事务逻辑：检查成就条件 + 插入 `achievements` + 创建通知
  - [ ] 2.8.3 防重复：`ON CONFLICT (family_member_id, achievement_type) DO NOTHING`

- [ ] 2.9 在 Supabase SQL Editor 测试所有 RPC 函数
  - [ ] 2.9.1 测试 `update_inventory_tx`
  - [ ] 2.9.2 测试 `create_meal_log_tx`
  - [ ] 2.9.3 测试 `batch_mark_notifications_read`
  - [ ] 2.9.4 测试 `calculate_health_score`
  - [ ] 2.9.5 测试 `get_family_dashboard_stats`
  - [ ] 2.9.6 测试 `get_recipe_recommendations`
  - [ ] 2.9.7 测试 `process_achievement_unlock`

## 3. 创建 Supabase Views（30 分钟）
- [ ] 3.1 创建 `supabase/migrations/003_create_views.sql`

- [ ] 3.2 实现 `v_health_statistics` View
  - [ ] 3.2.1 聚合字段：`AVG(weight)`, `SUM(steps)`, `AVG(sleep_hours)`, `COUNT(*)`
  - [ ] 3.2.2 分组：`family_member_id`, `DATE_TRUNC('week', created_at)`
  - [ ] 3.2.3 添加索引：`CREATE INDEX idx_health_data_member_date ON health_data(family_member_id, created_at DESC)`

- [ ] 3.3 实现 `v_budget_summary` View
  - [ ] 3.3.1 聚合字段：`SUM(amount)`, `category`, `COUNT(*)`
  - [ ] 3.3.2 分组：`family_id`, `category`, `DATE_TRUNC('month', transaction_date)`
  - [ ] 3.3.3 JOIN：`budget_transactions` + `budget_categories`

- [ ] 3.4 实现 `v_recipe_ratings` View
  - [ ] 3.4.1 聚合字段：`AVG(rating)`, `COUNT(*)`, `recipe_id`
  - [ ] 3.4.2 分组：`recipe_id`
  - [ ] 3.4.3 过滤：`WHERE rating IS NOT NULL`

- [ ] 3.5 实现 `v_family_activity_feed` View
  - [ ] 3.5.1 UNION ALL 多个表：`tasks` + `meal_logs` + `achievements` + `budget_transactions`
  - [ ] 3.5.2 统一字段：`activity_type`, `family_id`, `created_at`, `description`
  - [ ] 3.5.3 排序：`ORDER BY created_at DESC`
  - [ ] 3.5.4 限制：前 100 条

- [ ] 3.6 实现 `v_inventory_expiring_soon` View
  - [ ] 3.6.1 过滤：`WHERE expiration_date < CURRENT_DATE + INTERVAL '7 days'`
  - [ ] 3.6.2 JOIN：`inventory_items` + `foods`
  - [ ] 3.6.3 排序：`ORDER BY expiration_date ASC`

- [ ] 3.7 在 Supabase SQL Editor 验证所有 Views
  - [ ] 3.7.1 查询 `v_health_statistics` 验证性能（< 100ms）
  - [ ] 3.7.2 查询 `v_budget_summary` 验证正确性
  - [ ] 3.7.3 查询 `v_recipe_ratings` 验证数据
  - [ ] 3.7.4 查询 `v_family_activity_feed` 验证排序
  - [ ] 3.7.5 查询 `v_inventory_expiring_soon` 验证过滤

## 4. Repository 层切换（1 小时）
- [ ] 4.1 修改 `src/lib/repositories/family-repository-singleton.ts`
  - [ ] 4.1.1 移除 `@dualWrite` 装饰器导入
  - [ ] 4.1.2 移除 Prisma Repository 实例化
  - [ ] 4.1.3 直接返回 `new SupabaseFamilyRepository(supabase)`

- [ ] 4.2 修改 `src/lib/repositories/task-repository-singleton.ts`
- [ ] 4.3 修改 `src/lib/repositories/shopping-list-repository-singleton.ts`
- [ ] 4.4 修改 `src/lib/repositories/recipe-repository-singleton.ts`
- [ ] 4.5 修改 `src/lib/repositories/member-repository-singleton.ts`
- [ ] 4.6 修改 `src/lib/repositories/budget-repository-singleton.ts`
- [ ] 4.7 修改 `src/lib/repositories/inventory-repository-singleton.ts`
- [ ] 4.8 修改 `src/lib/repositories/meal-plan-repository-singleton.ts`
- [ ] 4.9 修改 `src/lib/repositories/device-repository-singleton.ts`
- [ ] 4.10 修改 `src/lib/repositories/leaderboard-repository-singleton.ts`
- [ ] 4.11 修改 `src/lib/repositories/health-repository-singleton.ts`
- [ ] 4.12 修改 `src/lib/repositories/feedback-repository-singleton.ts`
- [ ] 4.13 修改 `src/lib/repositories/food-repository-singleton.ts`
- [ ] 4.14 修改 `src/lib/repositories/meal-tracking-repository-singleton.ts`
- [ ] 4.15 验证 `src/lib/repositories/notification-repository-singleton.ts` 已切换（无需修改）

## 5. 更新配置和 Feature Flags（5 分钟）
- [ ] 5.1 修改 `src/config/feature-flags.ts`
  - [ ] 5.1.1 设置 `enableSupabase: true`
  - [ ] 5.1.2 设置 `enableDualWrite: false`
  - [ ] 5.1.3 设置 `supabasePrimary: true`

- [ ] 5.2 更新 `.env.example`
  - [ ] 5.2.1 注释 Prisma 环境变量：`# DATABASE_URL="postgresql://..."`
  - [ ] 5.2.2 注释 Feature Flags：`# ENABLE_SUPABASE="true"`
  - [ ] 5.2.3 添加说明注释：`# Prisma 保留用于 Schema 管理，不用于运行时`

- [ ] 5.3 更新 `.env` (本地开发环境)
  - [ ] 5.3.1 应用 `.env.example` 的变更
  - [ ] 5.3.2 确认 Supabase 连接信息正确

## 6. 测试验证（30 分钟）
- [ ] 6.1 单元测试
  - [ ] 6.1.1 运行 `pnpm test`
  - [ ] 6.1.2 修复因 Repository 切换导致的测试失败

- [ ] 6.2 本地启动应用
  - [ ] 6.2.1 运行 `pnpm dev`
  - [ ] 6.2.2 检查控制台无错误

- [ ] 6.3 测试核心 API
  - [ ] 6.3.1 `/api/health` - 验证 `{"database": "connected"}`
  - [ ] 6.3.2 `/api/families` - 测试 Family CRUD
  - [ ] 6.3.3 `/api/families/[id]/tasks` - 测试 Task CRUD
  - [ ] 6.3.4 `/api/families/[id]/members` - 测试 Member CRUD
  - [ ] 6.3.5 `/api/dashboard` - 测试仪表板数据加载

- [ ] 6.4 测试 RPC 函数（通过 API）
  - [ ] 6.4.1 测试 `/api/inventory/update` 调用 `update_inventory_tx`
  - [ ] 6.4.2 测试 `/api/tracking/meals` 调用 `create_meal_log_tx`
  - [ ] 6.4.3 测试 `/api/notifications/mark-read` 调用 `batch_mark_notifications_read`

- [ ] 6.5 性能测试
  - [ ] 6.5.1 使用 Apache Bench 或 Artillery 压测核心 API
  - [ ] 6.5.2 验证响应时间 < 200ms (P95)

- [ ] 6.6 数据一致性验证
  - [ ] 6.6.1 在 Supabase Dashboard 检查数据
  - [ ] 6.6.2 验证所有关系完整性

## 7. 部署到 Cloudflare Pages（10 分钟）
- [ ] 7.1 提交代码
  - [ ] 7.1.1 运行 `git add -A`
  - [ ] 7.1.2 提交 commit（使用规范的 commit message）
  - [ ] 7.1.3 推送到远程：`git push origin main`

- [ ] 7.2 构建
  - [ ] 7.2.1 运行 `pnpm build:cloudflare`
  - [ ] 7.2.2 确认无构建错误

- [ ] 7.3 部署
  - [ ] 7.3.1 运行 `wrangler pages deploy .open-next --project-name=hearthbulter --commit-dirty=true`
  - [ ] 7.3.2 等待部署完成（约 10-20 秒）
  - [ ] 7.3.3 记录部署 URL

- [ ] 7.4 验证生产环境
  - [ ] 7.4.1 访问部署 URL + `/api/health`
  - [ ] 7.4.2 验证返回 `{"database": "connected"}` ✅
  - [ ] 7.4.3 测试核心功能正常

## 8. 监控和优化（可选 - 后续完成）
- [ ] 8.1 配置 Cloudflare Analytics
- [ ] 8.2 设置错误追踪（Sentry）
- [ ] 8.3 监控 API 响应时间
- [ ] 8.4 优化慢查询（使用 Supabase Query Inspector）

---

**总任务数**: 102
**预估总工时**: 3.5 小时
**优先级**: P0（阻塞 Cloudflare Pages 正常运行）
