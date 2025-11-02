import { NextRequest, NextResponse } from 'next/server';
import { ShoppingListService } from '@/services/shopping-list';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';

// GET /api/families/[familyId]/shopping/stats - 获取购物统计
export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = params;
      const userId = req.user!.id;

      const stats = await ShoppingListService.getShoppingStats(familyId, userId);

      return NextResponse.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting shopping stats:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get shopping stats', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}
