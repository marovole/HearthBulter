/**
 * 任务 Repository 单例
 *
 * 提供统一的双写 TaskRepository 实例，供所有任务相关端点使用
 *
 * @module task-repository-singleton
 */

import { getPrismaClient } from '@/lib/db';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaTaskRepository } from './implementations/prisma-task-repository';
import { SupabaseTaskRepository } from './implementations/supabase-task-repository';
import type { TaskRepository } from './interfaces/task-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();
const prismaClient = await getPrismaClient();

export const taskRepository = createDualWriteDecorator<TaskRepository>(
  new PrismaTaskRepository(prismaClient),
  new SupabaseTaskRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/families/:familyId/tasks',
  }
);
