import { api } from "../../convex-client";
import { convexClient } from "../../convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";

export interface PriceData {
  date: number;
  price: number;
  unitPrice: number;
  platform: string;
}

export interface PriceTrend {
  foodId: string;
  foodName: string;
  category: string;
  currentPrice: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  priceChange: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  trend: {
    direction: "UP" | "DOWN" | "STABLE";
    slope: number;
    confidence: number;
  };
  prediction: {
    next7Days: number[];
    expectedMin: number;
    expectedMax: number;
  };
  recommendations: string[];
}

export interface PlatformComparison {
  foodId: string;
  foodName: string;
  platforms: {
    platform: string;
    currentPrice: number;
    unitPrice: number;
    priceHistory: PriceData[];
    trend: "UP" | "DOWN" | "STABLE";
    reliability: number;
    shippingCost?: number;
    freeShippingThreshold?: number;
    discountInfo?: {
      type: "PERCENTAGE" | "FIXED" | "THRESHOLD";
      value: number;
      description: string;
    };
  }[];
  bestPlatform: {
    name: string;
    unitPrice: number;
    totalCost: number;
    savings: number;
  };
  recommendation: string;
  bulkOptimization?: {
    platforms: string[];
    totalCost: number;
    savings: number;
    breakdown: Array<{
      platform: string;
      items: string[];
      cost: number;
    }>;
  };
}

export interface PriceAlert {
  foodId: string;
  foodName: string;
  type: "SPIKE" | "DROP" | "OPPORTUNITY" | "WARNING";
  message: string;
  currentPrice: number;
  expectedPrice: number;
  deviation: number;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  action: string;
}

type FoodPlatformInfo = {
  foodId: string;
  foodName: string;
  platforms: PlatformComparison["platforms"];
};

type PlatformOption = {
  platform: string;
  items: Array<{
    foodId: string;
    foodName: string;
    quantity: number;
    unitPrice: number;
    itemCost: number;
  }>;
  subtotal: number;
  shippingCost: number;
  totalCost: number;
};

type MixedPlatformBreakdown = {
  platform: string;
  items: PlatformOption["items"];
  cost: number;
  shippingCost: number;
  freeShippingThreshold: number;
  totalCost?: number;
};

export class PriceAnalyzer {
  async getPriceTrend(foodId: string, days: number = 30): Promise<PriceTrend> {
    const food = (await convexClient.query(api.budget.getFoodById, {
      foodId: foodId as Id<"foods">,
    })) as Doc<"foods"> | null;

    if (!food) {
      throw new Error("食物不存在");
    }

    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;
    const priceHistories = (await convexClient.query(
      api.budget.getPriceHistories,
      {
        foodId: foodId as Id<"foods">,
        isValid: true,
        startDate,
        limit: 100,
      },
    )) as Doc<"priceHistories">[];

    if (priceHistories.length < 3) {
      throw new Error("价格数据不足，无法分析趋势");
    }

    const prices = priceHistories.map((ph) => ({
      date: ph.recordedAt,
      price: ph.price,
      unitPrice: ph.unitPrice,
      platform: ph.platform,
    }));

    const latestPrice = prices[prices.length - 1];
    if (!latestPrice) {
      throw new Error("价格数据不足，无法分析趋势");
    }
    const currentPrice = latestPrice.unitPrice;
    const averagePrice =
      prices.reduce((sum, p) => sum + p.unitPrice, 0) / prices.length;
    const minPrice = Math.min(...prices.map((p) => p.unitPrice));
    const maxPrice = Math.max(...prices.map((p) => p.unitPrice));

    const priceChange = this.calculatePriceChanges(prices);
    const trend = this.calculateTrend(prices);
    const prediction = this.predictPrices(prices);
    const recommendations = this.generateRecommendations(
      currentPrice,
      averagePrice,
      trend,
      prediction,
    );

    return {
      foodId: food._id,
      foodName: food.name,
      category: food.category,
      currentPrice,
      averagePrice,
      minPrice,
      maxPrice,
      priceChange,
      trend,
      prediction,
      recommendations,
    };
  }

