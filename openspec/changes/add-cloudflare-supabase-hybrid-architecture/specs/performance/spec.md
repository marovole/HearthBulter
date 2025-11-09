# 性能能力规范

## 概述

本规范定义了Cloudflare Pages + Supabase混合架构的性能要求、优化策略和验收标准，确保系统在全球范围提供卓越的用户体验。

## ADDED Requirements

### Requirement: 全球性能优化

系统 **SHALL** 利用 Cloudflare 全球边缘网络（300+ 城市的数据中心）在靠近用户的位置处理请求，**MUST** 确保静态资源加载全球平均延迟 < 50ms、API 响应全球平均延迟 < 150ms，并 **SHALL** 实现智能路由策略，根据用户地理位置、边缘节点健康度和负载情况自动选择最优边缘节点，以实现全球范围内的低延迟访问。

#### Scenario: 边缘计算加速

**Given** 用户从全球不同地区访问应用（如北美、欧洲、亚洲）
**When** 用户请求页面或 API 资源
**Then** 系统 SHALL 通过 Cloudflare CDN 从距离用户最近的边缘节点提供静态资源
**And** 静态资源加载时间 SHALL 在北美地区 < 20ms，欧洲 < 35ms，亚洲 < 50ms
**And** 系统 SHALL 使用智能路由选择健康且负载较低的边缘节点
**And** API 请求 SHALL 通过 Cloudflare Pages Functions 在边缘节点处理
**And** API 响应时间 MUST 在北美地区 < 80ms，欧洲 < 100ms，亚洲 < 120ms
**And** 系统 SHALL 监控边缘节点性能指标（CPU、内存、网络延迟、错误率）并动态调整路由

**需求**：系统必须利用Cloudflare全球边缘网络，在靠近用户的位置处理请求，实现全球范围内低延迟访问。

**性能指标**：
- 静态资源加载：全球平均 < 50ms
- API响应时间：全球平均 < 150ms
- 数据库查询：全球平均 < 100ms
- 页面完全加载：3G网络 < 2秒

**地理性能目标**：

| 地区 | 静态资源 | API响应 | 数据库查询 | 页面加载 |
|------|---------|---------|-----------|---------|
| 北美 | < 20ms | < 80ms | < 60ms | < 1.5s |
| 欧洲 | < 35ms | < 100ms | < 80ms | < 1.7s |
| 亚洲 | < 50ms | < 120ms | < 100ms | < 1.8s |
| 大洋洲 | < 60ms | < 150ms | < 120ms | < 2.0s |
| 南美 | < 80ms | < 180ms | < 150ms | < 2.2s |
| 非洲 | < 100ms | < 200ms | < 180ms | < 2.5s |

**边缘计算架构**：
```typescript
// 边缘缓存配置
interface EdgeCacheConfig {
  staticAssets: {
    cacheTtl: number;           // 静态资源缓存时间（秒）
    browserTtl: number;         // 浏览器缓存时间（秒）
    staleWhileRevalidate: number; // 陈旧数据重新验证时间
  };
  apiResponses: {
    cacheTtl: number;           // API响应缓存时间
    varyBy: string[];           // 缓存变体（如：Cookie, Authorization）
    bypassCache: boolean;       // 是否绕过缓存
  };
  database: {
    connectionPooling: boolean; // 启用连接池
    maxConnections: number;     // 最大连接数
    idleTimeout: number;        // 空闲超时（毫秒）
  };
}

const edgeCacheConfig: EdgeCacheConfig = {
  staticAssets: {
    cacheTtl: 31536000,         // 1年
    browserTtl: 604800,         // 7天
    staleWhileRevalidate: 86400, // 1天
  },
  apiResponses: {
    cacheTtl: 300,              // 5分钟
    varyBy: ['Cookie', 'Authorization'],
    bypassCache: false,
  },
  database: {
    connectionPooling: true,
    maxConnections: 20,
    idleTimeout: 300000,        // 5分钟
  },
};
```

**智能路由策略**：
```typescript
// 智能路由服务
export class SmartRoutingService {
  private edgeNodes: EdgeNode[];

  constructor(edgeNodes: EdgeNode[]) {
    this.edgeNodes = edgeNodes;
  }

  /**
   * 选择最优边缘节点
   */
  selectOptimalEdge(userLocation: Location): EdgeNode {
    // 1. 计算距离
    const nodesWithDistance = this.edgeNodes.map(node => ({
      ...node,
      distance: this.calculateDistance(userLocation, node.location),
    }));

    // 2. 计算健康分数
    const nodesWithScore = nodesWithDistance.map(node => ({
      ...node,
      healthScore: this.calculateHealthScore(node),
    }));

    // 3. 选择最优节点（距离 + 健康度）
    return nodesWithScore
      .sort((a, b) => b.healthScore - a.healthScore)
      .sort((a, b) => a.distance - b.distance)[0];
  }

  /**
   * 计算健康分数
   */
  private calculateHealthScore(node: EdgeNode): number {
    const weights = {
      cpuUsage: 0.3,
      memoryUsage: 0.3,
      networkLatency: 0.2,
      errorRate: 0.2,
    };

    return (
      (1 - node.metrics.cpuUsage) * weights.cpuUsage +
      (1 - node.metrics.memoryUsage) * weights.memoryUsage +
      (1 - node.metrics.networkLatency) * weights.networkLatency +
      (1 - node.metrics.errorRate) * weights.errorRate
    );
  }

  /**
   * 计算地理距离
   */
  private calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // 地球半径（公里）

    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) *
        Math.cos(this.toRadians(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// 边缘节点接口
interface EdgeNode {
  id: string;
  location: Location;
  metrics: NodeMetrics;
  isHealthy: boolean;
}

interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

interface NodeMetrics {
  cpuUsage: number;              // CPU使用率 (0-1)
  memoryUsage: number;           // 内存使用率 (0-1)
  networkLatency: number;        // 网络延迟 (毫秒)
  errorRate: number;             // 错误率 (0-1)
  requestCount: number;          // 请求数量
  lastHealthCheck: Date;         // 最后健康检查时间
}
```

