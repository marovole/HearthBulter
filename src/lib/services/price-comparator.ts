import { PrismaClient } from "@prisma/client";
import { SKUMatcher, MatchConfig } from "./sku-matcher";
import {
  PriceComparisonResult,
  SKUMatchResult,
  PlatformProductInfo,
  PlatformError,
  PlatformErrorType,
} from "./ecommerce/types";
import { EcommercePlatform, Food } from "@prisma/client";

export interface PriceComparisonConfig {
  includeShipping: boolean;
  minConfidence: number;
  maxResultsPerFood: number;
  considerDiscounts: boolean;
  preferInStock: boolean;
}

export interface PriceAnalysis {
  platform: EcommercePlatform;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  productCount: number;
  inStockRate: number;
}

export interface ProductWithDiscount extends PlatformProductInfo {
  discountAmount?: number;
  discountPercentage?: string;
  shippingFee?: number;
  unitPrice?: number;
  valueScore?: number;
  totalPrice?: number;
}

export class PriceComparator {
  private prisma: PrismaClient;
  private skuMatcher: SKUMatcher;

  // 平台权重配置（用于综合评分）
  private platformWeights: Record<EcommercePlatform, number> = {
    [EcommercePlatform.SAMS_CLUB]: 0.8,
    [EcommercePlatform.HEMA]: 0.9,
    [EcommercePlatform.DINGDONG]: 0.7,
  };

  // 配送费配置
  private shippingFees: Record<EcommercePlatform, number> = {
    [EcommercePlatform.SAMS_CLUB]: 6,
    [EcommercePlatform.HEMA]: 0,
    [EcommercePlatform.DINGDONG]: 3,
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.skuMatcher = new SKUMatcher(prisma);
  }

