/**
 * 设备连接 Repository 单例
 *
 * 提供统一的双写 DeviceRepository 实例，供所有设备相关端点使用
 *
 * @module device-repository-singleton
 */

import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaDeviceRepository } from './implementations/prisma-device-repository';
import { SupabaseDeviceRepository } from './implementations/supabase-device-repository';
import type { DeviceRepository } from './interfaces/device-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();

export const deviceRepository = createDualWriteDecorator<DeviceRepository>(
  new PrismaDeviceRepository(),
  new SupabaseDeviceRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/devices',
  }
);
