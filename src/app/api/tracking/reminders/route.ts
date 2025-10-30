import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { reminderService } from '@/lib/services/tracking/reminder-service';

/**
 * 验证用户是否有权限访问成员的追踪数据
 */
async function verifyTrackingAccess(
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
const reminderConfigSchema = z.object({
  type: z.enum(['MEAL_TIME', 'MISSING_MEAL', 'NUTRITION_DEFICIENCY', 'STREAK_WARNING']),
  enabled: z.boolean().optional(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59).optional().default(0),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([0, 1, 2, 3, 4, 5, 6]),
  message: z.string().max(200).optional().nullable(),
});

/**
 * GET /api/tracking/reminders
 * 获取用户的营养提醒配置
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyTrackingAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的提醒配置' },
        { status: 403 }
      );
    }

    const reminders = await reminderService.getReminderConfigs(memberId);

    return NextResponse.json({ reminders }, { status: 200 });
  } catch (error) {
    console.error('获取提醒配置失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracking/reminders
 * 创建或更新营养提醒配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, ...config } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyTrackingAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限设置该成员的提醒配置' },
        { status: 403 }
      );
    }

    const validation = reminderConfigSchema.safeParse(config);

    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    const reminder = await reminderService.upsertReminderConfig(memberId, validation.data);

    return NextResponse.json(
      {
        message: '提醒配置保存成功',
        reminder,
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
 * PUT /api/tracking/reminders
 * 批量更新提醒配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, configs } = body;

    if (!memberId || !Array.isArray(configs)) {
      return NextResponse.json(
        { error: '缺少memberId参数或configs数组' },
        { status: 400 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyTrackingAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限设置该成员的提醒配置' },
        { status: 403 }
      );
    }

    const updatedReminders = [];

    for (const config of configs) {
      const validation = reminderConfigSchema.safeParse(config);

      if (!validation.success) {
        return NextResponse.json(
          { error: '配置数据无效', details: validation.error.errors },
          { status: 400 }
        );
      }

      const reminder = await reminderService.upsertReminderConfig(memberId, validation.data);
      updatedReminders.push(reminder);
    }

    return NextResponse.json(
      {
        message: '批量更新提醒配置成功',
        reminders: updatedReminders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('批量更新提醒配置失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
