## Why

当前 Health Butler 项目面临多重挑战，需要进行架构升级以确保长期可持续发展：

### 技术瓶颈
1. **部署限制**：Vercel Edge Function 大小超限（1.05MB > 1MB 限制）导致部署失败
2. **ORM 限制**：Prisma 在 Cloudflare Workers 环境下无法使用连接池，需要每次请求创建新连接
3. **性能问题**：缺乏全球 CDN 优化，国际用户访问延迟高

### 成本优化
- Vercel Pro 计划 $20/月 + 额外费用
- Cloudflare Pages + Supabase 完全免费（免费层已足够）
- 预计节省 100% 运营成本

### 架构现代化
- 拥抱 Serverless/Edge 计算趋势
- 利用 Supabase 的现代化后端服务（Auth、Realtime、Storage）
- 提升系统可扩展性和维护性

## What Changes

### **BREAKING CHANGES**

#### 1. 数据访问层迁移（核心变更）
- **移除 Prisma ORM**：102 个 API 处理器需要重写数据访问逻辑
  - 85 个直接使用 Prisma 的 API
  - 17 个通过服务层间接使用的 API
- **采用 Supabase 客户端**：使用 `@supabase/supabase-js` 进行数据库操作
- **服务单例重构**：4 个核心服务需要改为依赖注入
  - `inventoryTracker`（12+ API 依赖）
  - `budgetTracker`（预算管理系列）
  - `inventoryNotificationService`（库存通知）
  - `trend-analyzer`（分析服务）

#### 2. 事务处理重构
- **识别出隐式事务依赖**：多个 API 假定了 ACID 特性但未显式使用事务
  - `/invite/[code]`（家庭邀请接受）- 唯一显式事务
  - `/budget/record-spending`（预算记账）- 隐式依赖
  - `/inventory/notifications`（库存通知）- 批量写入
  - `/shopping-lists/[id]/items/[itemId]`（购物清单更新）- 竞态条件
- **解决方案**：使用 Postgres RPC 函数替代 Prisma 事务

#### 3. 认证系统演进
- **短期**：保留 NextAuth.js，仅迁移数据访问层
- **中期**：逐步迁移到 Supabase Auth（可选）
- **权限策略**：保留应用层权限验证，RLS 作为后续增强

#### 4. 类型系统调整
- Prisma 自动生成的类型 → Supabase 生成的类型
- 需要引入 Zod 验证确保类型安全不退化
- 复杂的 `include`/`select` 查询需要手动定义类型

### 非破坏性变更
- 前端 UI 组件不变
- API 接口契约保持一致（JSON 响应格式）
- 用户数据无损迁移

## Impact

### 影响的代码模块

#### **高影响（需要重写）**
| 模块 | 文件数量 | 迁移复杂度 | 风险等级 |
|------|---------|-----------|---------|
| API 路由 | 85+ | High | 🔴 |
| 服务层 | 4 核心服务 | Medium | 🟡 |
| 数据库查询 | 全部 Prisma 调用 | High | 🔴 |
| 事务逻辑 | 4 个关键端点 | High | 🔴 |

#### **中等影响（需要调整）**
- 类型定义文件（TypeScript）
- 测试用例（需要更新数据 mock）
- 错误处理逻辑（Supabase 错误码不同）

#### **低影响（几乎不变）**
- 前端组件（React/Next.js）
- UI/UX 设计
- 静态资源

### 性能影响评估

#### 预期改进
- ✅ 全球 CDN 加速：首屏加载提升 40-60%
- ✅ 边缘计算：API 延迟降低 30-50%（非 DB 查询部分）
- ✅ 静态资源缓存：缓存命中率提升至 90%+

#### 潜在风险
- ⚠️ HTTP 延迟：Supabase HTTP API 相比直连增加 30-70ms
- ⚠️ 冷启动：Cloudflare Workers 首次加载 ~20-30ms
- ✅ 缓解措施：RPC 函数 + Cloudflare KV 缓存

