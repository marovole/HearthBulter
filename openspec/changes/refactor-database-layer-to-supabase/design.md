## Context

### 当前现状
系统使用 Prisma ORM + AWS RDS PostgreSQL 作为数据访问层。Prisma 提供了：
- 类型安全的查询构建器
- 自动生成的 TypeScript 类型
- 迁移管理工具
- 直观的关联查询 API

### 迁移动机
1. **成本优化**: AWS RDS 最低成本约 $50/月，Supabase 免费套餐（500MB 数据库 + 1GB 存储）足够 MVP 阶段使用
2. **边缘计算**: Supabase 边缘网络提供全球 CDN，降低用户访问延迟
3. **功能扩展**: Supabase 提供开箱即用的实时订阅、认证、存储功能，为未来功能（实时排行榜、协作编辑）奠定基础
4. **简化架构**: 从复杂的 Prisma 生成步骤简化为原生 SQL + Supabase Client
5. **开发者体验**: Supabase 提供 Web Dashboard、SQL 编辑器和实时数据查看器

### 约束条件
- **零停机迁移**:不能在迁移过程中导致服务不可用
- **API 兼容性**:前端接口保持不变，仅后端实现变更
- **数据完整性**:确保所有数据准确迁移，无丢失或损坏
- **性能要求**:查询性能不能显著下降（目标：<20% 性能回归）

## Goals / Non-Goals

### Goals
- 完全移除生产环境的 Prisma Client 依赖
- 将 7 个核心 API 迁移到 Supabase（ecommerce 3个 + analytics 1个 + social 2个 + foods 1个）
- 创建 5+ Supabase Views 优化性能
- 保持缓存架构不变（KV/DB/View 三层）
- 实现完善的错误处理和降级策略

### Non-Goals
- **不迁移 Prisma Schema 管理**:继续用 Prisma Schema 作为数据库 Schema 单一真相来源，`prisma db push` 推送到 Supabase
- **不修改前端代码**:API 接口保持不变，URL、请求/响应格式不变
- **不立即删除 Prisma 代码**:保留标记为 deprecated，作为回滚备选方案
- **不重构业务逻辑**:仅修改数据访问层查询语法，不更改核心算法

## Decisions

### Decision 1: 使用 Supabase Client 而非原生 pg 库
**选择**: 使用官方的 @supabase/supabase-js

**理由**:
- 自动处理 PostgREST API 的调用（无需手动写 HTTP 请求）
- 内置认证和 RLS（Row Level Security）集成
- 提供实时订阅能力（为未来功能做准备）
- 类型安全的查询构建器（虽然不如 Prisma 强大）

**替代方案**:
- 原生 `pg` 库：更底层，需要手动管理连接池，但性能更好
- `postgres` 模板字符串库：提供 SQL 模板字符串，但需要自己处理参数化

**权衡**:
- 依赖 Supabase API，增加供应商锁定风险
- 查询性能略低于原生 pg（经过 PostgREST 层）
- 但开发效率提升，维护成本降低

### Decision 2: 保留 Prisma Schema 作为 Schema 管理工具
**选择**: 继续使用 `prisma/schema.prisma` 作为唯一数据源，使用 `prisma db push` 将更改推送到 Supabase

**理由**:
- Prisma Schema DSL 比原始 SQL DDL 更易读和维护
- 类型生成功能为前端提供类型安全（仍然有价值）
- 团队已熟悉 Prisma Schema 语法
- 避免维护两套 Schema 定义

**注意**:
- 应用层不再使用 Prisma Client，仅使用其 Schema 管理功能
- `@prisma/client` 依赖从生产依赖移至 devDependency

**替代方案**:
- 使用纯 SQL Migration 文件：更通用，但缺乏类型生成
- Database-first 工具（如 dbmate）：但需要额外工具链

### Decision 3: 渐进式迁移策略（按 Phase）
**选择**: 按功能模块分 Phase 迁移，而非大爆炸式重写

**Phase 1**: Foods + Social/Achievements（简单路径查询）
**Phase 2**: Analytics Trends + Social Leaderboard（中等复杂度）
**Phase 3**: Ecommerce 三剑客（高度复杂，依赖多个服务）
**Phase 4**: 优化、Views、测试、文档

