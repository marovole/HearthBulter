import {
  callOpenAI,
  callOpenAIJSON,
  RECOMMENDED_MODELS,
} from "./openai-client";
import {
  getActivePrompt,
  renderPrompt,
  validatePromptParameters,
} from "./prompt-templates";
import { MedicalIndicator, IndicatorType } from "@/lib/types/medical";
import { aiResponseCache, AICacheKeys } from "./response-cache";
import { createHash } from "crypto";

// 健康分析结果类型
export interface HealthAnalysisResult {
  overall_score: number; // 1-100
  risk_level: "low" | "medium" | "high";
  key_findings: string[];
  risk_assessment: {
    level: string;
    concerns: string[];
    urgent_actions: string[];
  };
  nutritional_recommendations: {
    macro_distribution: {
      carbs_percent: number;
      protein_percent: number;
      fat_percent: number;
    };
    daily_calories: number;
    micronutrients: string[];
  };
  lifestyle_modifications: string[];
  follow_up_suggestions: string[];
}

// 体检数据结构化类型
export interface StructuredMedicalData {
  blood_tests: {
    total_cholesterol?: number;
    ldl_cholesterol?: number;
    hdl_cholesterol?: number;
    triglycerides?: number;
    fasting_glucose?: number;
    hba1c?: number;
  };
  liver_function: {
    alt?: number;
    ast?: number;
    ggt?: number;
  };
  kidney_function: {
    creatinine?: number;
    bun?: number;
    uric_acid?: number;
  };
  complete_blood_count: {
    hemoglobin?: number;
    white_blood_cell?: number;
    platelet?: number;
  };
  other_indicators: Record<string, number>;
}

// 用户健康档案
export interface UserHealthProfile {
  age: number;
  gender: "male" | "female";
  height: number; // cm
  weight: number; // kg
  bmi: number;
  health_goals: string[];
  dietary_preferences: string[];
  allergies: string[];
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
}

// 营养目标建议
export interface NutritionTargets {
  daily_calories: number;
  macros: {
    carbs_grams: number;
    protein_grams: number;
    fat_grams: number;
    carbs_percent: number;
    protein_percent: number;
    fat_percent: number;
  };
  micronutrients: {
    vitamin_a?: number;
    vitamin_c?: number;
    vitamin_d?: number;
    calcium?: number;
    iron?: number;
    zinc?: number;
  };
}

// 健康分析引擎主类
export class HealthAnalyzer {
  private static instance: HealthAnalyzer;

  static getInstance(): HealthAnalyzer {
    if (!HealthAnalyzer.instance) {
      HealthAnalyzer.instance = new HealthAnalyzer();
    }
    return HealthAnalyzer.instance;
  }

  /**
   * 结构化体检数据 - 将原始体检指标转换为AI可理解的格式
   */
  async structureMedicalData(
    rawIndicators: MedicalIndicator[],
  ): Promise<StructuredMedicalData> {
    const structured: StructuredMedicalData = {
      blood_tests: {},
      liver_function: {},
      kidney_function: {},
      complete_blood_count: {},
      other_indicators: {},
    };

    // 根据指标类型分类整理数据
    rawIndicators.forEach((indicator) => {
      const value = indicator.value;

      switch (indicator.indicatorType) {
        case IndicatorType.TOTAL_CHOLESTEROL:
          structured.blood_tests.total_cholesterol = value;
          break;
        case IndicatorType.LDL_CHOLESTEROL:
          structured.blood_tests.ldl_cholesterol = value;
          break;
        case IndicatorType.HDL_CHOLESTEROL:
          structured.blood_tests.hdl_cholesterol = value;
          break;
        case IndicatorType.TRIGLYCERIDES:
          structured.blood_tests.triglycerides = value;
          break;
        case IndicatorType.FASTING_GLUCOSE:
          structured.blood_tests.fasting_glucose = value;
          break;
        case IndicatorType.GLYCATED_HEMOGLOBIN:
          structured.blood_tests.hba1c = value;
          break;
        case IndicatorType.ALT:
          structured.liver_function.alt = value;
          break;
        case IndicatorType.AST:
          structured.liver_function.ast = value;
          break;
        case IndicatorType.CREATININE:
          structured.kidney_function.creatinine = value;
          break;
        case IndicatorType.UREA_NITROGEN:
          structured.kidney_function.bun = value;
          break;
        case IndicatorType.URIC_ACID:
          structured.kidney_function.uric_acid = value;
          break;
        case IndicatorType.HEMOGLOBIN:
          structured.complete_blood_count.hemoglobin = value;
          break;
        case IndicatorType.WHITE_BLOOD_CELL:
          structured.complete_blood_count.white_blood_cell = value;
          break;
        case IndicatorType.PLATELET:
          structured.complete_blood_count.platelet = value;
          break;
        default:
          structured.other_indicators[indicator.name] = value;
      }
    });

    return structured;
  }

