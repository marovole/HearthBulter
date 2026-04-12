/**
 * Health Repository Singleton
 *
 * 提供全局唯一的 HealthRepository 实例
 */

import { ConvexHealthRepository } from "./implementations/convex-health-repository";
import type { HealthRepository } from "./interfaces/health-repository";

let instance: HealthRepository | null = null;

export function getHealthRepository(): HealthRepository {
  if (!instance) {
    instance = new ConvexHealthRepository();
  }
  return instance;
}

export const healthRepository = getHealthRepository();
