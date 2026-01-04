/**
 * Token使用监控和成本控制服务
 */

interface TokenUsage {
  userId: string;
  sessionId?: string;
  endpoint: string;
  model: string;
  tokens: number;
  cost: number; // 估算成本（美元）
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface CostLimits {
  dailyLimit: number; // 每日成本限制（美元）
  monthlyLimit: number; // 每月成本限制（美元）
  warningThreshold: number; // 警告阈值（百分比）
}

interface TokenStats {
  totalTokens: number;
  totalCost: number;
  dailyTokens: number;
  dailyCost: number;
  monthlyTokens: number;
  monthlyCost: number;
  averageCostPerToken: number;
  mostUsedModel: string;
  lastUpdated: Date;
}

// 默认成本限制
const DEFAULT_COST_LIMITS: CostLimits = {
  dailyLimit: 5.0, // 每日最多5美元
  monthlyLimit: 100.0, // 每月最多100美元
  warningThreshold: 0.8, // 80%时发出警告
};

// 模型Token价格（每1000个token的价格，美元）
const MODEL_PRICING = {
  // OpenRouter模型定价（示例，实际价格可能变化）
  'openai/gpt-oss-20b:free': { input: 0, output: 0 }, // 免费
  'z-ai/glm-4-9b-chat:free': { input: 0, output: 0 }, // 免费
  'deepseek/deepseek-v3.2-exp': { input: 0.0007, output: 0.0007 },
  'x-ai/grok-4-fast': { input: 0.001, output: 0.001 },
  'openai/gpt-oss-120b:exacto': { input: 0.0015, output: 0.0015 },

  // 默认定价
  default: { input: 0.0005, output: 0.0005 },
};

export class TokenMonitor {
  private static instance: TokenMonitor;
  private usageRecords: TokenUsage[] = [];
  private costLimits: CostLimits = DEFAULT_COST_LIMITS;

  static getInstance(): TokenMonitor {
    if (!TokenMonitor.instance) {
      TokenMonitor.instance = new TokenMonitor();
    }
    return TokenMonitor.instance;
  }

  /**
   * 记录Token使用情况
   */
  async recordUsage(usage: Omit<TokenUsage, 'timestamp'>): Promise<void> {
    const fullUsage: TokenUsage = {
      ...usage,
      timestamp: new Date(),
    };

    // 计算成本
    fullUsage.cost = this.calculateCost(usage.model, usage.tokens);

    // 存储记录
    this.usageRecords.push(fullUsage);

    // 限制记录数量（保留最近1000条）
    if (this.usageRecords.length > 1000) {
      this.usageRecords = this.usageRecords.slice(-1000);
    }

    // 检查成本限制
    await this.checkCostLimits(fullUsage.userId);

    console.log(
      `Token使用记录: ${usage.model} - ${usage.tokens} tokens - $${fullUsage.cost.toFixed(4)}`,
    );
  }

