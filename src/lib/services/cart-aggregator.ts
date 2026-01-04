import { PrismaClient } from "@prisma/client";
import { PriceComparator, PriceComparisonConfig } from "./price-comparator";
import {
  CartAggregationResult,
  CartItem,
  CartRecommendation,
  SKUMatchResult,
  PlatformProductInfo,
  DeliveryAddress,
  OrderItem,
  PlatformError,
  PlatformErrorType,
} from "./ecommerce/types";
import { EcommercePlatform, Food } from "@prisma/client";

export interface CartAggregationConfig {
  includeShipping: boolean;
  minConfidence: number;
  maxResultsPerItem: number;
  considerDiscounts: boolean;
  preferInStock: boolean;
  allowCrossPlatform: boolean;
  optimizeFor: "price" | "speed" | "balance";
}

export interface PlatformCart {
  platform: EcommercePlatform;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  estimatedDeliveryTime: string;
}

export class CartAggregator {
  private prisma: PrismaClient;
  private priceComparator: PriceComparator;

  // 平台配送时间配置（分钟）
  private deliveryTimes: Record<EcommercePlatform, number> = {
    [EcommercePlatform.SAMS_CLUB]: 1440, // 24小时
    [EcommercePlatform.HEMA]: 30, // 30分钟
    [EcommercePlatform.DINGDONG]: 29, // 29分钟
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.priceComparator = new PriceComparator(prisma);
  }

  // 主要购物车聚合方法
  async aggregateCart(
    foods: Food[],
    quantities: Map<string, number>,
    address: DeliveryAddress,
    config: Partial<CartAggregationConfig> = {},
  ): Promise<CartAggregationResult> {
    const finalConfig: CartAggregationConfig = {
      includeShipping: true,
      minConfidence: 0.6,
      maxResultsPerItem: 3,
      considerDiscounts: true,
      preferInStock: true,
      allowCrossPlatform: true,
      optimizeFor: "balance",
      ...config,
    };

    try {
      // 1. 为每个食材生成购物车项
      const cartItems = await this.generateCartItems(
        foods,
        quantities,
        finalConfig,
      );

      // 2. 优化平台选择
      const optimizedItems = await this.optimizePlatformSelection(
        cartItems,
        address,
        finalConfig,
      );

      // 3. 计算平台汇总
      const platformTotals = this.calculatePlatformTotals(
        optimizedItems,
        finalConfig,
      );

      // 4. 生成推荐
      const recommendations = await this.generateRecommendations(
        optimizedItems,
        platformTotals,
        finalConfig,
      );

      // 5. 计算总价
      const grandTotal = Object.values(platformTotals).reduce(
        (sum, total) => sum + total.total,
        0,
      );

      return {
        items: optimizedItems,
        totalByPlatform: platformTotals,
        grandTotal,
        recommendations,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to aggregate cart: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 生成购物车项
  private async generateCartItems(
    foods: Food[],
    quantities: Map<string, number>,
    config: CartAggregationConfig,
  ): Promise<CartItem[]> {
    const cartItems: CartItem[] = [];

    for (const food of foods) {
      const quantity = quantities.get(food.id) || 1;

      // 获取价格比较结果
      const priceComparison = await this.priceComparator.compareSingleFood(
        food,
        {
          includeShipping: false, // 配送费在聚合时统一计算
          minConfidence: config.minConfidence,
          maxResultsPerFood: config.maxResultsPerItem,
          considerDiscounts: config.considerDiscounts,
          preferInStock: config.preferInStock,
        },
      );

      if (priceComparison.matches.length === 0) {
        console.warn(`No matching products found for food: ${food.name}`);
        continue;
      }

      const cartItem: CartItem = {
        foodId: food.id,
        foodName: food.name,
        quantity,
        matches: priceComparison.matches,
        selectedPlatform: undefined,
        selectedProduct: undefined,
      };

      cartItems.push(cartItem);
    }

    return cartItems;
  }

  // 优化平台选择
  private async optimizePlatformSelection(
    cartItems: CartItem[],
    address: DeliveryAddress,
    config: CartAggregationConfig,
  ): Promise<CartItem[]> {
    if (!config.allowCrossPlatform) {
      // 单平台模式：选择最优平台
      return this.optimizeForSinglePlatform(cartItems, config);
    }

    // 跨平台模式：为每个商品选择最优平台
    return this.optimizeForCrossPlatform(cartItems, config);
  }

  // 单平台优化
  private async optimizeForSinglePlatform(
    cartItems: CartItem[],
    config: CartAggregationConfig,
  ): Promise<CartItem[]> {
    // 计算每个平台的总价
    const platformScores = await this.calculatePlatformScores(
      cartItems,
      config,
    );

    // 选择最优平台
    const bestPlatform = Object.entries(platformScores).reduce(
      (best, [platform, score]) => {
        return score.totalCost < best.score.totalCost
          ? { platform, score }
          : best;
      },
      {
        platform: "",
        score: { totalCost: Infinity, deliveryTime: Infinity, itemCount: 0 },
      },
    );

    if (!bestPlatform.platform) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: "No suitable platform found for cart optimization",
      });
    }

    // 为所有商品选择最优平台
    return cartItems.map((item) => {
      const platformMatch = item.matches.find(
        (match) => match.platformProduct.platform === bestPlatform.platform,
      );

      if (platformMatch) {
        return {
          ...item,
          selectedPlatform: platformMatch.platformProduct
            .platform as EcommercePlatform,
          selectedProduct: platformMatch.platformProduct,
        };
      }

      return item;
    });
  }

