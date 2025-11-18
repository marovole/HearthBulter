## ADDED Requirements

### Requirement: Supabase Database Access
The system SHALL provide a unified interface for database access using Supabase Client with PostgreSQL.

#### Scenario: Initialize Supabase Client
- **WHEN** 应用程序启动
- **THEN**: 使用环境变量（SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY）初始化 Supabase Client
- **AND**: 创建全局单例实例，供所有服务使用

#### Scenario: Execute basic SELECT query
- **WHEN** 服务层调用 getUserById('user-123')
- **THEN**: 使用 supabase.from('users').select('*').eq('id', 'user-123').single() 查询数据
- **AND**: 返回符合 TypeScript 类型的结果或错误

#### Scenario: Execute complex JOIN query
- **WHEN** 需要查询关联数据（如：用户 + 他们的家庭 + 家庭成员）
- **THEN**: 使用 supabase.from('users').select('*, families(*, family_members(*))') 执行嵌套查询
- **AND**: 返回扁平化或嵌套结构（根据业务需求）

#### Scenario: Execute INSERT with returning
- **WHEN** 创建新的餐饮记录
- **THEN**: 使用 supabase.from('meal_records').insert(data).select() 插入数据并返回插入的结果
- **AND**: 确保类型安全，返回完整的记录对象

### Requirement: Query Performance Optimization
The system SHALL implement performance optimization strategies including caching, indexing, and Materialized Views.

#### Scenario: Use Materialized Views for complex aggregations
- **WHEN** 查询排行榜数据（需要 JOIN + GROUP BY + ORDER BY）
- **THEN**: 查询 Supabase v_social_leaderboard Materialized View（每日刷新）
- **AND**: 确保查询响应时间 **<500ms**

#### Scenario: Implement query result caching
- **WHEN** 查询用户营养摄入汇总（高频查询，结果变化慢）
- **THEN**: 使用 Supabase 查询的 cache-first 策略（Redis + DB Cache）
- **AND**: 配置缓存 TTL（Time To Live），过期后自动刷新

#### Scenario: Optimize with database indexes
- **WHEN** 发现慢查询（通过 Supabase Index Advisor）
- **THEN**: 创建 PostgreSQL 索引（CREATE INDEX ...）优化查询性能
- **AND**: 监控查询计划，确保索引生效

#### Scenario: Pagination for large datasets
- **WHEN** 查询超过1000条历史记录
- **THEN**: 使用 Supabase limit() 和 offset() 实现分页
- **AND**: 或使用 infinite scroll 模式（cursor-based pagination）

### Requirement: Row Level Security (RLS) Integration
The system SHALL enforce Row Level Security policies to ensure data isolation between users and families.

#### Scenario: Enable RLS on user tables
- **GIVEN** users 表包含敏感健康数据
- **WHEN** 执行 ALTER TABLE users ENABLE ROW LEVEL SECURITY
- **THEN**: 创建 RLS Policy: CREATE POLICY "Users can view own record" ON users FOR SELECT USING (auth.uid() = id)

#### Scenario: Family data sharing with RLS
- **GIVEN** family_members 表关联用户和家庭
- **WHEN** 查询家庭的健康数据
- **THEN**: 创建 RLS Policy: CREATE POLICY "Family members can view each other's data" ON health_records FOR SELECT USING (EXISTS (SELECT 1 FROM family_members fm WHERE fm.user_id = auth.uid() AND fm.family_id = health_records.family_id))

#### Scenario: Bypass RLS for admin operations
- **GIVEN** 需要执行全表管理操作（如生成报告）
- **WHEN** 使用 Supabase Service Role Key
- **THEN**: Service Role 绕过 RLS，可以访问所有记录（需谨慎使用）

#### Scenario: Test RLS policies
- **WHEN** 编写单元测试测试权限控制
- **THEN**: 使用不同用户身份（JWT）验证数据可见性
- **AND**: 确保用户只能看到自己的数据和家庭成员的数据

### Requirement: Transaction Management
The system SHALL support database transactions for operations requiring atomicity.

#### Scenario: Execute simple transaction
- **WHEN** 创建订单（需要插入 orders + order_items + 更新 inventory）
- **THEN**: 使用 Supabase rpc('create_order_transaction', {params}) 调用 Edge Function 或数据库 RPC
- **AND**: 确保所有操作要么全部成功，要么全部回滚

