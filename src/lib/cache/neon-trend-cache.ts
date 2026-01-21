// @ts-nocheck - Legacy migration: pending full type safety review
import { NeonClientManager } from "@/lib/db/neon-client";
import type { TrendDataType } from "@/lib/types/analytics";

export interface TrendCacheData {
  aggregatedData: any;
  mean?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
  stdDev?: number | null;
  trendDirection?: string | null;
  slope?: number | null;
  rSquared?: number | null;
  predictions?: any | null;
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
  async get(query: TrendCacheQuery): Promise<TrendCacheResult | null> {
    try {
      const rows = await NeonClientManager.query<any>(
        `SELECT * FROM trend_data
         WHERE member_id = $1 AND data_type = $2 AND start_date = $3 AND end_date = $4
         LIMIT 1`,
        [query.memberId, query.dataType, query.startDate.toISOString(), query.endDate.toISOString()]
      );

      const data = rows[0];
      if (!data) return null;

      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        this.delete(query).catch((err) =>
          console.error("[NeonTrendCache] Failed to delete expired cache:", err)
        );
        return null;
      }

      this.incrementHitCount(data.id).catch((err) =>
        console.warn("[NeonTrendCache] Failed to increment hit count:", err)
      );

      return {
        id: data.id,
        aggregatedData: this.parseJson(data.aggregated_data),
        mean: data.mean,
        median: data.median,
        min: data.min,
        max: data.max,
        stdDev: data.std_dev,
        trendDirection: data.trend_direction,
        slope: data.slope,
        rSquared: data.r_squared,
        predictions: this.parseJson(data.predictions),
        expiresAt,
        hitCount: data.hit_count,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error("[NeonTrendCache] Get error:", error);
      return null;
    }
  }

  async set(query: TrendCacheQuery, data: TrendCacheData, ttl = 300): Promise<boolean> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);

      const existingRows = await NeonClientManager.query<{ hit_count: number }>(
        `SELECT hit_count FROM trend_data
         WHERE member_id = $1 AND data_type = $2 AND start_date = $3 AND end_date = $4
         LIMIT 1`,
        [query.memberId, query.dataType, query.startDate.toISOString(), query.endDate.toISOString()]
      );

      const currentHitCount = existingRows[0]?.hit_count ?? 0;

      await NeonClientManager.query(
        `INSERT INTO trend_data (
          member_id, data_type, start_date, end_date,
          aggregated_data, mean, median, min, max,
          std_dev, trend_direction, slope, r_squared,
          predictions, expires_at, hit_count, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (member_id, data_type, start_date, end_date)
        DO UPDATE SET
          aggregated_data = EXCLUDED.aggregated_data,
          mean = EXCLUDED.mean,
          median = EXCLUDED.median,
          min = EXCLUDED.min,
          max = EXCLUDED.max,
          std_dev = EXCLUDED.std_dev,
          trend_direction = EXCLUDED.trend_direction,
          slope = EXCLUDED.slope,
          r_squared = EXCLUDED.r_squared,
          predictions = EXCLUDED.predictions,
          expires_at = EXCLUDED.expires_at,
          updated_at = EXCLUDED.updated_at`,
        [
          query.memberId,
          query.dataType,
          query.startDate.toISOString(),
          query.endDate.toISOString(),
          JSON.stringify(data.aggregatedData),
          data.mean ?? null,
          data.median ?? null,
          data.min ?? null,
          data.max ?? null,
          data.stdDev ?? null,
          data.trendDirection ?? null,
          data.slope ?? null,
          data.rSquared ?? null,
          data.predictions ? JSON.stringify(data.predictions) : null,
          expiresAt.toISOString(),
          currentHitCount,
          now.toISOString(),
        ]
      );

      return true;
    } catch (error) {
      console.error("[NeonTrendCache] Set error:", error);
      return false;
    }
  }

  async delete(query: TrendCacheQuery): Promise<boolean> {
    try {
      await NeonClientManager.query(
        `DELETE FROM trend_data
         WHERE member_id = $1 AND data_type = $2 AND start_date = $3 AND end_date = $4`,
        [query.memberId, query.dataType, query.startDate.toISOString(), query.endDate.toISOString()]
      );
      return true;
    } catch (error) {
      console.error("[NeonTrendCache] Delete error:", error);
      return false;
    }
  }

  async deleteByMember(memberId: string, dataType?: TrendDataType): Promise<number> {
    try {
      let sql = "DELETE FROM trend_data WHERE member_id = $1";
      const params: any[] = [memberId];

      if (dataType) {
        sql += " AND data_type = $2";
        params.push(dataType);
      }

      sql += " RETURNING id";

      const result = await NeonClientManager.query<{ id: string }>(sql, params);
      return result.length;
    } catch (error) {
      console.error("[NeonTrendCache] Delete by member error:", error);
      return 0;
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      const result = await NeonClientManager.query<{ id: string }>(
        "DELETE FROM trend_data WHERE expires_at < $1 RETURNING id",
        [new Date().toISOString()]
      );
      return result.length;
    } catch (error) {
      console.error("[NeonTrendCache] Cleanup expired error:", error);
      return 0;
    }
  }

  private async incrementHitCount(id: string): Promise<boolean> {
    try {
      await NeonClientManager.query(
        "UPDATE trend_data SET hit_count = hit_count + 1 WHERE id = $1",
        [id]
      );
      return true;
    } catch (error) {
      console.error("[NeonTrendCache] Increment hit count error:", error);
      return false;
    }
  }

  private parseJson(json: string | any | null): any {
    if (!json) return null;

    if (typeof json === "string") {
      try {
        return JSON.parse(json);
      } catch {
        return json;
      }
    }

    return json;
  }
}

let trendCacheInstance: NeonTrendCache | null = null;

export function getTrendCache(): NeonTrendCache {
  if (!trendCacheInstance) {
    trendCacheInstance = new NeonTrendCache();
  }
  return trendCacheInstance;
}
