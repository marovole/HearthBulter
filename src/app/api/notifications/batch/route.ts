import { NextRequest, NextResponse } from "next/server";
import { notificationRepository } from "@/lib/repositories/notification-repository-singleton";
import type { CreateNotificationDTO } from "@/lib/repositories/types/notification";

/**
 * 模块级别的单例 - 避免每次请求都重新创建
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
/**
 * POST /api/notifications/batch
 * 批量操作通知
 *
 * 使用双写框架，支持 Prisma/Supabase 双写验证
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, data } = body;

    // 验证 data 参数是否存在
    if (!data) {
      return NextResponse.json(
        { error: "Missing required field: data" },
        { status: 400 },
      );
    }

    switch (operation) {
      case "create":
        return await handleBatchCreate(data);
      case "markRead":
        return await handleBatchMarkRead(data);
      case "delete":
        return await handleBatchDelete(data);
      default:
        return NextResponse.json(
          { error: "Invalid operation" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error in batch operation:", error);
    return NextResponse.json(
      { error: "Failed to perform batch operation" },
      { status: 500 },
    );
  }
}

// 批量创建通知
async function handleBatchCreate(data: {
  notifications: Array<{
    memberId: string;
    type: string;
    title?: string;
    content?: string;
    priority?: string;
    channels?: string[];
    metadata?: any;
    actionUrl?: string;
    actionText?: string;
    dedupKey?: string;
    batchId?: string;
  }>;
}) {
  if (!data.notifications || !Array.isArray(data.notifications)) {
    return NextResponse.json(
      { error: "Notifications array is required" },
      { status: 400 },
    );
  }

  if (data.notifications.length === 0) {
    return NextResponse.json(
      { error: "At least one notification is required" },
      { status: 400 },
    );
  }

  if (data.notifications.length > 100) {
    return NextResponse.json(
      { error: "Maximum 100 notifications allowed per batch" },
      { status: 400 },
    );
  }

  const results = [];
  const errors = [];

  // 使用双写框架逐个创建通知（保证一致性）
  for (const notif of data.notifications) {
    try {
      const payload: CreateNotificationDTO = {
        memberId: notif.memberId,
        type: notif.type as any,
        title: notif.title || "Notification",
        content: notif.content || "",
        priority: (notif.priority as any) || "MEDIUM",
        channels: notif.channels as any,
        metadata: notif.metadata,
        actionUrl: notif.actionUrl,
        actionText: notif.actionText,
        dedupKey: notif.dedupKey,
        batchId: notif.batchId,
      };

      const created = await notificationRepository.createNotification(payload);
      results.push(created);
    } catch (error) {
      errors.push({
        memberId: notif.memberId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successCount = results.length;
  const failureCount = errors.length;

  return NextResponse.json({
    success: successCount > 0,
    data: {
      results,
      summary: {
        total: data.notifications.length,
        success: successCount,
        failed: failureCount,
        successRate:
          data.notifications.length > 0
            ? (successCount / data.notifications.length) * 100
            : 0,
      },
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}

// 批量标记为已读
async function handleBatchMarkRead(data: {
  notificationIds: string[];
  memberId: string;
}) {
  if (!data.notificationIds || !Array.isArray(data.notificationIds)) {
    return NextResponse.json(
      { error: "Notification IDs array is required" },
      { status: 400 },
    );
  }

  if (!data.memberId) {
    return NextResponse.json(
      { error: "Member ID is required" },
      { status: 400 },
    );
  }

  if (data.notificationIds.length === 0) {
    return NextResponse.json(
      { error: "At least one notification ID is required" },
      { status: 400 },
    );
  }

  if (data.notificationIds.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 notifications allowed per batch" },
      { status: 400 },
    );
  }

  let successCount = 0;
  const errors = [];

  // 使用双写框架逐个标记已读
  for (const notificationId of data.notificationIds) {
    try {
      await notificationRepository.markAsRead(notificationId, data.memberId);
      successCount++;
    } catch (error) {
      errors.push({
        notificationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const failureCount = errors.length;

  return NextResponse.json({
    success: successCount > 0,
    data: {
      summary: {
        total: data.notificationIds.length,
        success: successCount,
        failed: failureCount,
        successRate:
          data.notificationIds.length > 0
            ? (successCount / data.notificationIds.length) * 100
            : 0,
      },
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}

// 批量删除通知
async function handleBatchDelete(data: {
  notificationIds: string[];
  memberId: string;
}) {
  if (!data.notificationIds || !Array.isArray(data.notificationIds)) {
    return NextResponse.json(
      { error: "Notification IDs array is required" },
      { status: 400 },
    );
  }

  if (!data.memberId) {
    return NextResponse.json(
      { error: "Member ID is required" },
      { status: 400 },
    );
  }

  if (data.notificationIds.length === 0) {
    return NextResponse.json(
      { error: "At least one notification ID is required" },
      { status: 400 },
    );
  }

  if (data.notificationIds.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 notifications allowed per batch" },
      { status: 400 },
    );
  }

  let successCount = 0;
  const errors = [];

  // 使用双写框架逐个删除通知
  for (const notificationId of data.notificationIds) {
    try {
      await notificationRepository.deleteNotification(
        notificationId,
        data.memberId,
      );
      successCount++;
    } catch (error) {
      errors.push({
        notificationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const failureCount = errors.length;

  return NextResponse.json({
    success: successCount > 0,
    data: {
      summary: {
        total: data.notificationIds.length,
        success: successCount,
        failed: failureCount,
        successRate:
          data.notificationIds.length > 0
            ? (successCount / data.notificationIds.length) * 100
            : 0,
      },
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}