  async getPlatformComparison(
    foodId: string,
    quantity: number = 1,
  ): Promise<PlatformComparison> {
    const food = (await convexClient.query(api.budget.getFoodById, {
      foodId: foodId as Id<"foods">,
    })) as Doc<"foods"> | null;

    if (!food) {
      throw new Error("食物不存在");
    }

    const priceHistories = (await convexClient.query(
      api.budget.getPriceHistories,
      {
        foodId: foodId as Id<"foods">,
        isValid: true,
        limit: 100,
      },
    )) as Doc<"priceHistories">[];

    const platformData: { [key: string]: PriceData[] } = {};

    for (const price of priceHistories) {
      platformData[price.platform] ??= [];
      platformData[price.platform]!.push({
        date: price.recordedAt,
        price: price.price,
        unitPrice: price.unitPrice,
        platform: price.platform,
      });
    }

    const platforms: PlatformComparison["platforms"] = [];
    for (const [platform, priceHistory] of Object.entries(platformData)) {
      if (priceHistory.length < 2) continue;

      const latestPrice = priceHistory[0];
      if (!latestPrice) continue;

      const currentPrice = latestPrice.unitPrice;
      const trend = this.calculateTrend(priceHistory);
      const reliability = Math.min(1, priceHistory.length / 10);

      const platformInfo = await this.getPlatformInfo(platform);

      platforms.push({
        platform,
        currentPrice,
        unitPrice: currentPrice,
        priceHistory: priceHistory.slice(0, 30).reverse(),
        trend: trend.direction,
        reliability,
        shippingCost: platformInfo.shippingCost,
        freeShippingThreshold: platformInfo.freeShippingThreshold,
        discountInfo: platformInfo.discountInfo,
      });
    }

    if (platforms.length === 0) {
      throw new Error("缺少平台价格数据");
    }

    const platformsWithCost = platforms.map((p) => {
      const itemCost = p.unitPrice * quantity;
      const totalCost = this.calculateTotalCost(
        itemCost,
        p.shippingCost,
        p.freeShippingThreshold,
      );

      return {
        ...p,
        totalCost,
      };
    });

    const sortedByCost = platformsWithCost.sort(
      (a, b) => a.totalCost - b.totalCost,
    );
    const bestPlatform = sortedByCost[0];
    if (!bestPlatform) {
      throw new Error("缺少平台价格数据");
    }

    const avgTotalCost =
      platformsWithCost.reduce((sum, p) => sum + p.totalCost, 0) /
      platformsWithCost.length;
    const savings =
      platformsWithCost.length > 1
        ? ((avgTotalCost - bestPlatform.totalCost) / avgTotalCost) * 100
        : 0;
    const bestPlatformSummary = {
      name: bestPlatform.platform,
      unitPrice: bestPlatform.unitPrice,
      totalCost: bestPlatform.totalCost,
      savings,
    };

    const recommendation = this.generatePlatformRecommendation(
      platforms,
      bestPlatformSummary,
    );

    return {
      foodId: food._id,
      foodName: food.name,
      platforms,
      bestPlatform: bestPlatformSummary,
      recommendation,
    };
  }