**理由**:
- 降低风险：每 Phase 可独立测试和上线
- 快速验证：Phase 1 完成后即可验证 Supabase 集成
- 即时反馈：发现问题可以快速调整策略
- 资源分配：按优先级分配开发时间

**替代方案**:
- 分支重写：在 feature 分支完成全部迁移再合并
  - 缺点：长时间无法合并 main，合并冲突风险高
  - 优点：整体架构一致性更好

### Decision 4: 创建 Supabase Views 优化复杂查询
**选择**: 为热点查询路径创建 5+ Materialized/Regular Views

**计划创建的 Views**:
1. **v_family_member_stats**: 家庭成员统计数据（用于 Dashboard）
2. **v_social_leaderboard**: 社交排行榜（包含排名计算逻辑）
3. **v_ecommerce_product_prices**: 电商产品价格比较（聚合多平台数据）
4. **v_nutrition_summary**: 营养摄入汇总（群：By date/user/meal）
5. **v_analytics_trends**: 趋势分析数据（时间序列聚合）

**理由**:
- 复杂聚合查询在 View 中预计算，应用层只需简单 SELECT
- Materialized Views 可定期刷新，大幅降低查询时间
- 业务逻辑封装在数据库层，应用层更简洁
- Supabase Views 支持 RLS，可与应用层权限集成

**替代方案**:
- 应用层缓存：使用 Redis 缓存查询结果
  - 优点：更灵活，可控制缓存策略
  - 缺点：需要管理缓存失效，增加复杂度
- 应用层查询：保持复杂查询在应用层
  - 优点：逻辑集中，易于调试
  - 缺点：查询性能差，网络传输数据量大

### Decision 5: 权限验证模式：拆分嵌套查询
**选择**: 对于不支持嵌套关系查询的权限验证场景，拆分为多次简单查询 + 应用层过滤

**应用场景**:
```typescript
// Prisma 方式（不支持）
const achievements = await db.achievement.findMany({
  where: {
    user: {
      family: {
        members: {
          some: { userId: currentUser.id }
        }
      }
    }
  }
});

// 替代方案：拆分查询
const familyIds = await db.family_member
  .findMany({ where: { userId: currentUser.id } })
  .then(rows => rows.map(r => r.familyId));

const userIds = await db.family_member
  .findMany({ where: { familyId: in(familyIds) } })
  .then(rows => rows.map(r => r.userId));

const achievements = await db.achievement
  .findMany({ where: { userId: in(userIds) } });
```

**理由**:
- 避免创建复杂的 Supabase RPC 函数（难以维护）
- 应用层逻辑更清晰，易于测试
- 虽然增加查询次数，但简单查询性能更好
- 可以通过增加 Redis 缓存优化重复查询

**替代方案**:
- 创建 Supabase RPC 函数处理复杂权限逻辑
  - 优点：查询次数少，网络开销小
  - 缺点：调试困难，业务逻辑分散在数据库层

### Decision 6: 错误处理和降级策略
**选择**: 每个 API 端点实现多层次错误处理

**层次**:
1. **数据层错误**: Supabase 连接失败、查询超时、权限不足
2. **服务层错误**: 业务逻辑验证失败、数据不一致
3. **API 层错误**: 参数验证失败、认证失败

**降级策略**:
- 主数据库（Supabase）不可用时，返回 503 + 缓存数据（如果可用）
- RLS 权限检查失败时，返回 403 + 明确错误信息
- 查询超时时，返回 408 + 优化提示
- 限制查询深度，防止复杂查询导致数据库过载

**监控**: 打印错误日志到 Sentry，包含：
- 错误类型（数据库、权限、业务规则）
- 影响 API 端点
- 用户 ID（用于追踪）
- 事务 ID（用于调试）

## Risks / Trade-offs

### Risk 1: 性能回归风险
**风险**: 迁移后查询性能下降，影响用户体验

**影响**: High