### Requirement: 智能缓存策略

系统 **SHALL** 实现多级缓存架构（客户端浏览器缓存 → CDN 缓存 → 边缘缓存 → 源服务器），**MUST** 确保缓存命中率 > 85%，**SHALL** 对静态资源（JS、CSS、图片）使用长期缓存（1年 TTL），对 API 响应使用短期缓存（5分钟 TTL），并 **SHALL** 提供自适应缓存机制，根据访问频率和内容类型动态调整缓存时间和策略。

#### Scenario: 多级缓存架构

**Given** 用户访问应用并请求各类资源
**When** 请求静态资源（JS、CSS、图片）或 API 数据
**Then** 系统 SHALL 首先检查客户端浏览器缓存，若命中则直接返回
**And** 若浏览器缓存未命中，系统 SHALL 检查 Cloudflare CDN 缓存
**And** 若 CDN 缓存未命中，系统 SHALL 检查边缘节点缓存（KV 存储）
**And** 静态资源 SHALL 使用 1 年缓存时间（cache-control: max-age=31536000）
**And** API 响应 SHALL 使用 5 分钟缓存时间，并根据 Authorization header 区分缓存
**And** 系统 MUST 确保整体缓存命中率 > 85%
**And** 系统 SHALL 提供缓存预热和失效机制，支持按 URL 模式批量清除缓存

**需求**：实现多级缓存策略，包括CDN缓存、边缘缓存、客户端缓存，最大化缓存命中率和性能。

**缓存层次**：
```
用户请求 → 客户端缓存（浏览器）→ CDN缓存 → 边缘缓存 → 源服务器
     ↓                                              ↑
 缓存命中                                         缓存未命中
     ↓                                              ↑
 返回数据 ←────────────────────────────────────────────
```

**缓存策略配置**：
```typescript
// 缓存策略配置
interface CacheStrategy {
  // 可缓存响应
  cacheableResponses: {
    statusCodes: number[];       // 状态码：200, 301, 308
    methods: string[];           // 方法：GET, HEAD
  };

  // 缓存键
  cacheKey: {
    includeQueryString: boolean; // 包含查询字符串
    includeHeaders: string[];    // 包含的请求头
    ignoreHeaders: string[];     // 忽略的请求头
  };

  // 缓存时间策略
  ttl: {
    staticAssets: string;        // 静态资源：1年
    apiResponses: string;        // API响应：5分钟
    authenticated: string;       // 认证内容：不缓存
  };

  // 缓存变体
  varyBy: {
    userAgent: boolean;          // User-Agent
    language: boolean;           // Accept-Language
    encoding: boolean;           // Accept-Encoding
    authorization: boolean;      // Authorization
  };
}

const cacheStrategy: CacheStrategy = {
  cacheableResponses: {
    statusCodes: [200, 301, 308, 404],
    methods: ['GET', 'HEAD'],
  },

  cacheKey: {
    includeQueryString: true,
    includeHeaders: ['Accept', 'Accept-Language'],
    ignoreHeaders: ['Authorization', 'Cookie'],
  },

  ttl: {
    staticAssets: '1y',         // 1年
    apiResponses: '5m',         // 5分钟
    authenticated: '0s',        // 不缓存
  },

  varyBy: {
    userAgent: false,
    language: true,
    encoding: true,
    authorization: true,
  },
};
```

**自适应缓存策略**：
```typescript
// 自适应缓存服务
export class AdaptiveCacheService {
  private cacheMetrics: CacheMetrics;

  /**
   * 根据内容类型确定缓存时间
   */
  getTTLByContentType(path: string): number {
    const contentType = this.getContentType(path);

    const ttlMap = {
      'static': 31536000,      // 1年（JS, CSS, 图片）
      'api': 300,              // 5分钟（API响应）
      'authenticated': 0,      // 不缓存（认证内容）
      'error': 60,             // 1分钟（错误页面）
    };

    return ttlMap[contentType] || 0;
  }

  /**
   * 根据访问频率调整缓存时间
   */
  getAdaptiveTTL(path: string, accessFrequency: number): number {
    const baseTTL = this.getTTLByContentType(path);

    // 高频访问：增加缓存时间
    if (accessFrequency > 1000) {
      return baseTTL * 2;
    }

    // 中频访问：标准缓存时间
    if (accessFrequency > 100) {
      return baseTTL;
    }

    // 低频访问：减少缓存时间
    return baseTTL * 0.5;
  }

  /**
   * 缓存预热
   */
  async prewarmCache(paths: string[]): Promise<PrewarmResult> {
    const results = [];

    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          await this.cacheResponse(path, response);
          results.push({ path, status: 'success' });
        } else {
          results.push({ path, status: 'failed', error: response.status });
        }
      } catch (error) {
        results.push({ path, status: 'failed', error: error.message });
      }
    }

    return {
      total: paths.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      details: results,
    };
  }

  /**
   * 缓存失效
   */
  async invalidateCache(pattern: string): Promise<InvalidateResult> {
    // 1. 匹配缓存键
    const keys = await this.getCacheKeys(pattern);

    // 2. 批量删除
    const results = await Promise.allSettled(
      keys.map(key => this.deleteCache(key))
    );

    return {
      total: keys.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      keys,
    };
  }

  /**
   * 缓存分析
   */
  async analyzeCache(): Promise<CacheAnalysis> {
    const metrics = await this.getCacheMetrics();

    return {
      hitRate: metrics.hits / (metrics.hits + metrics.misses),
      byteHitRate: metrics.bytesHit / (metrics.bytesHit + metrics.bytesMiss),
      totalRequests: metrics.hits + metrics.misses,
      cachedRequests: metrics.hits,
      uncachedRequests: metrics.misses,
      topCachedPaths: metrics.topPaths,
      cacheSize: metrics.totalBytes,
    };
  }
}

// 缓存指标
interface CacheMetrics {
  hits: number;
  misses: number;
  bytesHit: number;
  bytesMiss: number;
  totalBytes: number;
  topPaths: Array<{ path: string; hits: number }>;
}

interface CacheAnalysis {
  hitRate: number;               // 缓存命中率
  byteHitRate: number;           // 字节命中率
  totalRequests: number;         // 总请求数
  cachedRequests: number;        // 缓存请求数
  uncachedRequests: number;      // 未缓存请求数
  topCachedPaths: Array<{ path: string; hits: number }>;
  cacheSize: number;             // 缓存大小（字节）
}
```

