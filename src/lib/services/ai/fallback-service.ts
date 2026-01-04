/**
 * AI服务降级策略
 *
 * 当AI API不可用或失败时，提供备用方案
 */

import { healthAnalyzer } from "./health-analyzer";
import { conversationManager } from "./conversation-manager";
import { recipeOptimizer } from "./recipe-optimizer";
import { healthReportGenerator } from "./health-report-generator";

export enum FallbackReason {
  API_UNAVAILABLE = "API_UNAVAILABLE",
  RATE_LIMITED = "RATE_LIMITED",
  API_ERROR = "API_ERROR",
  TIMEOUT = "TIMEOUT",
  INVALID_RESPONSE = "INVALID_RESPONSE",
}

export interface FallbackResult {
  success: boolean;
  fallbackUsed: boolean;
  reason?: FallbackReason;
  data: any;
  message: string;
}

/**
 * AI服务降级管理器
 */
export class AIFallbackService {
  private static instance: AIFallbackService;
  private failureCount: Map<string, number> = new Map();
  private lastFailure: Map<string, number> = new Map();
  private circuitBreakerThreshold = 3; // 连续失败3次触发熔断
  private circuitBreakerTimeout = 5 * 60 * 1000; // 5分钟熔断时间

  static getInstance(): AIFallbackService {
    if (!AIFallbackService.instance) {
      AIFallbackService.instance = new AIFallbackService();
    }
    return AIFallbackService.instance;
  }

  /**
   * 检查服务是否被熔断
   */
  private isCircuitOpen(serviceName: string): boolean {
    const failures = this.failureCount.get(serviceName) || 0;
    const lastFailureTime = this.lastFailure.get(serviceName) || 0;

    if (failures >= this.circuitBreakerThreshold) {
      const timeSinceLastFailure = Date.now() - lastFailureTime;
      if (timeSinceLastFailure < this.circuitBreakerTimeout) {
        return true;
      } else {
        // 熔断时间已过，重置计数器
        this.failureCount.delete(serviceName);
        this.lastFailure.delete(serviceName);
      }
    }

    return false;
  }

  /**
   * 记录失败
   */
  private recordFailure(serviceName: string): void {
    const currentCount = this.failureCount.get(serviceName) || 0;
    this.failureCount.set(serviceName, currentCount + 1);
    this.lastFailure.set(serviceName, Date.now());
  }

  /**
   * 记录成功
   */
  private recordSuccess(serviceName: string): void {
    this.failureCount.delete(serviceName);
    this.lastFailure.delete(serviceName);
  }

  /**
   * 执行带降级策略的健康分析
   */
  async analyzeHealthWithFallback(
    medicalData: any,
    userProfile: any,
    mealHistory?: any[],
  ): Promise<FallbackResult> {
    const serviceName = "health-analysis";

    // 检查熔断器
    if (this.isCircuitOpen(serviceName)) {
      return this.analyzeHealthOffline(
        medicalData,
        userProfile,
        FallbackReason.API_UNAVAILABLE,
      );
    }

    try {
      // 尝试调用AI分析
      const result = await healthAnalyzer.analyzeHealth(
        medicalData,
        userProfile,
        mealHistory,
      );
      this.recordSuccess(serviceName);

      return {
        success: true,
        fallbackUsed: false,
        data: result,
        message: "AI健康分析完成",
      };
    } catch (error) {
      this.recordFailure(serviceName);
      console.error("AI健康分析失败，使用降级策略:", error);

      return this.analyzeHealthOffline(
        medicalData,
        userProfile,
        FallbackReason.API_ERROR,
      );
    }
  }