**缓解**:
- Phase 1 完成后立即进行性能基准测试
- 创建 Supabase Views 预计算复杂聚合
- 实施多层缓存（KV/DB/View）
- 为慢查询设置监控和告警
- 优化索引（Supabase 提供 Index Advisor）

**成功标准**: 95% 查询性能 <200ms（P95 延迟）

### Risk 2: 权限验证漏洞
**风险**: RLS 配置错误或应用层权限检查不足，导致数据泄露

**影响**: High (Security)

**缓解**:
- 严格审查所有涉及用户数据的 RLS 策略
- 每个 API 端点编写权限测试用例
- 使用 Supabase 的 SQL Editor 验证查询结果
- 代码审查重点检查权限逻辑
- 安全渗透测试

**成功标准**: 通过所有安全测试用例

### Risk 3: 数据迁移错误
**风险**: 迁移过程中数据丢失或损坏

**影响**: Very High

**缓解**:
- 保持 AWS RDS 备份直到 Supabase 完全验证
- 使用 Prisma 对比 Schema 和 Supabase 实际 Schema
- 迁移后运行数据完整性检查脚本
- 种子数据对比验证

**成功标准**: 数据完整性和一致性 100%

### Risk 4: Supabase 供应商锁定
**风险**: 过度依赖 Supabase 专有功能，未来难以迁移

**影响**: Medium (Long-term)

**缓解**:
- 数据访问层封装在 Repository 中，隐藏实现细节
- 尽量使用标准 PostgreSQL 语法，而非 Supabase 专有扩展
- 保留 Prisma Schema 作为 Database-agnostic 的定义
- 避免使用 Supabase Edge Functions（除非确实需要）

**成功标准**: 代码库可在 <2 周迁移到原生 PostgreSQL（如果需要）

### Risk 5: 团队学习曲线
**风险**: 团队成员不熟悉 Supabase，导致开发效率下降

**影响**: Medium

**缓解**:
- 编写详细的迁移文档和示例
- 为每个 Phase 提供代码模板
- 文档化常见错误和解决方案
- 定期回顾和分享经验

**成功标准**: 团队可在 1 周内独立开发 Supabase 功能

## Migration Plan

### Phase Execution Order

#### Phase 1 (Week 1): Foods + Social Achievements
```bash
# Step 1 - Infrastructure
git checkout -b feature/refactor-database-phase-1
pnpm add @supabase/supabase-js
pnpm remove @prisma/client # 移至 devDependency

# Step 2 - Migrate Foods API
# 文件: src/lib/services/nutrition-calculator.ts
# 文件: src/app/api/foods/calculate-nutrition/route.ts

# Step 3 - Fix Social Achievements
# 文件: src/app/api/social/achievements/route.ts

# Step 4 - Test & Validate
pnpm test -- nutrition-calculator
pnpm test --social-achievements

# Step 5 - Commit & PR
git add .
git commit -m "feat: Phase 1 - 迁移 Foods 和修复 Social Achievements"
git push origin feature/refactor-database-phase-1
# PR merge (等待审核)
```

#### Phase 2 (Week 2): Analytics + Social Leaderboard
```bash
git checkout -b feature/refactor-database-phase-2

# 文件: src/lib/services/trend-analyzer.ts
# 文件: src/app/api/analytics/trends/route.ts
# 文件: src/lib/services/leaderboard-service.ts
# 文件: src/app/api/social/leaderboard/route.ts
# SQL: supabase/views/v_social_leaderboard.sql

git commit -m "feat: Phase 2 - 迁移 Analytics Trends 和 Social Leaderboard"
git push origin feature/refactor-database-phase-2
# PR merge
```

#### Phase 3 (Week 3-4): Ecommerce 三剑客
```bash
git checkout -b feature/refactor-database-phase-3

# 文件: src/lib/services/sku-matcher.ts
# 文件: src/lib/services/price-comparator.ts
# 文件: src/lib/services/platform-adapter-factory.ts
# 文件: src/app/api/ecommerce/*/route.ts
# SQL: supabase/views/v_ecommerce_product_prices.sql

git commit -m "feat: Phase 3 - 迁移 Ecommerce 三个核心 API"
git push origin feature/refactor-database-phase-3
# PR merge
```

