## Phase 1: 基础设施准备

### 1.1 创建授权工具函数
- [x] 1.1.1 创建 `src/lib/middleware/authorization.ts` 授权检查模块
- [x] 1.1.2 实现 `requireFamilyMembership(userId, memberId)` 函数
- [x] 1.1.3 实现 `requireAdmin(userId)` 函数
- [x] 1.1.4 实现 `requireOwnership(userId, resourceType, resourceId)` 函数
- [x] 1.1.5 添加授权函数单元测试

### 1.2 创建安全Token生成器
- [x] 1.2.1 创建 `src/lib/security/token-generator.ts` 模块
- [x] 1.2.2 实现 `generateSecureShareToken()` 使用 Web Crypto API
- [x] 1.2.3 实现 `verifyShareToken()` Token验证函数
- [x] 1.2.4 添加Token生成器单元测试

### 1.3 创建加密工具
- [x] 1.3.1 创建 `src/lib/security/encryption.ts` 模块
- [x] 1.3.2 实现 AES-256-GCM 加密函数 `encrypt()`
- [x] 1.3.3 实现 AES-256-GCM 解密函数 `decrypt()`
- [x] 1.3.4 添加加密工具单元测试

## Phase 2: Critical 安全修复

### 2.1 保护管理员调度器API
- [x] 2.1.1 为 `/api/admin/scheduler` 添加认证检查
- [x] 2.1.2 添加管理员角色验证（RBAC）
- [x] 2.1.3 添加操作审计日志
- [ ] 2.1.4 添加集成测试验证认证生效

### 2.2 修复库存API IDOR漏洞
- [x] 2.2.1 修复 `/api/inventory/items` 添加所有权验证
- [x] 2.2.2 修复 `/api/inventory/stats` 添加所有权验证
- [x] 2.2.3 修复 `/api/inventory/usage` 添加所有权验证
- [x] 2.2.4 修复 `/api/inventory/expiry` 添加所有权验证
- [x] 2.2.5 修复 `/api/inventory/suggestions` 添加所有权验证
- [x] 2.2.6 修复 `/api/inventory/analysis` 添加所有权验证
- [ ] 2.2.7 添加IDOR否定测试（验证跨租户访问被拒绝）

### 2.3 修复分析报告API IDOR漏洞
- [x] 2.3.1 修复 `/api/analytics/anomalies` 添加所有权验证
- [x] 2.3.2 修复 `/api/analytics/reports` 添加所有权验证
- [x] 2.3.3 修复 `/api/analytics/share` 添加所有权验证
- [ ] 2.3.4 添加IDOR否定测试

### 2.4 保护诊断端点
- [x] 2.4.1 移除或添加认证到 `/api/test-db`
- [x] 2.4.2 移除或添加认证到 `/api/test-auth`
- [x] 2.4.3 移除生产环境中的敏感信息输出
- [x] 2.4.4 添加环境变量检查（仅开发环境可用）

## Phase 3: High 安全修复

### 3.1 重构Supabase客户端管理
- [x] 3.1.1 创建 `src/lib/db/supabase-clients.ts` 多层客户端模块
- [x] 3.1.2 实现 `getAnonClient()` 匿名客户端
- [x] 3.1.3 实现 `getUserClient(jwt)` 用户级客户端
- [x] 3.1.4 实现 `getServiceClient(reason)` 服务级客户端（需记录使用原因）
- [ ] 3.1.5 更新 `supabase-adapter.ts` 使用新客户端管理
- [ ] 3.1.6 审查并更新所有直接使用 Service Key 的代码
- [ ] 3.1.7 添加客户端使用的单元测试

### 3.2 更新Token生成逻辑
- [x] 3.2.1 更新 `report-generator.ts` 使用安全Token生成器
- [x] 3.2.2 更新 `getReportByShareToken()` 添加所有权验证
- [ ] 3.2.3 更新数据库schema添加Token元数据字段（如需要）
- [ ] 3.2.4 创建Token迁移脚本（旧Token过渡期）
- [ ] 3.2.5 添加Token生成和验证的集成测试

### 3.3 加密电商平台Token
- [x] 3.3.1 创建 `token-storage.ts` Token加密存储服务
- [ ] 3.3.2 修改Token存储逻辑使用加密函数
- [ ] 3.3.3 修改Token读取逻辑使用解密函数
- [ ] 3.3.4 创建现有Token加密迁移脚本
- [ ] 3.3.5 添加Token加密存储的测试

