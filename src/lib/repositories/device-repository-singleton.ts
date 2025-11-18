/**
 * 设备连接 Repository 单例
 *
 * 提供全局单例 DeviceRepository 实例
 *
 * @module device-repository-singleton
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { SupabaseDeviceRepository } from './implementations/supabase-device-repository';
import type { DeviceRepository } from './interfaces/device-repository';

let instance: DeviceRepository | null = null;

/**
 * 获取 DeviceRepository 单例实例
 *
 * @returns DeviceRepository 实例
 */
export function getDeviceRepository(): DeviceRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseDeviceRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 DeviceRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { deviceRepository } from '@/lib/repositories/device-repository-singleton';
 *
 * const device = await deviceRepository.getDeviceById(id);
 * ```
 */
export const deviceRepository = getDeviceRepository();
