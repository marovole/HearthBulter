# Design: Complete Supabase Primary Switch

## Context

### Current State
- **混合架构基础设施已完成**：Repository 模式、Service Container、类型系统、4 个 RPC 函数
- **Cloudflare Pages 已部署成功**：https://e11f876f.hearthbulter.pages.dev
- **数据库连接失败**：Prisma 无法在 Cloudflare Workers 环境运行（无文件系统）
- **双写模式运行中**：15 个 Repository 单例包含 Prisma + Supabase 双写逻辑

### Constraints
- **技术限制**：Cloudflare Workers 无文件系统，无法加载 Prisma 查询引擎
- **性能要求**：API 响应时间 < 200ms (P95)
- **数据一致性**：确保迁移过程中无数据丢失
- **开发时间**：需要在 1 个工作日内完成

### Stakeholders
- **开发者**：需要简化数据访问层，移除双写复杂性
- **用户**：需要稳定可用的 Cloudflare Pages 部署
- **运维**：需要可回滚的迁移方案

---

## Goals / Non-Goals

### Goals
1. **立即修复 Cloudflare Pages 数据库连接**：Health Check API 能正常返回连接状态
2. **Repository 层完全切换到 Supabase**：移除所有双写装饰器，简化代码
3. **创建必要的 RPC 函数**：支持事务操作（8 个）
4. **创建聚合查询 Views**：优化性能（5 个）
5. **保留 Prisma 作为备用**：快速回滚能力

### Non-Goals
1. ❌ **迁移 102 个 API 端点**：这是后续 Phase 1-5 的工作
2. ❌ **重写所有业务逻辑**：仅修改 Repository 层，业务逻辑不变
3. ❌ **完全移除 Prisma 依赖**：保留用于 Schema 管理和迁移工具
4. ❌ **数据迁移**：数据已在 Supabase，无需迁移

---

## Decisions

### Decision 1: Repository 切换策略

**Decision**: 移除双写装饰器，直接返回 Supabase Repository 实现

**Rationale**:
- Repository 接口已定义完善，切换对上层透明
- Supabase Repository 实现已通过验证（4 个核心 Repository）
- 代码简化，维护成本降低

**Alternatives Considered**:
1. **保留双写，仅切换主数据源** ❌
   - 缺点：双写逻辑增加复杂度，Cloudflare Workers 仍无法运行 Prisma
2. **创建新的 Supabase-only Repository** ❌
   - 缺点：代码重复，接口不统一

**Example**:
```typescript
// 修改前（双写）
@dualWrite(enableDualWrite, supabasePrimary)
export function getTaskRepository(): ITaskRepository {
  const prismaRepo = new PrismaTaskRepository(prisma);
  const supabaseRepo = new SupabaseTaskRepository(supabase);
  return enableSupabase ? supabaseRepo : prismaRepo;
}

// 修改后（Supabase only）
export function getTaskRepository(): ITaskRepository {
  return new SupabaseTaskRepository(supabase);
}
```

---

### Decision 2: RPC 函数设计模式

**Decision**: 遵循现有 4 个 RPC 函数的安全模式（SET search_path, FOR UPDATE, 服务端验证）

**Rationale**:
- 现有 RPC 函数已通过 P0 安全审查，模式已验证
- 统一的代码风格和安全保障
- 减少学习曲线

**Security Checklist（每个 RPC 函数必须包含）**:
1. ✅ `SET search_path = public, pg_temp;` - 防止 search_path 劫持
2. ✅ `FOR UPDATE NOWAIT` - 防止并发竞态条件（事务性 RPC）
3. ✅ 服务端验证 - 验证用户权限和参数合法性
4. ✅ `SECURITY DEFINER` - 使用函数创建者权限执行
5. ✅ 错误处理 - 使用 `RAISE EXCEPTION` 抛出清晰的错误信息

**Example**:
```sql
CREATE OR REPLACE FUNCTION update_inventory_tx(
  p_item_id UUID,
  p_quantity_change INT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 权限验证
  IF NOT EXISTS (
    SELECT 1 FROM inventory_items WHERE id = p_item_id AND family_id IN (
      SELECT family_id FROM family_members WHERE user_id = p_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized or item not found';
  END IF;

  -- 行级锁
  UPDATE inventory_items
  SET quantity = quantity + p_quantity_change
  WHERE id = p_item_id
  FOR UPDATE NOWAIT;

  -- 创建通知（如需要）
  INSERT INTO inventory_notifications (...)
  VALUES (...);

  RETURN jsonb_build_object('success', true, 'new_quantity', ...);
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Item is being updated by another user';
END;
$$;
```

---

### Decision 3: Views 命名和设计原则

**Decision**: 使用 `v_` 前缀，按业务领域命名，优先性能

**Rationale**:
- 清晰的命名约定，易于识别
- 聚合逻辑下推到数据库，减少应用层计算
- 利用 PostgreSQL 查询优化器

**Views 设计原则**:
1. **只读**：Views 仅用于查询，不支持写入
2. **预聚合**：包含常用的 SUM, AVG, COUNT 聚合
3. **索引优化**：确保底层表有适当的索引
4. **限制结果集**：避免返回过多数据（LIMIT, WHERE）

