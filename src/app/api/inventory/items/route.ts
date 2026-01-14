import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";

/**
 * GET /api/inventory/items
 * 获取库存列表 - 已迁移到 Convex
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "缺少成员ID" }, { status: 400 });
    }

    // TODO: 迁移权限验证逻辑到 Convex
    // 目前暂时跳过详细权限检查，或保持简单的 ID 校验

    // 从 Convex 获取库存
    const items = await convexClient.query(api.inventory.list, {
      // @ts-expect-error - ID type mismatch
      memberId: memberId,
    });

    return NextResponse.json({
      success: true,
      data: items || [],
      count: items?.length || 0,
    });
  } catch (error) {
    console.error("获取库存列表失败:", error);
    return NextResponse.json(
      { error: "获取库存列表失败", details: error },
      { status: 500 },
    );
  }
}

/**
 * POST /api/inventory/items
 * 创建库存条目 - 已迁移到 Convex
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const validated = inventoryCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "输入验证失败", details: validated.error },
        { status: 400 },
      );
    }

    const data = validated.data;

    // 在 Convex 中创建
    const result = await convexClient.mutation(api.inventory.add, {
      // @ts-expect-error - ID type mismatch
      memberId: data.memberId,
      // @ts-expect-error - ID type mismatch
      foodId: data.foodId,
      quantity: data.quantity,
      unit: data.unit,
      storageLocation: data.storageLocation || "未分类",
      expiryDate: data.expiryDate
        ? new Date(data.expiryDate).getTime()
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "库存条目创建成功",
    });
  } catch (error) {
    console.error("创建库存条目失败:", error);
    return NextResponse.json(
      { error: "创建库存条目失败", details: error },
      { status: 500 },
    );
  }
}

const inventoryCreateSchema = z.object({
  memberId: z.string().min(1),
  foodId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  storageLocation: z.string().optional(),
  expiryDate: z.string().optional(),
});
