# 类型安全迁移检查清单

## 概述

此清单用于确保从 Prisma 到 Supabase 的迁移过程中保持严格的类型安全。

## 迁移前检查

### 1. 基础设施准备

- [ ] 1.1 Supabase 环境已配置
  - [ ] NEXT_PUBLIC_SUPABASE_URL 设置
  - [ ] SUPABASE_SERVICE_KEY 配置
  - [ ] 数据库连接测试通过

- [ ] 1.2 类型生成工具就绪
  - [ ] scripts/generate-supabase-types.ts 存在
  - [ ] src/types/supabase-generated.ts 生成
  - [ ] src/types/supabase-rpc.ts 生成

### 2. Schema 验证

- [ ] 2.1 Zod Schema 库建立
  - [ ] src/schemas/supabase-schemas.ts 创建
  - [ ] 所有表对应的 Zod Schema 定义
  - [ ] 基础类型验证（string, number, uuid, date）

- [ ] 2.2 API 输入验证 Schema
  - [ ] create* 操作的输入 Schema
  - [ ] update* 操作的输入 Schema
  - [ ] 必填字段验证
  - [ ] 数据类型验证
  - [ ] 业务规则验证

### 3. RPC 函数类型

- [ ] 3.1 RPC 函数 SQL 迁移
  - [ ] accept_family_invite.sql
  - [ ] record_spending_tx.sql
  - [ ] create_inventory_notifications_batch.sql
  - [ ] update_shopping_list_item_atomic.sql

- [ ] 3.2 RPC 函数 TypeScript 类型
  - [ ] 参数类型定义（zod）
  - [ ] 返回值类型定义
  - [ ] 错误处理类型
  - [ ] 成功/失败响应类型

## 迁移中检查

### 4. API 路由迁移

#### 4.1 低风险 CRUD（Batch 1）

- [ ] 4.1.1 auth/register
  - [ ] 使用 createUserSchema 验证输入
  - [ ] Supabase 客户端调用替代 Prisma
  - [ ] 类型安全的响应返回

- [ ] 4.1.2 foods/popular
  - [ ] 使用 Zod 验证查询参数
  - [ ] Supabase 查询替代 Prisma findMany
  - [ ] 响应类型定义

- [ ] 4.1.3 foods/categories/[category]
  - [ ] 路径参数验证（category）
  - [ ] 分页参数验证
  - [ ] 查询响应类型

- [ ] 4.1.4 user/preferences
  - [ ] updateUserSchema 验证
  - [ ] upsert 操作类型安全
  - [ ] 响应类型定义

- [ ] 4.1.5 recipes/[id]/favorite
  - [ ] 路径参数验证（id）
  - [ ] RPC 函数调用（update_recipe_favorite_count）
  - [ ] 响应类型定义

- [ ] 4.1.6 recipes/[id]/rate
  - [ ] 路径参数验证（id）
  - [ ] 评分范围验证（1-5）
  - [ ] 响应类型定义

#### 4.2 通知系统（Batch 2）

- [ ] 4.2.1 /notifications（GET/POST）
  - [ ] 创建通知输入验证
  - [ ] Supabase Realtime 订阅类型
  - [ ] 分页参数验证

- [ ] 4.2.2 /notifications/preferences
  - [ ] 更新偏好设置 Schema
  - [ ] 通知类型验证
  - [ ] 渠道验证（EMAIL, SMS, IN_APP）

- [ ] 4.2.3 /notifications/[id]
  - [ ] 路径参数验证（id）
  - [ ] 操作类型验证（GET, DELETE）
  - [ ] 响应类型定义

- [ ] 4.2.4 /notifications/read
  - [ ] 批量操作输入验证
  - [ ] IDs 数组验证
  - [ ] 部分成功响应类型

#### 4.3 事务处理（Batch 4）

- [ ] 4.3.1 budget/record-spending
  - [ ] recordSpendingSchema 验证
  - [ ] RPC 函数调用（record_spending_tx）
  - [ ] 错误处理（预算超出）
  - [ ] 响应类型：Spending + Budget

- [ ] 4.3.2 invite/[code]
  - [ ] acceptFamilyInviteSchema 验证
  - [ ] RPC 函数调用（accept_family_invite）
  - [ ] 事务回滚处理
  - [ ] 响应类型：Member + Family

- [ ] 4.3.3 inventory/notifications
  - [ ] createInventoryNotificationsSchema 验证
  - [ ] 批量操作输入验证
  - [ ] 响应类型：统计信息

- [ ] 4.3.4 shopping-lists/[id]/items/[itemId]
  - [ ] updateShoppingListItemSchema 验证
  - [ ] RPC 函数调用（update_shopping_list_item_atomic）
  - [ ] 乐观锁检查
  - [ ] 响应类型：更新后的 Item

### 5. 服务层迁移

- [ ] 5.1 Repository 接口
  - [ ] BudgetRepository 接口
  - [ ] InventoryRepository 接口
  - [ ] NotificationRepository 接口
  - [ ] AnalyticsRepository 接口

- [ ] 5.2 Supabase Adapter 实现
  - [ ] SupabaseBudgetRepository
  - [ ] SupabaseInventoryRepository
  - [ ] SupabaseNotificationRepository
  - [ ] SupabaseAnalyticsRepository

- [ ] 5.3 服务重构
  - [ ] BudgetTracker 依赖注入
  - [ ] InventoryTracker 依赖注入
  - [ ] InventoryNotificationService 依赖注入
  - [ ] TrendAnalyzer 依赖注入

## 迁移后检查