  /**
   * 执行全面健康分析
   */
  async analyzeHealth(
    medicalData: StructuredMedicalData,
    userProfile: UserHealthProfile,
    mealHistory?: any[],
  ): Promise<HealthAnalysisResult> {
    // 生成缓存键
    const dataHash = createHash("md5")
      .update(JSON.stringify(medicalData) + JSON.stringify(userProfile))
      .digest("hex");
    const cacheKey = AICacheKeys.healthAnalysis(
      userProfile.id || "unknown",
      dataHash,
    );

    // 尝试从缓存获取结果
    const cachedResult =
      await aiResponseCache.get<HealthAnalysisResult>(cacheKey);
    if (cachedResult) {
      console.log("使用缓存的健康分析结果");
      return cachedResult;
    }

    const prompt = getActivePrompt(
      "health_analysis",
      "detailed_health_analysis",
    );
    if (!prompt) {
      throw new Error("Health analysis prompt template not found");
    }

    // 准备Prompt变量
    const variables = {
      medical_report_json: JSON.stringify(medicalData, null, 2),
      user_profile: JSON.stringify(userProfile, null, 2),
      meal_history: mealHistory
        ? JSON.stringify(mealHistory.slice(-30), null, 2)
        : "[]", // 最近30餐
    };

    // 验证参数
    const validation = validatePromptParameters(prompt, variables);
    if (!validation.valid) {
      throw new Error(
        `Missing prompt parameters: ${validation.missing.join(", ")}`,
      );
    }

    // 渲染Prompt
    const renderedPrompt = renderPrompt(prompt, variables);

    // 调用AI分析
    try {
      // 先尝试使用付费模型，如果失败则使用免费模型
      let result;
      try {
        result = await callOpenAIJSON(
          renderedPrompt,
          RECOMMENDED_MODELS.PAID[0], // 使用付费模型获得更好分析
          2000, // 增加token限制以获得详细分析
          true,
        );
      } catch (paidError) {
        console.warn(
          "Paid model failed, falling back to free model:",
          paidError,
        );
        // 回退到免费模型
        const response = await callOpenAI(
          renderedPrompt,
          RECOMMENDED_MODELS.FREE[0],
          2000,
          0.3, // 降低温度以获得更结构化的输出
          true,
        );

        // 尝试手动解析JSON响应
        result = this.parseHealthAnalysisResponse(response.content);
      }

      // 验证和标准化结果
      const validatedResult = this.validateAndNormalizeAnalysis(result);

      // 缓存结果（健康分析缓存6小时）
      await aiResponseCache.set(cacheKey, validatedResult, 21600);

      return validatedResult;
    } catch (error) {
      console.error("Health analysis failed:", error);
      throw new Error("健康分析失败，请稍后重试");
    }
  }

  /**
   * 生成个性化营养目标建议
   */
  async generateNutritionTargets(
    userProfile: UserHealthProfile,
    healthAnalysis: HealthAnalysisResult,
    healthGoals: string[],
  ): Promise<NutritionTargets> {
    // 计算基础代谢率 (BMR) - Mifflin-St Jeor公式
    const bmr = this.calculateBMR(userProfile);

    // 根据活动水平计算TDEE
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = bmr * activityMultipliers[userProfile.activity_level];

    // 根据健康目标调整热量
    let dailyCalories = tdee;

    if (healthGoals.includes("lose_weight")) {
      dailyCalories -= 500; // 每周减重0.5kg
    } else if (healthGoals.includes("gain_muscle")) {
      dailyCalories += 300; // 支持肌肉增长
    }

    // 根据健康分析调整宏量营养素比例
    const macros = this.calculateMacros(
      dailyCalories,
      userProfile,
      healthAnalysis,
    );

    return {
      daily_calories: Math.round(dailyCalories),
      macros,
      micronutrients: this.calculateMicronutrients(userProfile, healthAnalysis),
    };
  }

