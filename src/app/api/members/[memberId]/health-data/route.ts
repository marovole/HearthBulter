import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import {
  validateAndDetectAnomaly,
  type HealthDataInput,
} from '@/lib/services/health-data-validator';
import { updateStreakDays } from '../health-reminders/route';
import {
  validateRequestBody,
  handleApiError,
  healthDataSchemas,
  commonSchemas,
  formatApiCreated,
} from '@/lib/validation';

/**
 * 验证用户是否有权限访问成员的健康数据
 *
 * Migrated from Prisma to Supabase
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: any }> {
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
    return { hasAccess: false, member: null };
  }

  // 检查是否是家庭创建者
  const isCreator = member.family?.creatorId === userId;

  // 检查是否是管理员
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

  // 检查是否是本人
  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
    member,
  };
}

/**
 * GET /api/members/:memberId/health-data
 * 查询成员的健康数据历史记录
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
    const { hasAccess, member } = await verifyMemberAccess(
      memberId,
      session.user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的健康数据' },
        { status: 403 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询
    let query = supabase
      .from('health_data')
      .select('*', { count: 'exact' })
      .eq('memberId', memberId)
      .order('measuredAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // 添加日期过滤
    if (startDate) {
      query = query.gte('measuredAt', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('measuredAt', new Date(endDate).toISOString());
    }

    const { data: healthData, error, count: total } = await query;

    if (error) {
      console.error('查询健康数据失败:', error);
      return NextResponse.json(
        { error: '查询健康数据失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: healthData || [],
        total: total || 0,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('查询健康数据失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/:memberId/health-data
 * 录入新的健康数据
 *
 * Migrated from Prisma to Supabase
 */
export async function POST(
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
    const { hasAccess, member } = await verifyMemberAccess(
      memberId,
      session.user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限为该成员录入健康数据' },
        { status: 403 }
      );
    }

    // 验证请求体
    const validation = await validateRequestBody(request, healthDataSchemas.create);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // 构建健康数据输入
    const healthDataInput: HealthDataInput = {
      weight: data.weight ?? null,
      bodyFat: data.bodyFat ?? null,
      muscleMass: data.muscleMass ?? null,
      bloodPressureSystolic: data.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: data.bloodPressureDiastolic ?? null,
      heartRate: data.heartRate ?? null,
      measuredAt: data.measuredAt ?? new Date(),
      source: 'MANUAL', // 目前只支持手动录入
      notes: data.notes ?? null,
    };

    // 验证数据（业务逻辑验证）
    const businessValidation = await validateAndDetectAnomaly(memberId, healthDataInput);

    if (!businessValidation.valid) {
      return NextResponse.json(
        {
          error: '数据验证失败',
          details: businessValidation.errors,
          warnings: businessValidation.warnings,
        },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 创建健康数据记录
    const { data: healthData, error: createError } = await supabase
      .from('health_data')
      .insert({
        memberId,
        weight: healthDataInput.weight,
        bodyFat: healthDataInput.bodyFat,
        muscleMass: healthDataInput.muscleMass,
        bloodPressureSystolic: healthDataInput.bloodPressureSystolic,
        bloodPressureDiastolic: healthDataInput.bloodPressureDiastolic,
        heartRate: healthDataInput.heartRate,
        measuredAt: (healthDataInput.measuredAt as Date).toISOString(),
        source: healthDataInput.source || 'MANUAL',
        notes: healthDataInput.notes,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      console.error('创建健康数据失败:', createError);
      return NextResponse.json(
        { error: '创建健康数据失败' },
        { status: 500 }
      );
    }

    // 更新连续打卡天数（异步，不阻塞响应）
    updateStreakDays(memberId).catch((error) => {
      console.error('更新连续打卡天数失败:', error);
    });

    // 构建响应数据
    const responseData: any = {
      data: healthData,
    };

    // 如果有警告（异常检测），在响应中包含警告信息
    if (businessValidation.warnings && businessValidation.warnings.length > 0) {
      responseData.warnings = businessValidation.warnings;
    }

    return formatApiCreated(responseData, '健康数据录入成功');
  } catch (error) {
    return handleApiError(error, '录入健康数据');
  }
}
