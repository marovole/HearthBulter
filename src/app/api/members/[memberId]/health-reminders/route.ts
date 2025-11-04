import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * 验证用户是否有权限访问成员的健康数据
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId, deletedAt: null },
    include: {
      family: {
        select: {
          creatorId: true,
          members: {
            where: { userId, deletedAt: null },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!member) {
    return { hasAccess: false };
  }

  const isCreator = member.family.creatorId === userId;
  const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
  const isSelf = member.userId === userId;

  return {
    hasAccess: isAdmin || isSelf,
  };
}

/**
 * 提醒配置验证schema
 */
const reminderSchema = z.object({
  reminderType: z.enum(['WEIGHT', 'BLOOD_PRESSURE', 'HEART_RATE', 'GENERAL']),
  enabled: z.boolean().optional(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59).optional().default(0),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([0, 1, 2, 3, 4, 5, 6]),
  message: z.string().max(200).optional().nullable(),
});

/**
 * GET /api/members/:memberId/health-reminders
 * 获取成员的健康数据提醒配置
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的提醒配置' },
        { status: 403 }
      );
    }

    const reminders = await prisma.healthReminder.findMany({
      where: { memberId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      {
        reminders: reminders.map((r) => ({
          ...r,
          daysOfWeek: JSON.parse(r.daysOfWeek || '[]'),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取提醒配置失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/:memberId/health-reminders
 * 创建或更新健康数据提醒配置
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限设置该成员的提醒配置' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = reminderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { reminderType, enabled, hour, minute, daysOfWeek, message } =
      validation.data;

    // 使用 upsert 创建或更新
    const reminder = await prisma.healthReminder.upsert({
      where: {
        memberId_reminderType: {
          memberId,
          reminderType,
        },
      },
      create: {
        memberId,
        reminderType,
        enabled: enabled ?? true,
        hour,
        minute: minute ?? 0,
        daysOfWeek: JSON.stringify(daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
        message: message || null,
      },
      update: {
        enabled: enabled ?? undefined,
        hour,
        minute: minute ?? 0,
        daysOfWeek: JSON.stringify(daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
        message: message !== undefined ? message : undefined,
      },
    });

    return NextResponse.json(
      {
        message: '提醒配置保存成功',
        reminder: {
          ...reminder,
          daysOfWeek: JSON.parse(reminder.daysOfWeek || '[]'),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('保存提醒配置失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 计算连续打卡天数
 * 当用户录入健康数据时调用此函数更新提醒的连续打卡天数
 * 导出供其他模块使用
 */
export async function updateStreakDays(memberId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否已经录入数据
    const todayData = await prisma.healthData.findFirst({
      where: {
        memberId,
        measuredAt: {
          gte: today,
        },
      },
    });

    if (!todayData) {
      return; // 今天还没有数据，不更新
    }

    // 获取所有启用的提醒配置
    const reminders = await prisma.healthReminder.findMany({
      where: {
        memberId,
        enabled: true,
      },
    });

    // 查找最近一次录入数据（不包括今天）
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastData = await prisma.healthData.findFirst({
      where: {
        memberId,
        measuredAt: {
          gte: yesterday,
          lt: today,
        },
      },
      orderBy: { measuredAt: 'desc' },
    });

    // 更新所有提醒的连续打卡天数
    for (const reminder of reminders) {
      if (lastData) {
        // 如果昨天有数据，连续天数+1
        await prisma.healthReminder.update({
          where: { id: reminder.id },
          data: {
            streakDays: reminder.streakDays + 1,
            lastTriggeredAt: new Date(),
          },
        });
      } else if (reminder.streakDays === 0) {
        // 如果昨天没有数据但连续天数为0，则设置为1（今天第一次）
        await prisma.healthReminder.update({
          where: { id: reminder.id },
          data: {
            streakDays: 1,
            lastTriggeredAt: new Date(),
          },
        });
      } else {
        // 如果昨天没有数据且连续天数>0，重置为0
        await prisma.healthReminder.update({
          where: { id: reminder.id },
          data: {
            streakDays: 0,
          },
        });
      }
    }
  } catch (error) {
    console.error('更新连续打卡天数失败:', error);
    // 不影响主流程，只记录错误
  }
}