  async optimizeBulkPurchase(foodIds: string[]): Promise<{
    combinations: PlatformOption[];
    bestCombination: {
      platform: string;
      totalCost: number;
      savings: number;
      items: PlatformOption["items"];
    };
    mixedPlatformOption?: {
      platforms: string[];
      totalCost: number;
      savings: number;
      breakdown: MixedPlatformBreakdown[];
    };
  }> {
    const foodPlatforms: FoodPlatformInfo[] = await Promise.all(
      foodIds.map(async (foodId) => {
        const comparison = await this.getPlatformComparison(foodId, 1);
        return {
          foodId,
          foodName: comparison.foodName,
          platforms: comparison.platforms,
        };
      }),
    );

    const singlePlatformOptions =
      await this.generateSinglePlatformOptions(foodPlatforms);

    const mixedPlatformOptionResult =
      await this.generateMixedPlatformOption(foodPlatforms);
    const mixedPlatformOption:
      | {
          platforms: string[];
          totalCost: number;
          savings: number;
          breakdown: MixedPlatformBreakdown[];
        }
      | undefined = mixedPlatformOptionResult ?? undefined;

    const allOptions = [...singlePlatformOptions];
    if (mixedPlatformOption) {
      const subtotal = mixedPlatformOption.breakdown.reduce(
        (sum, breakdownItem) => sum + breakdownItem.cost,
        0,
      );
      const shippingCost = mixedPlatformOption.breakdown.reduce(
        (sum, breakdownItem) => sum + (breakdownItem.cost > 99 ? 0 : 12),
        0,
      );

      allOptions.push({
        platform: "跨平台组合",
        items: mixedPlatformOption.breakdown.flatMap(
          (breakdownItem) => breakdownItem.items,
        ),
        subtotal,
        shippingCost,
        totalCost: mixedPlatformOption.totalCost,
      });
    }

    if (allOptions.length === 0) {
      throw new Error("没有可用的购买方案");
    }

    const sortedOptions = [...allOptions].sort(
      (a, b) => a.totalCost - b.totalCost,
    );
    const bestOption = sortedOptions[0];
    if (!bestOption) {
      throw new Error("没有可用的购买方案");
    }

    const avgCost =
      allOptions.reduce((sum, option) => sum + option.totalCost, 0) /
      allOptions.length;
    const savings =
      allOptions.length > 1
        ? ((avgCost - bestOption.totalCost) / avgCost) * 100
        : 0;

    return {
      combinations: singlePlatformOptions,
      bestCombination: {
        platform: bestOption.platform,
        totalCost: bestOption.totalCost,
        savings,
        items: bestOption.items,
      },
      mixedPlatformOption,
    };
  }

  private async getPlatformInfo(platform: string): Promise<{
    shippingCost: number;
    freeShippingThreshold: number;
    discountInfo?: {
      type: "PERCENTAGE" | "FIXED" | "THRESHOLD";
      value: number;
      description: string;
    };
  }> {
    const platformConfigs: { [key: string]: any } = {
      山姆会员商店: {
        shippingCost: 15,
        freeShippingThreshold: 299,
        discountInfo: {
          type: "THRESHOLD",
          value: 299,
          description: "满29元免运费",
        },
      },
      盒马鲜生: {
        shippingCost: 12,
        freeShippingThreshold: 99,
        discountInfo: {
          type: "THRESHOLD",
          value: 99,
          description: "满99元免运费",
        },
      },
      叮咚买菜: {
        shippingCost: 8,
        freeShippingThreshold: 59,
        discountInfo: {
          type: "THRESHOLD",
          value: 59,
          description: "满59元免运费",
        },
      },
      每日优鲜: {
        shippingCost: 10,
        freeShippingThreshold: 79,
        discountInfo: {
          type: "PERCENTAGE",
          value: 10,
          description: "新用户首单9折",
        },
      },
    };

    return (
      platformConfigs[platform] || {
        shippingCost: 12,
        freeShippingThreshold: 99,
      }
    );
  }

  private calculateTotalCost(
    itemCost: number,
    shippingCost?: number,
    freeShippingThreshold?: number,
  ): number {
    if (!shippingCost || !freeShippingThreshold) {
      return itemCost;
    }

    return itemCost >= freeShippingThreshold
      ? itemCost
      : itemCost + shippingCost;
  }

  private async generateSinglePlatformOptions(
    foodPlatforms: FoodPlatformInfo[],
  ): Promise<PlatformOption[]> {
    const allPlatforms = new Set<string>();
    for (const foodPlatform of foodPlatforms) {
      for (const platformItem of foodPlatform.platforms) {
        allPlatforms.add(platformItem.platform);
      }
    }

    const options: PlatformOption[] = [];

    for (const platform of allPlatforms) {
      const items: PlatformOption["items"] = [];
      let subtotal = 0;

      for (const foodPlatform of foodPlatforms) {
        const platformInfo = foodPlatform.platforms.find(
          (platformItem) => platformItem.platform === platform,
        );
        if (platformInfo) {
          const item = {
            foodId: foodPlatform.foodId,
            foodName: foodPlatform.foodName,
            quantity: 1,
            unitPrice: platformInfo.unitPrice,
            itemCost: platformInfo.unitPrice,
          };
          items.push(item);
          subtotal += item.itemCost;
        }
      }

      if (items.length > 0) {
        const platformData = await this.getPlatformInfo(platform);
        const shippingCost = this.calculateShippingCost(
          subtotal,
          platformData.shippingCost,
          platformData.freeShippingThreshold,
        );
        const totalCost = subtotal + shippingCost;

        options.push({
          platform,
          items,
          subtotal,
          shippingCost,
          totalCost,
        });
      }
    }

    return options;
  }

