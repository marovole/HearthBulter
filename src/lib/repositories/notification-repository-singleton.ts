/**
 * Notification Repository Singleton
 *
 * 提供全局单例 NotificationRepository 实例
 *
 * 注意：目前使用裸 Supabase 实例（不使用双写装饰器），
 * 因为通知系统已迁移至 Supabase
 */

import { ConvexNotificationRepository } from "./implementations/convex-notification-repository";
import type { NotificationRepository } from "./interfaces/notification-repository";

let instance: NotificationRepository | null = null;

/**
 * 获取 NotificationRepository 单例实例
 *
 * @returns NotificationRepository 实例
 */
export function getNotificationRepository(): NotificationRepository {
  if (!instance) {
    instance = new ConvexNotificationRepository();
  }
  return instance;
}

/**
 * 全局 NotificationRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { notificationRepository } from '@/lib/repositories/notification-repository-singleton';
 *
 * const notification = await notificationRepository.getNotificationById(id);
 * ```
 */
export const notificationRepository = getNotificationRepository();
