/**
 * [已迁移] 查询优化中间件占位实现。
 * Prisma 已移除；保留性能监控所需的统计接口。
 */

interface QueryStats {
  avgDuration: number;
  totalQueries: number;
}

interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
}

class QueryOptimizer {
  getStats(): QueryStats {
    return { avgDuration: 0, totalQueries: 0 };
  }

  getSlowQueries(): SlowQuery[] {
    return [];
  }

  resetMetrics(): void {}
}

export const queryOptimizer = new QueryOptimizer();
