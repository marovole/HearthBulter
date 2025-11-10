import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { healthAnalyzer } from '@/lib/services/ai/health-analyzer';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { rateLimiter } from '@/lib/services/ai/rate-limiter';
import { aiFallbackService } from '@/lib/services/ai/fallback-service';
import { medicalReportFilter } from '@/lib/middleware/ai-sensitive-filter';
import { consentManager } from '@/lib/services/consent-manager';

/**
 * POST /api/ai/analyze-health
 * 执行健康分析
 *
 * Migrated from Prisma to Supabase (endpoint layer)
 * Note: Service layer (healthAnalyzer, rateLimiter, etc.) still uses Prisma
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 速率限制检查
    const rateLimitResult = await rateLimiter.checkLimit(
      session.user.id,
      'ai_analyze_health'
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
          },
        }
      );
    }

    // 同意检查
    const requiredConsents = ['ai_health_analysis', 'medical_data_processing'];
    const consentResults = await consentManager.checkMultipleConsents(
      session.user.id,
      requiredConsents
    );

    // 检查必需的同意
    const missingConsents = requiredConsents.filter(consentId => !consentResults[consentId]);
    if (missingConsents.length > 0) {
      // 获取缺失的同意类型详情
      const consentTypes = missingConsents.map(id => consentManager.getConsentType(id)).filter(Boolean);

      return NextResponse.json({
        error: 'Required consents not granted',
        requiredConsents: consentTypes.map(type => ({
          id: type?.id,
          name: type?.name,
          description: type?.description,
          content: type?.content,
        })),
        missingConsents,
      }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, includeRecommendations = true } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 验证用户对该成员的访问权限并获取成员数据
    const { data: memberData } = await supabase
      .from('family_members')
      .select('id, familyId, userId, birthDate, gender, height, weight, bmi')
      .eq('id', memberId)
      .single();

    if (!memberData) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 检查权限：是成员本人或家庭管理员
    const isOwnMember = memberData.userId === session.user.id;
    let isAdmin = false;

    if (!isOwnMember) {
      const { data: adminCheck } = await supabase
        .from('family_members')
        .select('id')
        .eq('familyId', memberData.familyId)
        .eq('userId', session.user.id)
        .eq('role', 'ADMIN')
        .is('deletedAt', null)
        .maybeSingle();

      isAdmin = !!adminCheck;
    }

    if (!isOwnMember && !isAdmin) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 获取健康目标
    const { data: healthGoals } = await supabase
      .from('health_goals')
      .select('id, goalType, targetValue, currentValue, deadline, status')
      .eq('memberId', memberId)
      .is('deletedAt', null);

    // 获取过敏信息
    const { data: allergies } = await supabase
      .from('allergies')
      .select('id, allergenName, severity, symptoms')
      .eq('memberId', memberId)
      .is('deletedAt', null);

    // 获取饮食偏好
    const { data: dietaryPreferenceData } = await supabase
      .from('dietary_preferences')
      .select('dietType, isVegetarian, isVegan, restrictions, preferences')
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .maybeSingle();

    // 获取健康数据（最近10条）
    const { data: healthData } = await supabase
      .from('health_data')
      .select('id, dataType, value, unit, measuredAt, source')
      .eq('memberId', memberId)
      .order('measuredAt', { ascending: false })
      .limit(10);

    // 获取体检报告（最近5条）及其指标
    const { data: medicalReports } = await supabase
      .from('medical_reports')
      .select('id, reportType, reportDate, uploadedAt')
      .eq('memberId', memberId)
      .order('createdAt', { ascending: false })
      .limit(5);

    // 获取所有体检指标
    let allIndicators: any[] = [];
    if (medicalReports && medicalReports.length > 0) {
      const reportIds = medicalReports.map(r => r.id);
      const { data: indicators } = await supabase
        .from('medical_report_indicators')
        .select('id, reportId, indicatorName, value, unit, referenceRange, status')
        .in('reportId', reportIds);

      allIndicators = indicators || [];
    }

    // 组装完整的成员数据
    const member = {
      ...memberData,
      healthGoals: healthGoals || [],
      allergies: allergies || [],
      dietaryPreference: dietaryPreferenceData,
      healthData: healthData || [],
      medicalReports: (medicalReports || []).map(report => ({
        ...report,
        indicators: allIndicators.filter(ind => ind.reportId === report.id),
      })),
    };

    // 结构化体检数据
    const medicalData = await healthAnalyzer.structureMedicalData(
      member.medicalReports.flatMap(report => report.indicators)
    );

    // 敏感信息过滤处理（使用医疗报告专用过滤器）
    const filteredMedicalData = medicalReportFilter.filterStructuredData(medicalData);

    // 构建用户健康档案
    const userProfile = {
      age: Math.floor((Date.now() - new Date(member.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
      gender: member.gender.toLowerCase() as 'male' | 'female',
      height: member.height || 170,
      weight: member.weight || 70,
      bmi: member.bmi || 24,
      health_goals: member.healthGoals.map(g => g.goalType),
      dietary_preferences: member.dietaryPreference ? [
        member.dietaryPreference.dietType,
        ...(member.dietaryPreference.isVegetarian ? ['vegetarian'] : []),
        ...(member.dietaryPreference.isVegan ? ['vegan'] : []),
      ] : [],
      allergies: member.allergies.map(a => a.allergenName),
      activity_level: 'moderate' as const, // 可以从健康数据推断
    };

    // 执行健康分析（带降级策略）
    const analysisResult = await aiFallbackService.analyzeHealthWithFallback(
      filteredMedicalData,
      userProfile
    );

    if (!analysisResult.success) {
      return NextResponse.json(
        { error: analysisResult.message },
        { status: 500 }
      );
    }

    // 生成个性化营养目标建议
    let nutritionTargets;
    let dietaryAdjustments;

    if (!analysisResult.fallbackUsed) {
      // AI分析成功，使用AI生成建议
      nutritionTargets = await healthAnalyzer.generateNutritionTargets(
        userProfile,
        analysisResult.data,
        userProfile.health_goals
      );

      dietaryAdjustments = healthAnalyzer.generateDietaryAdjustments(
        analysisResult.data
      );
    } else {
      // 使用降级方案，生成基础建议
      nutritionTargets = {
        daily_calories: userProfile.gender === 'male' ? 2000 : 1800,
        macros: {
          carbs_percent: 50,
          protein_percent: 20,
          fat_percent: 30,
        },
        micronutrients: ['需要专业医生详细分析'],
      };

      dietaryAdjustments = [
        'AI服务暂时不可用，请咨询专业营养师',
        '保持均衡饮食，适量运动',
        '定期监测健康指标',
      ];
    }

    // 保存建议到数据库
    const now = new Date().toISOString();
    const { data: aiAdvice, error: createError } = await supabase
      .from('ai_advice')
      .insert({
        memberId,
        type: 'HEALTH_ANALYSIS',
        content: {
          analysis: analysisResult.data,
          nutritionTargets,
          dietaryAdjustments,
          medicalData,
          userProfile,
          fallbackUsed: analysisResult.fallbackUsed,
          fallbackReason: analysisResult.reason,
        },
        prompt: 'Comprehensive health analysis with personalized recommendations',
        tokens: 0,
        generatedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      console.error('保存AI建议失败:', createError);
      // 继续返回结果，即使保存失败
    }

    const result = {
      adviceId: aiAdvice?.id,
      analysis: analysisResult.data,
      nutritionTargets,
      dietaryAdjustments,
      prioritizedConcerns: !analysisResult.fallbackUsed
        ? healthAnalyzer.prioritizeHealthConcerns(analysisResult.data)
        : ['AI服务不可用，请咨询专业医生'],
      generatedAt: aiAdvice?.generatedAt || now,
      fallbackUsed: analysisResult.fallbackUsed,
      message: analysisResult.message,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Health analysis API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/analyze-health
 * 获取历史分析记录
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 验证访问权限
    const { data: memberData } = await supabase
      .from('family_members')
      .select('id, familyId, userId')
      .eq('id', memberId)
      .single();

    if (!memberData) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 检查权限：是成员本人或家庭管理员
    const isOwnMember = memberData.userId === session.user.id;
    let isAdmin = false;

    if (!isOwnMember) {
      const { data: adminCheck } = await supabase
        .from('family_members')
        .select('id')
        .eq('familyId', memberData.familyId)
        .eq('userId', session.user.id)
        .eq('role', 'ADMIN')
        .is('deletedAt', null)
        .maybeSingle();

      isAdmin = !!adminCheck;
    }

    if (!isOwnMember && !isAdmin) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 获取历史分析记录
    const { data: history, error } = await supabase
      .from('ai_advice')
      .select('id, generatedAt, content, feedback')
      .eq('memberId', memberId)
      .eq('type', 'HEALTH_ANALYSIS')
      .order('generatedAt', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取历史记录失败:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ history: history || [] });

  } catch (error) {
    console.error('Health analysis history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
