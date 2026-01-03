import { NextRequest, NextResponse } from 'next/server';
import { dailyReviewService } from '@/lib/services/daily-review-service';
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from '@/middleware/permissions';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/families/:familyId/daily-reviews?memberId=xxx&days=7
 * 获取每日复盘列表
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;
      const { searchParams } = new URL(request.url);
      const memberId = searchParams.get('memberId');
      const days = searchParams.get('days');

      const supabase = SupabaseClientManager.getInstance();

      // 验证用户权限并获取成员信息
      const { data: member } = await supabase
        .from('family_members')
        .select('id, role')
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Not a family member' },
          { status: 403 },
        );
      }

      // 使用请求的 memberId 或当前用户的成员ID
      const targetMemberId = memberId || member.id;
      const reviewDays = days ? parseInt(days, 10) : 7;

      // 获取复盘历史
      const reviews = await dailyReviewService.getReviewHistory(
        targetMemberId,
        reviewDays,
      );

      return NextResponse.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      console.error('Error getting daily reviews:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get daily reviews',
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}

/**
 * POST /api/families/:familyId/daily-reviews
 * 手动触发生成每日复盘
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;
      const body = await request.json();
      const { memberId, date } = body;

      const supabase = SupabaseClientManager.getInstance();

      // 验证用户权限并获取成员信息
      const { data: member } = await supabase
        .from('family_members')
        .select('id, role')
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Not a family member' },
          { status: 403 },
        );
      }

      // 使用请求的 memberId 或当前用户的成员ID
      const targetMemberId = memberId || member.id;
      const reviewDate = date ? new Date(date) : undefined;

      // 生成每日复盘
      const review = await dailyReviewService.generateDailyReview(
        familyId,
        targetMemberId,
        reviewDate,
      );

      return NextResponse.json({
        success: true,
        data: review,
      });
    } catch (error) {
      console.error('Error generating daily review:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to generate daily review',
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}