  // 跨平台优化
  private async optimizeForCrossPlatform(
    cartItems: CartItem[],
    config: CartAggregationConfig,
  ): Promise<CartItem[]> {
    return cartItems.map((item) => {
      if (item.matches.length === 0) {
        return item;
      }

      // 根据优化策略选择最佳匹配
      let bestMatch = item.matches[0];

      switch (config.optimizeFor) {
        case "price":
          bestMatch = item.matches.reduce((best, current) => {
            const currentPrice =
              (current.platformProduct as any).totalPrice ||
              current.platformProduct.price;
            const bestPrice =
              (best.platformProduct as any).totalPrice ||
              best.platformProduct.price;
            return currentPrice < bestPrice ? current : best;
          });
          break;

        case "speed":
          bestMatch = item.matches.reduce((best, current) => {
            const currentDelivery =
              this.deliveryTimes[
                current.platformProduct.platform as EcommercePlatform
              ];
            const bestDelivery =
              this.deliveryTimes[
                best.platformProduct.platform as EcommercePlatform
              ];
            return currentDelivery < bestDelivery ? current : best;
          });
          break;

        case "balance":
        default:
          // 综合评分（已在PriceComparator中计算）
          bestMatch = item.matches.reduce((best, current) => {
            const currentValue =
              (current.platformProduct as any).valueScore || 0;
            const bestValue = (best.platformProduct as any).valueScore || 0;
            return currentValue > bestValue ? current : best;
          });
          break;
      }

      return {
        ...item,
        selectedPlatform: bestMatch.platformProduct
          .platform as EcommercePlatform,
        selectedProduct: bestMatch.platformProduct,
      };
    });
  }

  // 计算平台评分
  private async calculatePlatformScores(
    cartItems: CartItem[],
    config: CartAggregationConfig,
  ): Promise<
    Record<
      string,
      {
        totalCost: number;
        deliveryTime: number;
        itemCount: number;
      }
    >
  > {
    const platformScores: Record<
      string,
      {
        totalCost: number;
        deliveryTime: number;
        itemCount: number;
      }
    > = {};

    for (const item of cartItems) {
      for (const match of item.matches) {
        const platform = match.platformProduct.platform;
        const price =
          (match.platformProduct as any).totalPrice ||
          match.platformProduct.price;
        const deliveryTime = this.deliveryTimes[platform as EcommercePlatform];

        if (!platformScores[platform]) {
          platformScores[platform] = {
            totalCost: 0,
            deliveryTime: deliveryTime,
            itemCount: 0,
          };
        }

        platformScores[platform].totalCost += price * item.quantity;
        platformScores[platform].itemCount += item.quantity;
      }
    }

    return platformScores;
  }

  // 计算平台汇总
  private calculatePlatformTotals(
    cartItems: CartItem[],
    config: CartAggregationConfig,
  ): Record<
    EcommercePlatform,
    {
      subtotal: number;
      shippingFee: number;
      total: number;
      itemCount: number;
    }
  > {
    const platformTotals: Record<
      EcommercePlatform,
      {
        subtotal: number;
        shippingFee: number;
        total: number;
        itemCount: number;
      }
    > = {} as any;

    // 初始化平台汇总
    const platforms = [
      EcommercePlatform.SAMS_CLUB,
      EcommercePlatform.HEMA,
      EcommercePlatform.DINGDONG,
    ];
    platforms.forEach((platform) => {
      platformTotals[platform] = {
        subtotal: 0,
        shippingFee: 0,
        total: 0,
        itemCount: 0,
      };
    });

    // 计算每个平台的汇总
    cartItems.forEach((item) => {
      if (item.selectedProduct && item.selectedPlatform) {
        const platform = item.selectedPlatform;
        const price =
          (item.selectedProduct as any).totalPrice ||
          item.selectedProduct.price;
        const itemTotal = price * item.quantity;

        platformTotals[platform].subtotal += itemTotal;
        platformTotals[platform].itemCount += item.quantity;
      }
    });

    // 计算配送费和总价
    Object.entries(platformTotals).forEach(([platform, total]) => {
      if (config.includeShipping) {
        total.shippingFee = this.calculatePlatformShippingFee(
          platform as EcommercePlatform,
          total.subtotal,
          total.itemCount,
        );
      }
      total.total = total.subtotal + total.shippingFee;
    });

    return platformTotals;
  }

