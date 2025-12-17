import { PrismaClient } from '@prisma/client';
import { Food, PriceHistory, PriceSource } from '@prisma/client';
import type {
  PlatformConfig,
  PlatformPriceInfo,
  FoodPlatformMapping,
  PlatformBreakdownGroup,
  PlatformBreakdownItem,
  MixedPlatformOption,
  TrendAnalysis,
  PricePrediction,
} from '@/types/service-types';

const prisma = new PrismaClient();

export interface PriceData {
  date: Date
  price: number
  unitPrice: number
  platform: string
}

export interface PriceTrend {
  foodId: string
  foodName: string
  category: string
  currentPrice: number
  averagePrice: number
  minPrice: number
  maxPrice: number
  priceChange: {
    daily: number // 日变化
    weekly: number // 周变化
    monthly: number // 月变化
  }
  trend: {
    direction: 'UP' | 'DOWN' | 'STABLE'
    slope: number // 线性回归斜率
    confidence: number // 置信度 0-1
  }
  prediction: {
    next7Days: number[]
    expectedMin: number
    expectedMax: number
  }
  recommendations: string[]
}

export interface PlatformComparison {
  foodId: string
  foodName: string
  platforms: {
    platform: string
    currentPrice: number
    unitPrice: number
    priceHistory: PriceData[]
    trend: 'UP' | 'DOWN' | 'STABLE'
    reliability: number // 数据可靠性 0-1
    shippingCost?: number // 运费
    freeShippingThreshold?: number // 免运费门槛
    discountInfo?: {
      type: 'PERCENTAGE' | 'FIXED' | 'THRESHOLD'
      value: number
      description: string
    }
  }[]
  bestPlatform: {
    name: string
    unitPrice: number
    totalCost: number // 包含运费的总成本
    savings: number // 相比平均价格的节省百分比
  }
  recommendation: string
  bulkOptimization?: {
    platforms: string[] // 推荐的平台组合
    totalCost: number
    savings: number
    breakdown: Array<{
      platform: string
      items: string[]
      cost: number
    }>
  }
}

export interface PriceAlert {
  foodId: string
  foodName: string
  type: 'SPIKE' | 'DROP' | 'OPPORTUNITY' | 'WARNING'
  message: string
  currentPrice: number
  expectedPrice: number
  deviation: number // 偏差百分比
  urgency: 'LOW' | 'MEDIUM' | 'HIGH'
  action: string
}

