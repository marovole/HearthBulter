import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";

/**
 * GET /api/invite/:code
 * 获取邀请信息
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const supabase = SupabaseClientManager.getInstance();

    // 查找邀请记录
    const { data: invitation, error: inviteError } = await supabase
      .from("family_invitations")
      .select(
        `
        *,
        family:families!inner(
          id,
          name,
          description
        )
      `,
      )
      .eq("inviteCode", code)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "邀请码无效" }, { status: 404 });
    }

    // 检查邀请是否过期
    if (new Date(invitation.expiresAt) < new Date()) {
      // 自动标记为过期
      await supabase
        .from("family_invitations")
        .update({ status: "EXPIRED", updatedAt: new Date().toISOString() })
        .eq("id", invitation.id);

      return NextResponse.json({ error: "邀请已过期" }, { status: 410 });
    }

    // 检查邀请状态
    if (invitation.status === "ACCEPTED") {
      return NextResponse.json({ error: "该邀请已被接受" }, { status: 410 });
    }

    if (invitation.status === "REJECTED") {
      return NextResponse.json({ error: "该邀请已被拒绝" }, { status: 410 });
    }

    // 获取家庭成员数量
    const { count: memberCount } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("familyId", invitation.family.id)
      .is("deletedAt", null);

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
        family: {
          id: invitation.family.id,
          name: invitation.family.name,
          description: invitation.family.description,
          memberCount: memberCount || 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("获取邀请信息失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * POST /api/invite/:code
 * 接受邀请并加入家庭
 *
 * 使用 accept_family_invite RPC 函数确保原子性
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录后再接受邀请" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { memberName, gender, birthDate } = body;

    if (
      !memberName ||
      typeof memberName !== "string" ||
      memberName.trim() === ""
    ) {
      return NextResponse.json({ error: "请提供成员名称" }, { status: 400 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 查找邀请记录
    const { data: invitation, error: inviteError } = await supabase
      .from("family_invitations")
      .select("id, email")
      .eq("inviteCode", code)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "邀请码无效" }, { status: 404 });
    }

    // 调用 RPC 函数处理邀请接受
    // RPC 函数会验证：
    // - 用户邮箱是否匹配
    // - 邀请是否有效、未过期
    // - 用户是否已是成员
    // - 用户是否在其他家庭
    // 并且原子地创建成员和更新邀请状态
    const { data: result, error: rpcError } = await supabase.rpc(
      "accept_family_invite",
      {
        p_invitation_id: invitation.id,
        p_user_id: session.user.id,
        p_member_name: memberName.trim(),
        p_gender: gender || "MALE",
        p_birth_date: birthDate || "2000-01-01",
      },
    );

    if (rpcError) {
      console.error("RPC 调用失败:", rpcError);
      return NextResponse.json({ error: "加入家庭失败" }, { status: 500 });
    }

    // 检查 RPC 返回的成功标志
    if (!result?.success) {
      const errorCode = result?.error;
      const message = result?.message || "加入家庭失败";

      // 根据错误码返回适当的 HTTP 状态码
      if (errorCode === "USER_NOT_FOUND") {
        return NextResponse.json({ error: message }, { status: 401 });
      }

      if (errorCode === "INVALID_OR_EXPIRED_INVITATION") {
        return NextResponse.json({ error: message }, { status: 410 });
      }

      if (errorCode === "ALREADY_MEMBER") {
        return NextResponse.json({ error: message }, { status: 400 });
      }

      if (errorCode === "MEMBER_OF_OTHER_FAMILY") {
        return NextResponse.json({ error: message }, { status: 400 });
      }

      if (errorCode === "FAMILY_NOT_FOUND") {
        return NextResponse.json({ error: message }, { status: 404 });
      }

      if (errorCode === "CONCURRENT_ACCEPTANCE") {
        return NextResponse.json({ error: message }, { status: 409 });
      }

      // 其他错误
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 返回成功结果
    return NextResponse.json(
      {
        message: result.message,
        family: result.data.family,
        member: result.data.member,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("加入家庭失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