  // 主要价格比较方法
  async comparePrices(
    foods: Food[],
    config: Partial<PriceComparisonConfig> = {},
  ): Promise<PriceComparisonResult[]> {
    const finalConfig: PriceComparisonConfig = {
      includeShipping: true,
      minConfidence: 0.6,
      maxResultsPerFood: 5,
      considerDiscounts: true,
      preferInStock: true,
      ...config,
    };

    try {
      const results: PriceComparisonResult[] = [];

      for (const food of foods) {
        const result = await this.compareSingleFood(food, finalConfig);
        results.push(result);
      }

      return results;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to compare prices: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 比较单个食材的价格
  private async compareSingleFood(
    food: Food,
    config: PriceComparisonConfig,
  ): Promise<PriceComparisonResult> {
    // 1. 获取匹配的SKU
    const matches = await this.skuMatcher.matchFoodToSKUs(food, {
      minConfidence: config.minConfidence,
      maxResults: config.maxResultsPerFood * 3, // 获取更多结果用于筛选
      includeOutOfStock: !config.preferInStock,
    });

    // 2. 过滤和增强匹配结果
    const enhancedMatches = await this.enhanceMatchesWithPricing(
      matches,
      config,
    );

    // 3. 找出最优价格
    const bestPrice = this.findBestPrice(enhancedMatches, config);

    return {
      foodId: food.id,
      foodName: food.name,
      matches: enhancedMatches,
      bestPrice,
    };
  }

  // 增强匹配结果的价格信息
  private async enhanceMatchesWithPricing(
    matches: SKUMatchResult[],
    config: PriceComparisonConfig,
  ): Promise<SKUMatchResult[]> {
    const enhancedMatches: SKUMatchResult[] = [];

    for (const match of matches) {
      const enhancedMatch = await this.calculateTotalPrice(match, config);
      if (enhancedMatch) {
        enhancedMatches.push(enhancedMatch);
      }
    }

    // 按总价排序
    enhancedMatches.sort((a, b) => {
      const priceA =
        (a.platformProduct as any).totalPrice || a.platformProduct.price;
      const priceB =
        (b.platformProduct as any).totalPrice || b.platformProduct.price;
      return priceA - priceB;
    });

    return enhancedMatches.slice(0, config.maxResultsPerFood);
  }

  // 计算总价（包含配送费等）
  private async calculateTotalPrice(
    match: SKUMatchResult,
    config: PriceComparisonConfig,
  ): Promise<SKUMatchResult | null> {
    const product = { ...match.platformProduct };
    let totalPrice = product.price;

    // 考虑折扣
    if (
      config.considerDiscounts &&
      product.originalPrice &&
      product.originalPrice > product.price
    ) {
      (product as ProductWithDiscount).discountAmount =
        product.originalPrice - product.price;
      const discountPercent = (
        ((product.originalPrice - product.price) / product.originalPrice) *
        100
      ).toFixed(1);
      (product as ProductWithDiscount).discountPercentage = discountPercent;
    }

    // 添加配送费
    if (config.includeShipping) {
      const shippingFee = this.calculateShippingFee(product);
      totalPrice += shippingFee(product as ProductWithDiscount).shippingFee =
        shippingFee;
    }

    // 计算单位价格
    const unitPrice = this.calculateUnitPrice(product);
    if (unitPrice) {
      (product as ProductWithDiscount).unitPrice = unitPrice;
    }

    // 计算性价比评分
    const valueScore =
      (this.calculateValueScore(
        product,
        match.confidence,
      )(product as ProductWithDiscount).valueScore =
      valueScore(product as ProductWithDiscount).totalPrice =
        totalPrice);

    return {
      ...match,
      platformProduct: product,
    };
  }

  // 计算配送费
  private calculateShippingFee(product: PlatformProductInfo): number {
    // 如果商品有特定的配送费，使用商品配送费
    if (product.shippingFee !== undefined) {
      return product.shippingFee;
    }

    // 否则使用平台默认配送费
    return this.shippingFees[product.platform as EcommercePlatform] || 0;
  }

  // 计算单位价格
  private calculateUnitPrice(product: PlatformProductInfo): number | null {
    const price = (product as any).totalPrice || product.price;

    if (product.weight && product.weight > 0) {
      // 按重量计算（元/kg）
      return price / (product.weight / 1000);
    }

    if (product.volume && product.volume > 0) {
      // 按体积计算（元/L）
      return price / (product.volume / 1000);
    }

    if (product.priceUnit) {
      // 根据价格单位计算
      switch (product.priceUnit) {
        case "kg":
          return price;
        case "500g":
          return price * 2;
        case "100g":
          return price * 10;
        case "l":
          return price;
        case "ml":
          return price * 1000;
        default:
          return null;
      }
    }

    return null;
  }

  // 计算性价比评分
  private calculateValueScore(
    product: PlatformProductInfo,
    confidence: number,
  ): number {
    let score = 0;

    // 基础分数（基于匹配置信度）
    score += confidence * 0.3;

    // 价格分数（价格越低分数越高）
    const priceScore = Math.max(0, 1 - product.price / 100); // 假设100元为基准高价
    score += priceScore * 0.4;

    // 库存分数
    const stockScore = product.isInStock ? 1 : 0.2;
    score += stockScore * 0.1;

    // 评分分数
    if (product.rating) {
      const ratingScore = product.rating / 5;
      score += ratingScore * 0.1;
    }

    // 平台权重
    const platformWeight =
      this.platformWeights[product.platform as EcommercePlatform] || 0.5;
    score *= platformWeight;

    return Math.min(score, 1);
  }

  // 找出最优价格
  private findBestPrice(
    matches: SKUMatchResult[],
    config: PriceComparisonConfig,
  ): PriceComparisonResult["bestPrice"] {
    if (matches.length === 0) {
      return undefined;
    }

    // 找出总价最低的商品
    let bestMatch = matches[0];
    let lowestTotalPrice =
      (bestMatch.platformProduct as any).totalPrice ||
      bestMatch.platformProduct.price;

    for (const match of matches) {
      const totalPrice =
        (match.platformProduct as any).totalPrice ||
        match.platformProduct.price;
      if (totalPrice < lowestTotalPrice) {
        lowestTotalPrice = totalPrice;
        bestMatch = match;
      }
    }

    return {
      platform: bestMatch.platformProduct.platform as EcommercePlatform,
      product: bestMatch.platformProduct,
      totalPrice: lowestTotalPrice,
      unitPrice: (bestMatch.platformProduct as any).unitPrice,
    };
  }

  // 获取平台价格分析
  async getPlatformPriceAnalysis(
    foods: Food[],
    platform: EcommercePlatform,
  ): Promise<PriceAnalysis> {
    const matches: SKUMatchResult[] = [];

    for (const food of foods) {
      const foodMatches = await this.skuMatcher.matchFoodToSKUs(food, {
        minConfidence: 0.6,
        maxResults: 10,
      });

      const platformMatches = foodMatches.filter(
        (match) => match.platformProduct.platform === platform,
      );

      matches.push(...platformMatches);
    }

    if (matches.length === 0) {
      return {
        platform,
        averagePrice: 0,
        lowestPrice: 0,
        highestPrice: 0,
        productCount: 0,
        inStockRate: 0,
      };
    }

    const prices = matches.map((match) => match.platformProduct.price);
    const inStockCount = matches.filter(
      (match) => match.platformProduct.isInStock,
    ).length;

    return {
      platform,
      averagePrice:
        prices.reduce((sum, price) => sum + price, 0) / prices.length,
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      productCount: matches.length,
      inStockRate: inStockCount / matches.length,
    };
  }

  // 获取跨平台价格对比
  async getCrossPlatformComparison(
    foods: Food[],
  ): Promise<Map<EcommercePlatform, PriceAnalysis>> {
    const platforms = [
      EcommercePlatform.SAMS_CLUB,
      EcommercePlatform.HEMA,
      EcommercePlatform.DINGDONG,
    ];
    const results = new Map<EcommercePlatform, PriceAnalysis>();

    for (const platform of platforms) {
      const analysis = await this.getPlatformPriceAnalysis(foods, platform);
      results.set(platform, analysis);
    }

    return results;
  }

  // 获取价格趋势
  async getPriceTrends(
    foodId: string,
    days: number = 30,
  ): Promise<
    Array<{
      date: string;
      platforms: Record<EcommercePlatform, number | null>;
    }>
  > {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      const priceHistories = await this.prisma.priceHistory.findMany({
        where: {
          foodId,
          recordedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          recordedAt: "asc",
        },
      });

      // 按日期分组
      const dailyPrices = new Map<
        string,
        Record<EcommercePlatform, number | null>
      >();

      priceHistories.forEach((history) => {
        const dateKey = history.recordedAt.toISOString().split("T")[0];

        if (!dailyPrices.has(dateKey)) {
          const platforms: Record<EcommercePlatform, number | null> = {
            [EcommercePlatform.SAMS_CLUB]: null,
            [EcommercePlatform.HEMA]: null,
            [EcommercePlatform.DINGDONG]: null,
          };
          dailyPrices.set(dateKey, platforms);
        }

        const dailyPrice = dailyPrices.get(dateKey)!;
        dailyPrice[history.platform as EcommercePlatform] = history.unitPrice;
      });

      return Array.from(dailyPrices.entries()).map(([date, platforms]) => ({
        date,
        platforms,
      }));
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get price trends for food ${foodId}: ${error.message}`,
        details: { foodId, originalError: error },
      });
    }
  }

  // 获取价格提醒
  async getPriceAlerts(
    foods: Food[],
    threshold: number = 0.2, // 20%价格变化阈值
  ): Promise<
    Array<{
      foodId: string;
      foodName: string;
      platform: EcommercePlatform;
      currentPrice: number;
      previousPrice: number;
      changePercentage: number;
      alertType: "price_drop" | "price_increase";
    }>
  > {
    const alerts: Array<{
      foodId: string;
      foodName: string;
      platform: EcommercePlatform;
      currentPrice: number;
      previousPrice: number;
      changePercentage: number;
      alertType: "price_drop" | "price_increase";
    }> = [];

    for (const food of foods) {
      const comparison = await this.compareSingleFood(food, {
        includeShipping: false,
        minConfidence: 0.7,
        maxResultsPerFood: 3,
        considerDiscounts: true,
        preferInStock: true,
      });

      for (const match of comparison.matches) {
        const platform = match.platformProduct.platform as EcommercePlatform;
        const currentPrice = match.platformProduct.price;

        // 获取历史价格
        const previousPrice = await this.getPreviousPrice(food.id, platform);

        if (previousPrice && previousPrice > 0) {
          const changePercentage =
            (currentPrice - previousPrice) / previousPrice;

          if (Math.abs(changePercentage) >= threshold) {
            alerts.push({
              foodId: food.id,
              foodName: food.name,
              platform,
              currentPrice,
              previousPrice,
              changePercentage: changePercentage * 100,
              alertType: changePercentage < 0 ? "price_drop" : "price_increase",
            });
          }
        }
      }
    }

    return alerts;
  }

  // 获取历史价格
  private async getPreviousPrice(
    foodId: string,
    platform: EcommercePlatform,
  ): Promise<number | null> {
    try {
      const previousHistory = await this.prisma.priceHistory.findFirst({
        where: {
          foodId,
          platform: platform as any,
        },
        orderBy: {
          recordedAt: "desc",
        },
        skip: 1, // 跳过最新的记录
      });

      return previousHistory?.unitPrice || null;
    } catch (error) {
      console.error(
        `Failed to get previous price for food ${foodId} on ${platform}:`,
        error,
      );
      return null;
    }
  }

  // 更新价格历史
  async updatePriceHistory(
    foodId: string,
    platform: EcommercePlatform,
    price: number,
    unitPrice: number,
  ): Promise<void> {
    try {
      await this.prisma.priceHistory.create({
        data: {
          foodId,
          price,
          unit,
          unitPrice,
          platform: platform as any,
          recordedAt: new Date(),
          source: "API",
        },
      });
    } catch (error) {
      console.error(
        `Failed to update price history for food ${foodId}:`,
        error,
      );
    }
  }
}
