import { NextRequest, NextResponse } from 'next/server';
import { ShoppingListService } from '@/services/shopping-list';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';

// POST /api/families/[familyId]/shopping/[itemId]/assign - 分配购物项

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; itemId: string }> }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, itemId } = await params;
      const userId = req.user!.id;
      const body = await request.json();

      const { assigneeId } = body;

      // 验证必需字段
      if (!assigneeId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: assigneeId' },
          { status: 400 }
        );
      }

      const updatedItem = await ShoppingListService.assignShoppingItem(familyId, userId, itemId, assigneeId);

      return NextResponse.json({
        success: true,
        data: updatedItem,
      });
    } catch (error) {
      console.error('Error assigning shopping item:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to assign shopping item', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.ASSIGN_SHOPPING_ITEM)(request as any, { params });
}
