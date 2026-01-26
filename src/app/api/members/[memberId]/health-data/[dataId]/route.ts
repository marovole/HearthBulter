import { NextRequest, NextResponse } from "next/server";
import { api, convexClient } from "@/lib/convex-client";

export const dynamic = "force-dynamic";

async function verifyMemberAccess(memberId: string, clerkId: string): Promise<boolean> {
  const result = await convexClient.query<any>(api.members.verifyAccess, {
    memberId: memberId as any,
    clerkId,
  });
  return Boolean(result?.hasAccess);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; dataId: string }> }
) {
  try {
    const { memberId, dataId } = await params;

    const clerkId = request.headers.get("x-auth-user-id");
    if (!clerkId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const hasAccess = await verifyMemberAccess(memberId, clerkId);
    if (!hasAccess) {
      return NextResponse.json({ error: "无权限删除该成员的健康数据" }, { status: 403 });
    }

    const record = await convexClient.query<any>(api.health.getRecordById, {
      recordId: dataId as any,
    });

    if (!record || record.memberId !== memberId) {
      return NextResponse.json({ error: "健康数据记录不存在" }, { status: 404 });
    }

    await convexClient.mutation(api.health.deleteRecord, {
      recordId: dataId as any,
    });

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
