import { NextRequest, NextResponse } from 'next/server';
import { ShoppingListService } from '@/services/shopping-list';
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from '@/middleware/permissions';

// GET /api/families/[familyId]/shopping - 获取家庭购物清单

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;

      const shoppingLists = await ShoppingListService.getFamilyShoppingList(
        familyId,
        userId,
      );

      return NextResponse.json({
        success: true,
        data: shoppingLists,
      });
    } catch (error) {
      console.error('Error getting shopping lists:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get shopping lists',
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}

// POST /api/families/[familyId]/shopping - 添加购物项
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;
      const body = await request.json();

      const { listId, foodId, amount, estimatedPrice, assigneeId } = body;

      // 验证必需字段
      if (!listId || !foodId || !amount) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required fields: listId, foodId, amount',
          },
          { status: 400 },
        );
      }

      const shoppingItem = await ShoppingListService.addShoppingItem(
        familyId,
        userId,
        {
          listId,
          foodId,
          amount,
          estimatedPrice,
          assigneeId,
        },
      );

      return NextResponse.json({
        success: true,
        data: shoppingItem,
      });
    } catch (error) {
      console.error('Error adding shopping item:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to add shopping item',
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.CREATE_SHOPPING_ITEM)(request as any, { params });
}