  /**
   * 离线健康分析（降级方案）
   */
  private async analyzeHealthOffline(
    medicalData: any,
    userProfile: any,
    reason: FallbackReason,
  ): Promise<FallbackResult> {
    // 基于规则的简单健康评估
    const analysis = {
      overall_score: this.calculateBasicHealthScore(medicalData, userProfile),
      risk_level: this.assessBasicRiskLevel(medicalData),
      key_findings: this.extractBasicFindings(medicalData),
      risk_assessment: {
        level: "需要专业医生评估",
        concerns: ["AI服务不可用，请咨询专业医生"],
        urgent_actions: ["建议尽快进行专业体检"],
      },
      nutritional_recommendations: this.getBasicNutritionAdvice(userProfile),
      lifestyle_modifications: [
        "保持规律作息",
        "适量运动",
        "均衡饮食",
        "定期体检",
      ],
      follow_up_suggestions: ["AI服务暂时不可用", "请咨询专业医生获得详细分析"],
    };

    return {
      success: true,
      fallbackUsed: true,
      reason,
      data: analysis,
      message:
        reason === FallbackReason.API_UNAVAILABLE
          ? "AI服务暂时不可用，提供基础健康评估"
          : "AI分析失败，提供基础健康评估",
    };
  }

  /**
   * 执行带降级策略的对话响应
   */
  async chatWithFallback(
    sessionId: string,
    message: string,
    intent: any,
  ): Promise<FallbackResult> {
    const serviceName = "chat-service";

    // 检查熔断器
    if (this.isCircuitOpen(serviceName)) {
      return this.generateOfflineResponse(
        message,
        intent,
        FallbackReason.API_UNAVAILABLE,
      );
    }

    try {
      // 尝试调用AI对话
      const response = await conversationManager.generateResponse(
        sessionId,
        message,
        intent,
      );
      this.recordSuccess(serviceName);

      return {
        success: true,
        fallbackUsed: false,
        data: { response },
        message: "AI对话响应完成",
      };
    } catch (error) {
      this.recordFailure(serviceName);
      console.error("AI对话失败，使用降级策略:", error);

      return this.generateOfflineResponse(
        message,
        intent,
        FallbackReason.API_ERROR,
      );
    }
  }

  /**
   * 生成离线对话响应
   */
  private async generateOfflineResponse(
    message: string,
    intent: any,
    reason: FallbackReason,
  ): Promise<FallbackResult> {
    // 基于意图的预设回复
    const fallbackResponses = {
      question:
        "很抱歉，AI助手暂时不可用。对于您的问题，建议您咨询专业医生或营养师获得准确答案。",
      advice_request:
        "很抱歉，AI助手暂时无法提供个性化建议。建议您咨询专业医生或营养师，他们可以根据您的具体情况提供最适合的建议。",
      clarification:
        "很抱歉，AI助手暂时不可用。如果您需要澄清健康相关问题，建议直接咨询您的医生。",
      general_chat:
        "很抱歉，AI助手暂时离线。如果您有健康问题，请咨询专业医生。紧急情况请立即就医。",
    };

    const response =
      fallbackResponses[intent.intent] || fallbackResponses.general_chat;

    return {
      success: true,
      fallbackUsed: true,
      reason,
      data: { response },
      message:
        reason === FallbackReason.API_UNAVAILABLE
          ? "AI服务暂时不可用，提供预设回复"
          : "AI对话失败，提供预设回复",
    };
  }

  /**
   * 执行带降级策略的食谱优化
   */
  async optimizeRecipeWithFallback(
    recipeId: string,
    memberId: string,
    preferences: any,
  ): Promise<FallbackResult> {
    const serviceName = "recipe-optimization";

    // 检查熔断器
    if (this.isCircuitOpen(serviceName)) {
      return this.optimizeRecipeOffline(
        recipeId,
        preferences,
        FallbackReason.API_UNAVAILABLE,
      );
    }

    try {
      // 尝试调用AI优化
      const result = await recipeOptimizer.optimizeRecipeForHealth(
        recipeId,
        memberId,
        preferences,
      );
      this.recordSuccess(serviceName);

      return {
        success: true,
        fallbackUsed: false,
        data: result,
        message: "AI食谱优化完成",
      };
    } catch (error) {
      this.recordFailure(serviceName);
      console.error("AI食谱优化失败，使用降级策略:", error);

      return this.optimizeRecipeOffline(
        recipeId,
        preferences,
        FallbackReason.API_ERROR,
      );
    }
  }