  private async generateMixedPlatformOption(
    foodPlatforms: FoodPlatformInfo[],
  ): Promise<{
    platforms: string[];
    totalCost: number;
    savings: number;
    breakdown: MixedPlatformBreakdown[];
  } | null> {
    const breakdown: MixedPlatformBreakdown[] = [];
    let totalCost = 0;

    for (const foodPlatform of foodPlatforms) {
      const sortedPlatforms = [...foodPlatform.platforms].sort(
        (a, b) => a.unitPrice - b.unitPrice,
      );
      const cheapestPlatform = sortedPlatforms[0];

      if (!cheapestPlatform) continue;

      let platformGroup = breakdown.find(
        (group) => group.platform === cheapestPlatform.platform,
      );

      if (!platformGroup) {
        const platformData = await this.getPlatformInfo(
          cheapestPlatform.platform,
        );
        platformGroup = {
          platform: cheapestPlatform.platform,
          items: [],
          cost: 0,
          shippingCost: platformData.shippingCost,
          freeShippingThreshold: platformData.freeShippingThreshold,
        };
        breakdown.push(platformGroup);
      }

      const item: PlatformOption["items"][number] = {
        foodId: foodPlatform.foodId,
        foodName: foodPlatform.foodName,
        quantity: 1,
        unitPrice: cheapestPlatform.unitPrice,
        itemCost: cheapestPlatform.unitPrice,
      };

      platformGroup.items.push(item);
      platformGroup.cost += item.itemCost;
    }

    for (const group of breakdown) {
      const shippingCost = this.calculateShippingCost(
        group.cost,
        group.shippingCost,
        group.freeShippingThreshold,
      );
      group.totalCost = group.cost + shippingCost;
      totalCost += group.totalCost;
    }

    if (breakdown.length === 0) return null;

    return {
      platforms: breakdown.map((group) => group.platform),
      totalCost,
      savings: 0,
      breakdown,
    };
  }

  private calculateShippingCost(
    subtotal: number,
    shippingCost: number,
    freeShippingThreshold: number,
  ): number {
    return subtotal >= freeShippingThreshold ? 0 : shippingCost;
  }

