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