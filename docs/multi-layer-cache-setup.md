# 多层缓存策略 - 部署指南

## 概述

本项目实现了三层缓存架构：
- **L1: Cloudflare KV** (60s TTL) - 边缘缓存，全球分布
- **L2: Supabase trend_data 表** (300s TTL) - 数据库缓存，预计算结果
- **L3: Materialized View** - 聚合视图（未来扩展）

降级策略：L1 miss → L2 → L3 → 实时查询

## 文件结构

```
src/
├── types/
│   └── cloudflare-env.d.ts          # Cloudflare KV 类型定义
├── lib/
│   └── cache/
│       ├── cloudflare-kv.ts         # L1: KV 客户端包装器
│       ├── supabase-trend-cache.ts  # L2: 趋势数据缓存
│       ├── multi-layer-cache.ts     # 多层缓存协调器
│       └── edge-cache-helpers.ts    # HTTP 缓存头辅助函数（已存在）
└── app/
    └── api/
        └── analytics/
            └── trends/
                └── route.ts          # 已集成多层缓存
```

## 部署步骤

### 1. 创建 Cloudflare KV 命名空间

在 Cloudflare Dashboard 中：

1. 进入你的 Pages 项目
2. 导航到 **Settings** → **Functions** → **KV namespace bindings**
3. 创建两个 KV 命名空间：
   - 生产环境：`hearthbutler-cache-prod`
   - 预览环境：`hearthbutler-cache-preview`
4. 记录下 Namespace ID

### 2. 配置 wrangler.toml

编辑 `wrangler.toml`，启用 KV 绑定：

```toml
# 生产环境 KV
[[env.production.kv_namespaces]]
binding = "CACHE_KV"
id = "your-production-kv-id"  # 替换为实际的 Namespace ID

# 预览环境 KV
[[env.preview.kv_namespaces]]
binding = "CACHE_KV"
preview_id = "your-preview-kv-id"  # 替换为实际的 Namespace ID
```

### 3. 部署到 Cloudflare Pages

```bash
# 构建项目
pnpm run build:cloudflare

# 部署到 Cloudflare Pages
pnpm run deploy:cloudflare

# 或者使用 Wrangler CLI
npx wrangler pages deploy .open-next
```

### 4. 验证部署

#### 检查 KV 绑定

```bash
# 列出 KV 命名空间
npx wrangler kv:namespace list

# 查看 KV 中的键
npx wrangler kv:key list --binding=CACHE_KV --env=production
```

#### 测试缓存

访问 `/api/analytics/trends` 端点并检查响应头：

**开发环境**：
```json
{
  "success": true,
  "data": {...},
  "_cache": {
    "source": "l1-kv",  // 或 "l2-trend-data", "database"
    "hit": true,
    "duration": 15
  }
}
```

**响应头**：
```
Cache-Control: public, s-maxage=120, stale-while-revalidate=60
Vary: Authorization
X-Cache-Layer: l1-kv  (仅开发环境)
X-Cache-Hit: true      (仅开发环境)
X-Cache-Duration: 15ms (仅开发环境)
```

## 使用方式

### 在 API 路由中使用

```typescript
import { getMultiLayerCache } from '@/lib/cache/multi-layer-cache';
import { addCacheHeaders, EDGE_CACHE_PRESETS } from '@/lib/cache/edge-cache-helpers';

export async function GET(request: NextRequest) {
  // 创建缓存实例
  const cache = getMultiLayerCache({
    l1Ttl: 60,   // L1 (KV): 60 秒
    l2Ttl: 300,  // L2 (trend_data): 5 分钟
    debug: process.env.NODE_ENV === 'development',
  });

  // 获取趋势数据（自动使用多层缓存）
  const result = await cache.getTrendData(
    { memberId, dataType, startDate, endDate },
    async () => {
      // Fallback: 实时查询（仅在缓存 miss 时执行）
      return await analyzer.analyzeTrend(...);
    }
  );

  // 添加缓存头
  const headers = new Headers();
  addCacheHeaders(headers, EDGE_CACHE_PRESETS.ANALYTICS_ENDPOINT);

  return NextResponse.json({ data: result.data }, { headers });
}
```

### 缓存失效

```typescript
import { getMultiLayerCache } from '@/lib/cache/multi-layer-cache';

const cache = getMultiLayerCache();

// 删除特定趋势缓存
await cache.invalidateTrendData({
  memberId: 'member-123',
  dataType: 'WEIGHT',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
});

// 删除成员的所有缓存
await cache.invalidateByMember('member-123');
```

## 监控和调试

### KV 缓存统计

```bash
# 查看 KV 使用情况
npx wrangler kv:key list --binding=CACHE_KV --prefix="cache:trends:"
```

### L2 缓存统计

在数据库中查询：

```sql
-- 查看缓存命中次数
SELECT member_id, data_type, hit_count, expires_at
FROM trend_data
ORDER BY hit_count DESC
LIMIT 10;

-- 清理过期缓存
DELETE FROM trend_data WHERE expires_at < NOW();
```

### 日志分析

开发环境会输出详细日志：

```
[KvCache] KV hit: trends:member-123:WEIGHT:2025-01-01:2025-01-31
[MultiLayerCache] Trend cache hit: L1 (KV), key=trends:member-123:...
[SupabaseTrendCache] Set cache (TTL: 300s)
```

## 性能优化

### 缓存预热

在数据更新后主动填充缓存：

```typescript
// 数据更新后，立即写入 L2 和 L1
await cache.setTrendData(
  { memberId, dataType, startDate, endDate },
  trendData,
  { mean, median, slope }  // 可选的统计数据
);
```

### 批量失效

```typescript
// 删除成员的所有趋势缓存
await cache.invalidateByMember('member-123');

// 清理 L2 中的过期缓存
const trendCache = getTrendCache();
await trendCache.cleanupExpired();
```

## 常见问题

### Q: KV 绑定不可用怎么办？

A: 多层缓存会自动降级到 L2（trend_data）。开发环境下 KV 默认不可用，这是正常的。

### Q: 如何调试缓存未命中？

A: 设置 `debug: true` 并查看控制台日志：

```typescript
const cache = getMultiLayerCache({ debug: true });
```

### Q: 缓存数据不一致怎么办？

A: 手动清除所有层：

```bash
# 清除 KV
npx wrangler kv:key delete "cache:trends:member-123:..." --binding=CACHE_KV

# 清除 L2
DELETE FROM trend_data WHERE member_id = 'member-123';
```

## 限制和注意事项

1. **KV 限制**：
   - 键大小：最大 512 字节
   - 值大小：最大 25 MB（推荐 < 1MB）
   - 最终一致性：写入后可能需要 60 秒全球传播

2. **L2 (trend_data) 限制**：
   - JSONB 字段大小：建议 < 1MB
   - 自动过期：通过 `expiresAt` 字段管理

3. **适用场景**：
   - ✅ 计算密集型查询（趋势分析、统计聚合）
   - ✅ 数据更新频率低的查询
   - ❌ 实时数据（如在线状态）
   - ❌ 用户个性化数据（需要 private 缓存）

## 未来扩展

- [ ] L3: 创建 Materialized View 用于聚合分析
- [ ] 缓存预热任务（Cron Job）
- [ ] 缓存命中率监控仪表板
- [ ] 智能 TTL 调整（基于数据更新频率）
