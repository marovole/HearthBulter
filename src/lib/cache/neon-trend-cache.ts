/**
 * [已迁移至 Convex] L2 trend_data 缓存层占位实现。
 * Neon/Prisma 基础设施已移除；保留接口供 MultiLayerCache 降级到 L1 + 实时查询。
 */

import type { TrendDataType } from "@/lib/types/analytics";

export interface TrendCacheData {
  aggregatedData: unknown;
  mean?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
  stdDev?: number | null;
  trendDirection?: string | null;
  slope?: number | null;
  rSquared?: number | null;
  predictions?: unknown | null;
}

export interface TrendCacheQuery {
  memberId: string;
  dataType: TrendDataType;
  startDate: Date;
  endDate: Date;
}

export interface TrendCacheResult extends TrendCacheData {
  id: string;
  expiresAt: Date;
  hitCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class NeonTrendCache {
  async get(): Promise<TrendCacheResult | null> {
    return null;
  }

  async set(): Promise<boolean> {
    return false;
  }

  async delete(): Promise<void> {}

  async deleteByMember(): Promise<void> {}
}