  /**
   * 获取用户Token使用统计
   */
  async getUserStats(userId: string): Promise<TokenStats> {
    const userRecords = this.usageRecords.filter(
      (record) => record.userId === userId,
    );
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 计算各种统计
    const totalTokens = userRecords.reduce(
      (sum, record) => sum + record.tokens,
      0,
    );
    const totalCost = userRecords.reduce((sum, record) => sum + record.cost, 0);

    const dailyRecords = userRecords.filter(
      (record) => record.timestamp >= today,
    );
    const dailyTokens = dailyRecords.reduce(
      (sum, record) => sum + record.tokens,
      0,
    );
    const dailyCost = dailyRecords.reduce(
      (sum, record) => sum + record.cost,
      0,
    );

    const monthlyRecords = userRecords.filter(
      (record) => record.timestamp >= thisMonth,
    );
    const monthlyTokens = monthlyRecords.reduce(
      (sum, record) => sum + record.tokens,
      0,
    );
    const monthlyCost = monthlyRecords.reduce(
      (sum, record) => sum + record.cost,
      0,
    );

    // 计算平均成本
    const averageCostPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;

    // 找出最常用的模型
    const modelUsage = userRecords.reduce(
      (acc, record) => {
        acc[record.model] = (acc[record.model] || 0) + record.tokens;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostUsedModel =
      Object.entries(modelUsage).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'none';

    return {
      totalTokens,
      totalCost,
      dailyTokens,
      dailyCost,
      monthlyTokens,
      monthlyCost,
      averageCostPerToken,
      mostUsedModel,
      lastUpdated: now,
    };
  }

  /**
   * 检查成本限制
   */
  private async checkCostLimits(userId: string): Promise<void> {
    const stats = await this.getUserStats(userId);

    // 检查每日限制
    if (
      stats.dailyCost >=
      this.costLimits.dailyLimit * this.costLimits.warningThreshold
    ) {
      if (stats.dailyCost >= this.costLimits.dailyLimit) {
        console.warn(
          `用户 ${userId} 已达到每日成本限制: $${stats.dailyCost.toFixed(2)}`,
        );
        // 这里可以发送通知或限制服务
      } else {
        console.warn(
          `用户 ${userId} 接近每日成本限制: $${stats.dailyCost.toFixed(2)} / $${this.costLimits.dailyLimit}`,
        );
      }
    }

    // 检查每月限制
    if (
      stats.monthlyCost >=
      this.costLimits.monthlyLimit * this.costLimits.warningThreshold
    ) {
      if (stats.monthlyCost >= this.costLimits.monthlyLimit) {
        console.error(
          `用户 ${userId} 已达到每月成本限制: $${stats.monthlyCost.toFixed(2)}`,
        );
      } else {
        console.warn(
          `用户 ${userId} 接近每月成本限制: $${stats.monthlyCost.toFixed(2)} / $${this.costLimits.monthlyLimit}`,
        );
      }
    }
  }

  /**
   * 计算Token成本
   */
  private calculateCost(model: string, tokens: number): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;

    // 简单估算：假设输入和输出token各占一半
    const inputTokens = Math.ceil(tokens / 2);
    const outputTokens = tokens - inputTokens;

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * 更新成本限制
   */
  async updateCostLimits(limits: Partial<CostLimits>): Promise<void> {
    this.costLimits = { ...this.costLimits, ...limits };
  }

  /**
   * 获取成本限制
   */
  getCostLimits(): CostLimits {
    return { ...this.costLimits };
  }

  /**
   * 获取全局统计信息
   */
  async getGlobalStats(): Promise<{
    totalUsers: number;
    totalTokens: number;
    totalCost: number;
    averageCostPerUser: number;
    topModels: Array<{ model: string; usage: number; cost: number }>;
  }> {
    const userIds = [
      ...new Set(this.usageRecords.map((record) => record.userId)),
    ];

    const totalTokens = this.usageRecords.reduce(
      (sum, record) => sum + record.tokens,
      0,
    );
    const totalCost = this.usageRecords.reduce(
      (sum, record) => sum + record.cost,
      0,
    );

    // 统计模型使用情况
    const modelStats = this.usageRecords.reduce(
      (acc, record) => {
        if (!acc[record.model]) {
          acc[record.model] = { tokens: 0, cost: 0 };
        }
        acc[record.model].tokens += record.tokens;
        acc[record.model].cost += record.cost;
        return acc;
      },
      {} as Record<string, { tokens: number; cost: number }>,
    );

    const topModels = Object.entries(modelStats)
      .map(([model, stats]) => ({
        model,
        usage: stats.tokens,
        cost: stats.cost,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    return {
      totalUsers: userIds.length,
      totalTokens,
      totalCost,
      averageCostPerUser: userIds.length > 0 ? totalCost / userIds.length : 0,
      topModels,
    };
  }

  /**
   * 清理过期记录
   */
  async cleanup(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialLength = this.usageRecords.length;
    this.usageRecords = this.usageRecords.filter(
      (record) => record.timestamp >= cutoffDate,
    );

    return initialLength - this.usageRecords.length;
  }

  /**
   * 导出使用记录（用于分析）
   */
  async exportRecords(
    userId?: string,
    days: number = 7,
  ): Promise<TokenUsage[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let records = this.usageRecords.filter(
      (record) => record.timestamp >= cutoffDate,
    );

    if (userId) {
      records = records.filter((record) => record.userId === userId);
    }

    return records.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }
}

// 导出单例实例
export const tokenMonitor = TokenMonitor.getInstance();

// 集成到AI客户端中
import { callOpenAI } from './openai-client';

// 包装原始的callOpenAI函数，添加监控
export async function callOpenAIMonitored(
  prompt: string,
  model: string,
  maxTokens: number = 1000,
  temperature: number = 0.7,
  useOpenRouter: boolean = true,
  userId?: string,
  sessionId?: string,
) {
  const startTime = Date.now();
  let success = false;
  let tokens = 0;
  let error: string | undefined;

  try {
    const response = await callOpenAI(
      prompt,
      model,
      maxTokens,
      temperature,
      useOpenRouter,
    );
    tokens = response.tokens;
    success = true;

    return response;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    throw err;
  } finally {
    // 记录使用情况
    if (userId) {
      await tokenMonitor.recordUsage({
        userId,
        sessionId,
        endpoint: 'ai_call',
        model,
        tokens,
        success,
        error,
      });
    }
  }
}
