/**
 * Price Estimator Service
 * 价格估算服务
 * 
 * 提供成本估算、预算检查和实际花费记录功能
 */

import { prisma } from '@/lib/db';
import type { FoodCategory } from '@prisma/client';

/**
 * 价格估算结果
 */
export interface PriceEstimate {
  foodId: string
  foodName: string
  amount: number // 重量（g）
  estimatedPrice: number // 估算价格（元）
  unitPrice: number // 单价（元/100g）
}

/**
 * 预算检查结果
 */
export interface BudgetCheckResult {
  totalEstimatedCost: number
  budget: number | null
  isOverBudget: boolean
  overBudgetAmount: number // 超预算金额（如果超预算）
  recommendation?: string // 建议（如果超预算）
}

/**
 * 默认价格映射（元/100g）
 * 基于常见食材的市场价格
 */
const DEFAULT_PRICES: Partial<Record<FoodCategory, number>> = {
  VEGETABLES: 3.0, // 蔬菜类平均3元/100g
  FRUITS: 8.0, // 水果类平均8元/100g
  GRAINS: 2.5, // 谷物类平均2.5元/100g
  PROTEIN: 15.0, // 肉类平均15元/100g
  SEAFOOD: 20.0, // 海鲜类平均20元/100g
  DAIRY: 6.0, // 乳制品平均6元/100g
  OILS: 12.0, // 油脂类平均12元/100g
  SNACKS: 5.0, // 零食类平均5元/100g
  BEVERAGES: 2.0, // 饮料类平均2元/100g
  OTHER: 5.0, // 其他类平均5元/100g
};

/**
 * 价格估算器类
 */
export class PriceEstimator {
  /**
   * 估算食材价格
   * @param foodId 食物ID
   * @param amount 重量（g）
   * @returns 价格估算结果
   */
  async estimatePrice(
    foodId: string,
    amount: number
  ): Promise<PriceEstimate> {
    // 查询食物信息
    const food = await prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      throw new Error(`食物不存在: ${foodId}`);
    }

    // 获取单价（优先使用历史价格，否则使用默认价格）
    const unitPrice = await this.getUnitPrice(food.category);

    // 计算总价（转换为元）
    const estimatedPrice = (unitPrice * amount) / 100;

    return {
      foodId,
      foodName: food.name,
      amount,
      estimatedPrice: Math.round(estimatedPrice * 100) / 100, // 保留两位小数
      unitPrice,
    };
  }

  /**
   * 批量估算价格
   * @param items 食材列表（foodId, amount）
   * @returns 价格估算结果列表
   */
  async estimatePrices(
    items: Array<{ foodId: string; amount: number }>
  ): Promise<PriceEstimate[]> {
    const estimates = await Promise.all(
      items.map((item) => this.estimatePrice(item.foodId, item.amount))
    );

    return estimates;
  }

  /**
   * 获取单价（元/100g）
   * 优先使用历史价格，否则使用默认价格
   * @param category 食物分类
   * @returns 单价
   */
  private async getUnitPrice(category: FoodCategory): Promise<number> {
    // TODO: 未来可以从历史采购记录中获取平均价格
    // 目前使用默认价格
    return DEFAULT_PRICES[category] || DEFAULT_PRICES.OTHER || 5.0;
  }

  /**
   * 检查预算
   * @param estimatedCost 估算总成本
   * @param budget 预算金额
   * @returns 预算检查结果
   */
  checkBudget(
    estimatedCost: number,
    budget: number | null
  ): BudgetCheckResult {
    if (budget === null) {
      return {
        totalEstimatedCost: estimatedCost,
        budget: null,
        isOverBudget: false,
        overBudgetAmount: 0,
      };
    }

    const isOverBudget = estimatedCost > budget;
    const overBudgetAmount = isOverBudget ? estimatedCost - budget : 0;

    let recommendation: string | undefined;
    if (isOverBudget) {
      recommendation = `超预算 ${overBudgetAmount.toFixed(2)} 元，建议：\n1. 选择更经济的替代食材\n2. 减少高价值食材的用量\n3. 调整预算金额`;
    }

    return {
      totalEstimatedCost: estimatedCost,
      budget,
      isOverBudget,
      overBudgetAmount: Math.round(overBudgetAmount * 100) / 100,
      recommendation,
    };
  }

  /**
   * 计算总估算成本
   * @param estimates 价格估算结果列表
   * @returns 总成本
   */
  calculateTotalCost(estimates: PriceEstimate[]): number {
    return estimates.reduce(
      (total, estimate) => total + estimate.estimatedPrice,
      0
    );
  }

  /**
   * 更新实际花费
   * @param shoppingListId 购物清单ID
   * @param actualCost 实际花费金额
   */
  async updateActualCost(
    shoppingListId: string,
    actualCost: number
  ): Promise<void> {
    await prisma.shoppingList.update({
      where: { id: shoppingListId },
      data: { actualCost },
    });
  }

  /**
   * 获取价格趋势建议
   * 比较估算成本和实际成本的差异
   * @param estimatedCost 估算成本
   * @param actualCost 实际成本
   * @returns 建议文本
   */
  getPriceTrendAdvice(
    estimatedCost: number,
    actualCost: number
  ): string {
    const diff = actualCost - estimatedCost;
    const diffPercent = (diff / estimatedCost) * 100;

    if (Math.abs(diffPercent) < 5) {
      return '价格估算准确，与实际采购成本接近';
    } else if (diffPercent > 0) {
      return `实际采购成本比估算高 ${diffPercent.toFixed(1)}%，建议关注市场价格波动`;
    } else {
      return `实际采购成本比估算低 ${Math.abs(diffPercent).toFixed(1)}%，市场可能处于促销期`;
    }
  }
}

// 导出单例实例
export const priceEstimator = new PriceEstimator();

