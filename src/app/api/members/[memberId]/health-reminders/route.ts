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
  userId: string,
): Promise<{ hasAccess: boolean }> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: member } = await supabase
    .from('family_members')
    .select(
      `
      id,
      userId,
      familyId,
      family:families!inner(
        id,
        creatorId
      )
    `,
    )
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
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .optional()
    .default([0, 1, 2, 3, 4, 5, 6]),
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
  { params }: { params: Promise<{ memberId: string }> },
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
        { status: 403 },
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
      return NextResponse.json({ error: '获取提醒配置失败' }, { status: 500 });
    }

    return NextResponse.json(
      {
        reminders: (reminders || []).map((r) => ({
          ...r,
          daysOfWeek: JSON.parse(r.daysOfWeek || '[]'),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('获取提醒配置失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
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
  { params }: { params: Promise<{ memberId: string }> },
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
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = reminderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { reminderType, enabled, hour, minute, daysOfWeek, message } =
      validation.data;

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 使用 upsert 创建或更新
    const { data: reminder, error: upsertError } = await supabase
      .from('health_reminders')
      .upsert(
        {
          memberId,
          reminderType,
          enabled: enabled ?? true,
          hour,
          minute: minute ?? 0,
          daysOfWeek: JSON.stringify(daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
          message: message || null,
          updatedAt: now,
          createdAt: now,
        },
        {
          onConflict: 'memberId,reminderType',
          ignoreDuplicates: false,
        },
      )
      .select()
      .single();

    if (upsertError) {
      console.error('保存提醒配置失败:', upsertError);
      return NextResponse.json({ error: '保存提醒配置失败' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: '提醒配置保存成功',
        reminder: {
          ...reminder,
          daysOfWeek: JSON.parse(reminder.daysOfWeek || '[]'),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('保存提醒配置失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
