import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";
import { shoppingListRepository } from "@/lib/repositories/shopping-list-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const shoppingList = await shoppingListRepository.getShoppingListById(listId, {
      includePlan: true,
    });

    const memberId = shoppingList?.plan?.member?.id;
    if (!shoppingList || !memberId) {
      return NextResponse.json({ error: "购物清单不存在" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(api.members.verifyAccess, {
      memberId: memberId as Id<"familyMembers">,
      clerkId: session.user.id,
    });

    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限分享该购物清单" }, { status: 403 });
    }

    const shareToken = randomBytes(32).toString("hex");
    const shareExpiry = new Date();
    shareExpiry.setDate(shareExpiry.getDate() + 7);

    await convexClient.mutation(api.shoppingLists.createShare, {
      listId: listId as Id<"shoppingLists">,
      token: shareToken,
      expiresAt: shareExpiry.getTime(),
      createdBy: session.user.id,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/shopping-list/${shareToken}`;

    return NextResponse.json({
      shareUrl,
      expiresAt: shareExpiry,
    });
  } catch (error) {
    console.error("生成分享链接失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
