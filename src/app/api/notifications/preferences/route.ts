import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/notifications/preferences - 获取用户通知偏好设置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { memberId },
    });

    // 如果没有偏好设置，创建默认设置
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          memberId,
          enableNotifications: true,
          dailyMaxNotifications: 50,
          dailyMaxSMS: 5,
          dailyMaxEmail: 20,
          channelPreferences: JSON.stringify({
            CHECK_IN_REMINDER: ['IN_APP', 'EMAIL'],
            TASK_NOTIFICATION: ['IN_APP'],
            EXPIRY_ALERT: ['IN_APP', 'EMAIL', 'SMS'],
            BUDGET_WARNING: ['IN_APP', 'EMAIL'],
            HEALTH_ALERT: ['IN_APP', 'EMAIL', 'SMS'],
            GOAL_ACHIEVEMENT: ['IN_APP', 'EMAIL'],
            FAMILY_ACTIVITY: ['IN_APP'],
            SYSTEM_ANNOUNCEMENT: ['IN_APP'],
            MARKETING: ['IN_APP'],
            OTHER: ['IN_APP'],
          }),
          typeSettings: JSON.stringify({
            CHECK_IN_REMINDER: true,
            TASK_NOTIFICATION: true,
            EXPIRY_ALERT: true,
            BUDGET_WARNING: true,
            HEALTH_ALERT: true,
            GOAL_ACHIEVEMENT: true,
            FAMILY_ACTIVITY: true,
            SYSTEM_ANNOUNCEMENT: true,
            MARKETING: false,
            OTHER: true,
          }),
        },
      });
    }

    // 解析JSON字段
    const formattedPreferences = {
      ...preferences,
      channelPreferences: JSON.parse(preferences.channelPreferences || '{}'),
      typeSettings: JSON.parse(preferences.typeSettings || '{}'),
    };

    return NextResponse.json({
      success: true,
      data: formattedPreferences,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences - 更新用户通知偏好设置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      enableNotifications,
      globalQuietHoursStart,
      globalQuietHoursEnd,
      dailyMaxNotifications,
      dailyMaxSMS,
      dailyMaxEmail,
      channelPreferences,
      typeSettings,
      wechatOpenId,
      wechatSubscribed,
      pushToken,
      pushEnabled,
      emailEnabled,
      phoneEnabled,
      phoneNumber,
      enableSmartScheduling,
      enableDeduplication,
    } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // 验证时间设置
    if (globalQuietHoursStart !== undefined && 
        (globalQuietHoursStart < 0 || globalQuietHoursStart > 23)) {
      return NextResponse.json(
        { error: 'Quiet hours start must be between 0 and 23' },
        { status: 400 }
      );
    }

    if (globalQuietHoursEnd !== undefined && 
        (globalQuietHoursEnd < 0 || globalQuietHoursEnd > 23)) {
      return NextResponse.json(
        { error: 'Quiet hours end must be between 0 and 23' },
        { status: 400 }
      );
    }

    // 验证每日限额
    if (dailyMaxNotifications !== undefined && dailyMaxNotifications < 0) {
      return NextResponse.json(
        { error: 'Daily max notifications must be non-negative' },
        { status: 400 }
      );
    }

    if (dailyMaxSMS !== undefined && dailyMaxSMS < 0) {
      return NextResponse.json(
        { error: 'Daily max SMS must be non-negative' },
        { status: 400 }
      );
    }

    if (dailyMaxEmail !== undefined && dailyMaxEmail < 0) {
      return NextResponse.json(
        { error: 'Daily max email must be non-negative' },
        { status: 400 }
      );
    }

    // 验证手机号格式
    if (phoneNumber !== undefined && phoneNumber) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // 只更新提供的字段
    if (enableNotifications !== undefined) updateData.enableNotifications = enableNotifications;
    if (globalQuietHoursStart !== undefined) updateData.globalQuietHoursStart = globalQuietHoursStart;
    if (globalQuietHoursEnd !== undefined) updateData.globalQuietHoursEnd = globalQuietHoursEnd;
    if (dailyMaxNotifications !== undefined) updateData.dailyMaxNotifications = dailyMaxNotifications;
    if (dailyMaxSMS !== undefined) updateData.dailyMaxSMS = dailyMaxSMS;
    if (dailyMaxEmail !== undefined) updateData.dailyMaxEmail = dailyMaxEmail;
    if (channelPreferences !== undefined) updateData.channelPreferences = JSON.stringify(channelPreferences);
    if (typeSettings !== undefined) updateData.typeSettings = JSON.stringify(typeSettings);
    if (wechatOpenId !== undefined) updateData.wechatOpenId = wechatOpenId;
    if (wechatSubscribed !== undefined) updateData.wechatSubscribed = wechatSubscribed;
    if (pushToken !== undefined) updateData.pushToken = pushToken;
    if (pushEnabled !== undefined) updateData.pushEnabled = pushEnabled;
    if (emailEnabled !== undefined) updateData.emailEnabled = emailEnabled;
    if (phoneEnabled !== undefined) updateData.phoneEnabled = phoneEnabled;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (enableSmartScheduling !== undefined) updateData.enableSmartScheduling = enableSmartScheduling;
    if (enableDeduplication !== undefined) updateData.enableDeduplication = enableDeduplication;

    const preferences = await prisma.notificationPreference.upsert({
      where: { memberId },
      update: updateData,
      create: {
        memberId,
        enableNotifications: true,
        dailyMaxNotifications: 50,
        dailyMaxSMS: 5,
        dailyMaxEmail: 20,
        channelPreferences: JSON.stringify({
          CHECK_IN_REMINDER: ['IN_APP', 'EMAIL'],
          TASK_NOTIFICATION: ['IN_APP'],
          EXPIRY_ALERT: ['IN_APP', 'EMAIL', 'SMS'],
          BUDGET_WARNING: ['IN_APP', 'EMAIL'],
          HEALTH_ALERT: ['IN_APP', 'EMAIL', 'SMS'],
          GOAL_ACHIEVEMENT: ['IN_APP', 'EMAIL'],
          FAMILY_ACTIVITY: ['IN_APP'],
          SYSTEM_ANNOUNCEMENT: ['IN_APP'],
          MARKETING: ['IN_APP'],
          OTHER: ['IN_APP'],
        }),
        typeSettings: JSON.stringify({
          CHECK_IN_REMINDER: true,
          TASK_NOTIFICATION: true,
          EXPIRY_ALERT: true,
          BUDGET_WARNING: true,
          HEALTH_ALERT: true,
          GOAL_ACHIEVEMENT: true,
          FAMILY_ACTIVITY: true,
          SYSTEM_ANNOUNCEMENT: true,
          MARKETING: false,
          OTHER: true,
        }),
        ...updateData,
      },
    });

    // 解析JSON字段返回
    const formattedPreferences = {
      ...preferences,
      channelPreferences: JSON.parse(preferences.channelPreferences || '{}'),
      typeSettings: JSON.parse(preferences.typeSettings || '{}'),
    };

    return NextResponse.json({
      success: true,
      data: formattedPreferences,
      message: 'Notification preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
