import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";
import {
  initializeMemberHealthData,
  checkIfMemberNeedsInitialization,
} from "@/lib/services/user-initialization";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

interface FamilyMember {
  id: string;
  userId: string | null;
  familyId: string;
}

interface Family {
  id: string;
  creatorId: string;
}

/**
 * 验证用户是否有权限初始化成员数据
 *
 * Migrated from Supabase to Neon
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: FamilyMember | null }> {
  // 查询成员信息
  const member = await neonAdapter.familyMember.findFirst<FamilyMember>({
    where: { id: memberId, deletedAt: null },
  });

  if (!member) {
    return { hasAccess: false, member: null };
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
    member,
  };
}

/**
 * GET /api/members/[memberId]/initialize
 * 检查成员是否需要初始化
 *
 * Migrated from Supabase to Neon
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
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
    const needsInitialization = await checkIfMemberNeedsInitialization(memberId);

    return NextResponse.json(
      {
        needsInitialization,
        memberId,
      },
      { status: 200 }
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
 * Migrated from Supabase to Neon
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
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
      return NextResponse.json({ error: "无权限初始化该成员" }, { status: 403 });
    }

    // 执行初始化
    const result = await initializeMemberHealthData(memberId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: result.message,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("初始化成员健康数据失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