  async getPriceAlerts(memberId?: string): Promise<PriceAlert[]> {
    const alerts: PriceAlert[] = [];
    const recentPrices = (await convexClient.query(
      api.budget.getPriceHistories,
      {
        foodId: "" as Id<"foods">,
        isValid: true,
        startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
        limit: 100,
      },
    )) as Doc<"priceHistories">[];

    const foodPrices: { [key: string]: any[] } = {};
    for (const price of recentPrices) {
      foodPrices[price.foodId] ??= [];
      foodPrices[price.foodId]!.push(price);
    }

    for (const [foodId, prices] of Object.entries(foodPrices)) {
      if (prices.length < 3) continue;

      const alert = this.analyzePriceAnomaly(prices);
      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts.sort((a, b) => {
      const urgencyOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }

  async updatePriceData(
    priceUpdates: {
      foodId: string;
      price: number;
      unit: string;
      platform: string;
      source?: string;
    }[],
  ): Promise<void> {
    await convexClient.mutation(api.budget.createManyPriceHistories, {
      updates: priceUpdates.map((update) => ({
        foodId: update.foodId as any,
        price: update.price,
        unitPrice: this.calculateUnitPrice(update.price, update.unit),
        unit: update.unit,
        platform: update.platform,
        source: update.source,
      })),
    });
  }

  private calculatePriceChanges(prices: PriceData[]): {
    daily: number;
    weekly: number;
    monthly: number;
  } {
    const latest = prices[prices.length - 1];
    if (!latest) {
      return { daily: 0, weekly: 0, monthly: 0 };
    }
    const daily = this.findPriceAtDaysAgo(prices, 1);
    const weekly = this.findPriceAtDaysAgo(prices, 7);
    const monthly = this.findPriceAtDaysAgo(prices, 30);

    return {
      daily: daily
        ? ((latest.unitPrice - daily.unitPrice) / daily.unitPrice) * 100
        : 0,
      weekly: weekly
        ? ((latest.unitPrice - weekly.unitPrice) / weekly.unitPrice) * 100
        : 0,
      monthly: monthly
        ? ((latest.unitPrice - monthly.unitPrice) / monthly.unitPrice) * 100
        : 0,
    };
  }

  private findPriceAtDaysAgo(
    prices: PriceData[],
    days: number,
  ): PriceData | null {
    const targetDate = Date.now() - days * 24 * 60 * 60 * 1000;

    let closest = null;
    let minDiff = Infinity;

    for (const price of prices) {
      const diff = Math.abs(price.date - targetDate);
      if (diff < minDiff) {
        minDiff = diff;
        closest = price;
      }
    }

    return closest;
  }

  private calculateTrend(prices: PriceData[]): {
    direction: "UP" | "DOWN" | "STABLE";
    slope: number;
    confidence: number;
  } {
    if (prices.length < 3) {
      return { direction: "STABLE", slope: 0, confidence: 0 };
    }

    const n = prices.length;
    const x = prices.map((_, i) => i);
    const y = prices.map((p) => p.unitPrice);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => {
      const yValue = y[i] ?? 0;
      return sum + val * yValue;
    }, 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const xValue = x[i] ?? 0;
      const predicted = slope * xValue + (meanY - slope * (sumX / n));
      return sum + Math.pow(val - predicted, 2);
    }, 0);

    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
    const confidence = Math.max(0, rSquared);

    let direction: "UP" | "DOWN" | "STABLE" = "STABLE";
    if (Math.abs(slope) > 0.01) {
      direction = slope > 0 ? "UP" : "DOWN";
    }

    return { direction, slope, confidence };
  }

  private predictPrices(prices: PriceData[]): {
    next7Days: number[];
    expectedMin: number;
    expectedMax: number;
  } {
    if (prices.length < 5) {
      const latestPrice = prices[prices.length - 1];
      if (!latestPrice) {
        throw new Error("价格数据不足，无法分析趋势");
      }
      const currentPrice = latestPrice.unitPrice;

      return {
        next7Days: Array(7).fill(currentPrice),
        expectedMin: currentPrice,
        expectedMax: currentPrice,
      };
    }

    const trend = this.calculateTrend(prices);
    const latestPrice = prices[prices.length - 1];
    if (!latestPrice) {
      return {
        next7Days: Array(7).fill(0),
        expectedMin: 0,
        expectedMax: 0,
      };
    }
    const currentPrice = latestPrice.unitPrice;
    const volatility = this.calculateVolatility(prices);

    const next7Days: number[] = [];
    for (let i = 1; i <= 7; i++) {
      const predictedPrice = currentPrice + trend.slope * i;
      const randomFactor = (Math.random() - 0.5) * volatility * 2;
      next7Days.push(Math.max(0, predictedPrice + randomFactor));
    }

    const expectedMin = Math.min(...next7Days);
    const expectedMax = Math.max(...next7Days);

    return {
      next7Days,
      expectedMin,
      expectedMax,
    };
  }

  private calculateVolatility(prices: PriceData[]): number {
    if (prices.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const current = prices[i];
      const previous = prices[i - 1];
      if (!current || !previous) continue;
      const returnRate =
        (current.unitPrice - previous.unitPrice) / previous.unitPrice;
      returns.push(returnRate);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;

    return Math.sqrt(variance);
  }

  private generateRecommendations(
    currentPrice: number,
    averagePrice: number,
    trend: { direction: "UP" | "DOWN" | "STABLE"; confidence: number },
    prediction: {
      next7Days: number[];
      expectedMin: number;
      expectedMax: number;
    },
  ): string[] {
    const recommendations: string[] = [];

    if (currentPrice < averagePrice * 0.8) {
      recommendations.push("当前价格较低，建议适量采购");
    } else if (currentPrice > averagePrice * 1.2) {
      recommendations.push("当前价格较高，建议延后采购或寻找替代品");
    }

    if (trend.direction === "UP" && trend.confidence > 0.7) {
      recommendations.push("价格呈上涨趋势，建议尽早采购");
    } else if (trend.direction === "DOWN" && trend.confidence > 0.7) {
      recommendations.push("价格呈下降趋势，建议等待更低价格");
    }

    const futureAvg =
      prediction.next7Days.reduce((sum, p) => sum + p, 0) /
      prediction.next7Days.length;
    if (futureAvg < currentPrice * 0.9) {
      recommendations.push("预计未来价格会下降，建议等待");
    } else if (futureAvg > currentPrice * 1.1) {
      recommendations.push("预计未来价格会上涨，建议当前采购");
    }

    return recommendations;
  }

  private generatePlatformRecommendation(
    platforms: PlatformComparison["platforms"],
    bestPlatform: PlatformComparison["bestPlatform"],
  ): string {
    if (!bestPlatform || platforms.length < 2) {
      return "需要更多平台数据来生成推荐";
    }

    if (bestPlatform.savings > 10) {
      return `强烈推荐${bestPlatform.name}，比其他平台便宜${bestPlatform.savings.toFixed(1)}%`;
    } else if (bestPlatform.savings > 5) {
      return `推荐${bestPlatform.name}，价格较优`;
    } else {
      return "各平台价格相近，可根据便利性选择";
    }
  }

  private analyzePriceAnomaly(prices: any[]): PriceAlert | null {
    const latest = prices[0];
    if (!latest) return null;

    const previous = prices.slice(1, 6);
    if (previous.length < 3) return null;

    const avgPrice =
      previous.reduce((sum, p) => sum + p.unitPrice, 0) / previous.length;
    const deviation = ((latest.unitPrice - avgPrice) / avgPrice) * 100;

    const foodName = latest.food?.name ?? "食物";
    let alert: PriceAlert | null = null;

    if (deviation > 20) {
      alert = {
        foodId: latest.foodId,
        foodName,
        type: "SPIKE",
        message: `${foodName}价格暴涨${deviation.toFixed(1)}%`,
        currentPrice: latest.unitPrice,
        expectedPrice: avgPrice,
        deviation,
        urgency: deviation > 50 ? "HIGH" : "MEDIUM",
        action: "建议延后采购或寻找替代品",
      };
    } else if (deviation < -15) {
      alert = {
        foodId: latest.foodId,
        foodName,
        type: "OPPORTUNITY",
        message: `${foodName}价格下降${Math.abs(deviation).toFixed(1)}%`,
        currentPrice: latest.unitPrice,
        expectedPrice: avgPrice,
        deviation,
        urgency: "MEDIUM",
        action: "建议及时采购，价格优惠",
      };
    }

    return alert;
  }

  private calculateUnitPrice(price: number, unit: string): number {
    const unitMap: { [key: string]: number } = {
      kg: 1,
      斤: 2,
      g: 0.001,
      "500g": 0.5,
      "100g": 0.1,
      "250g": 0.25,
    };

    const multiplier = unitMap[unit] || 1;
    return price / multiplier;
  }

  async getPopularFoodsPrices(limit: number = 20): Promise<PriceTrend[]> {
    const popularFoods = (await convexClient.query(api.budget.getPopularFoods, {
      limit,
    })) as Array<Doc<"foods"> | null>;

    const trends: PriceTrend[] = [];

    for (const food of popularFoods) {
      if (food && food._id) {
        try {
          const trend = await this.getPriceTrend(food._id);
          trends.push(trend);
        } catch {
          // ignore errors
        }
      }
    }

    return trends;
  }
}

export const priceAnalyzer = new PriceAnalyzer();
