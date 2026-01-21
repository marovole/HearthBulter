import { NeonDeviceRepository } from "./implementations/neon-device-repository";
import type { DeviceRepository } from "./interfaces/device-repository";

let instance: DeviceRepository | null = null;

export function getDeviceRepository(): DeviceRepository {
  if (!instance) {
    instance = new NeonDeviceRepository();
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
