import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { z } from "zod";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

interface FamilyMember {
  id: string;
  userId: string | null;
  familyId: string;
  role?: string;
}

interface Family {
  id: string;
  creatorId: string;
}

interface HealthReminder {
  id: string;
  memberId: string;
  reminderType: string;
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: string;
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 验证用户是否有权限访问成员的健康数据
 *
 * Migrated from Supabase to Neon
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
  // 查询成员信息
  const member = await neonAdapter.familyMember.findFirst<FamilyMember>({
    where: { id: memberId, deletedAt: null },
  });

  if (!member) {
    return { hasAccess: false };
  }

  // 查询家庭信息
  const family = await neonAdapter.family.findFirst<Family>({
    where: { id: member.familyId },
  });

  const isCreator = family?.creatorId === userId;

  let isAdmin = false;
  if (!isCreator) {
    const adminMember = await neonAdapter.familyMember.findFirst<FamilyMember>({
      where: {
        familyId: member.familyId,
        userId: userId,
        role: "ADMIN",
        deletedAt: null,
      },
    });

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
  reminderType: z.enum(["WEIGHT", "BLOOD_PRESSURE", "HEART_RATE", "GENERAL"]),
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
 * Migrated from Supabase to Neon
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的提醒配置" }, { status: 403 });
    }

    const reminders = await neonAdapter.healthReminder.findMany<HealthReminder>({
      where: { memberId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      {
        reminders: (reminders || []).map((r) => ({
          ...r,
          daysOfWeek: JSON.parse(r.daysOfWeek || "[]"),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("获取提醒配置失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * POST /api/members/:memberId/health-reminders
 * 创建或更新健康数据提醒配置
 *
 * Migrated from Supabase to Neon
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限设置该成员的提醒配置" }, { status: 403 });
    }

    const body = await request.json();
    const validation = reminderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "输入数据无效", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { reminderType, enabled, hour, minute, daysOfWeek, message } = validation.data;

    // 使用 upsert 创建或更新
    const reminder = await neonAdapter.healthReminder.upsert<HealthReminder>({
      where: { memberId, reminderType },
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
        enabled: enabled ?? true,
        hour,
        minute: minute ?? 0,
        daysOfWeek: JSON.stringify(daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
        message: message || null,
      },
    });

    return NextResponse.json(
      {
        message: "提醒配置保存成功",
        reminder: {
          ...reminder,
          daysOfWeek: JSON.parse(reminder.daysOfWeek || "[]"),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("保存提醒配置失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
