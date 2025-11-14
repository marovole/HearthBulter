# 监控和日志收集配置

## 概述

本目录包含 Health Butler 双写迁移期间的监控和日志收集配置,支持:

- Grafana 仪表盘(性能指标、Diff 统计)
- Supabase Log Drain(慢查询、错误日志)
- Cloudflare Workers 日志(边缘计算日志)

## 快速开始

### 1. Grafana 监控

#### 1.1 导入仪表盘

```bash
# 在 Grafana UI 中:
# 1. 进入 Dashboards -> Import
# 2. 上传 grafana-dashboard.json
# 3. 选择数据源: PostgreSQL (连接到 Supabase)
```

#### 1.2 配置数据源

**PostgreSQL 数据源**:
- Host: `<your-project>.supabase.co:5432`
- Database: `postgres`
- User: `postgres`
- Password: `<your-supabase-password>`
- SSL Mode: `require`
- TLS/SSL Method: `TLS Client Auth`

**Prometheus 数据源**(可选,用于 HTTP 指标):
- URL: `http://localhost:9090` (如果运行了 Prometheus)

### 2. Supabase Log Drain

#### 2.1 启用日志导出

```bash
# 使用 Supabase CLI
supabase logs enable --project-ref <your-project-ref>

# 配置日志导出到 Grafana Loki
supabase logs config --destination loki --url <loki-url>
```

#### 2.2 查询慢查询日志

```sql
-- 查询执行时间 > 1s 的 RPC 函数
SELECT
  timestamp,
  request_id,
  path,
  duration_ms
FROM supabase_logs.postgres_logs
WHERE duration_ms > 1000
  AND path LIKE '/rest/v1/rpc/%'
ORDER BY timestamp DESC
LIMIT 50;
```

### 3. Cloudflare Workers 日志

#### 3.1 实时日志监控

```bash
# 使用 wrangler tail(实时流式日志)
npx wrangler pages deployment tail hearthbulter --project-name hearthbulter
```

#### 3.2 配置日志推送

在 `wrangler.toml` 中添加:

```toml
[env.production]
logpush = true

[[env.production.logpush]]
destination_conf = "https://your-loki-instance/loki/api/v1/push"
ownership_challenge = "your-ownership-token"
```

#### 3.3 查询 Cloudflare Analytics

```bash
# 使用 Cloudflare GraphQL API
curl -X POST https://api.cloudflare.com/client/v4/graphql \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { viewer { zones(filter: { zoneTag: \"<zone-id>\" }) { httpRequests1dGroups(limit: 10) { dimensions { date } sum { requests } } } } }"
  }'
```

## 监控指标

### 核心指标

#### 1. API 性能指标

| 指标 | 描述 | 阈值 | 告警条件 |
|------|------|------|---------|
| `http_request_duration_p95` | API P95 延迟 | < 500ms | > 800ms |
| `http_request_success_rate` | API 成功率 | > 99% | < 95% |
| `http_requests_per_second` | 请求速率 | N/A | 监控趋势 |

#### 2. 双写验证指标

| 指标 | 描述 | 阈值 | 告警条件 |
|------|------|------|---------|
| `dual_write_diff_count` | 24h Diff 数量 | < 100 | > 500 |
| `dual_write_error_rate` | Diff 错误率 | < 1% | > 5% |
| `supabase_write_failure_rate` | Supabase 写入失败率 | < 0.5% | > 5% |

#### 3. RPC 函数性能

| 指标 | 描述 | 阈值 | 告警条件 |
|------|------|------|---------|
| `rpc_accept_family_invite_latency` | 家庭邀请 RPC 延迟 | < 200ms | > 500ms |
| `rpc_record_spending_latency` | 记账 RPC 延迟 | < 150ms | > 400ms |
| `rpc_fetch_advice_history_latency` | AI 历史 RPC 延迟 | < 300ms | > 800ms |

### 自定义 SQL 查询

#### 查询 Diff 统计

```sql
-- 最近 24 小时的 Diff 统计
SELECT
  get_dual_write_stats(1) as stats;
```

#### 查询错误趋势

```sql
-- 按小时统计错误数
SELECT
  date_trunc('hour', created_at) as hour,
  severity,
  COUNT(*) as count
FROM dual_write_diffs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, severity
ORDER BY hour DESC;
```

#### 查询 Top 10 差异端点

```sql
SELECT
  api_endpoint,
  COUNT(*) as diff_count,
  COUNT(*) FILTER (WHERE severity = 'error') as errors,
  COUNT(*) FILTER (WHERE severity = 'warning') as warnings,
  AVG(jsonb_array_length(diff)) as avg_diff_fields
FROM dual_write_diffs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY api_endpoint
ORDER BY diff_count DESC
LIMIT 10;
```

## 告警配置

### Grafana 告警规则

#### 1. Diff 错误率过高

```yaml
alert: DualWriteErrorRateHigh
expr: |
  (
    count(dual_write_diffs{severity="error"}) /
    count(dual_write_diffs)
  ) > 0.05
for: 5m
labels:
  severity: critical
annotations:
  summary: "Dual write error rate > 5%"
  description: "Current error rate: {{ $value }}%"
```

#### 2. Supabase 写入失败率过高

```yaml
alert: SupabaseWriteFailureHigh
expr: |
  rate(dual_write_diffs{supabase_result_status="rejected"}[5m]) > 0.05
for: 5m
labels:
  severity: warning
annotations:
  summary: "Supabase write failure rate > 5%"
```