  // 计算平台配送费
  private calculatePlatformShippingFee(
    platform: EcommercePlatform,
    subtotal: number,
    itemCount: number,
  ): number {
    const shippingRules = {
      [EcommercePlatform.SAMS_CLUB]: {
        baseFee: 6,
        freeThreshold: 99,
        itemFee: 0,
      },
      [EcommercePlatform.HEMA]: {
        baseFee: 0,
        freeThreshold: 0,
        itemFee: 0,
      },
      [EcommercePlatform.DINGDONG]: {
        baseFee: 3,
        freeThreshold: 39,
        itemFee: 1,
      },
    };

    const rule = shippingRules[platform];

    // 检查是否满足免运费条件
    if (rule.freeThreshold > 0 && subtotal >= rule.freeThreshold) {
      return 0;
    }

    // 计算配送费
    let shippingFee = rule.baseFee;

    // 叮咚买菜按商品数量收费
    if (platform === EcommercePlatform.DINGDONG && itemCount > 1) {
      shippingFee += (itemCount - 1) * rule.itemFee;
    }

    return shippingFee;
  }

  // 生成推荐
  private async generateRecommendations(
    cartItems: CartItem[],
    platformTotals: Record<EcommercePlatform, any>,
    config: CartAggregationConfig,
  ): Promise<CartRecommendation[]> {
    const recommendations: CartRecommendation[] = [];

    // 1. 价格优化推荐
    const priceRecommendation = this.generatePriceOptimizationRecommendation(
      cartItems,
      platformTotals,
    );
    if (priceRecommendation) {
      recommendations.push(priceRecommendation);
    }

    // 2. 平台整合推荐
    const consolidationRecommendation =
      this.generatePlatformConsolidationRecommendation(platformTotals);
    if (consolidationRecommendation) {
      recommendations.push(consolidationRecommendation);
    }

    // 3. 替代商品推荐
    const substitutionRecommendations =
      await this.generateSubstitutionRecommendations(cartItems);
    recommendations.push(...substitutionRecommendations);

    return recommendations;
  }

  // 生成价格优化推荐
  private generatePriceOptimizationRecommendation(
    cartItems: CartItem[],
    platformTotals: Record<EcommercePlatform, any>,
  ): CartRecommendation | null {
    // 找出最贵的平台
    const expensivePlatform = Object.entries(platformTotals).reduce(
      (expensive, [platform, total]) => {
        return total.total > expensive.total.total
          ? { platform, total }
          : expensive;
      },
      { platform: "", total: { total: 0 } },
    );

    if (expensivePlatform.total.total > 0) {
      const potentialSavings = Math.round(expensivePlatform.total.total * 0.1); // 假设可以节省10%

      return {
        type: "price_optimization",
        message: `考虑将${expensivePlatform.platform}的部分商品更换为其他平台，预计可节省¥${potentialSavings}`,
        potentialSavings,
        suggestedActions: [
          "查看其他平台的同类商品价格",
          "考虑使用优惠券或促销活动",
          "调整购买数量以达到免运费门槛",
        ],
      };
    }

    return null;
  }

  // 生成平台整合推荐
  private generatePlatformConsolidationRecommendation(
    platformTotals: Record<EcommercePlatform, any>,
  ): CartRecommendation | null {
    const activePlatforms = Object.entries(platformTotals).filter(
      ([_, total]) => total.itemCount > 0,
    );

    if (activePlatforms.length > 2) {
      return {
        type: "platform_consolidation",
        message: `您的购物车分布在${activePlatforms.length}个平台，考虑整合到1-2个平台可以节省配送费`,
        suggestedActions: [
          "选择商品最多的平台作为主要购买平台",
          "比较跨平台价格差异",
          "考虑配送时间要求",
        ],
      };
    }

    return null;
  }

