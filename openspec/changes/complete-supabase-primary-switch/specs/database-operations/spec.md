# Database Operations Specification (Delta)

## ADDED Requirements

### Requirement: Transaction RPC Functions
系统 **SHALL** 提供 PostgreSQL RPC 函数处理复杂事务操作，确保 ACID 特性和数据一致性。

#### Scenario: 库存更新事务
- **WHEN** 调用 `update_inventory_tx` RPC 函数（参数：item_id, quantity_change, user_id）
- **THEN** 系统 **SHALL** 在单一事务中原子性地更新库存数量
- **AND** 使用 `FOR UPDATE NOWAIT` 行级锁防止并发冲突
- **AND** 当库存低于阈值时自动创建通知记录
- **AND** 失败时完全回滚所有更改
- **AND** 返回 JSONB `{"success": true, "new_quantity": N}`

#### Scenario: 用餐记录创建事务
- **WHEN** 调用 `create_meal_log_tx` RPC 函数（参数：meal_data JSONB, health_data_update JSONB）
- **THEN** 系统 **SHALL** 在单一事务中创建 `meal_logs` 记录
- **AND** 同时更新 `health_data` 表的营养摄入统计
- **AND** 验证外键关系（`recipe_id`, `family_member_id` 必须存在）
- **AND** 失败时回滚所有操作并抛出清晰错误信息

#### Scenario: 成就解锁事务
- **WHEN** 调用 `process_achievement_unlock` RPC 函数（参数：family_member_id, achievement_type）
- **THEN** 系统 **SHALL** 检查成就解锁条件是否满足
- **AND** 插入 `achievements` 记录（使用 `ON CONFLICT DO NOTHING` 防重复）
- **AND** 创建成就解锁通知
- **AND** 所有操作 **SHALL** 在单一事务中完成

#### Scenario: RPC 函数安全保护
- **WHEN** 任何 RPC 函数被调用
- **THEN** 函数 **SHALL** 使用 `SET search_path = public, pg_temp` 防止 search_path 劫持
- **AND** 函数 **SHALL** 使用 `SECURITY DEFINER` 以函数创建者权限执行
- **AND** 函数 **SHALL** 验证调用者权限（如：用户只能修改自己家庭的数据）
- **AND** 非法调用 **SHALL** 抛出 `RAISE EXCEPTION`

---

### Requirement: Batch Operations RPC Functions
系统 **SHALL** 提供批量操作 RPC 函数，优化多记录操作性能。

#### Scenario: 批量标记通知已读
- **WHEN** 调用 `batch_mark_notifications_read` RPC 函数（参数：notification_ids UUID[], user_id）
- **THEN** 系统 **SHALL** 批量更新 `notifications` 表的 `is_read` 字段
- **AND** **仅** 更新属于当前用户的通知（权限验证）
- **AND** 返回成功更新的通知数量
- **AND** 查询性能 **SHALL** 优于逐条更新（使用 `UPDATE ... WHERE id = ANY(array)`）

---

### Requirement: Analytics RPC Functions
系统 **SHALL** 提供分析查询 RPC 函数，执行复杂聚合计算并返回结构化结果。

#### Scenario: 计算健康分数
- **WHEN** 调用 `calculate_health_score` RPC 函数（参数：family_member_id, date_range INTERVAL）
- **THEN** 系统 **SHALL** 聚合 `health_data` 表的数据（体重、睡眠、步数等）
- **AND** 根据加权公式计算综合健康分数（体重达标 30% + 睡眠质量 40% + 运动量 30%）
- **AND** 返回 JSONB `{"score": 85, "breakdown": {"weight": 90, "sleep": 85, "exercise": 80}}`
- **AND** 查询响应时间 **SHALL** < 200ms

#### Scenario: 获取家庭仪表板统计
- **WHEN** 调用 `get_family_dashboard_stats` RPC 函数（参数：family_id）
- **THEN** 系统 **SHALL** JOIN 多个表（`family_members`, `tasks`, `health_data`, `budget`）
- **AND** 返回 JSONB 包含：成员数、待办任务数、本周健康评分、预算使用率
- **AND** 使用索引优化 JOIN 性能
- **AND** 查询响应时间 **SHALL** < 300ms

