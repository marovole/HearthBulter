import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import {
  initializeMemberHealthData,
  checkIfMemberNeedsInitialization,
} from "@/lib/services/user-initialization";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

/**
 * 验证用户是否有权限初始化成员数据
 *
 * Migrated from Prisma to Supabase
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string,
): Promise<{ hasAccess: boolean; member: any }> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: member } = await supabase
    .from("family_members")
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
    .eq("id", memberId)
    .is("deletedAt", null)
    .single();

  if (!member) {
    return { hasAccess: false, member: null };
  }

  const isCreator = member.family?.creatorId === userId;

  let isAdmin = false;
  if (!isCreator) {
    const { data: adminMember } = await supabase
      .from("family_members")
      .select("id, role")
      .eq("familyId", member.familyId)
      .eq("userId", userId)
      .eq("role", "ADMIN")
      .is("deletedAt", null)
      .maybeSingle();

    isAdmin = !!adminMember;
  }

  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
    member,
  };
}

/**
 * GET /api/members/[memberId]/initialize
 * 检查成员是否需要初始化
 *
 * Migrated from Prisma to Supabase (endpoint layer)
 * Note: checkIfMemberNeedsInitialization service still uses Prisma
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { memberId } = await params;

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员" }, { status: 403 });
    }

    // 检查是否需要初始化
    // Note: Service function still uses Prisma
    const needsInitialization =
      await checkIfMemberNeedsInitialization(memberId);

    return NextResponse.json(
      {
        needsInitialization,
        memberId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("检查初始化状态失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * POST /api/members/[memberId]/initialize
 * 初始化成员的健康数据
 *
 * Migrated from Prisma to Supabase (endpoint layer)
 * Note: initializeMemberHealthData service still uses Prisma
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { memberId } = await params;

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "无权限初始化该成员" },
        { status: 403 },
      );
    }

    // 执行初始化
    // Note: Service function still uses Prisma for complex initialization logic
    const result = await initializeMemberHealthData(memberId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: result.message,
        data: result.data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("初始化成员健康数据失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