#### 3. API 延迟异常

```yaml
alert: APILatencyHigh
expr: |
  histogram_quantile(0.95, http_request_duration_seconds) > 0.8
for: 10m
labels:
  severity: warning
annotations:
  summary: "API P95 latency > 800ms"
```

### Slack 集成

在 Grafana 中配置 Slack 通知:

1. 进入 **Alerting** -> **Contact points**
2. 添加新的 Contact point:
   - **Name**: `slack-alerts`
   - **Type**: `Slack`
   - **Webhook URL**: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`
   - **Channel**: `#dual-write-alerts`

## 性能基线

### 目标指标(Supabase 模式)

基于 Prisma 模式的性能基线,Supabase 模式应满足:

| 操作类型 | Prisma P95 | Supabase 目标 | 可接受上限 |
|---------|-----------|--------------|----------|
| 简单查询 | 50ms | < 60ms | < 80ms |
| 复杂查询 | 200ms | < 240ms | < 300ms |
| 写操作(无事务) | 80ms | < 100ms | < 150ms |
| RPC 事务 | 150ms | < 180ms | < 250ms |
| 分析查询 | 500ms | < 600ms | < 800ms |

### 性能回归检测

如果检测到以下情况,应立即调查:

1. **P95 延迟增加 > 20%**: 可能的慢查询或索引缺失
2. **错误率 > 1%**: 可能的 RPC 函数 bug 或 Schema 不一致
3. **Diff 数量激增**: 可能的数据同步问题

## 日志查询示例

### Supabase 日志

#### 查询 RPC 函数调用

```sql
SELECT
  timestamp,
  request_id,
  method,
  path,
  duration_ms,
  status_code
FROM supabase_logs.postgres_logs
WHERE path LIKE '/rest/v1/rpc/%'
  AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY duration_ms DESC
LIMIT 20;
```

#### 查询错误日志

```sql
SELECT
  timestamp,
  level,
  message,
  error_code,
  request_id
FROM supabase_logs.postgres_logs
WHERE level IN ('ERROR', 'FATAL')
  AND timestamp >= NOW() - INTERVAL '6 hours'
ORDER BY timestamp DESC;
```

### Cloudflare 日志

通过 Logpush 导出到 Loki 后,使用 LogQL 查询:

```logql
# 查询所有错误
{job="cloudflare-workers"} |= "error" | json

# 查询特定 API 的延迟
{job="cloudflare-workers", path="/api/budget/record-spending"} | json | duration > 500ms

# 统计每分钟的请求数
sum(rate({job="cloudflare-workers"}[1m]))
```

## 故障排查

### 问题 1: Diff 数量突然增加

**排查步骤**:

1. 查询最近的 diff 记录:
   ```sql
   SELECT * FROM dual_write_diffs
   ORDER BY created_at DESC LIMIT 50;
   ```

2. 检查是否有特定端点出现问题:
   ```sql
   SELECT api_endpoint, COUNT(*)
   FROM dual_write_diffs
   WHERE created_at >= NOW() - INTERVAL '1 hour'
   GROUP BY api_endpoint
   ORDER BY count DESC;
   ```

3. 检查 Feature Flag 是否被意外修改:
   ```sql
   SELECT * FROM dual_write_config;
   ```

### 问题 2: Supabase RPC 调用失败

**排查步骤**:

1. 检查 Supabase 日志:
   ```sql
   SELECT * FROM supabase_logs.postgres_logs
   WHERE path LIKE '%rpc%' AND status_code >= 400
   ORDER BY timestamp DESC LIMIT 20;
   ```

2. 测试 RPC 函数:
   ```sql
   SELECT * FROM accept_family_invite('<test-code>', '<test-user-id>', 'Test User');
   ```

3. 检查数据库连接池:
   ```sql
   SELECT count(*) as active_connections
   FROM pg_stat_activity
   WHERE state = 'active';
   ```

### 问题 3: API 延迟异常

**排查步骤**:

1. 检查慢查询:
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE mean_exec_time > 1000  -- > 1s
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. 检查缓存命中率:
   ```sql
   SELECT
     sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
   FROM pg_statio_user_tables;
   ```

3. 检查锁等待:
   ```sql
   SELECT * FROM pg_stat_activity
   WHERE wait_event_type = 'Lock';
   ```

## 维护任务

### 每日检查

- [ ] 查看 Grafana 仪表盘,确认所有指标正常
- [ ] 检查 Diff 错误率 < 1%
- [ ] 检查 Supabase 写入成功率 > 99%

### 每周任务

- [ ] 生成性能对比报告
- [ ] 清理 30 天前的 info 级别 diff 记录:
  ```sql
  SELECT cleanup_dual_write_diffs(30);
  ```
- [ ] 检查数据库索引使用情况

### 每月任务

- [ ] 审查告警历史,优化告警阈值
- [ ] 性能基线对比分析
- [ ] 数据对账(Budget, Spending, RecipeFavorite)

## 相关文档

- [Grafana Documentation](https://grafana.com/docs/)
- [Supabase Logging](https://supabase.com/docs/guides/platform/logs)
- [Cloudflare Logpush](https://developers.cloudflare.com/logs/get-started/)
- [K6 Performance Testing](https://k6.io/docs/)

## 联系方式

如有监控相关问题,请联系:

- 技术负责人: [email]
- Slack 频道: #dual-write-monitoring