### Requirement: 数据库查询优化

系统 **SHALL** 优化所有 Supabase 数据库查询以实现最佳性能，**MUST** 确保查询执行时间 < 100ms（P95），**SHALL** 对频繁查询的列添加适当索引（B-tree、复合索引），使用游标分页替代 OFFSET 分页以避免大表扫描，并 **SHALL** 提供查询性能分析工具（EXPLAIN ANALYZE）和慢查询监控（执行时间 > 1秒触发告警）。

#### Scenario: Supabase数据库性能调优

**Given** 应用需要查询 Supabase 数据库以获取用户数据或业务数据
**When** 执行数据库查询操作
**Then** 系统 SHALL 在频繁查询的列（如 user_id、created_at）上添加索引
**And** 系统 SHALL 使用游标分页（基于 ID 或时间戳）替代传统 OFFSET 分页
**And** 系统 SHALL 批量执行多个独立查询（使用 Promise.all）以减少网络往返
**And** 查询执行时间 MUST 保持在 100ms 以内（P95 性能指标）
**And** 系统 SHALL 使用 EXPLAIN ANALYZE 分析慢查询并生成优化建议
**And** 系统 SHALL 监控所有查询性能，对执行时间 > 1秒的查询发送慢查询告警
**And** 系统 SHALL 避免 N+1 查询问题，使用 JOIN 或批量查询一次性获取关联数据

**需求**：优化数据库查询性能，确保在Supabase平台上实现最佳查询效率和响应速度。