### 6. 类型安全验证

- [ ] 6.1 运行类型检查
  ```bash
  npx tsc --noEmit --skipLibCheck
  ```

- [ ] 6.2 运行类型安全检查
  ```bash
  npx tsx scripts/type-safety-checker.ts
  ```

- [ ] 6.3 ESLint 检查
  ```bash
  npm run lint
  ```

- [ ] 6.4 单元测试
  ```bash
  npm test
  ```

### 7. 双写验证

- [ ] 7.1 启用双写模式
  - [ ] Feature Flag 设置
  - [ ] DualWriteDecorator 包装
  - [ ] 结果比对器配置

- [ ] 7.2 监控差异
  - [ ] diff 记录表查询
  - [ ] 错误率监控
  - [ ] 数据一致性检查

- [ ] 7.3 对账脚本
  - [ ] 预算金额对账
  - [ ] 收藏计数对账
  - [ ] 库存数量对账

### 8. 性能验证

- [ ] 8.1 RPC 函数性能
  - [ ] accept_family_invite < 100ms
  - [ ] record_spending_tx < 100ms
  - [ ] create_inventory_notifications_batch < 200ms
  - [ ] update_shopping_list_item_atomic < 50ms

- [ ] 8.2 API 响应时间
  - [ ] GET 请求 < 200ms
  - [ ] POST/PUT 请求 < 500ms
  - [ ] 批量操作 < 1s

- [ ] 8.3 缓存命中率
  - [ ] Edge Cache > 70%
  - [ ] Supabase 查询优化
  - [ ] RPC 函数缓存

## 批量迁移检查点

### Batch 1 完成检查点

- [ ] 6 个 API 端点迁移完成
- [ ] E2E 测试全部通过
- [ ] 双写验证无严重问题
- [ ] 错误率 < 0.1%

### Batch 2 完成检查点

- [ ] 5 个通知系统端点迁移完成
- [ ] Realtime 功能验证通过
- [ ] 模板渲染正确
- [ ] 批量通知测试通过

### Batch 3 完成检查点

- [ ] 11 个家庭/购物/库存端点迁移完成
- [ ] UAT 通过
- [ ] 并发写入测试通过
- [ ] 数据一致性检查通过

### Batch 4 完成检查点

- [ ] 9 个财务/事务端点迁移完成
- [ ] 对账脚本无异常
- [ ] 灰度发布验证通过
- [ ] 事务回滚测试通过

### Batch 5 完成检查点

- [ ] 10 个 AI/Analytics 端点迁移完成
- [ ] 性能达标报告通过
- [ ] 缓存策略验证通过
- [ ] P95 延迟 < 200ms

## 回滚检查

- [ ] 回滚条件定义
  - [ ] 错误率 > 1%
  - [ ] 性能退化 > 20%
  - [ ] 数据不一致 > 0.1%

- [ ] 回滚流程
  - [ ] Feature Flag 切换
  - [ ] Prisma 代码恢复
  - [ ] 数据补偿脚本
  - [ ] 回滚时间 < 5 分钟

## 工具脚本

### 类型检查脚本

```bash
# 完整类型安全检查
npx tsx scripts/type-safety-checker.ts

# 仅 TypeScript 类型检查
npx tsc --noEmit --skipLibCheck

# 仅 Zod Schema 检查
grep -r "z\." src/schemas/
```

### RPC 函数测试

```bash
# 测试单个 RPC 函数
npx tsx scripts/test-rpc-function.ts

# 批量测试 RPC 函数
npx tsx scripts/test-all-rpc.ts
```

### 双写验证

```bash
# 启动双写模式
export ENABLE_DUAL_WRITE=true

# 检查差异
npx tsx scripts/check-dual-write-diffs.ts

# 生成对账报告
npx tsx scripts/generate-reconciliation-report.ts
```

## 验收标准

### 最低要求

- [ ] 100% TypeScript 类型覆盖
- [ ] 所有 API 端点使用 Zod 验证
- [ ] 所有 RPC 函数类型安全
- [ ] 单元测试覆盖率 > 80%
- [ ] E2E 测试全部通过

### 优化目标

- [ ] 错误率 < 0.1%
- [ ] P95 延迟 < 200ms
- [ ] 数据一致性 100%
- [ ] 缓存命中率 > 70%
- [ ] 代码审查通过率 100%

## 常见问题

### Q: 如何验证 RPC 函数参数类型？
A: 使用 `RPCFunctions` 映射和对应的 Zod Schema：
```typescript
import { RPCFunctions } from '@/types/supabase-rpc';

const params = RPCFunctions.accept_family_invite.params.parse({
  p_invitation_id: 'uuid',
  p_user_id: 'uuid',
  p_member_name: 'name',
});
```

### Q: 如何处理可选字段？
A: 在 Zod Schema 中使用 `.optional()`：
```typescript
const schema = z.object({
  required_field: z.string(),
  optional_field: z.string().optional(),
});
```

### Q: 如何验证复杂嵌套对象？
A: 使用 Zod 的递归验证：
```typescript
const nestedSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
});
```

## 维护指南

### 定期检查

- [ ] 每周运行类型安全检查
- [ ] 每月审查 API 端点类型覆盖
- [ ] 每季度更新类型定义

### 持续改进

- [ ] 根据监控数据优化验证规则
- [ ] 添加新的类型安全检查
- [ ] 更新迁移检查清单

---

**版本**: 1.0  
**维护者**: 技术团队  
**最后更新**: 2025-11-09  
**下次检查**: 2025-11-16
