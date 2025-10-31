import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getLeaderboard, 
  updateLeaderboardData,
  getRankHistory
} from '@/lib/services/social/leaderboard';
import { LeaderboardType, LeaderboardPeriod } from '@prisma/client';

/**
 * GET /api/social/leaderboard
 * 获取排行榜数据
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as LeaderboardType;
    const period = searchParams.get('period') as LeaderboardPeriod;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeUser = searchParams.get('includeUser') === 'true';

    // 验证参数
    if (!type || !Object.values(LeaderboardType).includes(type)) {
      return NextResponse.json(
        { error: '无效的排行榜类型' },
        { status: 400 }
      );
    }

    if (!period || !Object.values(LeaderboardPeriod).includes(period)) {
      return NextResponse.json(
        { error: '无效的时间周期' },
        { status: 400 }
      );
    }

    // 获取用户ID（如果需要包含用户排名）
    const memberId = session?.user?.id;

    // 获取排行榜数据
    const leaderboardData = await getLeaderboard(
      type,
      period,
      includeUser ? memberId : undefined,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      data: {
        type: leaderboardData.type,
        period: leaderboardData.period,
        periodStart: leaderboardData.periodStart,
        periodEnd: leaderboardData.periodEnd,
        entries: leaderboardData.entries.map(entry => ({
          rank: entry.rank,
          previousRank: entry.previousRank,
          rankChange: entry.rankChange,
          score: entry.score,
          member: entry.member,
          isAnonymous: entry.isAnonymous,
          metadata: entry.metadata
        })),
        totalParticipants: leaderboardData.totalParticipants,
        userRank: leaderboardData.userRank ? {
          rank: leaderboardData.userRank.rank,
          score: leaderboardData.userRank.score,
          member: leaderboardData.userRank.member,
          metadata: leaderboardData.userRank.metadata
        } : null,
        lastUpdated: leaderboardData.lastUpdated
      }
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/leaderboard
 * 更新排行榜数据（管理员功能）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 检查是否为管理员
    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, period } = body;

    if (!type || !Object.values(LeaderboardType).includes(type)) {
      return NextResponse.json(
        { error: '无效的排行榜类型' },
        { status: 400 }
      );
    }

    if (!period || !Object.values(LeaderboardPeriod).includes(period)) {
      return NextResponse.json(
        { error: '无效的时间周期' },
        { status: 400 }
      );
    }

    // 更新排行榜数据
    await updateLeaderboardData(type, period);

    return NextResponse.json({
      success: true,
      message: '排行榜数据更新成功'
    });
  } catch (error) {
    console.error('更新排行榜失败:', error);
    return NextResponse.json(
      { error: '更新排行榜失败' },
      { status: 500 }
    );
  }
}
