/**
 * 库存 Repository 单例
 *
 * 提供统一的双写 InventoryRepository 实例，供所有库存相关端点使用
 *
 * @module inventory-repository-singleton
 */

import { getPrismaClient } from '@/lib/db';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaInventoryRepository } from './implementations/prisma-inventory-repository';
import { SupabaseInventoryRepository } from './implementations/supabase-inventory-repository';
import type { InventoryRepository } from './interfaces/inventory-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();
const prismaClient = await getPrismaClient();

export const inventoryRepository = createDualWriteDecorator<InventoryRepository>(
  new PrismaInventoryRepository(),
  new SupabaseInventoryRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/inventory',
  }
);