#### Scenario: 获取食谱推荐
- **WHEN** 调用 `get_recipe_recommendations` RPC 函数（参数：family_member_id, goal_type, limit INT）
- **THEN** 系统 **SHALL** 基于健康目标筛选食谱
- **AND** 根据营养比例匹配度和评分排序
- **AND** 返回 TABLE（recipe_id, title, match_score, nutrition_info）
- **AND** 限制返回数量为 `limit` 参数值

---

### Requirement: Aggregation Views
系统 **SHALL** 提供数据库视图优化复杂聚合查询，提升性能并简化应用层代码。

#### Scenario: 健康统计视图查询
- **WHEN** 查询 `v_health_statistics` 视图
- **THEN** 系统 **SHALL** 返回预聚合的健康指标（平均体重、总步数、平均睡眠时长）
- **AND** 按 `family_member_id` 和周分组
- **AND** 仅包含最近 3 个月的数据（性能优化）
- **AND** 查询延迟 **SHALL** < 100ms

#### Scenario: 预算汇总视图查询
- **WHEN** 查询 `v_budget_summary` 视图
- **THEN** 系统 **SHALL** 返回按类别和月份聚合的预算数据
- **AND** 包含 `SUM(amount)`, `category`, `month`, `family_id` 字段
- **AND** JOIN `budget_transactions` 和 `budget_categories` 表
- **AND** 查询性能 **SHALL** 优于直接 JOIN 和聚合（利用 PostgreSQL 查询优化器）

#### Scenario: 食谱评分视图查询
- **WHEN** 查询 `v_recipe_ratings` 视图
- **THEN** 系统 **SHALL** 返回每个食谱的平均评分和评分数量
- **AND** 过滤掉 `rating IS NULL` 的记录
- **AND** 按 `recipe_id` 分组
- **AND** 查询延迟 **SHALL** < 50ms

#### Scenario: 家庭活动流视图查询
- **WHEN** 查询 `v_family_activity_feed` 视图
- **THEN** 系统 **SHALL** 返回混合多个表的活动记录（`tasks`, `meal_logs`, `achievements`, `budget_transactions`）
- **AND** 统一字段格式（`activity_type`, `family_id`, `created_at`, `description`）
- **AND** 按 `created_at DESC` 排序
- **AND** 限制返回前 100 条记录（性能优化）

#### Scenario: 即将过期库存视图查询
- **WHEN** 查询 `v_inventory_expiring_soon` 视图
- **THEN** 系统 **SHALL** 返回 7 天内即将过期的库存项目
- **AND** JOIN `inventory_items` 和 `foods` 表获取食物详情
- **AND** 按 `expiration_date ASC` 排序
- **AND** 查询延迟 **SHALL** < 100ms

---

### Requirement: View Indexes and Performance
系统 **SHALL** 为 Views 依赖的底层表创建适当的索引，确保查询性能。

#### Scenario: 健康数据索引
- **WHEN** 系统初始化数据库 Schema
- **THEN** **SHALL** 创建索引 `idx_health_data_member_date ON health_data(family_member_id, created_at DESC)`
- **AND** 索引 **SHALL** 支持 `v_health_statistics` 视图的快速查询
- **AND** 索引 **SHALL** 包含 `WHERE created_at >= ...` 过滤条件

#### Scenario: 预算交易索引
- **WHEN** 系统初始化数据库 Schema
- **THEN** **SHALL** 创建索引 `idx_budget_transactions_family_date ON budget_transactions(family_id, transaction_date DESC)`
- **AND** 索引 **SHALL** 支持 `v_budget_summary` 视图的分组和排序

#### Scenario: 库存过期索引
- **WHEN** 系统初始化数据库 Schema
- **THEN** **SHALL** 创建索引 `idx_inventory_items_expiration ON inventory_items(expiration_date ASC) WHERE expiration_date IS NOT NULL`
- **AND** 索引 **SHALL** 支持 `v_inventory_expiring_soon` 视图的过滤和排序
- **AND** 使用部分索引（`WHERE` 条件）减少索引大小
