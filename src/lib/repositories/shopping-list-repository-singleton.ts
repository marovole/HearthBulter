/**
 * 购物清单 Repository 单例
 *
 * 提供统一的双写 ShoppingListRepository 实例，供所有购物清单相关端点使用
 *
 * @module shopping-list-repository-singleton
 */

import { getPrismaClient } from '@/lib/db';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaShoppingListRepository } from './implementations/prisma-shopping-list-repository';
import { SupabaseShoppingListRepository } from './implementations/supabase-shopping-list-repository';
import type { ShoppingListRepository } from './interfaces/shopping-list-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();
const prismaClient = await getPrismaClient();

export const shoppingListRepository = createDualWriteDecorator<ShoppingListRepository>(
  new PrismaShoppingListRepository(prismaClient),
  new SupabaseShoppingListRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/shopping-lists',
  }
);
