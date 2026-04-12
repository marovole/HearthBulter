import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";

type Id<TableName extends string> = string & { __tableName: TableName };

interface FamilyInvitation {
  _id: Id<"familyInvitations">;
  inviteCode: string;
  email: string;
  role: string;
  status: string;
  familyId: Id<"families">;
  expiresAt: number;
}

interface Family {
  _id: Id<"families">;
  name: string;
  description?: string;
}

interface FamilyMember {
  _id: Id<"familyMembers">;
  familyId: Id<"families">;
  userId?: Id<"users">;
  name: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  birthDate: number;
  role: "ADMIN" | "MEMBER" | "GUEST";
  deletedAt?: number;
}

interface AcceptInvitationResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    family: { id: string; name: string; description?: string };
    member: { id: string; name: string; role: string };
  };
}

/**
 * GET /api/invite/:code
 * 获取邀请信息
 *
 * Migrated from Neon to Convex
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;

    const invitation = await convexClient.query<FamilyInvitation | null>(
      api.families.getInvitationByCode,
      {
        inviteCode: code,
      }
    );

    if (!invitation) {
      return NextResponse.json({ error: "邀请码无效" }, { status: 404 });
    }

    const family = await convexClient.query<Family | null>(api.families.getById, {
      familyId: invitation.familyId,
    });

    if (!family) {
      return NextResponse.json({ error: "家庭不存在" }, { status: 404 });
    }

    if (invitation.expiresAt < Date.now()) {
      await convexClient.mutation(api.families.updateInvitationStatus, {
        invitationId: invitation._id,
        status: "EXPIRED",
      });
      return NextResponse.json({ error: "邀请已过期" }, { status: 410 });
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json({ error: "该邀请已被接受" }, { status: 410 });
    }

    if (invitation.status === "REJECTED") {
      return NextResponse.json({ error: "该邀请已被拒绝" }, { status: 410 });
    }

    const members = await convexClient.query<FamilyMember[]>(api.families.listMembers, {
      familyId: family._id,
      includeDeleted: false,
    });
    const memberCount = members?.length || 0;

    return NextResponse.json(
      {
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: new Date(invitation.expiresAt),
        },
        family: {
          id: family._id,
          name: family.name,
          description: family.description,
          memberCount: memberCount || 0,
        },
      },
      { status: 200 }
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
 * Migrated from Neon to Convex
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录后再接受邀请" }, { status: 401 });
    }

    const body = await request.json();
    const { memberName, gender, birthDate } = body;

    if (!memberName || typeof memberName !== "string" || memberName.trim() === "") {
      return NextResponse.json({ error: "请提供成员名称" }, { status: 400 });
    }

    const result = await convexClient.mutation<AcceptInvitationResult>(
      api.families.acceptInvitation,
      {
        inviteCode: code,
        userId: session.user.id as Id<"users">,
        memberName: memberName.trim(),
        gender: gender || "MALE",
        birthDate: birthDate ? new Date(birthDate).getTime() : undefined,
      }
    );

    if (!result?.success) {
      const errorCode = result?.error;
      const message = result?.message || "加入家庭失败";

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

      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: result.message,
        family: result.data?.family,
        member: result.data?.member,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("加入家庭失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
