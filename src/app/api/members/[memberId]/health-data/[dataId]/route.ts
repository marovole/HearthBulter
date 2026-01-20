import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";

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

async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
  const member = await neonAdapter.familyMember.findFirst<FamilyMember>({
    where: { id: memberId, deletedAt: null },
  });

  if (!member) {
    return { hasAccess: false };
  }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; dataId: string }> }
) {
  try {
    const { memberId, dataId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限删除该成员的健康数据" }, { status: 403 });
    }

    const healthData = await neonAdapter.healthData.findFirst({
      where: { id: dataId, memberId },
    });

    if (!healthData) {
      return NextResponse.json({ error: "健康数据记录不存在" }, { status: 404 });
    }

    await neonAdapter.healthData.delete({ where: { id: dataId } });

    return NextResponse.json(
      {
        message: "健康数据删除成功",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("删除健康数据失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