### 数据迁移影响

#### 迁移范围
- **71 张数据表**完整迁移
- **估计数据量**：< 100MB（免费层足够）
- **停机时间**：目标零停机（双写策略）

#### 一致性保证
- 双写验证期：2-4 周
- 自动对账脚本：每日运行
- 关键数据（预算、库存）：实时校验

### 开发流程影响

#### 学习曲线
- Supabase 客户端 API：1-2 天
- Postgres RPC 函数开发：3-5 天
- 双写验证框架：5-7 天

#### 团队技能要求
- 需要掌握：Supabase、Postgres、Cloudflare Workers
- 降低依赖：不再需要深入理解 Prisma 内部机制

### 时间估算
- **基础设施准备**：4-5 周
- **分批迁移**：6-8 周（5 个批次）
- **稳定化和优化**：2-3 周
- **总计**：约 3 个月

### 回滚策略
- ✅ Feature Flag 控制切换
- ✅ 保留 Prisma 代码 2-4 周作为回滚选项
- ✅ 数据补偿脚本随时可用
- ✅ Cloudflare Pages 支持即时回滚到上一版本

### Affected Specs
- `architecture`：核心架构变更
- `authentication`：认证流程调整
- `deployment`：部署流程完全重构
- `migration`：数据迁移策略
- `performance`：性能优化方案
- `api-design`：数据访问模式变更

### Breaking Changes Summary
1. **API 内部实现**：所有数据库查询逻辑重写（对外接口不变）
2. **开发环境**：需要 Supabase 本地实例或远程项目
3. **类型导入**：从 `@prisma/client` 切换到 Supabase 生成的类型
4. **错误处理**：Supabase 错误码与 Prisma 不同
5. **事务 API**：必须使用 RPC 函数，不再支持 `prisma.$transaction`

---

## Implementation Status

**Last Updated**: 2025-11-10
**Actual Progress**: ~62% of Phase 0 (23/37 tasks), ~18% overall (28/155 total tasks)

⚠️ **重要更新 (2025-11-10)**: 完成 4 个 RPC 函数的 P0 关键缺陷修复，解决 12 个阻塞性问题（安全漏洞、Schema 不一致、并发问题等）。详见 [P0_FIXES_SUMMARY.md](./P0_FIXES_SUMMARY.md)。

### Completed (Phase 0 - Infrastructure)

#### 0.1 Supabase 环境搭建 (50% complete)
- ✅ Prisma Schema 生成 Supabase 迁移脚本 (129KB)
- ✅ 71 张数据表结构同步完成
- ✅ RLS 策略和性能索引配置
- ✅ 表结构验证脚本和测试端点
- ⏳ 环境变量配置（待完善）
- ⏳ 种子数据导入（待完成）

#### 0.2 RPC 函数库开发 (40% complete)
- ✅ 4 个事务处理 RPC 函数 (100%) **+ P0 修复完成** 🎯
  - `accept_family_invite` (3.4KB + 测试)
    - ✅ **P0 修复**: Email 服务端验证、FOR UPDATE NOWAIT、SET search_path
  - `record_spending_tx` (4.6KB)
    - ✅ **P0 修复**: Schema 对齐、类别枚举修复、Alert 去重、FOR UPDATE 锁
  - `create_inventory_notifications_batch` (3.3KB)
    - ✅ **P0 修复**: SET search_path 安全保护
  - `update_shopping_list_item_atomic` (3.8KB)
    - ✅ **P0 修复**: SET search_path 安全保护
- ⏳ 3 个分析查询 RPC 函数（待完成）
- ⏳ 3 个辅助 RPC 函数（待完成）

