/**
 * Price Estimator Service
 * 价格估算服务
 *
 * 提供成本估算、预算检查和实际花费记录功能
 */

import type { FoodCategory } from "@/lib/types/meal";
import { convexEcommerceRepository } from "@/lib/repositories/implementations/convex-ecommerce-repository";

/**
 * 价格估算结果
 */
export interface PriceEstimate {
  foodId: string;
  foodName: string;
  amount: number;
  estimatedPrice: number;
  unitPrice: number;
}

/**
 * 预算检查结果
 */
export interface BudgetCheckResult {
  totalEstimatedCost: number;
  budget: number | null;
  isOverBudget: boolean;
  overBudgetAmount: number;
  recommendation?: string;
}

/**
 * 默认价格映射（元/100g）
 */
const DEFAULT_PRICES: Partial<Record<FoodCategory, number>> = {
  VEGETABLES: 3.0,
  FRUITS: 8.0,
  GRAINS: 2.5,
  PROTEIN: 15.0,
  SEAFOOD: 20.0,
  DAIRY: 6.0,
  OILS: 12.0,
  SNACKS: 5.0,
  BEVERAGES: 2.0,
  OTHER: 5.0,
};

/**
 * 价格估算器类
 */
export class PriceEstimator {
  private static instance: PriceEstimator | null = null;

  static getInstance() {
    if (!PriceEstimator.instance) {
      PriceEstimator.instance = new PriceEstimator();
    }
    return PriceEstimator.instance;
  }

  /**
   * 估算食材价格
   */
  async estimatePrice(foodId: string, amount: number): Promise<PriceEstimate> {
    try {
      const priceHistory = await convexEcommerceRepository.getPriceHistory({
        foodId,
        limit: 1,
      });

      const latestHistory = priceHistory[0];

      const unitPrice = latestHistory?.unitPrice ?? DEFAULT_PRICES.OTHER ?? 5.0;
      const estimatedPrice = (unitPrice * amount) / 100;

      return {
        foodId,
        foodName: "",
        amount,
        estimatedPrice: Math.round(estimatedPrice * 100) / 100,
        unitPrice,
      };
    } catch {
      return {
        foodId,
        foodName: "",
        amount,
        estimatedPrice: 0,
        unitPrice: DEFAULT_PRICES.OTHER ?? 5.0,
      };
    }
  }

  /**
   * 批量估算价格
   */
  async estimatePrices(
    items: Array<{ foodId: string; amount: number }>,
  ): Promise<PriceEstimate[]> {
    const estimates = await Promise.all(
      items.map((item) => this.estimatePrice(item.foodId, item.amount)),
    );

    return estimates;
  }

  /**
   * 获取单价（元/100g）
   */
  private async getUnitPrice(category: FoodCategory): Promise<number> {
    return DEFAULT_PRICES[category] || DEFAULT_PRICES.OTHER || 5.0;
  }

  /**
   * 检查预算
   */
  checkBudget(estimatedCost: number, budget: number | null): BudgetCheckResult {
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
   */
  calculateTotalCost(estimates: PriceEstimate[]): number {
    return estimates.reduce(
      (total, estimate) => total + estimate.estimatedPrice,
      0,
    );
  }

  /**
   * 更新实际花费
   */
  async updateActualCost(
    shoppingListId: string,
    actualCost: number,
  ): Promise<void> {
    const orders = await convexEcommerceRepository.getOrders({
      memberId: "" as any,
    });

    const order = orders.orders.find(
      (o) => (o as any).shoppingListId === shoppingListId,
    );

    if (order) {
      await convexEcommerceRepository.updateOrderStatus(order._id, "COMPLETED");
    }
  }

  /**
   * 获取价格趋势建议
   */
  getPriceTrendAdvice(estimatedCost: number, actualCost: number): string {
    const diff = actualCost - estimatedCost;
    const diffPercent = (diff / estimatedCost) * 100;

    if (Math.abs(diffPercent) < 5) {
      return "价格估算准确，与实际采购成本接近";
    } else if (diffPercent > 0) {
      return `实际采购成本比估算高 ${diffPercent.toFixed(1)}%，建议关注市场价格波动`;
    } else {
      return `实际采购成本比估算低 ${Math.abs(diffPercent).toFixed(1)}%，市场可能处于促销期`;
    }
  }
}

export const priceEstimator = new PriceEstimator();
export const priceEstimatorService = PriceEstimator;
