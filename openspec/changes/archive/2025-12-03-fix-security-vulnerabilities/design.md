## Context

### 背景

2024年12月代码审查发现多个关键安全漏洞，需要系统性修复。主要问题集中在：

1. **认证授权缺失**: 管理员API、库存API等缺少必要的认证和授权检查
2. **数据库访问权限过大**: Supabase Service Key被全局使用，绕过RLS
3. **Token安全性不足**: 使用可预测算法生成分享Token
4. **敏感信息泄露**: 诊断端点暴露环境变量和数据库信息
5. **类型安全薄弱**: 大量`any`类型使用

### 约束

- 需要保持向后兼容（除明确标记的Breaking Changes外）
- 不能影响现有用户的正常使用体验
- 修复需要分阶段进行，避免一次性大规模变更
- Cloudflare Workers运行时限制（无法使用Node.js原生crypto模块的某些功能）

### 利益相关方

- 最终用户：数据安全保护
- 开发团队：代码可维护性
- 运维团队：系统安全监控

## Goals / Non-Goals

### Goals

- 修复所有Critical和High级别安全漏洞
- 建立统一的API授权检查机制
- 实现安全的Token生成和存储
- 提升核心模块的类型安全
- 添加安全相关测试覆盖

### Non-Goals

- 完全重构现有架构
- 实现100%类型覆盖（聚焦核心模块）
- 添加Web Application Firewall
- 实现完整的审计日志系统（后续迭代）

## Decisions

### Decision 1: API授权检查架构

**选择**: 创建统一的授权中间件 + 每个端点显式调用

**理由**:
- 提供一致的授权检查接口
- 保持灵活性，允许端点级别的自定义逻辑
- 避免过度设计，保持代码可读性

**实现方案**:
```typescript
// src/lib/middleware/authorization.ts
export async function requireFamilyMembership(
  userId: string,
  memberId: string
): Promise<boolean>

export async function requireAdmin(userId: string): Promise<boolean>

export async function requireOwnership(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean>
```

**备选方案**:
- 装饰器模式：TypeScript装饰器支持有限，增加复杂性
- 全局中间件自动检查：过于隐式，难以理解和调试

### Decision 2: Supabase客户端管理

**选择**: 引入三层客户端策略

**理由**:
- 最小权限原则
- 明确区分不同场景的访问需求
- 为未来启用RLS做准备

**实现方案**:
```typescript
// src/lib/db/supabase-clients.ts

// 1. 公共客户端 - 匿名访问
export function getAnonClient(): SupabaseClient

// 2. 用户客户端 - 带用户JWT的访问
export function getUserClient(userJwt: string): SupabaseClient

// 3. 服务客户端 - 仅限后台任务（需要显式理由）
export function getServiceClient(reason: string): SupabaseClient
```

**备选方案**:
- 保持单一Service Key：安全风险过高
- 完全依赖RLS：需要Supabase配置变更，当前阶段过于复杂

### Decision 3: Token生成策略

**选择**: 使用Web Crypto API + 签名验证

**理由**:
- Web Crypto API在Cloudflare Workers中可用
- 签名Token可以携带额外信息（过期时间、作用域）
- 可以在不查询数据库的情况下验证Token有效性

**实现方案**:
```typescript
// src/lib/security/token-generator.ts
import { SignJWT, jwtVerify } from 'jose';

export async function generateSecureShareToken(
  resourceId: string,
  resourceType: string,
  expiryDays: number = 7
): Promise<string>

export async function verifyShareToken(
  token: string
): Promise<TokenPayload | null>
```

**备选方案**:
- 纯随机Token + 数据库存储：每次验证需要数据库查询
- UUID v4：随机性足够但无法携带元数据

### Decision 4: 敏感数据加密

**选择**: 使用AES-256-GCM应用层加密

**理由**:
- 符合项目现有规范（project.md已定义）
- 提供认证加密（防止数据篡改）
- Web Crypto API支持

**实现方案**:
```typescript
// src/lib/security/encryption.ts
export async function encrypt(plaintext: string): Promise<string>
export async function decrypt(ciphertext: string): Promise<string>
```

**存储格式**:
```
<version>$<iv_base64>$<ciphertext_base64>$<auth_tag_base64>
```

### Decision 5: 类型安全增强策略

**选择**: 渐进式类型增强 + 泛型改造

**理由**:
- 避免一次性大规模重构
- 聚焦高风险区域（数据库适配器、API路由）
- 保持开发效率

**实现方案**:
1. 为`ModelAdapter`添加泛型约束
2. 为API路由添加Zod schema验证
3. 创建DTOs替换`any`返回类型

**优先级**:
1. `supabase-adapter.ts` - ModelAdapter泛型化
2. `inventory/*.ts` - API输入验证
3. `analytics/*.ts` - API输入验证
4. `services/*.ts` - 服务层类型定义

## Risks / Trade-offs

### Risk 1: 破坏现有功能
- **风险**: 授权检查可能阻断合法请求
- **缓解**:
  - 添加详细的错误日志
  - 分阶段rollout（先日志警告，再强制阻断）
  - 完善测试覆盖

### Risk 2: 性能影响
- **风险**: 额外的授权检查增加延迟
- **缓解**:
  - 使用缓存减少数据库查询
  - 批量授权检查
  - 性能监控和优化

### Risk 3: 迁移数据丢失
- **风险**: Token重新生成可能导致旧分享链接失效
- **缓解**:
  - 设置过渡期，同时支持新旧Token
  - 提前通知用户
  - 提供Token迁移工具

### Trade-off 1: 安全性 vs 开发效率
- 选择安全性优先
- 通过提供良好的工具函数和文档来减轻开发负担

### Trade-off 2: 完整重构 vs 渐进改进
- 选择渐进改进
- 避免大爆炸式变更带来的风险

## Migration Plan

### Phase 1: 基础设施准备（1-3天）
1. 创建授权工具函数
2. 创建安全Token生成器
3. 创建加密工具
4. 添加单元测试

### Phase 2: Critical修复（3-5天）
1. 保护管理员调度器API
2. 修复库存API IDOR
3. 修复分析报告API IDOR
4. 移除/保护诊断端点

### Phase 3: High修复（5-7天）
1. 重构Supabase客户端管理
2. 更新Token生成逻辑
3. 加密电商平台Token
4. 添加集成测试

### Phase 4: Medium修复（7-14天）
1. 添加Zod schema验证
2. 减少`any`类型使用
3. 统一软删除实现
4. 添加AI调用限流

### Rollback Plan
- 每个Phase独立部署
- 保留旧代码路径的Feature Flag
- 数据库变更使用可逆迁移
- 监控错误率，超过阈值自动回滚

## Open Questions

1. **RLS启用时机**: 是否在本次变更中启用Supabase RLS，还是作为后续迭代？
   - 建议：本次不启用，先完成应用层授权检查

2. **旧Token处理**: 现有分享Token如何处理？
   - 建议：设置30天过渡期，之后强制使用新Token

3. **测试环境**: 是否需要为安全测试创建独立环境？
   - 建议：使用现有测试环境，添加安全测试用例

4. **审计日志**: 是否在本次变更中添加安全审计日志？
   - 建议：添加基础日志，完整审计系统作为后续迭代
