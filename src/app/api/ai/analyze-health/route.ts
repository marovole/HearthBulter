import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/api-auth";
import { checkAIRateLimit } from "@/lib/middleware/api-rate-limit";
import { checkMultipleConsents } from "@/lib/middleware/api-consent";
import { healthAnalyzer } from "@/lib/services/ai/health-analyzer";
import { healthRepository } from "@/lib/repositories/health-repository-singleton";
import { SupabaseFamilyRepository } from "@/lib/repositories/implementations/supabase-family-repository";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { aiFallbackService } from "@/lib/services/ai/fallback-service";
import { medicalReportFilter } from "@/lib/middleware/ai-sensitive-filter";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const familyRepo = new SupabaseFamilyRepository(
  SupabaseClientManager.getInstance(),
);

/**
 * POST /api/ai/analyze-health
 * 执行健康分析
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    const { userId } = authResult.context;

    const rateLimitResult = await checkAIRateLimit(userId, "ai_analyze_health");
    if (!rateLimitResult.success) return rateLimitResult.response;

    const consentResult = await checkMultipleConsents(userId, [
      "ai_health_analysis",
      "medical_data_processing",
    ]);
    if (!consentResult.success) return consentResult.response;

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    // 使用 HealthRepository 获取成员健康上下文
    const memberContext =
      await healthRepository.getMemberHealthContext(memberId);

    if (!memberContext) {
      return NextResponse.json(
        { error: "Member not found or access denied" },
        { status: 404 },
      );
    }

    // 检查权限：是成员本人或家庭管理员
    const isOwnMember = memberContext.member.userId === userId;
    let isAdmin = false;

    if (!isOwnMember) {
      const role = await familyRepo.getUserFamilyRole(
        memberContext.member.familyId,
        userId,
      );
      isAdmin = role === "ADMIN";
    }

    if (!isOwnMember && !isAdmin) {
      return NextResponse.json(
        { error: "Member not found or access denied" },
        { status: 404 },
      );
    }

    // 组装完整的成员数据
    const member = {
      ...memberContext.member,
      birthDate: memberContext.member.birthDate.toISOString(),
      gender: memberContext.member.gender.toLowerCase(),
      healthGoals: memberContext.healthGoals,
      allergies: memberContext.allergies,
      dietaryPreference: memberContext.dietaryPreference,
      healthData: memberContext.healthData,
      medicalReports: memberContext.medicalReports,
    };

    // 结构化体检数据
    const medicalData = await healthAnalyzer.structureMedicalData(
      member.medicalReports.flatMap((report) => report.indicators) as any,
    );

    // 敏感信息过滤处理（使用医疗报告专用过滤器）
    const filteredMedicalData =
      medicalReportFilter.filterStructuredData(medicalData);

    // 构建用户健康档案
    const userProfile = {
      age: Math.floor(
        (Date.now() - new Date(member.birthDate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      ),
      gender: member.gender.toLowerCase() as "male" | "female",
      height: member.height || 170,
      weight: member.weight || 70,
      bmi: member.bmi || 24,
      health_goals: member.healthGoals.map((g) => g.goalType),
      dietary_preferences: member.dietaryPreference
        ? [
            member.dietaryPreference.dietType,
            ...(member.dietaryPreference.isVegetarian ? ["vegetarian"] : []),
            ...(member.dietaryPreference.isVegan ? ["vegan"] : []),
          ].filter((pref): pref is string => pref !== null)
        : [],
      allergies: member.allergies.map((a) => a.allergenName),
      activity_level: "moderate" as const, // 可以从健康数据推断
    };

    // 执行健康分析（带降级策略）
    const analysisResult = await aiFallbackService.analyzeHealthWithFallback(
      filteredMedicalData,
      userProfile,
    );

    if (!analysisResult.success) {
      return NextResponse.json(
        { error: analysisResult.message },
        { status: 500 },
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
        userProfile.health_goals,
      );

      dietaryAdjustments = healthAnalyzer.generateDietaryAdjustments(
        analysisResult.data,
      );
    } else {
      // 使用降级方案，生成基础建议
      nutritionTargets = {
        daily_calories: userProfile.gender === "male" ? 2000 : 1800,
        macros: {
          carbs_percent: 50,
          protein_percent: 20,
          fat_percent: 30,
        },
        micronutrients: ["需要专业医生详细分析"],
      };

      dietaryAdjustments = [
        "AI服务暂时不可用，请咨询专业营养师",
        "保持均衡饮食，适量运动",
        "定期监测健康指标",
      ];
    }

    // 使用 HealthRepository 保存建议到数据库
    const aiAdvice = await healthRepository.saveHealthAdvice({
      memberId,
      type: "HEALTH_ANALYSIS",
      content: {
        analysis: analysisResult.data,
        nutritionTargets,
        dietaryAdjustments,
        medicalData,
        userProfile,
        fallbackUsed: analysisResult.fallbackUsed,
        fallbackReason: analysisResult.reason,
      },
      prompt: "Comprehensive health analysis with personalized recommendations",
      tokens: 0,
    });

    if (!aiAdvice) {
      logger.error("保存AI建议失败", { memberId });
    }

    const result = {
      adviceId: aiAdvice?.id,
      analysis: analysisResult.data,
      nutritionTargets,
      dietaryAdjustments,
      prioritizedConcerns: !analysisResult.fallbackUsed
        ? healthAnalyzer.prioritizeHealthConcerns(analysisResult.data)
        : ["AI服务不可用，请咨询专业医生"],
      generatedAt: aiAdvice?.generatedAt || new Date(),
      fallbackUsed: analysisResult.fallbackUsed,
      message: analysisResult.message,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Health analysis API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ai/analyze-health
 * 获取历史分析记录
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    const { userId } = authResult.context;

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    // 使用 FamilyRepository 验证访问权限
    const memberData = await familyRepo.getFamilyMemberById(memberId);

    if (!memberData) {
      return NextResponse.json(
        { error: "Member not found or access denied" },
        { status: 404 },
      );
    }

    // 检查权限：是成员本人或家庭管理员
    const isOwnMember = memberData.userId === userId;
    let isAdmin = false;

    if (!isOwnMember) {
      const role = await familyRepo.getUserFamilyRole(
        memberData.familyId,
        userId,
      );
      isAdmin = role === "ADMIN";
    }

    if (!isOwnMember && !isAdmin) {
      return NextResponse.json(
        { error: "Member not found or access denied" },
        { status: 404 },
      );
    }

    // 使用 HealthRepository 获取历史分析记录
    const history = await healthRepository.getMemberHealthHistory(
      memberId,
      limit,
    );

    return NextResponse.json({ history });
  } catch (error) {
    logger.error("Health analysis history API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
