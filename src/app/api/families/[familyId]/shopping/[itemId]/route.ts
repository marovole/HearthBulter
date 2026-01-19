import { NextRequest, NextResponse } from "next/server";
import { ShoppingListService } from "@/services/shopping-list";
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from "@/middleware/permissions";

// PUT /api/families/[familyId]/shopping/[itemId] - 更新购物项

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; itemId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, itemId } = await params;
      const userId = req.user!.id;
      const body = await request.json();

      const { amount, estimatedPrice, assigneeId } = body;

      const updatedItem = await ShoppingListService.updateShoppingItem(
        familyId,
        userId,
        itemId,
        {
          amount,
          estimatedPrice,
          assigneeId,
        },
      );

      return NextResponse.json({
        success: true,
        data: updatedItem,
      });
    } catch (error) {
      console.error("Error updating shopping item:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update shopping item",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.UPDATE_SHOPPING_ITEM)(request as any, { params });
}

// DELETE /api/families/[familyId]/shopping/[itemId] - 删除购物项
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; itemId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, itemId } = await params;
      const userId = req.user!.id;

      const result = await ShoppingListService.deleteShoppingItem(
        familyId,
        userId,
        itemId,
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error deleting shopping item:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete shopping item",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.DELETE_SHOPPING_ITEM)(request as any, { params });
}