### 3.4 修复OR过滤器注入风险
- [x] 3.4.1 审查 `supabase-adapter.ts` 中的 `buildFilterExpressions()`
- [x] 3.4.2 添加 `escapeFilterValue()` 函数转义特殊字符
- [x] 3.4.3 添加 `validateFilterKey()` 函数验证键名
- [ ] 3.4.4 添加过滤器构建的单元测试

## Phase 4: Medium 代码质量改进

### 4.1 添加Zod Schema验证
- [x] 4.1.1 为库存API添加请求/响应Zod schemas
- [x] 4.1.2 为分析报告API添加请求/响应Zod schemas
- [ ] 4.1.3 为电商API添加请求/响应Zod schemas
- [x] 4.1.4 创建统一的API验证中间件
- [ ] 4.1.5 更新API端点使用Zod验证

### 4.2 减少`any`类型使用
- [ ] 4.2.1 为 `ModelAdapter` 添加泛型约束
- [ ] 4.2.2 创建数据库模型DTO类型定义
- [ ] 4.2.3 更新 `supabase-adapter.ts` 核心方法类型
- [ ] 4.2.4 更新 `buildFilterExpressions()` 参数类型
- [ ] 4.2.5 更新 `applyWhereClause()` 参数类型
- [ ] 4.2.6 运行TypeScript严格检查验证

### 4.3 统一软删除实现
- [ ] 4.3.1 审查所有模型的 `deletedAt` 字段使用
- [ ] 4.3.2 修复 `family_members.userId` 唯一约束与软删除冲突
- [ ] 4.3.3 为缺少 `deletedAt` 的模型添加字段
- [x] 4.3.4 创建软删除查询过滤器工具函数 (`soft-delete.ts`)
- [ ] 4.3.5 更新Repository层统一使用软删除过滤

### 4.4 添加AI调用限流和错误处理
- [x] 4.4.1 创建 `src/lib/services/ai/rate-limiter.ts` 限流模块
- [x] 4.4.2 实现每用户调用频率限制
- [x] 4.4.3 添加超时和重试机制 (`error-handler.ts`)
- [x] 4.4.4 规范化错误响应（不泄露提供商详情）
- [ ] 4.4.5 添加AI调用的单元测试

### 4.5 统一数据库访问层
- [ ] 4.5.1 审查并移除 `report-generator.ts` 中的直接Prisma使用
- [ ] 4.5.2 审查并移除 `ecommerce` 服务中的直接Prisma使用
- [ ] 4.5.3 更新所有数据库访问统一通过Supabase适配器
- [ ] 4.5.4 移除 `prisma` 别名导出（`src/lib/db/index.ts`）

## Phase 5: 测试和文档

### 5.1 安全测试覆盖
- [x] 5.1.1 添加认证绕过测试用例 (`auth-bypass.test.ts`)
- [x] 5.1.2 添加IDOR攻击测试用例 (`idor-attack.test.ts`)
- [x] 5.1.3 添加Token预测测试用例 (`token-security.test.ts`)
- [x] 5.1.4 添加注入攻击测试用例 (`injection-attack.test.ts`)
- [ ] 5.1.5 更新CI/CD运行安全测试

### 5.2 文档更新
- [ ] 5.2.1 更新API文档说明认证要求
- [x] 5.2.2 创建安全开发指南 (`docs/SECURITY_GUIDE.md`)
- [ ] 5.2.3 更新环境变量文档
- [ ] 5.2.4 创建Token迁移指南

### 5.3 依赖更新
- [x] 5.3.1 升级 `next` 到最新安全版本 (14.2.5 → 14.2.32)
- [x] 5.3.2 升级 `@sentry/nextjs` 到最新版本 (10.25.0 → 10.28.0)
- [ ] 5.3.3 升级 `openai` 到最新版本
- [ ] 5.3.4 升级 `axios` 到最新版本
- [x] 5.3.5 运行 `pnpm audit` 验证 (6个间接依赖漏洞)
- [x] 5.3.6 升级 `nodemailer` 修复DoS漏洞 (7.0.10 → 7.0.11)
