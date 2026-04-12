import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import { z } from "zod";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

// Convex ID type helper
type Id<TableName extends string> = string & { __tableName: TableName };

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
    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的提醒配置" }, { status: 403 });
    }

    const reminders = await convexClient.query(api.health.listHealthRemindersByMember, {
      memberId: memberId as Id<"familyMembers">,
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
    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

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
    const reminder = await convexClient.mutation(api.health.upsertHealthReminder, {
      memberId: memberId as Id<"familyMembers">,
      reminderType,
      enabled: enabled ?? true,
      hour,
      minute: minute ?? 0,
      daysOfWeek: JSON.stringify(daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
      message: message || null,
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
