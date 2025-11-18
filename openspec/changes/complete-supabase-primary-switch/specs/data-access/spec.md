# Data Access Layer Specification (Delta)

## MODIFIED Requirements

### Requirement: Repository Pattern Data Access
系统 **SHALL** 使用 Repository 模式封装所有数据访问逻辑，确保业务层与数据源解耦。Repository **SHALL** 使用 Supabase 作为唯一主数据库，不再使用双写模式。

#### Scenario: 使用 Supabase 作为唯一数据源
- **WHEN** 应用初始化 Repository 单例（如 `getTaskRepository()`）
- **THEN** Repository **SHALL** 直接返回 Supabase 实现（`SupabaseTaskRepository`）
- **AND** 不再创建 Prisma Repository 实例
- **AND** 不再使用双写装饰器（`@dualWrite`）

#### Scenario: Repository 接口保持不变
- **WHEN** 业务层调用 Repository 方法（如 `taskRepo.findById(id)`）
- **THEN** 接口签名 **SHALL** 保持不变
- **AND** 返回数据类型 **SHALL** 保持不变
- **AND** 错误处理行为 **SHALL** 保持一致

#### Scenario: Prisma 仅用于 Schema 管理
- **WHEN** 开发者需要修改数据库 Schema
- **THEN** 开发者 **SHALL** 使用 Prisma Schema 定义修改
- **AND** 使用 `prisma migrate` 生成迁移脚本
- **AND** 将迁移脚本应用到 Supabase
- **AND** **不** 使用 Prisma Client 进行运行时数据库操作

---

### Requirement: Health Check Database Connection
系统 **SHALL** 提供 Health Check API 端点验证数据库连接状态，使用 Supabase Client 进行测试。

#### Scenario: 成功连接 Supabase 数据库
- **WHEN** 调用 `/api/health` 端点
- **THEN** 系统 **SHALL** 使用 Supabase Client 执行简单查询（如 `SELECT id FROM users LIMIT 1`）
- **AND** 返回 JSON 响应 `{"database": "connected", "status": "healthy"}`
- **AND** HTTP 状态码 **SHALL** 为 200

#### Scenario: Supabase 数据库连接失败
- **WHEN** 调用 `/api/health` 端点且 Supabase 连接失败
- **THEN** 系统 **SHALL** 捕获错误
- **AND** 返回 JSON 响应 `{"database": "disconnected", "status": "unhealthy", "error": "..."}`
- **AND** HTTP 状态码 **SHALL** 为 500

#### Scenario: 验证环境变量配置
- **WHEN** 调用 `/api/health` 端点
- **THEN** 系统 **SHALL** 检查必需的环境变量（`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 等）
- **AND** 在响应中包含环境变量检查结果（敏感信息使用 ✅/❌ 标识）

---

### Requirement: Feature Flags Configuration
系统 **SHALL** 移除双写相关的 Feature Flags，简化配置管理。

#### Scenario: Supabase 作为默认且唯一数据源
- **WHEN** 应用启动
- **THEN** 配置 **SHALL** 设置 `enableSupabase = true`
- **AND** 配置 **SHALL** 设置 `enableDualWrite = false`
- **AND** 配置 **SHALL** 设置 `supabasePrimary = true`
- **AND** 不再读取 `ENABLE_SUPABASE` 环境变量（直接硬编码为 true）

#### Scenario: Prisma 环境变量保留但不使用
- **WHEN** 应用启动
- **THEN** `DATABASE_URL` 环境变量 **MAY** 存在但 **SHALL NOT** 被读取用于运行时连接
- **AND** `.env.example` **SHALL** 注释 `DATABASE_URL` 并添加说明
- **AND** `DATABASE_URL` **MAY** 仅用于 Prisma CLI 工具（如 `prisma migrate`）

---

### Requirement: Type Safety with Supabase Types
系统 **SHALL** 使用 Supabase 生成的类型确保类型安全，而不是 Prisma 生成的类型。

#### Scenario: 使用 Supabase 生成的类型
- **WHEN** TypeScript 代码需要数据库类型定义
- **THEN** 代码 **SHALL** 导入 Supabase 生成的类型（从 `@/types/supabase-database.ts`）
- **AND** **不** 导入 Prisma 生成的类型（从 `@prisma/client`）
- **AND** 类型定义 **SHALL** 与 Supabase 实际 Schema 保持一致

#### Scenario: Zod 验证确保类型安全
- **WHEN** 接收用户输入或外部数据
- **THEN** 系统 **SHALL** 使用 Zod schema 验证数据
- **AND** Zod schema **SHALL** 与 Supabase 类型定义一致
- **AND** 验证失败时 **SHALL** 返回清晰的错误信息