#### Phase 4 (Week 5): 优化与上线
```bash
git checkout -b feature/refactor-database-phase-4

# 文件: supabase/views/*.sql
# 文件: 文档更新
# 文件: 测试完善

git commit -m "perf: Phase 4 - 添加 Supabase Views 优化查询性能"
git push origin feature/refactor-database-phase-4

# 最终验证
pnpm test:coverage
pnpm type-check
pnpm lint

# 上线决策
# 如果所有测试通过，合并到 main 并部署
```

### Rollback Plan

#### 回滚触发条件
- 性能下降 >30% 且无法在 4 小时内修复
- 严重安全漏洞（数据泄露）
- 数据丢失或损坏
- 核心功能不可用（下单、支付、健康数据查询）

#### 回滚步骤
```bash
# 1. 切换环境变量
dotenv set DATABASE_URL="旧 AWS RDS URL"
dotenv set USE_SUPABASE=false

# 2. 部署旧代码
git revert <最新的迁移 commit>
pnpm deploy

# 3. 验证服务
pm2 logs # 检查日志
# 测试核心功能：
# - 用户登录
# - 下单支付
# - 营养计算
# - 数据查询

# 4. 通知团队
# Slack 通知: @channel 数据库迁移回滚完成
# 安排事后复盘会议
```

**回滚时间目标**: <30 分钟

### 验证清单

#### 部署前
- [ ] 所有单元测试通过（覆盖率 >80%）
- [ ] 所有集成测试通过（7 个 API）
- [ ] 性能基准测试通过（P95 <200ms）
- [ ] 安全测试通过（权限检查）
- [ ] 数据库索引检查（Supabase Index Advisor）
- [ ] RLS 策略已配置并测试
- [ ] 环境变量已配置
- [ ] 监控和告警已设置
- [ ] 回滚计划已 review

#### 部署后
- [ ] 观察错误日志（1 小时）
- [ ] 监控响应时间（P95, P99）
- [ ] 监控慢查询（>1s）
- [ ] 用户反馈收集（24 小时）
- [ ] 错误率 <0.1%
- [ ] 无 500 错误

## Open Questions

### 技术问题
1. Supabase 免费套餐的 500MB 数据库限制是否足够？如果不足，何时需要升级到付费套餐？
   - 当前数据库大小：?
   - 预计 6 个月增长：?
   - 触发升级阈值：400MB?

2. RLS 策略对性能的影响如何评估？是否需要为高频查询绕过 RLS（使用 Service Role）？
   - 测试计划：基准测试对比启用/禁用 RLS

3. Supabase Edge Functions 是否适用于我们的业务场景？如果需要，何时引入？
   - 评估场景：Webhook 处理、图片处理、复杂业务逻辑
   - 成本考量：免费额度 500K invocations/month

4. Supabase Realtime 功能（WebSocket）如何集成到现有前端架构？是否需要全局状态管理（Zustand/Jotai）？
   - 评估场景：实时排行榜更新、协作编辑购物清单

### 业务问题
1. 迁移期间是否需要通知用户？如果出现问题，如何快速沟通？
   - 计划：维护页面、邮件通知、Slack 通知

2. Supabase 的数据备份和恢复策略是否符合合规要求（如 GDPR、HIPAA）？
   - 需要研究 Supabase 的备份频率和恢复时间（RTO/RPO）

3. 如果未来需要离开 Supabase，数据库迁移的难度如何？
   - 评估：从 Supabase PostgreSQL 导出到 AWS RDS 的步骤
   - 维护数据库中立性的策略

### 团队协作
1. 是否需要为团队组织 Supabase 培训？培训范围和形式？
   - 建议：1 小时基础 + 2 小时实操 + 文档

2. Code Review 时如何确保 Supabase 查询的正确性？是否需要自动化工具？
   - 选项：SQL Lint、查询性能分析、测试覆盖检查

3. 数据库 schema 变更流程如何调整？是否继续使用 Prisma Migration？
   - 决策：保持 Prisma Schema，使用 `prisma db push`，但需要文档化
