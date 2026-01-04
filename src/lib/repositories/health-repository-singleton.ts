/**
 * Health Repository Singleton
 *
 * 提供全局唯一的 HealthRepository 实例
 */

import { SupabaseHealthRepository } from "./implementations/supabase-health-repository";
import type { HealthRepository } from "./interfaces/health-repository";

let instance: HealthRepository | null = null;

export function getHealthRepository(): HealthRepository {
  if (!instance) {
    instance = new SupabaseHealthRepository();
  }
  return instance;
}

// 导出默认实例以便导入使用
export const healthRepository = getHealthRepository();