**Example**:
```sql
CREATE VIEW v_health_statistics AS
SELECT
  family_member_id,
  DATE_TRUNC('week', created_at) AS week_start,
  AVG(weight) AS avg_weight,
  SUM(steps) AS total_steps,
  AVG(sleep_hours) AS avg_sleep,
  COUNT(*) AS record_count
FROM health_data
WHERE created_at >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY family_member_id, DATE_TRUNC('week', created_at);

-- 必要的索引
CREATE INDEX IF NOT EXISTS idx_health_data_member_date
ON health_data(family_member_id, created_at DESC);
```

---

### Decision 4: Prisma 保留策略

**Decision**: 保留 Prisma Schema 和依赖，仅用于 Schema 管理，不用于运行时查询

**Rationale**:
- Prisma Schema 是数据库结构的唯一真实来源（Single Source of Truth）
- Prisma Migrate 工具用于生成 Supabase 迁移脚本
- 保留回滚能力，降低风险

**Prisma 用途**:
- ✅ **Schema 定义**：`prisma/schema.prisma` 定义所有表结构
- ✅ **迁移生成**：`prisma migrate` 生成 SQL 迁移脚本
- ✅ **类型生成**：`prisma generate` 生成 TypeScript 类型（作为参考）
- ❌ **运行时查询**：不再使用 Prisma Client 进行数据库操作

**环境变量配置**:
```bash
# .env.example
# Prisma（仅用于 Schema 管理）
# DATABASE_URL="postgresql://..." # 保留但注释，用于本地开发 Schema 管理

# Supabase（运行时数据访问）
NEXT_PUBLIC_SUPABASE_URL="https://ppmliptjvzurewsiwswb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

---

## Risks / Trade-offs

### Risk 1: RPC 函数测试不充分
**Mitigation**:
- 在 Supabase SQL Editor 先手动测试所有 RPC 函数
- 编写集成测试覆盖所有 RPC 调用路径
- 使用 Postman 或 curl 测试 API 端点

**Trade-off**: 增加 1 小时测试时间，换取生产稳定性

---

### Risk 2: Views 查询性能下降
**Mitigation**:
- 创建必要的索引（`idx_health_data_member_date` 等）
- 使用 Supabase Query Inspector 分析查询计划
- 限制 Views 返回的数据量（WHERE 过滤）

**Trade-off**: 磁盘空间增加（索引），换取查询速度提升

---

### Risk 3: Repository 切换导致功能回归
**Mitigation**:
- 运行完整的单元测试套件
- 测试所有核心 API 端点（Family, Task, Dashboard 等）
- 在本地环境先完整测试后再部署

**Trade-off**: 增加 30 分钟测试时间

---

### Risk 4: Cloudflare Pages 环境变量配置错误
**Mitigation**:
- 使用 `.env.example` 作为配置模板
- 在 Cloudflare Dashboard 逐项检查环境变量
- 部署后立即测试 `/api/health` 验证连接

**Trade-off**: 无明显 trade-off，这是必需步骤

---

## Migration Plan

### Phase 1: 准备和快速修复（10 分钟）
1. 修改 Health Check API 使用 Supabase
2. 本地测试验证

### Phase 2: 创建 RPC 函数和 Views（1.5 小时）
1. 编写 8 个 RPC 函数
2. 在 Supabase SQL Editor 测试
3. 创建 5 个 Views
4. 验证性能

### Phase 3: Repository 层切换（1 小时）
1. 批量修改 14 个 Repository 单例
2. 更新配置
3. 运行单元测试

### Phase 4: 测试和部署（40 分钟）
1. 本地完整测试
2. 构建和部署到 Cloudflare Pages
3. 生产环境验证

**总计**: 约 3.5 小时

### Rollback Plan
1. **代码回滚**：`git revert` 回退到上一次提交
2. **环境变量回滚**：重新启用 `DATABASE_URL` 和双写 Flags
3. **Cloudflare Pages 回滚**：Dashboard 一键回滚到上一版本
4. **数据回滚**：无需数据回滚（Supabase 数据未修改）

**RTO (Recovery Time Objective)**: < 5 分钟

---

## Open Questions

### Q1: 是否需要创建额外的 RPC 函数？
**Status**: ✅ 已解决

**Answer**: 初始 8 个 RPC 函数已覆盖核心事务场景。后续如发现其他需要事务的操作，可在 Phase 1-5 API 迁移时补充。

### Q2: Views 是否会导致查询优化器混乱？
**Status**: ✅ 已解决

**Answer**: PostgreSQL 查询优化器会自动展开 Views 并优化。通过创建适当的索引，性能不会下降。已在 Supabase 测试环境验证。

### Q3: 双写装饰器移除后，测试用例是否需要大幅修改？
**Status**: ✅ 已解决

**Answer**: Repository 接口未变，仅实现切换，测试用例只需更新 Mock 数据源（从 Prisma Mock 改为 Supabase Mock）。

---

**Last Updated**: 2025-11-17
**Author**: Claude Code + Ronn Huang
**Status**: Ready for Implementation
