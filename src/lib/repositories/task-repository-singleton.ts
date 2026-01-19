/**
 * 任务 Repository 单例
 *
 * 提供全局单例 TaskRepository 实例
 *
 * @module task-repository-singleton
 */

import { ConvexTaskRepository } from "./implementations/convex-task-repository";
import type { TaskRepository } from "./interfaces/task-repository";

let instance: TaskRepository | null = null;

/**
 * 获取 TaskRepository 单例实例
 *
 * @returns TaskRepository 实例
 */
export function getTaskRepository(): TaskRepository {
  if (!instance) {
    instance = new ConvexTaskRepository();
  }
  return instance;
}

/**
 * 全局 TaskRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { taskRepository } from '@/lib/repositories/task-repository-singleton';
 *
 * const task = await taskRepository.getTaskById(id);
 * ```
 */
export const taskRepository = getTaskRepository();
