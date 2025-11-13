# 双写验证框架 - 操作手册

## 概述

双写验证框架用于支持 Prisma 到 Supabase 的平滑迁移,提供:
- 双写模式(Prisma + Supabase)
- 结果比对和告警
- 主库切换
- 数据对账
- 快速回滚

## 工作模式

### 1. 单写模式 - 仅使用 Prisma(默认)
```
enableDualWrite: false
enableSupabasePrimary: false
```
所有请求仅使用 Prisma,Supabase 不参与。

### 2. 双写模式 - Prisma 为主
```
enableDualWrite: true
enableSupabasePrimary: false
```
所有写操作同时写入 Prisma 和 Supabase,Prisma 结果返回给用户。
读操作主要查询 Prisma,同时异步查询 Supabase 进行比对。

### 3. 双写模式 - Supabase 为主
```
enableDualWrite: true
enableSupabasePrimary: true
```
所有写操作同时写入 Prisma 和 Supabase,Supabase 结果返回给用户。
读操作主要查询 Supabase,同时异步查询 Prisma 进行比对。

### 4. 单写模式 - 仅使用 Supabase(迁移完成)
```
enableDualWrite: false
enableSupabasePrimary: true
```
所有请求仅使用 Supabase,Prisma 不参与(可移除)。

## 常用操作

### 查看当前配置

```bash
pnpm ts-node scripts/dual-write/toggle-feature-flags.ts
```

输出示例:
```
✅ 当前配置:
  - enableDualWrite: false
  - enableSupabasePrimary: false
  - 最后更新: 2025-11-13T10:30:00Z

📋 当前模式: 单写模式 - 仅使用 Prisma
```

### 切换到双写模式

#### 步骤1: 开启双写(Prisma 为主)

```bash
pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
  --dual-write=on \
  --primary=prisma
```

#### 步骤2: 观察 3-7 天,检查 diff

```bash
# 查看 diff 统计
psql $DATABASE_URL -c "SELECT get_dual_write_stats(7);" | jq
```

或在 Supabase Dashboard 查询:
```sql
SELECT
  api_endpoint,
  severity,
  COUNT(*) as count
FROM dual_write_diffs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY api_endpoint, severity
ORDER BY count DESC;
```

#### 步骤3: 切换到 Supabase 为主

```bash
pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
  --primary=supabase
```

#### 步骤4: 再观察 3-7 天,确认无问题

```bash
# 运行数据对账
pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=all --report
```

#### 步骤5: 关闭双写,仅使用 Supabase

```bash
pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
  --dual-write=off \
  --primary=supabase
```

### 数据对账

#### 对账所有关键数据

```bash
pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=all
```

#### 仅对账预算数据

```bash
pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=budget
```

#### 生成对账报告

```bash
pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=all --report
```

报告保存为 `reconcile-report-YYYY-MM-DD.json`

## 监控和告警

### 查看 Diff 统计

```sql
-- 最近 7 天的 diff 统计
SELECT get_dual_write_stats(7);
```

### 查看错误级别的 Diff

```sql
SELECT
  api_endpoint,
  operation,
  created_at,
  diff
FROM dual_write_diffs
WHERE severity = 'error'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;
```

### 清理旧的 Diff 记录

```sql
-- 清理 30 天前的 info 级别记录(保留 warning/error)
SELECT cleanup_dual_write_diffs(30);
```

## 回滚流程

### 场景 1: Supabase 写入失败率过高

**现象**: `dual_write_diffs` 表中 Supabase 错误率 > 5%

**操作**:
1. 立即停止向 Supabase 切换
2. 保持 Prisma 为主
3. 检查 Supabase 错误日志
4. 修复 Supabase 问题后重新开始

```bash
# 确保 Prisma 为主
pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
  --dual-write=on \
  --primary=prisma
```

### 场景 2: Supabase 性能不达标

**现象**: API P95 延迟上升 > 20%

**操作**:
1. 立即回滚到 Prisma 为主
2. 分析慢查询日志
3. 优化 RPC 函数或索引
4. 重新测试后再切换

```bash
# 回滚到 Prisma
pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
  --primary=prisma
```

### 场景 3: 数据不一致

**现象**: 对账发现关键数据不一致 > 10 条

**操作**:
1. 暂停迁移,保持当前模式
2. 运行对账脚本生成报告
3. 手动修复数据不一致
4. 确认修复后继续迁移

```bash
# 生成详细报告
pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=all --report

# TODO: 运行补偿脚本(尚未实现)
# pnpm ts-node scripts/dual-write/compensate-data.ts --report=reconcile-report-YYYY-MM-DD.json
```

### 场景 4: 紧急回滚到 Prisma

**现象**: 生产环境出现严重问题

**操作**:
1. 立即关闭双写,仅使用 Prisma
2. 记录事故详情
3. 分析根本原因
4. 修复后重新开始

```bash
# 紧急回滚
pnpm ts-node scripts/dual-write/toggle-feature-flags.ts \
  --dual-write=off \
  --primary=prisma
```

## 性能优化建议

### Feature Flag 缓存

Feature Flag 默认缓存 5 秒,通常不需要调整。
如果需要更快的切换响应,可以修改 `src/lib/db/dual-write/feature-flags.ts` 中的 `CACHE_TTL_MS`。

### Diff 记录优化

默认所有 diff 都会异步写入数据库。
如果 diff 数量过多影响性能,可以考虑:

1. 增加 ResultVerifier 的采样率(只记录部分 diff)
2. 使用 Cloudflare KV 缓冲,批量写入数据库
3. 提高 diff 记录的阈值(只记录差异 > 5 个字段的情况)

### 数据库连接池

双写模式下会同时使用 Prisma 和 Supabase 连接。
确保连接池配置足够:

```env
# Prisma 连接池(推荐)
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=10"

# Supabase 连接池(通过 Supabase Pooler)
SUPABASE_URL="https://xxx.supabase.co"  # 已包含连接池
```

## 常见问题

### Q: Feature Flag 更新后多久生效?

A: 最多 5 秒(缓存 TTL)。建议操作后等待 10 秒再验证。

### Q: 双写会影响性能多少?

A: 通常增加 5-10% 延迟,主要来自异步 diff 记录。
写操作延迟几乎不变(并发写入),读操作增加约 5ms(异步影子读)。

### Q: 如何完全移除 Prisma?

A:
1. 确认已在单写 Supabase 模式运行 ≥ 2 周
2. 运行对账脚本确认数据 100% 一致
3. 移除 `@prisma/client` 依赖
4. 删除 `prisma/` 目录
5. 移除双写验证框架代码

### Q: Diff 记录会占用多少空间?

A: 取决于 API 调用量。典型场景:
- 1000 req/min → ~50MB/天
- 建议每月清理一次 info 级别记录
- warning/error 级别记录永久保留

## 相关文件

- `src/lib/db/dual-write/` - 双写验证框架核心代码
- `supabase/migrations/20251113000000_dual_write_framework.sql` - 数据库表
- `scripts/dual-write/toggle-feature-flags.ts` - Feature Flag 切换工具
- `scripts/dual-write/reconcile-data.ts` - 数据对账脚本

## 支持

如有问题,请查看:
- `openspec/changes/add-cloudflare-supabase-hybrid-architecture/design.md` - 详细设计文档
- `openspec/changes/add-cloudflare-supabase-hybrid-architecture/tasks.md` - 任务清单