**查询优化策略**：
```typescript
// 查询优化器
export class QueryOptimizer {
  /**
   * 分析查询性能
   */
  async analyzeQueryPerformance(
    query: string,
    params: any[]
  ): Promise<QueryAnalysis> {
    const explainResult = await this.executeExplain(query, params);

    return {
      executionTime: explainResult.executionTime,
      planningTime: explainResult.planningTime,
      rowsExamined: explainResult.rowsExamined,
      rowsReturned: explainResult.rowsReturned,
      indexUsage: explainResult.indexUsage,
      sequentialScans: explainResult.sequentialScans,
      recommendations: this.generateRecommendations(explainResult),
    };
  }

  /**
   * 生成分页查询
   */
  buildPaginatedQuery(
    table: string,
    options: QueryOptions
  ): { query: string; params: any[] } {
    let query = `SELECT ${options.select || '*'} FROM ${table}`;
    const params: any[] = [];

    // WHERE条件
    if (options.where) {
      const whereClause = this.buildWhereClause(options.where, params);
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }
    }

    // ORDER BY
    if (options.orderBy) {
      const orderClause = options.orderBy
        .map(({ column, ascending }) => `${column} ${ascending ? 'ASC' : 'DESC'}`)
        .join(', ');
      query += ` ORDER BY ${orderClause}`;
    }

    // LIMIT和OFFSET
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    return { query, params };
  }

  /**
   * 使用游标分页（性能更好）
   */
  buildCursorPaginatedQuery(
    table: string,
    options: CursorPaginationOptions
  ): { query: string; params: any[] } {
    let query = `SELECT ${options.select || '*'} FROM ${table}`;
    const params: any[] = [];

    // WHERE条件（包含游标）
    if (options.cursor) {
      const cursorCondition = `${options.cursorColumn} ${options.direction === 'next' ? '>' : '<'} $1`;
      query += ` WHERE ${cursorCondition}`;
      params.push(options.cursor);
    }

    // 其他WHERE条件
    if (options.where) {
      const connector = options.cursor ? 'AND' : 'WHERE';
      const whereClause = this.buildWhereClause(options.where, params, 2);
      if (whereClause) {
        query += ` ${connector} ${whereClause}`;
      }
    }

    // ORDER BY（必须包含游标列）
    const sortDirection = options.direction === 'next' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${options.cursorColumn} ${sortDirection}`;
    if (options.orderBy) {
      query += `, ${options.orderBy}`;
    }

    // LIMIT
    query += ` LIMIT ${options.limit || 20}`;

    return { query, params };
  }

  /**
   * 批量查询优化
   */
  async batchQueries(queries: Array<{ query: string; params: any[] }>): Promise<any[]> {
    // 使用Promise.all并行执行
    const results = await Promise.allSettled(
      queries.map(({ query, params }) => this.executeQuery(query, params))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * 连接查询优化
   */
  buildOptimizedJoin(
    baseTable: string,
    joins: JoinConfig[],
    where?: any,
    limit?: number
  ): { query: string; params: any[] } {
    let query = `SELECT`;
    const selectColumns: string[] = [];
    const params: any[] = [];

    // 构建SELECT子句
    selectColumns.push(`${baseTable}.*`);
    joins.forEach(join => {
      join.columns.forEach(column => {
        selectColumns.push(`${join.alias}.${column} AS ${join.alias}_${column}`);
      });
    });

    query += ` ${selectColumns.join(', ')} FROM ${baseTable}`;

    // 构建JOIN子句
    joins.forEach(join => {
      query += ` ${join.type} JOIN ${join.table} AS ${join.alias} ON ${join.condition}`;
    });

    // WHERE条件
    if (where) {
      query += ` WHERE ${this.buildWhereClause(where, params)}`;
    }

    // LIMIT
    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    return { query, params };
  }

  /**
   * 生成查询建议
   */
  private generateRecommendations(analysis: QueryAnalysis): QueryRecommendation[] {
    const recommendations: QueryRecommendation[] = [];

    // 检查是否需要索引
    if (analysis.sequentialScans > 0) {
      recommendations.push({
        type: 'add_index',
        priority: 'high',
        description: '检测到全表扫描，建议添加索引',
        details: `分析的执行计划显示此查询进行了 ${analysis.sequentialScans} 次全表扫描`,
        suggestion: '在频繁查询的列上添加B-tree索引',
      });
    }

    // 检查执行时间
    if (analysis.executionTime > 100) {
      recommendations.push({
        type: 'optimize_query',
        priority: analysis.executionTime > 1000 ? 'high' : 'medium',
        description: '查询执行时间过长',
        details: `查询执行时间：${analysis.executionTime}ms`,
        suggestion: '考虑使用物化视图或查询缓存',
      });
    }

    // 检查返回行数
    if (analysis.rowsExamined > analysis.rowsReturned * 10) {
      recommendations.push({
        type: 'optimize_filter',
        priority: 'medium',
        description: '查询效率低，检查了大量不相关的行',
        details: `检查了 ${analysis.rowsExamined} 行，只返回了 ${analysis.rowsReturned} 行`,
        suggestion: '优化WHERE条件或使用更具体的索引',
      });
    }

    return recommendations;
  }

  private buildWhereClause(where: any, params: any[], paramOffset = 1): string {
    const conditions: string[] = [];
    let paramIndex = paramOffset;

    Object.entries(where).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // 复杂条件
        Object.entries(value).forEach(([operator, operand]) => {
          switch (operator) {
            case 'eq':
              conditions.push(`${key} = $${paramIndex}`);
              params.push(operand);
              paramIndex++;
              break;
            case 'gt':
              conditions.push(`${key} > $${paramIndex}`);
              params.push(operand);
              paramIndex++;
              break;
            case 'lt':
              conditions.push(`${key} < $${paramIndex}`);
              params.push(operand);
              paramIndex++;
              break;
            case 'in':
              const placeholders = operand
                .map(() => `$${paramIndex++}`)
                .join(', ');
              conditions.push(`${key} IN (${placeholders})`);
              params.push(...operand);
              break;
          }
        });
      } else {
        // 简单等值条件
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    return conditions.join(' AND ');
  }
}

// 查询分析接口
interface QueryAnalysis {
  executionTime: number;         // 执行时间（毫秒）
  planningTime: number;          // 计划时间（毫秒）
  rowsExamined: number;          // 检查的行数
  rowsReturned: number;          // 返回的行数
  indexUsage: string[];          // 使用的索引
  sequentialScans: number;       // 全表扫描次数
  recommendations: QueryRecommendation[];
}

interface QueryRecommendation {
  type: string;                  // 建议类型
  priority: 'high' | 'medium' | 'low';
  description: string;           // 描述
  details: string;               // 详细信息
  suggestion: string;            // 建议
}

interface QueryOptions {
  select?: string;               // 选择字段
  where?: any;                   // WHERE条件
  orderBy?: Array<{ column: string; ascending?: boolean }>;
  limit?: number;                // LIMIT
  offset?: number;               // OFFSET
}

interface CursorPaginationOptions {
  select?: string;
  where?: any;
  cursor?: string | number;      // 游标值
  cursorColumn: string;          // 游标列
  direction: 'next' | 'prev';    // 分页方向
  limit?: number;
  orderBy?: string;
}

interface JoinConfig {
  type: 'LEFT' | 'INNER' | 'RIGHT';
  table: string;
  alias: string;
  condition: string;
  columns: string[];
}
```

**查询性能监控**：
```typescript
// 查询性能监控器
export class QueryPerformanceMonitor {
  private metrics: Map<string, QueryMetrics> = new Map();

  /**
   * 记录查询执行
   */
  recordQueryExecution(
    queryId: string,
    executionTime: number,
    rowCount: number
  ): void {
    const metric = this.metrics.get(queryId) || {
      totalExecutions: 0,
      totalTime: 0,
      totalRows: 0,
      avgTime: 0,
      maxTime: 0,
      minTime: Infinity,
    };

    metric.totalExecutions++;
    metric.totalTime += executionTime;
    metric.totalRows += rowCount;
    metric.avgTime = metric.totalTime / metric.totalExecutions;
    metric.maxTime = Math.max(metric.maxTime, executionTime);
    metric.minTime = Math.min(metric.minTime, executionTime);

    this.metrics.set(queryId, metric);

    // 慢查询告警
    if (executionTime > 1000) {
      this.sendSlowQueryAlert(queryId, executionTime);
    }
  }

  /**
   * 获取查询性能报告
   */
  getPerformanceReport(): PerformanceReport {
    const metrics = Array.from(this.metrics.entries());

    return {
      totalQueries: metrics.length,
      slowQueries: metrics.filter(([, m]) => m.avgTime > 500).length,
      avgExecutionTime: metrics.reduce((sum, [, m]) => sum + m.avgTime, 0) / metrics.length,
      topSlowQueries: metrics
        .sort(([, a], [, b]) => b.avgTime - a.avgTime)
        .slice(0, 10),
      mostFrequentQueries: metrics
        .sort(([, a], [, b]) => b.totalExecutions - a.totalExecutions)
        .slice(0, 10),
    };
  }

  private sendSlowQueryAlert(queryId: string, executionTime: number): void {
    // 发送告警到监控平台
    console.warn(`Slow query detected: ${queryId} took ${executionTime}ms`);
  }
}

interface QueryMetrics {
  totalExecutions: number;
  totalTime: number;
  totalRows: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
}

interface PerformanceReport {
  totalQueries: number;
  slowQueries: number;
  avgExecutionTime: number;
  topSlowQueries: Array<[string, QueryMetrics]>;
  mostFrequentQueries: Array<[string, QueryMetrics]>;
}
```

### Requirement: 前端性能优化

系统 **SHALL** 优化 Next.js 静态导出应用的前端性能，**MUST** 实现代码分割（按路由和手动代码块分割）、组件懒加载、图片懒加载和优化（WebP 格式、响应式尺寸），**SHALL** 预加载关键路由和资源，并 **SHALL** 确保 Core Web Vitals 指标达标（LCP < 2.5s、FID < 100ms、CLS < 0.1）。

#### Scenario: 静态导出应用优化

**Given** 应用使用 Next.js 静态导出部署到 Cloudflare Pages
**When** 用户访问应用页面
**Then** 系统 SHALL 按路由自动分割代码，每个路由独立加载 JavaScript 代码块
**And** 系统 SHALL 手动分割第三方库（vendor、supabase、charts、ui）到独立代码块
**And** 系统 SHALL 对非首屏组件使用 React.lazy 懒加载
**And** 图片 SHALL 使用 WebP 格式（质量 85%）并提供响应式尺寸（640、768、1024、1280、1536px）
**And** 图片 SHALL 实现懒加载（intersection observer），视口阈值 10%，提前加载边距 100px
**And** 系统 SHALL 预加载可见链接对应的路由资源（延迟 100ms）
**And** 系统 MUST 确保 LCP < 2.5s、FID < 100ms、CLS < 0.1 以满足 Core Web Vitals 要求

**需求**：优化Next.js静态导出的前端性能，包括代码分割、懒加载、图片优化等。

**优化策略**：
```typescript
// 前端性能优化配置
export const frontendOptimization = {
  // 代码分割
  codeSplitting: {
    enabled: true,
    strategy: 'routes',          // 按路由分割
    chunkSizeWarningLimit: 500,  // 代码块大小警告（KB）
    manualChunks: {
      vendor: ['react', 'react-dom', 'next'],
      supabase: ['@supabase/supabase-js'],
      charts: ['recharts', 'chart.js'],
      ui: ['@headlessui/react', '@heroicons/react'],
    },
  },

  // 懒加载配置
  lazyLoading: {
    enabled: true,
    components: true,            // 组件懒加载
    images: true,                // 图片懒加载
    routes: true,                // 路由懒加载
    threshold: 0.1,              // 视口阈值
    rootMargin: '100px',         // 视口边距
  },

  // 图片优化
  imageOptimization: {
    enabled: true,
    format: 'webp',              // 目标格式
    quality: 85,                 // 质量
    sizes: [640, 768, 1024, 1280, 1536], // 响应式尺寸
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1280,
    },
  },

  // 预加载策略
  prefetching: {
    enabled: true,
    strategy: 'visible-links',   // 可见链接预加载
    delay: 100,                  // 延迟（ms）
  },

  // 字体优化
  fontOptimization: {
    enabled: true,
    display: 'swap',             // font-display: swap
    preload: true,               // 预加载关键字体
    subsets: ['latin'],          // 字体子集
  },
};
```

**性能监控和优化**：
```typescript
// 性能监控器（基于Web Vitals）
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