**P0 修复总结**:
- 修复了 12 个 P0 级别缺陷（5 个安全漏洞、4 个 Schema 不一致、2 个并发问题、1 个数据类型错误）
- 消除了 search_path 劫持风险（所有 SECURITY DEFINER 函数）
- 修复了身份验证绕过漏洞（`accept_family_invite`）
- 修复了类别预算限制失效问题（枚举值错误）
- 修复了 Alert 重复插入问题（添加 UPSERT 逻辑）
- 详细修复文档：[P0_FIXES_SUMMARY.md](./P0_FIXES_SUMMARY.md)

#### 0.3 类型生成与验证管道 (80% complete)
- ✅ 类型生成脚本实现 (11KB)
- ✅ 3 个类型定义文件生成
  - `supabase-generated.ts` (6.8KB)
  - `supabase-database.ts` (14.3KB)
  - `supabase-rpc.ts` (3.8KB)
- ✅ Zod schema 库创建 (12.6KB)
- ✅ TypeScript 严格模式验证脚本
- ⏳ CI 自动化流程（待配置）

#### 0.4 服务抽象层重构 (75% complete)
- ✅ Repository 接口设计 (100%)
  - 5 个接口：Budget, Notification, Analytics, Recommendation + 核心 Adapter
- ✅ Supabase Repository 实现 (100%)
  - `SupabaseBudgetRepository` (15.9KB)
  - `SupabaseNotificationRepository` (11.5KB)
  - `SupabaseAnalyticsRepository` (14KB)
  - `SupabaseRecommendationRepository` (14KB)
  - `SupabaseAdapter` (16.7KB) - 核心数据访问层
- ✅ Service Container 创建 (9.1KB)
- ⏳ 4 个核心服务重构为依赖注入（1/4 完成）

#### 0.5 双写验证框架 (0% complete)
- ⏳ 待开始

### In Progress
- 🔄 Phase 0 基础设施准备：62% 完成（预计还需 1-2 周）
- 🔄 服务层依赖注入重构（进行中）

### Pending
- ⏳ Phase 0.5: 双写验证框架（预计 6-7 天）
- ⏳ All migration batches (Phase 1-5) - 102 API endpoints
- ⏳ Production monitoring and rollout

### Risk Assessment
**Current Status**: ✅ **ACCELERATED PROGRESS + P0 修复完成**

Phase 0 进度已达 62%，显著超过之前估计的 8%。核心基础设施已基本完成：

**已验证的技术可行性**:
- ✅ Supabase 迁移脚本生成和表结构同步
- ✅ 事务 RPC 函数实现和测试
- ✅ **P0 关键缺陷修复完成**（12 个阻塞性问题已解决） 🎯
- ✅ 类型安全管道完整搭建
- ✅ Repository 模式完全实现
- ✅ Service Container 依赖注入架构

**当前风险**:
- 🟢 **已解决**: RPC 函数 P0 安全和稳定性问题（search_path 劫持、身份验证绕过、并发竞态）
- 🟡 需要完成剩余 3 个服务的依赖注入重构
- 🟡 双写验证框架尚未启动
- 🟡 102 个 API 端点迁移量仍然巨大
- 🟡 **识别出 P1 问题**（N+1 查询、竞态条件等），已记录待修复

**Mitigation Factors**:
- ✅ 核心架构已验证可行
- ✅ 4 个 Repository 实现可作为模板
- ✅ RPC 函数模式已建立并通过安全审查
- ✅ 类型安全保障已到位
- ✅ **P0 修复建立了代码质量标准和审查流程**

**修订后的时间估算**:
- Phase 0 剩余工作：1-2 周（vs 原估计 4-5 周）
  - 包括 P1 问题修复（预计 2-3 天）
- Phase 1-5 API 迁移：可能缩短至 4-6 周（有了完善的模板）
- 总计：约 6-10 周（vs 原估计 12-14 周）

**质量保障**:
- ✅ 建立了 CodeX 代码审查协作流程
- ✅ P0/P1 优先级分类机制
- ✅ 详细的修复文档和知识沉淀
- ✅ RPC 函数安全检查清单（SET search_path, FOR UPDATE, 服务端验证等）