  // 生成替代商品推荐
  private async generateSubstitutionRecommendations(
    cartItems: CartItem[],
  ): Promise<CartRecommendation[]> {
    const recommendations: CartRecommendation[] = [];

    for (const item of cartItems) {
      // 检查是否有更便宜的替代品
      if (item.matches.length > 1) {
        const cheapest = item.matches.reduce((cheapest, current) => {
          const currentPrice =
            (current.platformProduct as any).totalPrice ||
            current.platformProduct.price;
          const cheapestPrice =
            (cheapest.platformProduct as any).totalPrice ||
            cheapest.platformProduct.price;
          return currentPrice < cheapestPrice ? current : cheapest;
        });

        const selected = item.selectedProduct;
        if (selected && cheapest.platformProduct.id !== selected.id) {
          const selectedPrice = (selected as any).totalPrice || selected.price;
          const cheapestPrice =
            (cheapest.platformProduct as any).totalPrice ||
            cheapest.platformProduct.price;
          const savings = selectedPrice - cheapestPrice;

          if (savings > 5) {
            // 节省超过5元才推荐
            recommendations.push({
              type: "substitution",
              message: `${item.foodName}：选择${cheapest.platformProduct.name}可节省¥${savings.toFixed(2)}`,
              potentialSavings: savings,
              suggestedActions: [
                `考虑更换为${cheapest.platformProduct.platform}平台的${cheapest.platformProduct.name}`,
                "注意查看商品规格和品牌差异",
              ],
            });
          }
        }
      }
    }

    return recommendations;
  }

  // 创建订单
  async createOrders(
    cartItems: CartItem[],
    address: DeliveryAddress,
    paymentMethod: string = "wechat_pay",
  ): Promise<
    Array<{
      platform: EcommercePlatform;
      orderId: string;
      total: number;
      estimatedDeliveryTime: string;
    }>
  > {
    const platformCarts = this.groupItemsByPlatform(cartItems);
    const orders: Array<{
      platform: EcommercePlatform;
      orderId: string;
      total: number;
      estimatedDeliveryTime: string;
    }> = [];

    for (const [platform, cart] of platformCarts.entries()) {
      try {
        // 这里需要调用相应的平台适配器创建订单
        // 由于需要认证token，这里只是示例实现
        const orderResult = await this.createPlatformOrder(
          platform,
          cart.items,
          address,
          paymentMethod,
        );

        orders.push({
          platform,
          orderId: orderResult.platformOrderId,
          total: cart.total,
          estimatedDeliveryTime: cart.estimatedDeliveryTime,
        });
      } catch (error) {
        console.error(
          `Failed to create order for platform ${platform}:`,
          error,
        );
        throw new PlatformError({
          type: PlatformErrorType.PLATFORM_ERROR,
          message: `Failed to create order for ${platform}: ${error.message}`,
          details: { platform, originalError: error },
        });
      }
    }

    return orders;
  }

  // 按平台分组商品
  private groupItemsByPlatform(
    cartItems: CartItem[],
  ): Map<EcommercePlatform, PlatformCart> {
    const platformCarts = new Map<EcommercePlatform, PlatformCart>();

    cartItems.forEach((item) => {
      if (item.selectedPlatform && item.selectedProduct) {
        const platform = item.selectedPlatform;

        if (!platformCarts.has(platform)) {
          platformCarts.set(platform, {
            platform,
            items: [],
            subtotal: 0,
            shippingFee: 0,
            total: 0,
            estimatedDeliveryTime: this.formatDeliveryTime(
              this.deliveryTimes[platform],
            ),
          });
        }

        const cart = platformCarts.get(platform)!;
        const orderItem: OrderItem = {
          platformProductId: item.selectedProduct.platformProductId,
          name: item.selectedProduct.name,
          quantity: item.quantity,
          price: item.selectedProduct.price,
          subtotal: item.selectedProduct.price * item.quantity,
          specification: item.selectedProduct.specification,
        };

        cart.items.push(orderItem);
        cart.subtotal += orderItem.subtotal;
      }
    });

    // 计算配送费和总价
    platformCarts.forEach((cart) => {
      cart.shippingFee = this.calculatePlatformShippingFee(
        cart.platform,
        cart.subtotal,
        cart.items.length,
      );
      cart.total = cart.subtotal + cart.shippingFee;
    });

    return platformCarts;
  }

  // 创建平台订单（示例实现）
  private async createPlatformOrder(
    platform: EcommercePlatform,
    items: OrderItem[],
    address: DeliveryAddress,
    paymentMethod: string,
  ): Promise<{ platformOrderId: string }> {
    // 这里需要实际调用平台适配器
    // 由于需要用户认证token，这里只是返回模拟结果
    const mockOrderId = `${platform.toUpperCase()}_${Date.now()}`;

    return {
      platformOrderId: mockOrderId,
    };
  }

  // 格式化配送时间
  private formatDeliveryTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}分钟`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours}小时`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days}天`;
    }
  }
}
