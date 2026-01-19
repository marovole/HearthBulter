import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { shoppingListRepository } from "@/lib/repositories/shopping-list-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
const emailShareSchema = z.object({
  emailAddress: z.string().email("请输入正确的邮箱地址"),
  listName: z.string(),
  textContent: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const shoppingList = await shoppingListRepository.getShoppingListById(
      listId,
      { includePlan: true },
    );

    const memberId = shoppingList?.plan?.member?.id;
    if (!shoppingList || !memberId) {
      return NextResponse.json({ error: "购物清单不存在" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: memberId as Id<"familyMembers">,
        clerkId: session.user.id,
      },
    );

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "无权限分享该购物清单" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = emailShareSchema.parse(body);

    try {
      console.log("邮件发送模拟:", {
        to: validatedData.emailAddress,
        subject: `购物清单分享: ${validatedData.listName}`,
        content: validatedData.textContent,
      });

      return NextResponse.json({
        message: "邮件发送成功",
        emailAddress: validatedData.emailAddress,
      });
    } catch (emailError) {
      console.error("邮件发送失败:", emailError);
      return NextResponse.json(
        { error: "邮件发送失败，请稍后重试" },
        { status: 500 },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数验证失败", details: error.errors },
        { status: 400 },
      );
    }

    console.error("邮件分享失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
