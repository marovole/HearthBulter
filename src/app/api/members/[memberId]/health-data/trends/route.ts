import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * 验证用户是否有权限访问成员的健康数据
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: member } = await supabase
    .from('family_members')
    .select(`
      id,
      userId,
      familyId,
      family:families!inner(
        id,
        creatorId
      )
    `)
    .eq('id', memberId)
    .is('deletedAt', null)
    .single();

  if (!member) {
    return { hasAccess: false };
  }

  const isCreator = member.family?.creatorId === userId;

  let isAdmin = false;
  if (!isCreator) {
    const { data: adminMember } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('familyId', member.familyId)
      .eq('userId', userId)
      .eq('role', 'ADMIN')
      .is('deletedAt', null)
      .maybeSingle();

    isAdmin = !!adminMember;
  }

  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
  };
}

/**
 * GET /api/members/:memberId/health-data/trends
 * 获取健康数据趋势分析
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的健康数据' },
        { status: 403 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30'); // 默认30天
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 计算日期范围
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    // 查询数据
    const { data: healthData, error } = await supabase
      .from('health_data')
      .select('*')
      .eq('memberId', memberId)
      .gte('measuredAt', start.toISOString())
      .lte('measuredAt', end.toISOString())
      .order('measuredAt', { ascending: true });

    if (error) {
      console.error('查询健康数据失败:', error);
      return NextResponse.json(
        { error: '查询健康数据失败' },
        { status: 500 }
      );
    }

    // 计算趋势统计
    const trends: any = {
      weight: {
        data: [],
        average: null,
        min: null,
        max: null,
        change: null,
      },
      bodyFat: {
        data: [],
        average: null,
        min: null,
        max: null,
        change: null,
      },
      muscleMass: {
        data: [],
        average: null,
        min: null,
        max: null,
        change: null,
      },
      bloodPressure: {
        data: [],
        average: null,
        min: null,
        max: null,
        change: null,
      },
      heartRate: {
        data: [],
        average: null,
        min: null,
        max: null,
        change: null,
      },
    };

    if (!healthData || healthData.length === 0) {
      return NextResponse.json(
        {
          trends,
          period: {
            start,
            end,
          },
        },
        { status: 200 }
      );
    }

    // 处理体重数据
    const weightData = healthData
      .filter((d) => d.weight !== null)
      .map((d) => ({ date: d.measuredAt, value: d.weight! }));
    if (weightData.length > 0) {
      const values = weightData.map((d) => d.value);
      trends.weight = {
        data: weightData,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          weightData.length > 1
            ? weightData[weightData.length - 1].value - weightData[0].value
            : null,
      };
    }

    // 处理体脂率数据
    const bodyFatData = healthData
      .filter((d) => d.bodyFat !== null)
      .map((d) => ({ date: d.measuredAt, value: d.bodyFat! }));
    if (bodyFatData.length > 0) {
      const values = bodyFatData.map((d) => d.value);
      trends.bodyFat = {
        data: bodyFatData,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          bodyFatData.length > 1
            ? bodyFatData[bodyFatData.length - 1].value - bodyFatData[0].value
            : null,
      };
    }

    // 处理肌肉量数据
    const muscleMassData = healthData
      .filter((d) => d.muscleMass !== null)
      .map((d) => ({ date: d.measuredAt, value: d.muscleMass! }));
    if (muscleMassData.length > 0) {
      const values = muscleMassData.map((d) => d.value);
      trends.muscleMass = {
        data: muscleMassData,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          muscleMassData.length > 1
            ? muscleMassData[muscleMassData.length - 1].value -
              muscleMassData[0].value
            : null,
      };
    }

    // 处理血压数据
    const bloodPressureData = healthData
      .filter(
        (d) =>
          d.bloodPressureSystolic !== null &&
          d.bloodPressureDiastolic !== null
      )
      .map((d) => ({
        date: d.measuredAt,
        systolic: d.bloodPressureSystolic!,
        diastolic: d.bloodPressureDiastolic!,
      }));
    if (bloodPressureData.length > 0) {
      const systolicValues = bloodPressureData.map((d) => d.systolic);
      const diastolicValues = bloodPressureData.map((d) => d.diastolic);
      trends.bloodPressure = {
        data: bloodPressureData,
        average: {
          systolic:
            systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length,
          diastolic:
            diastolicValues.reduce((a, b) => a + b, 0) /
            diastolicValues.length,
        },
        min: {
          systolic: Math.min(...systolicValues),
          diastolic: Math.min(...diastolicValues),
        },
        max: {
          systolic: Math.max(...systolicValues),
          diastolic: Math.max(...diastolicValues),
        },
        change:
          bloodPressureData.length > 1
            ? {
              systolic:
                  bloodPressureData[bloodPressureData.length - 1].systolic -
                  bloodPressureData[0].systolic,
              diastolic:
                  bloodPressureData[bloodPressureData.length - 1].diastolic -
                  bloodPressureData[0].diastolic,
            }
            : null,
      };
    }

    // 处理心率数据
    const heartRateData = healthData
      .filter((d) => d.heartRate !== null)
      .map((d) => ({ date: d.measuredAt, value: d.heartRate! }));
    if (heartRateData.length > 0) {
      const values = heartRateData.map((d) => d.value);
      trends.heartRate = {
        data: heartRateData,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          heartRateData.length > 1
            ? heartRateData[heartRateData.length - 1].value -
              heartRateData[0].value
            : null,
      };
    }

    return NextResponse.json(
      {
        trends,
        period: {
          start,
          end,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取健康数据趋势失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
