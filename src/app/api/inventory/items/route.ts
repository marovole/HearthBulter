import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import {
  validateBody,
  validationErrorResponse,
} from "@/lib/validation/api-validator";
import { Id } from "../../../../../convex/_generated/dataModel";

// Type guard for Convex ID
function isValidId(value: string): value is string {
  return typeof value === "string" && value.length > 0;
}

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

    const status = searchParams.get("status") || undefined;
    const storageLocation = searchParams.get("storageLocation") || undefined;
    const category = searchParams.get("category") || undefined;
    const isExpiring = searchParams.get("isExpiring") === "true";
    const isExpired = searchParams.get("isExpired") === "true";
    const isLowStock = searchParams.get("isLowStock") === "true";

    const memberIdValue = memberId;
    const items = await convexClient.query(api.inventory.list, {
      memberId: isValidId(memberIdValue)
        ? (memberIdValue as Id<"familyMembers">)
        : memberIdValue,
      userEmail: user.email || "",
      status,
      storageLocation,
      category,
      isExpiring: isExpiring ? true : undefined,
      isExpired: isExpired ? true : undefined,
      isLowStock: isLowStock ? true : undefined,
    });

    const normalizedItems = (items || []).map((item: any) => ({
      id: item._id || item.id,
      memberId: item.memberId,
      foodId: item.foodId,
      quantity: item.quantity,
      unit: item.unit,
      originalQuantity: item.originalQuantity,
      purchaseDate: item.purchaseDate
        ? new Date(item.purchaseDate).toISOString()
        : null,
      purchasePrice: item.purchasePrice,
      purchaseSource: item.purchaseSource,
      expiryDate: item.expiryDate
        ? new Date(item.expiryDate).toISOString()
        : null,
      productionDate: item.productionDate
        ? new Date(item.productionDate).toISOString()
        : null,
      daysToExpiry:
        item.daysToExpiry !== null && item.daysToExpiry !== undefined
          ? item.daysToExpiry
          : undefined,
      storageLocation: item.storageLocation,
      storageNotes: item.storageNotes,
      minStockThreshold: item.minStockThreshold,
      isLowStock: item.isLowStock ?? false,
      status: item.status,
      barcode: item.barcode,
      brand: item.brand,
      packageInfo: item.packageInfo,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
      food: item.food
        ? {
            id: item.food._id || item.food.id,
            name: item.food.name,
            nameEn: item.food.nameEn,
            category: item.food.category,
            calories: item.food.calories,
            protein: item.food.protein,
            carbs: item.food.carbs,
            fat: item.food.fat,
          }
        : null,
      usageRecords: [],
      wasteRecords: [],
    }));

    return NextResponse.json({
      success: true,
      data: normalizedItems,
      count: normalizedItems.length,
    });
  } catch (error) {
    console.error("获取库存列表失败:", error);

    if (error && typeof error === "object" && "data" in error) {
      const errorData = (error as { data?: any }).data;
      if (errorData?.code === "FORBIDDEN") {
        return NextResponse.json(
          { error: "无权访问此成员数据" },
          { status: 403 },
        );
      }
    }

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

    const validation = await validateBody(request, inventoryCreateSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const data = validation.data;

    const memberIdValue = data.memberId;
    const foodIdValue = data.foodId;

    // 在 Convex 中创建
    const result = await convexClient.mutation(api.inventory.add, {
      memberId: isValidId(memberIdValue)
        ? (memberIdValue as Id<"familyMembers">)
        : memberIdValue,
      foodId: isValidId(foodIdValue)
        ? (foodIdValue as Id<"foods">)
        : foodIdValue,
      quantity: data.quantity,
      unit: data.unit,
      storageLocation: data.storageLocation || "未分类",
      expiryDate: data.expiryDate
        ? new Date(data.expiryDate).getTime()
        : undefined,
      minStockThreshold: data.minStockThreshold,
      purchasePrice: data.purchasePrice,
      purchaseSource: data.purchaseSource,
      productionDate: data.productionDate
        ? new Date(data.productionDate).getTime()
        : undefined,
      storageNotes: data.storageNotes,
      barcode: data.barcode,
      brand: data.brand,
      packageInfo: data.packageInfo,
      userEmail: user.email || "",
    });

    return NextResponse.json({
      success: true,
      data: result?.data ?? result,
      message: "库存条目创建成功",
    });
  } catch (error) {
    console.error("创建库存条目失败:", error);

    if (error && typeof error === "object" && "data" in error) {
      const errorData = (error as { data?: any }).data;
      const code = errorData?.code;
      if (code === "FORBIDDEN") {
        return NextResponse.json(
          { error: "无权访问此成员数据" },
          { status: 403 },
        );
      }
      if (code === "NOT_FOUND") {
        return NextResponse.json({ error: "食物不存在" }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "创建库存条目失败", details: error },
      { status: 500 },
    );
  }
}

const inventoryCreateSchema = z.object({
  memberId: z.string().min(1),
  foodId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  purchaseSource: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  productionDate: z.string().datetime().optional(),
  storageLocation: z.string().optional(),
  storageNotes: z.string().optional(),
  minStockThreshold: z.coerce.number().nonnegative().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  packageInfo: z.string().optional(),
});
