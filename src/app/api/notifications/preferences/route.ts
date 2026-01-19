import { NextRequest, NextResponse } from "next/server";
import { notificationRepository } from "@/lib/repositories/notification-repository-singleton";
import type { NotificationPreferenceDTO } from "@/lib/repositories/types/notification";

/**
 * 模块级别的单例 - 避免每次请求都重新创建
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
/**
 * 默认通知偏好设置
 */
const DEFAULT_PREFERENCES = {
  channelPreferences: {
    CHECK_IN_REMINDER: ["IN_APP", "EMAIL"],
    TASK_NOTIFICATION: ["IN_APP"],
    EXPIRY_ALERT: ["IN_APP", "EMAIL", "SMS"],
    BUDGET_WARNING: ["IN_APP", "EMAIL"],
    HEALTH_ALERT: ["IN_APP", "EMAIL", "SMS"],
    GOAL_ACHIEVEMENT: ["IN_APP", "EMAIL"],
    FAMILY_ACTIVITY: ["IN_APP"],
    SYSTEM_ANNOUNCEMENT: ["IN_APP"],
    MARKETING: ["IN_APP"],
    OTHER: ["IN_APP"],
  },
  mutedTypes: ["MARKETING"],
};

/**
 * GET /api/notifications/preferences - 获取用户通知偏好设置
 *
 * 使用双写框架，支持 Prisma/Supabase 双写验证
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    // 使用双写框架查询通知偏好
    let preferences =
      await notificationRepository.getNotificationPreferences(memberId);

    // 如果没有偏好设置，创建默认设置
    if (!preferences) {
      const defaultPreference: NotificationPreferenceDTO = {
        memberId,
        channelPreferences: DEFAULT_PREFERENCES.channelPreferences as any,
        mutedTypes: DEFAULT_PREFERENCES.mutedTypes as any,
        lastUpdatedAt: new Date(),
      };

      await notificationRepository.upsertNotificationPreferences(
        defaultPreference,
      );

      preferences = defaultPreference;
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications/preferences - 更新用户通知偏好设置
 *
 * 使用双写框架，支持 Prisma/Supabase 双写验证
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, channelPreferences, quietHours, mutedTypes } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    // 验证 quietHours 格式
    if (quietHours) {
      if (!quietHours.start || !quietHours.end) {
        return NextResponse.json(
          { error: "Quiet hours must have both start and end times" },
          { status: 400 },
        );
      }

      const timeRegex = /^\d{2}:\d{2}$/;
      if (
        !timeRegex.test(quietHours.start) ||
        !timeRegex.test(quietHours.end)
      ) {
        return NextResponse.json(
          { error: "Quiet hours must be in HH:MM format" },
          { status: 400 },
        );
      }
    }

    // 准备偏好数据
    const preferenceData: NotificationPreferenceDTO = {
      memberId,
      channelPreferences:
        channelPreferences || DEFAULT_PREFERENCES.channelPreferences,
      quietHours: quietHours || undefined,
      mutedTypes: mutedTypes || undefined,
      lastUpdatedAt: new Date(),
    };

    // 使用双写框架更新偏好设置
    await notificationRepository.upsertNotificationPreferences(preferenceData);

    return NextResponse.json({
      success: true,
      data: preferenceData,
      message: "Notification preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 },
    );
  }
}