export class FrontendPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cls: 0,        // Cumulative Layout Shift
    fid: 0,        // First Input Delay
    lcp: 0,        // Largest Contentful Paint
    fcp: 0,        // First Contentful Paint
    ttfb: 0,       // Time to First Byte
  };

  /**
   * 初始化性能监控
   */
  initialize(): void {
    // Core Web Vitals
    onCLS(metric => this.recordMetric('cls', metric.value));
    onFID(metric => this.recordMetric('fid', metric.value));
    onLCP(metric => this.recordMetric('lcp', metric.value));

    // 其他Web Vitals
    onFCP(metric => this.recordMetric('fcp', metric.value));
    onTTFB(metric => this.recordMetric('ttfb', metric.value));

    // 自定义指标
    this.measureCustomMetrics();
  }

  /**
   * 记录性能指标
   */
  private recordMetric(name: keyof PerformanceMetrics, value: number): void {
    this.metrics[name] = value;

    // 发送指标到分析平台
    this.sendMetricToAnalytics(name, value);

    // 性能告警
    this.checkPerformanceThresholds(name, value);
  }

  /**
   * 测量自定义指标
   */
  private measureCustomMetrics(): void {
    // 1. Time to Interactive (TTI)
    this.measureTTI();

    // 2. Total Blocking Time (TBT)
    this.measureTBT();

    // 3. 页面加载时间
    this.measurePageLoadTime();

    // 4. API响应时间
    this.measureAPIResponseTime();
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(
    metric: keyof PerformanceMetrics,
    value: number
  ): void {
    const thresholds = {
      cls: 0.1,      // Good: < 0.1, Poor: > 0.25
      fid: 100,      // Good: < 100ms
      lcp: 2500,     // Good: < 2.5s
      fcp: 1800,     // Good: < 1.8s
      ttfb: 800,     // Good: < 800ms
    };

    if (value > thresholds[metric]) {
      this.sendPerformanceAlert(metric, value, thresholds[metric]);
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): PerformanceReport {
    const performanceScore = this.calculatePerformanceScore();

    return {
      metrics: this.metrics,
      performanceScore,
      grades: this.calculateGrades(),
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 计算性能分数
   */
  private calculatePerformanceScore(): number {
    const weights = {
      lcp: 0.25,
      fid: 0.25,
      cls: 0.25,
      fcp: 0.15,
      ttfb: 0.10,
    };

    const scores = {
      lcp: this.normalizeMetric(this.metrics.lcp, 2500, 4000),
      fid: this.normalizeMetric(this.metrics.fid, 100, 300),
      cls: this.normalizeMetric(this.metrics.cls, 0.1, 0.25),
      fcp: this.normalizeMetric(this.metrics.fcp, 1800, 3000),
      ttfb: this.normalizeMetric(this.metrics.ttfb, 800, 1800),
    };

    return Math.round(
      Object.entries(scores).reduce((total, [metric, score]) => {
        return total + score * weights[metric];
      }, 0)
    );
  }

  /**
   * 标准化指标值到0-100分数
   */
  private normalizeMetric(value: number, good: number, poor: number): number {
    if (value <= good) return 100;
    if (value >= poor) return 0;

    return Math.round(100 - ((value - good) / (poor - good)) * 100);
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    if (this.metrics.lcp > 2500) {
      recommendations.push({
        metric: 'lcp',
        problem: 'LCP时间过长',
        recommendation: '优化首屏图片加载，使用WebP格式',
        priority: 'high',
      });
    }

    if (this.metrics.cls > 0.1) {
      recommendations.push({
        metric: 'cls',
        problem: '布局偏移较大',
        recommendation: '为图片和广告预留空间，避免布局抖动',
        priority: 'high',
      });
    }

    if (this.metrics.fid > 100) {
      recommendations.push({
        metric: 'fid',
        problem: '首次输入延迟较高',
        recommendation: '减少主线程阻塞，优化JavaScript执行',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  // 辅助方法...
}

// 性能指标接口
interface PerformanceMetrics {
  cls: number;                    // Cumulative Layout Shift
  fid: number;                    // First Input Delay
  lcp: number;                    // Largest Contentful Paint
  fcp: number;                    // First Contentful Paint
  ttfb: number;                   // Time to First Byte
}

interface PerformanceReport {
  metrics: PerformanceMetrics;
  performanceScore: number;       // 性能分数（0-100）
  grades: Record<string, string>; // 各项等级（Good/Poor）
  recommendations: PerformanceRecommendation[];
  timestamp: string;
}

interface PerformanceRecommendation {
  metric: string;                 // 指标名称
  problem: string;                // 问题描述
  recommendation: string;         // 优化建议
  priority: 'high' | 'medium' | 'low';
}
```

### Requirement: 性能预算

系统 **SHALL** 定义并强制执行性能预算，限制 JavaScript 总大小 < 200KB、每路由 < 100KB，CSS 总大小 < 50KB，图片总大小 < 500KB，**MUST** 确保 TTFB < 800ms、FCP < 2000ms、LCP < 2500ms、TTI < 3500ms，**SHALL** 限制总请求数 < 50个，并 **SHALL** 在构建时和运行时监控性能预算，违反预算时触发告警或阻止部署。

#### Scenario: 性能约束管理

**Given** 开发者添加新功能或第三方库到应用
**When** 构建应用或在生产环境运行
**Then** 系统 SHALL 检查 JavaScript 总大小是否超过 200KB 预算
**And** 系统 SHALL 检查每个路由的 JavaScript 大小是否超过 100KB 预算
**And** 系统 SHALL 检查 CSS 总大小是否超过 50KB 预算
**And** 系统 SHALL 检查图片总大小是否超过 500KB 预算
**And** 系统 MUST 监控加载时间指标（TTFB < 800ms、FCP < 2s、LCP < 2.5s、TTI < 3.5s）
**And** 系统 SHALL 限制总请求数不超过 50 个
**And** 若任何指标超出预算，系统 SHALL 记录违规并根据严重程度发送告警（超出 50% 为高严重性）
**And** 严重违规 MUST 阻止部署到生产环境

**需求**：定义性能预算，限制资源大小和加载时间，确保应用保持良好性能。

**性能预算配置**：
```typescript
// 性能预算配置
export const performanceBudget = {
  // JavaScript预算
  javascript: {
    total: 200,                  // 总JS大小（KB）
    perRoute: 100,               // 每路由JS大小（KB）
    firstParty: 150,             // 第一方JS大小（KB）
    thirdParty: 50,              // 第三方JS大小（KB）
  },

  // CSS预算
  css: {
    total: 50,                   // 总CSS大小（KB）
    critical: 15,                // 关键CSS大小（KB）
  },

  // 图片预算
  images: {
    total: 500,                  // 总图片大小（KB）
    hero: 100,                   // 首屏图片（KB）
    thumbnail: 20,               // 缩略图（KB）
  },

  // 字体预算
  fonts: {
    total: 100,                  // 总字体大小（KB）
    families: 2,                 // 字体族数量
  },

  // 加载时间预算
  loadTime: {
    firstByte: 800,              // TTFB（毫秒）
    firstPaint: 1800,            // 首次绘制（毫秒）
    firstContentfulPaint: 2000,  // 首次内容绘制（毫秒）
    largestContentfulPaint: 2500, // 最大内容绘制（毫秒）
    timeToInteractive: 3500,     // 可交互时间（毫秒）
  },

  // 请求数量预算
  requests: {
    total: 50,                   // 总请求数
    javascript: 15,              // JS请求数
    css: 5,                      // CSS请求数
    images: 25,                  // 图片请求数
    fonts: 5,                    // 字体请求数
  },
};
```

**性能预算监控**：
```typescript
// 性能预算监控器
export class PerformanceBudgetMonitor {
  private budget = performanceBudget;
  private violations: BudgetViolation[] = [];

  /**
   * 检查JavaScript大小
   */
  checkJavaScriptSize(size: number, route: string): void {
    if (size > this.budget.javascript.perRoute) {
      this.recordViolation({
        type: 'javascript',
        metric: 'perRoute',
        value: size,
        budget: this.budget.javascript.perRoute,
        severity: size > this.budget.javascript.perRoute * 1.5 ? 'high' : 'medium',
        route,
      });
    }
  }

  /**
   * 检查加载时间
   */
  checkLoadTime(metric: string, value: number, route: string): void {
    const budget = this.budget.loadTime[metric as keyof typeof this.budget.loadTime];

    if (value > budget) {
      this.recordViolation({
        type: 'loadTime',
        metric,
        value,
        budget,
        severity: value > budget * 1.5 ? 'high' : 'medium',
        route,
      });
    }
  }

  /**
   * 检查请求数量
   */
  checkRequestCount(count: number, route: string): void {
    if (count > this.budget.requests.total) {
      this.recordViolation({
        type: 'requests',
        metric: 'total',
        value: count,
        budget: this.budget.requests.total,
        severity: count > this.budget.requests.total * 1.5 ? 'high' : 'medium',
        route,
      });
    }
  }

  /**
   * 记录违规
   */
  private recordViolation(violation: BudgetViolation): void {
    this.violations.push({
      ...violation,
      timestamp: new Date().toISOString(),
    });

    // 发送告警
    if (violation.severity === 'high') {
      this.sendAlert(violation);
    }
  }

  /**
   * 获取预算报告
   */
  getBudgetReport(): BudgetReport {
    const violationsByType = this.groupViolationsByType();

    return {
      budget: this.budget,
      violations: this.violations,
      summary: {
        totalViolations: this.violations.length,
        criticalViolations: this.violations.filter(v => v.severity === 'high').length,
        warningViolations: this.violations.filter(v => v.severity === 'medium').length,
        violationsByType,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 按类型分组违规
   */
  private groupViolationsByType(): Record<string, number> {
    return this.violations.reduce((acc, violation) => {
      acc[violation.type] = (acc[violation.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 发送告警
   */
  private sendAlert(violation: BudgetViolation): void {
    // 发送到监控平台
    console.error(`Performance budget violation: ${violation.type}.${violation.metric} = ${violation.value} (budget: ${violation.budget})`);
  }
}

// 违规记录接口
interface BudgetViolation {
  type: string;                  // 违规类型
  metric: string;                // 指标名称
  value: number;                 // 实际值
  budget: number;                // 预算值
  severity: 'high' | 'medium' | 'low';
  route?: string;                // 路由
  timestamp?: string;            // 时间戳
}

interface BudgetReport {
  budget: typeof performanceBudget;
  violations: BudgetViolation[];
  summary: {
    totalViolations: number;
    criticalViolations: number;
    warningViolations: number;
    violationsByType: Record<string, number>;
  };
  timestamp: string;
}
```

## 性能测试要求

### Requirement: 性能基准测试

#### Scenario: 性能回归测试

**需求**：建立性能基准测试，防止性能回归，确保每次部署不会降低性能。

**基准测试配置**：
```typescript
// Lighthouse CI配置
export const lighthouseConfig = {
  ci: {
    collect: {
      url: [
        'https://health-butler.pages.dev/',
        'https://health-butler.pages.dev/dashboard',
        'https://health-butler.pages.dev/nutrition',
        'https://health-butler.pages.dev/recipes',
      ],
      numberOfRuns: 3,              // 运行次数
      settings: {
        preset: 'desktop',          // 测试环境
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.95 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // 性能指标
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'speed-index': ['warn', { maxNumericValue: 4300 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

**自动化性能测试**：
```typescript
// 自动化性能测试
export class AutomatedPerformanceTest {
  private baselineMetrics: PerformanceBaseline;

  constructor(baseline: PerformanceBaseline) {
    this.baselineMetrics = baseline;
  }

  /**
   * 运行性能测试
   */
  async runTest(testName: string, url: string): Promise<TestResult> {
    const result = await this.runLighthouse(url);

    return {
      testName,
      url,
      timestamp: new Date().toISOString(),
      metrics: {
        performance: result.categories.performance.score,
        accessibility: result.categories.accessibility.score,
        bestPractices: result.categories['best-practices'].score,
        seo: result.categories.seo.score,
      },
      webVitals: {
        lcp: result.audits['largest-contentful-paint'].numericValue,
        fid: result.audits['max-potential-fid']?.numericValue || 0,
        cls: result.audits['cumulative-layout-shift'].numericValue,
        fcp: result.audits['first-contentful-paint'].numericValue,
      },
      passed: this.compareWithBaseline(result),
      regression: this.detectRegression(result),
    };
  }

  /**
   * 与基线对比
   */
  private compareWithBaseline(result: LighthouseResult): boolean {
    const metrics = result.categories;

    return (
      metrics.performance.score >= this.baselineMetrics.performance &&
      metrics.accessibility.score >= this.baselineMetrics.accessibility &&
      metrics['best-practices'].score >= this.baselineMetrics.bestPractices &&
      metrics.seo.score >= this.baselineMetrics.seo
    );
  }

  /**
   * 检测性能回归
   */
  private detectRegression(result: LighthouseResult): PerformanceRegression[] {
    const regressions: PerformanceRegression[] = [];
    const metrics = result.categories;

    Object.entries(metrics).forEach(([name, metric]) => {
      const baselineValue = this.baselineMetrics[name as keyof PerformanceBaseline];
      if (metric.score < baselineValue * 0.95) { // 下降超过5%
        regressions.push({
          metric: name,
          baseline: baselineValue,
          current: metric.score,
          regression: baselineValue - metric.score,
          severity: this.calculateSeverity(metric.score, baselineValue),
        });
      }
    });

    return regressions;
  }

  /**
   * 计算回归严重程度
   */
  private calculateSeverity(current: number, baseline: number): 'low' | 'medium' | 'high' {
    const regression = baseline - current;
    const percentage = (regression / baseline) * 100;

    if (percentage > 10) return 'high';
    if (percentage > 5) return 'medium';
    return 'low';
  }

  /**
   * 运行Lighthouse测试
   */
  private async runLighthouse(url: string): Promise<LighthouseResult> {
    // 使用lighthouse库执行测试
    const lighthouse = require('lighthouse');
    const chrome = require('chrome-launcher');

    const chromeInstance = await chrome.launch({ chromeFlags: ['--headless'] });

    try {
      const result = await lighthouse(url, {
        port: chromeInstance.port,
        output: 'json',
        preset: 'desktop',
      });

      return result.lhr;
    } finally {
      await chromeInstance.kill();
    }
  }
}

// 基线性能指标
interface PerformanceBaseline {
  performance: number;            // 性能分数（0-1）
  accessibility: number;          // 可访问性分数
  bestPractices: number;          // 最佳实践分数
  seo: number;                    // SEO分数
}

// 测试结果
interface TestResult {
  testName: string;
  url: string;
  timestamp: string;
  metrics: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  webVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
  };
  passed: boolean;
  regression: PerformanceRegression[];
}

// 性能回归
interface PerformanceRegression {
  metric: string;                 // 指标名称
  baseline: number;               // 基线值
  current: number;                // 当前值
  regression: number;             // 回归量
  severity: 'low' | 'medium' | 'high';
}
```

## 性能监控和告警

### 7. 实时监控

#### 场景：生产环境性能监控

**需求**：建立实时性能监控系统，及时发现和响应性能问题。

**监控指标**：
```typescript
// 实时监控指标
export const realTimeMetrics = {
  // 响应时间
  responseTime: {
    target: 200,                 // 目标（毫秒）
    warning: 500,                // 警告阈值
    critical: 1000,              // 严重阈值
  },

  // 错误率
  errorRate: {
    target: 0.01,                // 目标（1%）
    warning: 0.05,               // 警告阈值（5%）
    critical: 0.1,               // 严重阈值（10%）
  },

  // 请求速率
  requestRate: {
    target: 1000,                // 目标（请求/秒）
    capacity: 5000,              // 容量（请求/秒）
  },

  // 缓存命中率
  cacheHitRate: {
    target: 0.95,                // 目标（95%）
    warning: 0.85,               // 警告阈值（85%）
    critical: 0.75,              // 严重阈值（75%）
  },

  // 数据库连接数
  dbConnections: {
    target: 10,                  // 目标
    warning: 15,                 // 警告阈值
    critical: 20,                // 严重阈值
    max: 25,                     // 最大值
  },

  // 内存使用（边缘函数）
  memoryUsage: {
    target: 64 * 1024 * 1024,    // 目标（64MB）
    warning: 96 * 1024 * 1024,   // 警告阈值（96MB）
    critical: 128 * 1024 * 1024, // 严重阈值（128MB）
  },
};
```

**监控告警**：
```typescript
// 性能告警系统
export class PerformanceAlertSystem {
  private alerts: AlertConfig[] = [
    {
      name: 'High Response Time',
      metric: 'responseTime',
      threshold: 1000,
      condition: 'greater_than',
      duration: 60000,             // 持续1分钟
      severity: 'critical',
      channels: ['pagerduty', 'slack'],
    },
    {
      name: 'High Error Rate',
      metric: 'errorRate',
      threshold: 0.1,
      condition: 'greater_than',
      duration: 300000,            // 持续5分钟
      severity: 'critical',
      channels: ['pagerduty', 'slack'],
    },
    {
      name: 'Low Cache Hit Rate',
      metric: 'cacheHitRate',
      threshold: 0.75,
      condition: 'less_than',
      duration: 600000,            // 持续10分钟
      severity: 'warning',
      channels: ['slack'],
    },
  ];

  /**
   * 检查指标并触发告警
   */
  async checkMetricAndAlert(metricName: string, value: number): Promise<void> {
    const relevantAlerts = this.alerts.filter(alert => alert.metric === metricName);

    for (const alert of relevantAlerts) {
      const triggered = this.evaluateThreshold(value, alert.threshold, alert.condition);

      if (triggered) {
        await this.recordAlertTrigger(alert);

        // 检查持续时间
        const hasMetDuration = await this.checkDuration(alert);

        if (hasMetDuration) {
          await this.sendAlert(alert, value);
        }
      } else {
        await this.clearAlertTrigger(alert);
      }
    }
  }

  /**
   * 评估阈值
   */
  private evaluateThreshold(value: number, threshold: number, condition: string): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'not_equals':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * 检查持续时间
   */
  private async checkDuration(alert: AlertConfig): Promise<boolean> {
    const triggerRecord = await this.getAlertTriggerRecord(alert.name);

    if (!triggerRecord) {
      return false;
    }

    const elapsedTime = Date.now() - triggerRecord.triggeredAt;
    return elapsedTime >= alert.duration;
  }

  /**
   * 发送告警
   */
  private async sendAlert(alert: AlertConfig, value: number): Promise<void> {
    const alertMessage = {
      name: alert.name,
      severity: alert.severity,
      value,
      threshold: alert.threshold,
      metric: alert.metric,
      timestamp: new Date().toISOString(),
    };

    // 发送到不同渠道
    for (const channel of alert.channels) {
      await this.sendToChannel(channel, alertMessage);
    }

    // 记录告警历史
    await this.recordAlertHistory(alert, value);
  }

  /**
   * 发送到渠道
   */
  private async sendToChannel(channel: string, message: AlertMessage): Promise<void> {
    switch (channel) {
      case 'slack':
        await this.sendToSlack(message);
        break;
      case 'pagerduty':
        await this.sendToPagerDuty(message);
        break;
      case 'email':
        await this.sendToEmail(message);
        break;
      case 'webhook':
        await this.sendToWebhook(message);
        break;
    }
  }
}

// 告警配置
interface AlertConfig {
  name: string;                   // 告警名称
  metric: string;                 // 监控指标
  threshold: number;              // 阈值
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  duration: number;               // 持续时间（毫秒）
  severity: 'critical' | 'warning' | 'info';
  channels: string[];             // 通知渠道
}

// 告警消息
interface AlertMessage {
  name: string;
  severity: string;
  value: number;
  threshold: number;
  metric: string;
  timestamp: string;
}
```

### 8. 性能测试覆盖

**性能测试场景**：
1. 首页加载性能
2. 仪表板页面性能
3. API端点响应时间
4. 数据库查询性能
5. 并发用户处理能力
6. 缓存命中率
7. CDN加速效果
8. 移动端性能

**测试频率**：
- 每日自动测试（生产环境监控）
- 每次部署前测试（预生产环境）
- 每周基准测试（性能趋势分析）

**性能验收标准**：
- 性能评分 > 90/100
- LCP < 2.5秒
- FID < 100毫秒
- CLS < 0.1
- API响应时间 < 200毫秒
- 缓存命中率 > 85%
- 错误率 < 1%

这个性能规范确保了Health Butler应用在Cloudflare Pages + Supabase混合架构下能够提供卓越的用户体验，并通过全面的监控和测试防止性能回归。所有的性能指标都必须满足或超过上述标准，才能被接受为生产就绪。