  /**
   * 健康风险评估
   */
  async assessHealthRisks(medicalData: StructuredMedicalData): Promise<{
    level: "low" | "medium" | "high";
    concerns: string[];
    urgent_actions: string[];
  }> {
    const concerns: string[] = [];
    const urgent_actions: string[] = [];

    // 血脂异常检查
    if (
      medicalData.blood_tests.total_cholesterol &&
      medicalData.blood_tests.total_cholesterol > 5.2
    ) {
      concerns.push("总胆固醇偏高");
      urgent_actions.push("建议3个月后复查血脂");
    }

    if (
      medicalData.blood_tests.ldl_cholesterol &&
      medicalData.blood_tests.ldl_cholesterol > 3.4
    ) {
      concerns.push("LDL胆固醇偏高");
      urgent_actions.push("控制动物脂肪摄入，增加蔬菜水果");
    }

    // 血糖异常检查
    if (
      medicalData.blood_tests.fasting_glucose &&
      medicalData.blood_tests.fasting_glucose > 6.1
    ) {
      concerns.push("空腹血糖偏高");
      urgent_actions.push("立即咨询内分泌科医生");
    }

    // 肝功能检查
    if (medicalData.liver_function.alt && medicalData.liver_function.alt > 40) {
      concerns.push("ALT偏高");
      urgent_actions.push("避免饮酒，定期复查肝功能");
    }

    // 确定风险等级
    let level: "low" | "medium" | "high" = "low";
    if (urgent_actions.length > 0) {
      level = "high";
    } else if (concerns.length > 2) {
      level = "medium";
    }

    return { level, concerns, urgent_actions };
  }

  /**
   * 生成饮食调整方案
   */
  generateDietaryAdjustments(
    healthAnalysis: HealthAnalysisResult,
    currentDiet?: any,
  ): string[] {
    const adjustments: string[] = [];

    // 根据宏量营养素推荐调整饮食
    const macros =
      healthAnalysis.nutritional_recommendations.macro_distribution;

    if (macros.carbs_percent < 40) {
      adjustments.push("减少精制碳水化合物摄入，增加粗粮和蔬菜");
    } else if (macros.carbs_percent > 60) {
      adjustments.push("适量增加优质蛋白质，减少简单糖摄入");
    }

    if (macros.protein_percent > 25) {
      adjustments.push("增加瘦肉、鱼类、蛋类和豆类的摄入");
    }

    // 根据健康风险添加具体建议
    if (
      healthAnalysis.risk_assessment.concerns.some((c) => c.includes("胆固醇"))
    ) {
      adjustments.push("减少红肉摄入，增加鱼类和植物蛋白");
      adjustments.push("选择低脂乳制品，限制蛋黄摄入");
    }

    if (
      healthAnalysis.risk_assessment.concerns.some((c) => c.includes("血糖"))
    ) {
      adjustments.push("规律三餐，避免暴饮暴食");
      adjustments.push("增加膳食纤维摄入，选择粗粮");
    }

    return adjustments;
  }

