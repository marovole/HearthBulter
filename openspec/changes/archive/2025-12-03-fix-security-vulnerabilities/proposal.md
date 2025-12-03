## Why

代码审查发现了多个严重安全漏洞和代码质量问题，包括：
- 管理员API无认证保护，任何人可控制调度器
- 多个API端点存在IDOR（不安全直接对象引用）漏洞，允许跨租户数据访问
- Supabase Service Key全局暴露，绕过RLS安全机制
- 分享Token使用可预测算法生成，存在被猜测风险
- 诊断端点泄露敏感环境信息
- 电商平台Token明文存储
- 大量`any`类型使用削弱类型安全

这些问题如果被利用，可能导致用户数据泄露、未授权访问和系统控制权丧失。

## What Changes

### 安全修复 (Critical/High)
- **BREAKING**: 为 `/api/admin/scheduler` 添加管理员认证和RBAC
- **BREAKING**: 修复所有IDOR漏洞，强制API端点的所有权验证
- 引入每请求的auth-bound Supabase客户端，限制service-key使用范围
- 将Token生成从 `Math.random()` 改为 `crypto.randomBytes()`
- 移除或保护 `/api/test-db`、`/api/test-auth` 诊断端点
- 加密存储电商平台access/refresh tokens

### 代码质量改进 (Medium)
- 为所有API添加Zod schema输入验证
- 减少`any`类型使用，增强核心模块类型安全
- 统一数据库访问层（清理Prisma/Supabase混用）
- 添加AI调用速率限制和错误处理
- 规范化软删除实现

### 测试增强
- 添加IDOR和授权的否定测试
- 添加安全关键路径的测试覆盖

## Impact

### Affected specs
- `code-quality` - 类型安全、错误处理规范
- `ecommerce-integration` - Token存储安全
- `health-analytics-reporting` - 报告分享Token安全
- `ingredient-inventory` - API授权检查
- `notification-system` - 系统通知安全
- `testing` - 安全测试覆盖

### Affected code
- `src/app/api/admin/scheduler/route.ts` - 添加认证
- `src/app/api/inventory/**/*.ts` - 添加所有权验证
- `src/app/api/analytics/**/*.ts` - 添加所有权验证
- `src/app/api/test-db/route.ts` - 移除或保护
- `src/app/api/test-auth/route.ts` - 移除或保护
- `src/lib/db/supabase-adapter.ts` - 重构客户端管理
- `src/lib/services/analytics/report-generator.ts` - 安全Token生成
- `src/lib/services/ecommerce/**/*.ts` - Token加密存储
- `src/middleware.ts` - 增强认证检查

### Breaking changes
- 管理员API需要认证，现有无认证调用将失败
- API端点将拒绝跨租户访问请求
- 诊断端点可能被移除或需要认证

### Migration requirements
- 更新所有调用管理员API的客户端代码
- 重新生成现有的分享Token（旧Token可能仍可用直到过期）
- 加密迁移现有电商平台Token