  /**
   * 离线食谱优化（基于规则的简单优化）
   */
  private async optimizeRecipeOffline(
    recipeId: string,
    preferences: any,
    reason: FallbackReason,
  ): Promise<FallbackResult> {
    // 这里应该从数据库获取原始食谱，然后进行简单的基于规则的优化
    // 为了简化，返回一个基本的优化建议

    const optimizations = [
      {
        type: "nutrition",
        suggestion: "减少盐分使用，增加蔬菜比例",
        impact: "降低钠摄入，增加纤维和维生素",
        difficulty: "easy",
      },
      {
        type: "cooking_method",
        suggestion: "优先选择蒸、煮、烤等健康烹饪方式",
        impact: "减少油脂摄入，保留更多营养",
        difficulty: "medium",
      },
    ];

    return {
      success: true,
      fallbackUsed: true,
      reason,
      data: {
        originalRecipe: { id: recipeId },
        optimizations,
        overallScore: 75,
        estimatedNutritionChange: {
          calories: -10,
          fat: -15,
          sodium: -20,
        },
      },
      message: "AI服务不可用，提供基础食谱优化建议",
    };
  }

  /**
   * 基础健康评分计算
   */
  private calculateBasicHealthScore(
    medicalData: any,
    userProfile: any,
  ): number {
    let score = 70; // 基础分数

    // 简单的健康指标评估
    if (medicalData.blood_tests?.fasting_glucose < 100) score += 10;
    if (medicalData.blood_tests?.total_cholesterol < 200) score += 10;
    if (userProfile.bmi >= 18.5 && userProfile.bmi <= 24.9) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 基础风险评估
   */
  private assessBasicRiskLevel(medicalData: any): "low" | "medium" | "high" {
    const riskFactors = 0;

    if (medicalData.blood_tests?.fasting_glucose > 126) return "high";
    if (medicalData.blood_tests?.total_cholesterol > 240) return "medium";

    return "low";
  }

  /**
   * 提取基本发现
   */
  private extractBasicFindings(medicalData: any): string[] {
    const findings = ["AI服务不可用，基于基础数据分析"];

    if (medicalData.blood_tests) {
      if (medicalData.blood_tests.fasting_glucose) {
        findings.push(
          `空腹血糖: ${medicalData.blood_tests.fasting_glucose} mg/dL`,
        );
      }
      if (medicalData.blood_tests.total_cholesterol) {
        findings.push(
          `总胆固醇: ${medicalData.blood_tests.total_cholesterol} mg/dL`,
        );
      }
    }

    return findings;
  }

  /**
   * 基础营养建议
   */
  private getBasicNutritionAdvice(userProfile: any): any {
    return {
      macro_distribution: {
        carbs_percent: 50,
        protein_percent: 20,
        fat_percent: 30,
      },
      daily_calories: userProfile.gender === "male" ? 2000 : 1800,
      micronutrients: ["需要专业医生详细分析"],
    };
  }

  /**
   * 获取降级统计信息
   */
  getFallbackStats(): {
    totalFailures: number;
    servicesWithFailures: string[];
    circuitBreakerStatus: Record<string, boolean>;
  } {
    let totalFailures = 0;
    const servicesWithFailures: string[] = [];
    const circuitBreakerStatus: Record<string, boolean> = {};

    for (const [service, count] of this.failureCount.entries()) {
      totalFailures += count;
      if (count > 0) {
        servicesWithFailures.push(service);
      }
      circuitBreakerStatus[service] = this.isCircuitOpen(service);
    }

    return {
      totalFailures,
      servicesWithFailures,
      circuitBreakerStatus,
    };
  }

  /**
   * 重置失败计数
   */
  resetFailures(serviceName?: string): void {
    if (serviceName) {
      this.failureCount.delete(serviceName);
      this.lastFailure.delete(serviceName);
    } else {
      this.failureCount.clear();
      this.lastFailure.clear();
    }
  }
}

// 导出单例实例
export const aiFallbackService = AIFallbackService.getInstance();