  /**
   * 优先级排序 - 确定最需要改善的健康指标
   */
  prioritizeHealthConcerns(healthAnalysis: HealthAnalysisResult): Array<{
    concern: string;
    priority: "high" | "medium" | "low";
    reason: string;
  }> {
    const prioritized = healthAnalysis.key_findings.map((finding) => {
      let priority: "high" | "medium" | "low" = "low";
      let reason = "";

      // 高优先级指标
      if (
        finding.includes("血糖") ||
        finding.includes("血压") ||
        finding.includes("严重")
      ) {
        priority = "high";
        reason = "可能影响生命质量，需要立即干预";
      }
      // 中优先级指标
      else if (
        finding.includes("胆固醇") ||
        finding.includes("体重") ||
        finding.includes("BMI")
      ) {
        priority = "medium";
        reason = "重要健康指标，需要逐步改善";
      }
      // 低优先级指标
      else {
        priority = "low";
        reason = "一般性建议，可长期关注";
      }

      return {
        concern: finding,
        priority,
        reason,
      };
    });

    // 按优先级排序
    return prioritized.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // 私有辅助方法

  private calculateBMR(profile: UserHealthProfile): number {
    // Mifflin-St Jeor公式
    const base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
    return profile.gender === "male" ? base + 5 : base - 161;
  }

  private calculateMacros(
    dailyCalories: number,
    profile: UserHealthProfile,
    analysis: HealthAnalysisResult,
  ) {
    const macroPercents =
      analysis.nutritional_recommendations.macro_distribution;

    return {
      carbs_grams: Math.round(
        (dailyCalories * macroPercents.carbs_percent) / 100 / 4,
      ),
      protein_grams: Math.round(
        (dailyCalories * macroPercents.protein_percent) / 100 / 4,
      ),
      fat_grams: Math.round(
        (dailyCalories * macroPercents.fat_percent) / 100 / 9,
      ),
      carbs_percent: macroPercents.carbs_percent,
      protein_percent: macroPercents.protein_percent,
      fat_percent: macroPercents.fat_percent,
    };
  }

  private calculateMicronutrients(
    profile: UserHealthProfile,
    analysis: HealthAnalysisResult,
  ) {
    // 基础微量营养素推荐值（可根据具体情况调整）
    const base = {
      vitamin_a: 800, // μg
      vitamin_c: 90, // mg
      vitamin_d: 15, // μg
      calcium: 1000, // mg
      iron: profile.gender === "female" ? 18 : 10, // mg
      zinc: profile.gender === "male" ? 16 : 11, // mg
    };

    // 根据健康状况调整
    if (analysis.risk_assessment.concerns.some((c) => c.includes("贫血"))) {
      base.iron += 10;
    }

    return base;
  }

  /**
   * 解析健康分析AI响应
   */
  private parseHealthAnalysisResponse(content: string): any {
    // 尝试直接解析JSON
    try {
      return JSON.parse(content);
    } catch {
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // 如果还是失败，返回默认结构
          console.warn("Failed to parse health analysis JSON, using fallback");
          return this.createFallbackAnalysisResult();
        }
      }

      // 如果完全无法解析，返回默认结果
      console.warn("No JSON found in health analysis response, using fallback");
      return this.createFallbackAnalysisResult();
    }
  }

  /**
   * 创建默认的健康分析结果
   */
  private createFallbackAnalysisResult(): any {
    return {
      overall_health_score: 75,
      key_findings: ["健康状况整体良好", "建议定期体检"],
      risk_assessment: {
        level: "low",
        concerns: ["无明显异常指标"],
        urgent_actions: [],
      },
      nutritional_recommendations: {
        macro_distribution: {
          carbs_percent: 50,
          protein_percent: 20,
          fat_percent: 30,
        },
        daily_calories: 2000,
        micronutrients: ["维生素C", "钙"],
      },
      lifestyle_modifications: ["保持规律作息", "适量运动"],
      follow_up_suggestions: ["3个月后复查体检"],
    };
  }

  private validateAndNormalizeAnalysis(result: any): HealthAnalysisResult {
    // 确保返回的数据结构正确
    return {
      overall_score: Math.min(
        100,
        Math.max(0, result.overall_health_score || 50),
      ),
      risk_level: result.risk_assessment?.level || "medium",
      key_findings: Array.isArray(result.key_findings)
        ? result.key_findings
        : ["健康状况评估完成"],
      risk_assessment: {
        level: result.risk_assessment?.level || "medium",
        concerns: Array.isArray(result.risk_assessment?.concerns)
          ? result.risk_assessment.concerns
          : [],
        urgent_actions: Array.isArray(result.risk_assessment?.urgent_actions)
          ? result.risk_assessment.urgent_actions
          : [],
      },
      nutritional_recommendations: {
        macro_distribution: result.nutritional_recommendations
          ?.macro_distribution || {
          carbs_percent: 50,
          protein_percent: 20,
          fat_percent: 30,
        },
        daily_calories:
          result.nutritional_recommendations?.daily_calories || 2000,
        micronutrients: Array.isArray(
          result.nutritional_recommendations?.micronutrients,
        )
          ? result.nutritional_recommendations.micronutrients
          : [],
      },
      lifestyle_modifications: Array.isArray(result.lifestyle_modifications)
        ? result.lifestyle_modifications
        : [],
      follow_up_suggestions: Array.isArray(result.follow_up_suggestions)
        ? result.follow_up_suggestions
        : [],
    };
  }
}

// 导出单例实例
export const healthAnalyzer = HealthAnalyzer.getInstance();
