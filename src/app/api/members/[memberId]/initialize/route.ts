import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import {
  initializeMemberHealthData,
  checkIfMemberNeedsInitialization,
} from "@/lib/services/user-initialization";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

/**
 * GET /api/members/[memberId]/initialize
 * 检查成员是否需要初始化
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
    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

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
    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

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