export class PriceAnalyzer {
  /**
   * 获取食物价格趋势分析
   */
  async getPriceTrend(foodId: string, days: number = 30): Promise<PriceTrend> {
    const food = await prisma.food.findUnique({
      where: { id: foodId },
      include: {
        priceHistories: {
          where: { 
            isValid: true,
            recordedAt: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { recordedAt: 'asc' },
        },
      },
    });

    if (!food) {
      throw new Error('食物不存在');
    }

    if (food.priceHistories.length < 3) {
      throw new Error('价格数据不足，无法分析趋势');
    }

    const prices = food.priceHistories.map(ph => ({
      date: ph.recordedAt,
      price: ph.price,
      unitPrice: ph.unitPrice,
      platform: ph.platform,
    }));

    const currentPrice = prices[prices.length - 1].unitPrice;
    const averagePrice = prices.reduce((sum, p) => sum + p.unitPrice, 0) / prices.length;
    const minPrice = Math.min(...prices.map(p => p.unitPrice));
    const maxPrice = Math.max(...prices.map(p => p.unitPrice));

    // 计算价格变化
    const priceChange = this.calculatePriceChanges(prices);

    // 计算趋势
    const trend = this.calculateTrend(prices);

    // 预测未来价格
    const prediction = this.predictPrices(prices);

    // 生成建议
    const recommendations = this.generateRecommendations(
      currentPrice, 
      averagePrice, 
      trend, 
      prediction
    );

    return {
      foodId: food.id,
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

  /**
   * 跨平台价格比较（增强版）
   */
  async getPlatformComparison(foodId: string, quantity: number = 1): Promise<PlatformComparison> {
    const food = await prisma.food.findUnique({
      where: { id: foodId },
      include: {
        priceHistories: {
          where: { isValid: true },
          orderBy: { recordedAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!food) {
      throw new Error('食物不存在');
    }

    // 按平台分组价格数据
    const platformData: { [key: string]: PriceData[] } = {};
    
    for (const price of food.priceHistories) {
      if (!platformData[price.platform]) {
        platformData[price.platform] = [];
      }
      platformData[price.platform].push({
        date: price.recordedAt,
        price: price.price,
        unitPrice: price.unitPrice,
        platform: price.platform,
      });
    }

    // 分析每个平台
    const platforms = [];
    for (const [platform, priceHistory] of Object.entries(platformData)) {
      if (priceHistory.length < 2) continue;

      const currentPrice = priceHistory[0].unitPrice;
      const trend = this.calculateTrend(priceHistory);
      const reliability = Math.min(1, priceHistory.length / 10);
      
      // 获取平台运费和优惠信息
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

    // 计算包含运费的总成本
    const platformsWithCost = platforms.map(p => {
      const itemCost = p.unitPrice * quantity;
      const totalCost = this.calculateTotalCost(itemCost, p.shippingCost, p.freeShippingThreshold);
      
      return {
        ...p,
        totalCost,
      };
    });

    // 找出最优平台（基于总成本）
    const sortedByCost = platformsWithCost.sort((a, b) => a.totalCost - b.totalCost);
    const bestPlatform = sortedByCost[0];
    
    if (bestPlatform && platforms.length > 1) {
      const avgTotalCost = platformsWithCost.reduce((sum, p) => sum + p.totalCost, 0) / platformsWithCost.length;
      bestPlatform.savings = ((avgTotalCost - bestPlatform.totalCost) / avgTotalCost) * 100;
      bestPlatform.totalCost = bestPlatform.totalCost;
    }

    // 生成推荐
    const recommendation = this.generatePlatformRecommendation(platforms, bestPlatform);

    return {
      foodId: food.id,
      foodName: food.name,
      platforms,
      bestPlatform,
      recommendation,
    };
  }

  /**
   * 多食材组合购买优化
   */
  async optimizeBulkPurchase(foodIds: string[]): Promise<{
    combinations: Array<{
      platform: string
      items: Array<{
        foodId: string
        foodName: string
        quantity: number
        unitPrice: number
        itemCost: number
      }>
      subtotal: number
      shippingCost: number
      totalCost: number
    }>
    bestCombination: {
      platform: string
      totalCost: number
      savings: number
      items: PlatformBreakdownItem[]
    }
    mixedPlatformOption?: {
      platforms: string[]
      totalCost: number
      savings: number
      breakdown: Array<{
        platform: string
        items: PlatformBreakdownItem[]
        cost: number
      }>
    }
  }> {
    // 获取所有食物的平台价格信息
    const foodPlatforms = await Promise.all(
      foodIds.map(async (foodId) => {
        const comparison = await this.getPlatformComparison(foodId, 1);
        return {
          foodId,
          foodName: comparison.foodName,
          platforms: comparison.platforms,
        };
      })
    );

    // 生成单平台购买方案
    const singlePlatformOptions = await this.generateSinglePlatformOptions(foodPlatforms);
    
    // 生成跨平台组合方案
    const mixedPlatformOption = await this.generateMixedPlatformOption(foodPlatforms);

    // 找出最优方案
    const allOptions = [...singlePlatformOptions];
    if (mixedPlatformOption) {
      allOptions.push({
        platform: '跨平台组合',
        items: mixedPlatformOption.breakdown.flatMap(b => b.items),
        subtotal: mixedPlatformOption.breakdown.reduce((sum, b) => sum + b.cost, 0),
        shippingCost: mixedPlatformOption.breakdown.reduce((sum, b) => sum + (b.cost > 99 ? 0 : 12), 0), // 简化运费计算
        totalCost: mixedPlatformOption.totalCost,
      });
    }

    const sortedOptions = allOptions.sort((a, b) => a.totalCost - b.totalCost);
    const bestOption = sortedOptions[0];

    if (bestOption && allOptions.length > 1) {
      const avgCost = allOptions.reduce((sum, o) => sum + o.totalCost, 0) / allOptions.length;
      bestOption.savings = ((avgCost - bestOption.totalCost) / avgCost) * 100;
    }

    return {
      combinations: singlePlatformOptions,
      bestCombination: bestOption,
      mixedPlatformOption,
    };
  }

  /**
   * 获取平台信息（运费、优惠等）
   */
  private async getPlatformInfo(platform: string): Promise<{
    shippingCost: number
    freeShippingThreshold: number
    discountInfo?: {
      type: 'PERCENTAGE' | 'FIXED' | 'THRESHOLD'
      value: number
      description: string
    }
  }> {
    // 模拟平台配置数据（实际应用中从配置或API获取）
    const platformConfigs: Record<string, PlatformConfig> = {
      '山姆会员商店': {
        shippingCost: 15,
        freeShippingThreshold: 299,
        discountInfo: {
          type: 'THRESHOLD',
          value: 299,
          description: '满29元免运费',
        },
      },
      '盒马鲜生': {
        shippingCost: 12,
        freeShippingThreshold: 99,
        discountInfo: {
          type: 'THRESHOLD',
          value: 99,
          description: '满99元免运费',
        },
      },
      '叮咚买菜': {
        shippingCost: 8,
        freeShippingThreshold: 59,
        discountInfo: {
          type: 'THRESHOLD',
          value: 59,
          description: '满59元免运费',
        },
      },
      '每日优鲜': {
        shippingCost: 10,
        freeShippingThreshold: 79,
        discountInfo: {
          type: 'PERCENTAGE',
          value: 10,
          description: '新用户首单9折',
        },
      },
    };

    return platformConfigs[platform] || {
      shippingCost: 12,
      freeShippingThreshold: 99,
    };
  }

  /**
   * 计算总成本（包含运费）
   */
  private calculateTotalCost(itemCost: number, shippingCost?: number, freeShippingThreshold?: number): number {
    if (!shippingCost || !freeShippingThreshold) {
      return itemCost;
    }

    return itemCost >= freeShippingThreshold ? itemCost : itemCost + shippingCost;
  }

  /**
   * 生成单平台购买方案
   */
  private async generateSinglePlatformOptions(foodPlatforms: FoodPlatformMapping[]): Promise<Array<{
    platform: string;
    items: PlatformBreakdownItem[];
    subtotal: number;
    shippingCost: number;
    totalCost: number;
    savings?: number;
  }>> {
    // 获取所有涉及的平台
    const allPlatforms = new Set<string>();
    foodPlatforms.forEach(fp => {
      fp.platforms.forEach((p: PlatformPriceInfo) => allPlatforms.add(p.platform));
    });

    const options: Array<{
      platform: string;
      items: PlatformBreakdownItem[];
      subtotal: number;
      shippingCost: number;
      totalCost: number;
      savings?: number;
    }> = [];

    // 为每个平台生成购买方案
    for (const platform of allPlatforms) {
      const items: PlatformBreakdownItem[] = [];
      let subtotal = 0;

      for (const fp of foodPlatforms) {
        const platformInfo = fp.platforms.find((p: PlatformPriceInfo) => p.platform === platform);
        if (platformInfo) {
          const item = {
            foodId: fp.foodId,
            foodName: fp.foodName,
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
        const shippingCost = this.calculateShippingCost(subtotal, platformData.shippingCost, platformData.freeShippingThreshold);
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

  /**
   * 生成跨平台组合方案
   */
  private async generateMixedPlatformOption(foodPlatforms: FoodPlatformMapping[]): Promise<MixedPlatformOption | null> {
    const breakdown: PlatformBreakdownGroup[] = [];
    let totalCost = 0;

    for (const fp of foodPlatforms) {
      // 找出该食物最便宜的平台
      const sortedPlatforms = [...fp.platforms].sort((a: PlatformPriceInfo, b: PlatformPriceInfo) => a.unitPrice - b.unitPrice);
      const cheapestPlatform = sortedPlatforms[0];

      if (!cheapestPlatform) continue;

      // 查找是否已有该平台的分组
      let platformGroup = breakdown.find((b: PlatformBreakdownGroup) => b.platform === cheapestPlatform.platform);
      
      if (!platformGroup) {
        const platformData = await this.getPlatformInfo(cheapestPlatform.platform);
        platformGroup = {
          platform: cheapestPlatform.platform,
          items: [],
          cost: 0,
          shippingCost: platformData.shippingCost,
          freeShippingThreshold: platformData.freeShippingThreshold,
        };
        breakdown.push(platformGroup);
      }

      const item: PlatformBreakdownItem = {
        foodId: fp.foodId,
        foodName: fp.foodName,
        quantity: 1,
        unitPrice: cheapestPlatform.unitPrice,
        itemCost: cheapestPlatform.unitPrice,
      };

      platformGroup.items.push(item);
      platformGroup.cost += item.itemCost;
    }

    // 计算各平台运费
    for (const group of breakdown) {
      const shippingCost = this.calculateShippingCost(
        group.cost, 
        group.shippingCost, 
        group.freeShippingThreshold
      );
      group.totalCost = group.cost + shippingCost;
      totalCost += group.totalCost;
    }

    if (breakdown.length === 0) return null;

    return {
      platforms: breakdown.map((b: PlatformBreakdownGroup) => b.platform),
      totalCost,
      savings: 0, // 需要与单平台方案比较计算
      breakdown,
    };
  }

  /**
   * 计算运费
   */
  private calculateShippingCost(subtotal: number, shippingCost: number, freeShippingThreshold: number): number {
    return subtotal >= freeShippingThreshold ? 0 : shippingCost;
  }

  /**
   * 获取价格预警
   */
  async getPriceAlerts(memberId?: string): Promise<PriceAlert[]> {
    const alerts: PriceAlert[] = [];

    // 获取最近有价格变化的食物
    const recentPrices = await prisma.priceHistory.findMany({
      where: {
        recordedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
        },
        isValid: true,
      },
      include: {
        food: true,
      },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    // 按食物分组
    const foodPrices: { [key: string]: PriceHistory[] } = {};
    for (const price of recentPrices) {
      if (!foodPrices[price.foodId]) {
        foodPrices[price.foodId] = [];
      }
      foodPrices[price.foodId].push(price);
    }

    // 分析每个食物的价格异常
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

  /**
   * 批量更新价格数据
   */
  async updatePriceData(priceUpdates: {
    foodId: string
    price: number
    unit: string
    platform: string
    source?: PriceSource
  }[]): Promise<void> {
    const updates = priceUpdates.map(update => ({
      ...update,
      unitPrice: this.calculateUnitPrice(update.price, update.unit),
      source: update.source || PriceSource.USER_REPORT,
    }));

    await prisma.priceHistory.createMany({
      data: updates,
    });
  }

  /**
   * 计算价格变化
   */
  private calculatePriceChanges(prices: PriceData[]): {
    daily: number
    weekly: number
    monthly: number
  } {
    const latest = prices[prices.length - 1];
    const daily = this.findPriceAtDaysAgo(prices, 1);
    const weekly = this.findPriceAtDaysAgo(prices, 7);
    const monthly = this.findPriceAtDaysAgo(prices, 30);

    return {
      daily: daily ? ((latest.unitPrice - daily.unitPrice) / daily.unitPrice) * 100 : 0,
      weekly: weekly ? ((latest.unitPrice - weekly.unitPrice) / weekly.unitPrice) * 100 : 0,
      monthly: monthly ? ((latest.unitPrice - monthly.unitPrice) / monthly.unitPrice) * 100 : 0,
    };
  }

  /**
   * 查找指定天数前的价格
   */
  private findPriceAtDaysAgo(prices: PriceData[], days: number): PriceData | null {
    const targetDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    let closest = null;
    let minDiff = Infinity;

    for (const price of prices) {
      const diff = Math.abs(price.date.getTime() - targetDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = price;
      }
    }

    return closest;
  }

  /**
   * 计算价格趋势
   */
  private calculateTrend(prices: PriceData[]): {
    direction: 'UP' | 'DOWN' | 'STABLE'
    slope: number
    confidence: number
  } {
    if (prices.length < 3) {
      return { direction: 'STABLE', slope: 0, confidence: 0 };
    }

    // 简单线性回归
    const n = prices.length;
    const x = prices.map((_, i) => i);
    const y = prices.map(p => p.unitPrice);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // 计算R²值作为置信度
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const predicted = (slope * x[i]) + (meanY - slope * (sumX / n));
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
    const confidence = Math.max(0, rSquared);

    let direction: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (Math.abs(slope) > 0.01) { // 阈值可调整
      direction = slope > 0 ? 'UP' : 'DOWN';
    }

    return { direction, slope, confidence };
  }

  /**
   * 预测未来价格
   */
  private predictPrices(prices: PriceData[]): {
    next7Days: number[]
    expectedMin: number
    expectedMax: number
  } {
    if (prices.length < 5) {
      const currentPrice = prices[prices.length - 1].unitPrice;
      return {
        next7Days: Array(7).fill(currentPrice),
        expectedMin: currentPrice,
        expectedMax: currentPrice,
      };
    }

    const trend = this.calculateTrend(prices);
    const currentPrice = prices[prices.length - 1].unitPrice;
    const volatility = this.calculateVolatility(prices);

    const next7Days: number[] = [];
    for (let i = 1; i <= 7; i++) {
      const predictedPrice = currentPrice + (trend.slope * i);
      // 添加随机波动
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

  /**
   * 计算价格波动性
   */
  private calculateVolatility(prices: PriceData[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnRate = (prices[i].unitPrice - prices[i-1].unitPrice) / prices[i-1].unitPrice;
      returns.push(returnRate);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * 生成价格建议
   */
  private generateRecommendations(
    currentPrice: number,
    averagePrice: number,
    trend: TrendAnalysis,
    prediction: PricePrediction
  ): string[] {
    const recommendations: string[] = [];

    // 基于当前价格的建议
    if (currentPrice < averagePrice * 0.8) {
      recommendations.push('当前价格较低，建议适量采购');
    } else if (currentPrice > averagePrice * 1.2) {
      recommendations.push('当前价格较高，建议延后采购或寻找替代品');
    }

    // 基于趋势的建议
    if (trend.direction === 'UP' && trend.confidence > 0.7) {
      recommendations.push('价格呈上涨趋势，建议尽早采购');
    } else if (trend.direction === 'DOWN' && trend.confidence > 0.7) {
      recommendations.push('价格呈下降趋势，建议等待更低价格');
    }

    // 基于预测的建议
    const futureAvg = prediction.next7Days.reduce((sum, p) => sum + p, 0) / prediction.next7Days.length;
    if (futureAvg < currentPrice * 0.9) {
      recommendations.push('预计未来价格会下降，建议等待');
    } else if (futureAvg > currentPrice * 1.1) {
      recommendations.push('预计未来价格会上涨，建议当前采购');
    }

    return recommendations;
  }

  /**
   * 生成平台推荐
   */
  private generatePlatformRecommendation(
    platforms: PlatformPriceInfo[],
    bestPlatform: PlatformPriceInfo | null
  ): string {
    if (!bestPlatform || platforms.length < 2) {
      return '需要更多平台数据来生成推荐';
    }

    if (bestPlatform.savings > 10) {
      return `强烈推荐${bestPlatform.platform}，比其他平台便宜${bestPlatform.savings.toFixed(1)}%`;
    } else if (bestPlatform.savings > 5) {
      return `推荐${bestPlatform.platform}，价格较优`;
    } else {
      return '各平台价格相近，可根据便利性选择';
    }
  }

  /**
   * 分析价格异常
   */
  private analyzePriceAnomaly(prices: PriceHistory[]): PriceAlert | null {
    const latest = prices[0];
    const previous = prices.slice(1, 6); // 最近5个历史价格
    
    if (previous.length < 3) return null;

    const avgPrice = previous.reduce((sum, p) => sum + p.unitPrice, 0) / previous.length;
    const deviation = ((latest.unitPrice - avgPrice) / avgPrice) * 100;

    let alert: PriceAlert | null = null;

    if (deviation > 20) {
      alert = {
        foodId: latest.foodId,
        foodName: latest.food.name,
        type: 'SPIKE',
        message: `${latest.food.name}价格暴涨${deviation.toFixed(1)}%`,
        currentPrice: latest.unitPrice,
        expectedPrice: avgPrice,
        deviation,
        urgency: deviation > 50 ? 'HIGH' : 'MEDIUM',
        action: '建议延后采购或寻找替代品',
      };
    } else if (deviation < -15) {
      alert = {
        foodId: latest.foodId,
        foodName: latest.food.name,
        type: 'OPPORTUNITY',
        message: `${latest.food.name}价格下降${Math.abs(deviation).toFixed(1)}%`,
        currentPrice: latest.unitPrice,
        expectedPrice: avgPrice,
        deviation,
        urgency: 'MEDIUM',
        action: '建议及时采购，价格优惠',
      };
    }

    return alert;
  }

  /**
   * 计算单位价格
   */
  private calculateUnitPrice(price: number, unit: string): number {
    const unitMap: { [key: string]: number } = {
      'kg': 1,
      '斤': 2, // 1kg = 2斤
      'g': 0.001,
      '500g': 0.5,
      '100g': 0.1,
      '250g': 0.25,
    };

    const multiplier = unitMap[unit] || 1;
    return price / multiplier;
  }

  /**
   * 获取热门食物价格监控
   */
  async getPopularFoodsPrices(limit: number = 20): Promise<PriceTrend[]> {
    // 获取价格数据最多的食物（热门食物）
    const popularFoods = await prisma.food.findMany({
      include: {
        priceHistories: {
          where: { isValid: true },
          orderBy: { recordedAt: 'desc' },
          take: 30,
        },
        _count: {
          select: { priceHistories: true },
        },
      },
      orderBy: {
        priceHistories: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    const trends: PriceTrend[] = [];
    
    for (const food of popularFoods) {
      if (food.priceHistories.length >= 3) {
        const trend = await this.getPriceTrend(food.id);
        trends.push(trend);
      }
    }

    return trends;
  }
}

export const priceAnalyzer = new PriceAnalyzer();
