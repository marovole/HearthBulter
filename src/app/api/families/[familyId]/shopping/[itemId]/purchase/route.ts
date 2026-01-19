import { NextRequest, NextResponse } from "next/server";
import { ShoppingListService } from "@/services/shopping-list";
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from "@/middleware/permissions";

// POST /api/families/[familyId]/shopping/[itemId]/purchase - 确认购买

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; itemId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, itemId } = await params;
      const userId = req.user!.id;
      const body = await request.json();

      const { actualPrice } = body;

      const updatedItem = await ShoppingListService.confirmPurchase(
        familyId,
        userId,
        itemId,
        actualPrice,
      );

      return NextResponse.json({
        success: true,
        data: updatedItem,
      });
    } catch (error) {
      console.error("Error confirming purchase:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to confirm purchase",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.PURCHASE_SHOPPING_ITEM)(request as any, { params });
}
