/**
 * Cloudflare Function: Dashboard Overview API
 * 
 * GET /api/v1/dashboard/overview?memberId=xxx
 * 
 * 获取仪表盘概览数据
 */

import { createSupabaseClient } from '../../../utils/supabase';
import { requireAuth, cors, errorHandler, composeMiddlewares, AuthenticatedRequest, CloudflareContext } from '../../../middleware/auth';

interface OverviewResponse {
  overview: {
    totalHealthRecords: number;
    totalMealLogs: number;
    averageHealthScore: number;
    recentTrends: any[];
  };
  healthScore: {
    score: number;
    level: string;
    factors: any[];
  };
}

/**
 * 验证用户是否有权限访问成员数据
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string,
  supabase: any
): Promise<{ hasAccess: boolean; member: any }> {
  // 查询成员信息和家庭信息
  const { data: member, error } = await supabase
    .from('family_members')
    .select(`
      *,
      family:families(
        id,
        creator_id,
        members:family_members!inner(
          id,
          user_id,
          role
        )
      )
    `)
    .eq('id', memberId)
    .is('deleted_at', null)
    .single();

  if (error || !member) {
    return { hasAccess: false, member: null };
  }

  // 检查权限
  const isCreator = member.family.creator_id === userId;
  const familyMember = member.family.members.find((m: any) => m.user_id === userId);
  const isAdmin = familyMember?.role === 'ADMIN' || isCreator;
  const isSelf = member.user_id === userId;

  return {
    hasAccess: isAdmin || isSelf,
    member,
  };
}

/**
 * 获取仪表盘概览数据
 */
async function getDashboardOverview(memberId: string, supabase: any) {
  // 获取健康数据总数
  const { count: healthRecordsCount } = await supabase
    .from('health_data')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId);

  // 获取饮食记录总数
  const { count: mealLogsCount } = await supabase
    .from('meal_logs')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId);

  // 获取最新健康评分
  const { data: latestScore } = await supabase
    .from('health_scores')
    .select('score, level')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 获取最近趋势数据
  const { data: recentTrends } = await supabase
    .from('trend_data')
    .select('*')
    .eq('member_id', memberId)
    .order('date', { ascending: false })
    .limit(7);

  return {
    totalHealthRecords: healthRecordsCount || 0,
    totalMealLogs: mealLogsCount || 0,
    averageHealthScore: latestScore?.score || 0,
    recentTrends: recentTrends || [],
  };
}

/**
 * 计算健康评分
 */
async function calculateHealthScore(memberId: string, supabase: any) {
  // 获取最新评分记录
  const { data: scoreRecord } = await supabase
    .from('health_scores')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!scoreRecord) {
    return {
      score: 0,
      level: 'UNKNOWN',
      factors: [],
    };
  }

  return {
    score: scoreRecord.score,
    level: scoreRecord.level,
    factors: scoreRecord.factors || [],
  };
}

/**
 * 主处理函数
 */
async function handleRequest(context: CloudflareContext): Promise<Response> {
  const request = context.request as AuthenticatedRequest;
  const user = request.user!;

  // 解析查询参数
  const url = new URL(request.url);
  const memberId = url.searchParams.get('memberId');

  if (!memberId) {
    return new Response(
      JSON.stringify({ error: '缺少成员ID参数' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 创建 Supabase 客户端
  const supabase = createSupabaseClient(context.env);

  // 验证权限
  const { hasAccess } = await verifyMemberAccess(memberId, user.id, supabase);

  if (!hasAccess) {
    return new Response(
      JSON.stringify({ error: '无权限访问该成员的仪表盘数据' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 获取数据
  const overview = await getDashboardOverview(memberId, supabase);
  const healthScore = await calculateHealthScore(memberId, supabase);

  const response: OverviewResponse = {
    overview,
    healthScore,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Cloudflare Pages Function 导出
 */
export const onRequestGet = async (context: CloudflareContext) => {
  const middlewares = composeMiddlewares(
    errorHandler,
    cors,
    requireAuth
  );

  return middlewares(context, () => handleRequest(context));
};

// 不支持的方法
export const onRequestPost = async () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const onRequestPut = onRequestPost;
export const onRequestDelete = onRequestPost;
