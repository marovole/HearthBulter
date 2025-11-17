import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { z } from 'zod';

/**
 * 验证用户是否有权限访问成员的健康数据
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: member } = await supabase
    .from('family_members')
    .select(`
      id,
      userId,
      familyId,
      family:families!inner(
        id,
        creatorId
      )
    `)
    .eq('id', memberId)
    .is('deletedAt', null)
    .single();

  if (!member) {
    return { hasAccess: false };
  }

  const isCreator = member.family?.creatorId === userId;

  let isAdmin = false;
  if (!isCreator) {
    const { data: adminMember } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('familyId', member.familyId)
      .eq('userId', userId)
      .eq('role', 'ADMIN')
      .is('deletedAt', null)
      .maybeSingle();

    isAdmin = !!adminMember;
  }

  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
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
 *
 * Migrated from Prisma to Supabase
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

    const supabase = SupabaseClientManager.getInstance();

    const { data: reminders, error } = await supabase
      .from('health_reminders')
      .select('*')
      .eq('memberId', memberId)
      .order('createdAt', { ascending: true });

    if (error) {
      console.error('获取提醒配置失败:', error);
      return NextResponse.json(
        { error: '获取提醒配置失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        reminders: (reminders || []).map((r) => ({
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
 *
 * Migrated from Prisma to Supabase
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

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 使用 upsert 创建或更新
    const { data: reminder, error: upsertError } = await supabase
      .from('health_reminders')
      .upsert({
        memberId,
        reminderType,
        enabled: enabled ?? true,
        hour,
        minute: minute ?? 0,
        daysOfWeek: JSON.stringify(daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
        message: message || null,
        updatedAt: now,
        createdAt: now,
      }, {
        onConflict: 'memberId,reminderType',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      console.error('保存提醒配置失败:', upsertError);
      return NextResponse.json(
        { error: '保存提醒配置失败' },
        { status: 500 }
      );
    }

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
 *
 * Migrated from Prisma to Supabase
 */
export async function updateStreakDays(memberId: string) {
  try {
    const supabase = SupabaseClientManager.getInstance();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否已经录入数据
    const { data: todayData } = await supabase
      .from('health_data')
      .select('id')
      .eq('memberId', memberId)
      .gte('measuredAt', today.toISOString())
      .limit(1)
      .maybeSingle();

    if (!todayData) {
      return; // 今天还没有数据，不更新
    }

    // 获取所有启用的提醒配置
    const { data: reminders } = await supabase
      .from('health_reminders')
      .select('*')
      .eq('memberId', memberId)
      .eq('enabled', true);

    if (!reminders || reminders.length === 0) {
      return;
    }

    // 查找最近一次录入数据（不包括今天）
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: lastData } = await supabase
      .from('health_data')
      .select('id, measuredAt')
      .eq('memberId', memberId)
      .gte('measuredAt', yesterday.toISOString())
      .lt('measuredAt', today.toISOString())
      .order('measuredAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();

    // 更新所有提醒的连续打卡天数
    for (const reminder of reminders) {
      if (lastData) {
        // 如果昨天有数据，连续天数+1
        await supabase
          .from('health_reminders')
          .update({
            streakDays: reminder.streakDays + 1,
            lastTriggeredAt: now,
            updatedAt: now,
          })
          .eq('id', reminder.id);
      } else if (reminder.streakDays === 0) {
        // 如果昨天没有数据但连续天数为0，则设置为1（今天第一次）
        await supabase
          .from('health_reminders')
          .update({
            streakDays: 1,
            lastTriggeredAt: now,
            updatedAt: now,
          })
          .eq('id', reminder.id);
      } else {
        // 如果昨天没有数据且连续天数>0，重置为0
        await supabase
          .from('health_reminders')
          .update({
            streakDays: 0,
            updatedAt: now,
          })
          .eq('id', reminder.id);
      }
    }
  } catch (error) {
    console.error('更新连续打卡天数失败:', error);
    // 不影响主流程，只记录错误
  }
}