#### Scenario: Handle transaction conflicts
- **GIVEN** 多个用户同时购买同一商品（库存竞争）
- **WHEN** 事务冲突发生（如 SERIALIZABLE isolation level）
- **THEN**: 捕获错误并重试（最多3次）
- **OR**: 返回 409 Conflict 给用户，提示重新尝试

#### Scenario: Implement idempotency
- **WHEN** 处理支付回调（可能重复调用）
- **THEN**: 使用 idempotency_key 确保多次调用结果一致
- **AND**: 查询 Supabase 检查是否已处理该 idempotency_key

### Requirement: Error Handling and Retry Logic
The system SHALL implement comprehensive error handling for database operations.

#### Scenario: Handle connection errors
- **WHEN** Supabase 连接失败（网络错误、服务不可用）
- **THEN**: 捕获错误，记录日志到 Sentry，返回 503 Service Unavailable
- **AND**: 如果启用了缓存，返回缓存数据作为降级方案

#### Scenario: Handle query timeout
- **GIVEN** 查询超过10秒未返回
- **WHEN** 发生查询超时
- **THEN**: 取消查询，记录慢查询日志
- **AND**: 返回 408 Request Timeout，提示用户优化查询条件

#### Scenario: Handle permission errors
- **WHEN** RLS 策略阻止查询（403 Forbidden）
- **THEN**: 返回清晰的错误信息："您没有权限访问此数据"
- **AND**: 记录审计日志（user_id, table, action, timestamp）

#### Scenario: Implement retry logic for transient failures
- **WHEN** 查询因临时故障失败（如连接池耗尽）
- **THEN**: 使用指数退避算法重试（间隔 100ms, 200ms, 400ms, 800ms）
- **AND**: 最多重试 3 次，仍然失败则返回错误

### Requirement: Migration and Schema Management
The system SHALL manage database schema changes using Prisma Schema as the single source of truth.

#### Scenario: Use Prisma Schema for DDL
- **GIVEN** 需要添加新表（如 nutrition_goals）
- **WHEN** 编辑 `prisma/schema.prisma`
- **THEN**: 运行 `prisma db push` 将更改推送到 Supabase PostgreSQL
- **AND**: 记录 Migration 在版本控制系统中

#### Scenario: Backward compatibility during migration
- **GIVEN** 需要修改表结构（如重命名字段）
- **WHEN** 执行数据库迁移
- **THEN**: 使用多阶段部署：1) 添加新字段 + 双写 2) 迁移旧数据 3) 删除旧字段
- **AND**: 确保旧版本代码在新 Schema 上仍能运行

#### Scenario: Sync Prisma Schema with Supabase
- **WHEN** 团队协作，多人修改 Schema
- **THEN**: 使用 `prisma db pull` 从 Supabase 拉取最新 Schema
- **AND**: 解决冲突后重新 `prisma db push`

### Requirement: Supabase Views Management
The system SHALL create and manage Materialized and Regular Views for query optimization.

#### Scenario: Create Materialized View for leaderboard
- **WHEN** 社交排行榜查询变慢（>2s）
- **THEN**: 创建 Materialized View:```sql
CREATE MATERIALIZED VIEW v_social_leaderboard AS
SELECT u.id, u.name, SUM(hs.score) as total_score
FROM users u
JOIN health_scores hs ON u.id = hs.user_id
WHERE hs.created_at >= NOW() - INTERVAL '7 days'
GROUP BY u.id, u.name
ORDER BY total_score DESC
```
- **AND**: 每日刷新：REFRESH MATERIALIZED VIEW CONCURRENTLY v_social_leaderboard

#### Scenario: Create Regular View for price comparison
- **WHEN** 电商价格对比需要聚合多平台数据
- **THEN**: 创建 Regular View:```sql
CREATE VIEW v_ecommerce_product_prices AS
SELECT pc.product_name, pp.platform_id, pp.price, pp.stock_status
FROM product_catalog pc
JOIN platform_products pp ON pc.id = pp.product_id
WHERE pp.is_active = true
```

#### Scenario: Document Views usage
- **WHEN** 创建新 View
- **THEN**: 在 `supabase/views/README.md` 中记录 View 的用途、刷新策略、依赖关系
- **AND**: 更新 API 文档说明哪些端点使用哪些 Views
