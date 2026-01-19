import { convexClient, api } from "@/lib/convex-client";
import { EcommercePlatform } from "@/lib/services/ecommerce/types";
import type { PlatformProductInfo } from "@/lib/services/ecommerce/types";

export interface PlatformProduct {
  _id: string;
  platformProductId: string;
  platform: string;
  sku?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  specification?: Record<string, unknown>;
  weight?: number;
  volume?: number;
  unit?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  priceUnit?: string;
  stock: number;
  isInStock: boolean;
  stockStatus?: string;
  salesCount?: number;
  rating?: number;
  reviewCount?: number;
  deliveryOptions?: Record<string, unknown>;
  deliveryTime?: Record<string, unknown>;
  shippingFee?: number;
  platformData?: Record<string, unknown>;
  isValid: boolean;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PriceHistory {
  _id: string;
  foodId: string;
  price: number;
  unitPrice: number;
  unit: string;
  platform: string;
  source?: string;
  isValid: boolean;
  recordedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlatformAccount {
  _id: string;
  memberId: string;
  platform: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  platformUserId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EcommerceOrder {
  _id: string;
  memberId: string;
  platform: string;
  platformOrderId: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  estimatedDeliveryTime?: string;
  deliveryAddress?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  platformResponse?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export class ConvexEcommerceRepository {
  async searchProducts(args: {
    keyword: string;
    platform?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    products: PlatformProductInfo[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const result = await convexClient.query<{
        products: PlatformProduct[];
        total: number;
        hasMore: boolean;
      }>((api as any).ecommerce.searchProducts, args);
      return {
        products: result.products.map((p) => ({
          platformProductId: p.platformProductId,
          platform: p.platform as EcommercePlatform,
          sku: p.sku,
          name: p.name,
          description: p.description,
          brand: p.brand,
          category: p.category,
          imageUrl: p.imageUrl,
          specification: p.specification,
          weight: p.weight,
          volume: p.volume,
          unit: p.unit,
          price: p.price,
          originalPrice: p.originalPrice,
          currency: p.currency,
          priceUnit: p.priceUnit,
          stock: p.stock,
          isInStock: p.isInStock,
          stockStatus: p.stockStatus,
          salesCount: p.salesCount,
          rating: p.rating,
          reviewCount: p.reviewCount,
          deliveryOptions: p.deliveryOptions,
          deliveryTime: p.deliveryTime,
          shippingFee: p.shippingFee,
          platformData: p.platformData,
        })),
        total: result.total,
        hasMore: result.hasMore,
      };
    } catch {
      return { products: [], total: 0, hasMore: false };
    }
  }

  async getProductById(
    platform: string,
    platformProductId: string,
  ): Promise<PlatformProduct | null> {
    try {
      return await convexClient.query((api as any).ecommerce.getProductById, {
        platform,
        platformProductId,
      });
    } catch {
      return null;
    }
  }

  async upsertProduct(product: Partial<PlatformProduct>): Promise<string> {
    return await convexClient.mutation(
      (api as any).ecommerce.upsertProduct,
      product,
    );
  }

  async invalidateProduct(
    platform: string,
    platformProductId: string,
  ): Promise<void> {
    await convexClient.mutation((api as any).ecommerce.invalidateProduct, {
      platform,
      platformProductId,
    });
  }

  async getPriceHistory(args: {
    foodId: string;
    platform?: string;
    days?: number;
    limit?: number;
  }): Promise<PriceHistory[]> {
    try {
      return await convexClient.query(
        (api as any).ecommerce.getPriceHistory,
        args,
      );
    } catch {
      return [];
    }
  }

  async addPriceHistory(args: {
    foodId: string;
    price: number;
    unitPrice: number;
    unit: string;
    platform: string;
    source?: string;
  }): Promise<string> {
    return await convexClient.mutation(
      (api as any).ecommerce.addPriceHistory,
      args,
    );
  }

  async getOrCreatePlatformAccount(
    memberId: string,
    platform: string,
  ): Promise<PlatformAccount | null> {
    try {
      return await convexClient.query(
        (api as any).ecommerce.getOrCreatePlatformAccount,
        { memberId, platform },
      );
    } catch {
      return null;
    }
  }

  async upsertPlatformAccount(account: {
    memberId: string;
    platform: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: number;
    platformUserId?: string;
  }): Promise<string> {
    return await convexClient.mutation(
      (api as any).ecommerce.upsertPlatformAccount,
      account,
    );
  }

  async createOrder(order: {
    memberId: string;
    platform: string;
    platformOrderId: string;
    status: string;
    subtotal: number;
    shippingFee: number;
    discount: number;
    totalAmount: number;
    estimatedDeliveryTime?: string;
    deliveryAddress?: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    platformResponse?: Record<string, unknown>;
  }): Promise<string> {
    return await convexClient.mutation(
      (api as any).ecommerce.createOrder,
      order,
    );
  }

  async getOrders(args: {
    memberId: string;
    platform?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: EcommerceOrder[]; total: number }> {
    try {
      return await convexClient.query((api as any).ecommerce.getOrders, args);
    } catch {
      return { orders: [], total: 0 };
    }
  }

  async getOrderByPlatformId(
    platform: string,
    platformOrderId: string,
  ): Promise<EcommerceOrder | null> {
    try {
      return await convexClient.query(
        (api as any).ecommerce.getOrderByPlatformId,
        {
          platform,
          platformOrderId,
        },
      );
    } catch {
      return null;
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await convexClient.mutation((api as any).ecommerce.updateOrderStatus, {
      orderId,
      status,
    });
  }
}

export const convexEcommerceRepository = new ConvexEcommerceRepository();
