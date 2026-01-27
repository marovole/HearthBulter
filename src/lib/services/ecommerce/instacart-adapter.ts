// ============================================================================
// Instacart Connect API Adapter
// 美国市场食品杂货配送平台集成
// ============================================================================

import { BasePlatformAdapter } from "./base-adapter";
import {
  OAuthRequest,
  OAuthResponse,
  TokenExchangeRequest,
  TokenInfo,
  ProductSearchRequest,
  ProductSearchResponse,
  StockQueryRequest,
  StockQueryResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderStatusResponse,
  DeliveryAddress,
  OrderItem,
  PlatformProductInfo,
  PlatformError,
  PlatformErrorType,
  EcommercePlatform,
} from "./types";
import type { OrderStatus, DeliveryStatus } from "./types";

// ============================================================================
// Instacart 特有类型定义
// ============================================================================

export interface InstacartCartItem {
  productId: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface InstacartCart {
  cartId: string;
  items: InstacartCartItem[];
  retailerId: string;
  checkoutUrl: string;
  deepLink: string;
  expiresAt: Date;
}

export interface InstacartRetailer {
  id: string;
  name: string;
  logoUrl: string;
  isAvailable: boolean;
  deliveryFee: number;
  minOrderAmount: number;
}

// ============================================================================
// Instacart 适配器实现
// ============================================================================

export class InstacartAdapter extends BasePlatformAdapter {
  readonly platform = EcommercePlatform.INSTACART;
  readonly platformName = "Instacart";
  readonly baseUrl = process.env.INSTACART_API_URL || "https://connect.instacart.com/v2";

  private readonly clientId = process.env.INSTACART_CLIENT_ID || "";
  private readonly clientSecret = process.env.INSTACART_CLIENT_SECRET || "";
  private readonly affiliateId = process.env.INSTACART_AFFILIATE_ID || "";

  // --------------------------------------------------------------------------
  // OAuth 认证
  // --------------------------------------------------------------------------

  async getAuthorizationUrl(request: OAuthRequest): Promise<OAuthResponse> {
    const state = request.state || this.generateState();
    const scope = (request.scope || ["cart:write", "products:read"]).join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: request.redirectUri,
      scope,
      state,
    });

    return {
      authorizationUrl: `https://www.instacart.com/oauth/authorize?${params.toString()}`,
      state,
      expiresIn: 3600,
    };
  }

  async exchangeToken(request: TokenExchangeRequest): Promise<TokenInfo> {
    try {
      const response = await this.makeRequest<{
        access_token: string;
        refresh_token?: string;
        token_type: string;
        scope?: string;
        expires_in?: number;
      }>("/oauth/token", {
        method: "POST",
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: request.code,
          redirect_uri: request.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type || "Bearer",
        scope: response.scope,
        expiresAt: this.parseTokenExpiry(response.expires_in),
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to exchange token with Instacart: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenInfo> {
    try {
      const response = await this.makeRequest<{
        access_token: string;
        refresh_token?: string;
        token_type: string;
        scope?: string;
        expires_in?: number;
      }>("/oauth/token", {
        method: "POST",
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token || refreshToken,
        tokenType: response.token_type || "Bearer",
        scope: response.scope,
        expiresAt: this.parseTokenExpiry(response.expires_in),
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.TOKEN_EXPIRED,
        message: `Failed to refresh Instacart token: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 商品搜索
  // --------------------------------------------------------------------------

  async searchProducts(
    request: ProductSearchRequest,
    token: string
  ): Promise<ProductSearchResponse> {
    try {
      const params = new URLSearchParams({
        query: request.keyword,
        page: (request.page || 1).toString(),
        per_page: (request.pageSize || 20).toString(),
      });

      if (request.category) {
        params.append("department", request.category);
      }
      if (request.brand) {
        params.append("brand", request.brand);
      }

      const response = await this.makeRequest<{
        products: any[];
        meta: {
          total: number;
          page: number;
          per_page: number;
          total_pages: number;
        };
      }>(`/products/search?${params.toString()}`, {}, token);

      return {
        products: response.products.map((p) => this.standardizeProductInfo(p)),
        total: response.meta.total,
        page: response.meta.page,
        pageSize: response.meta.per_page,
        hasMore: response.meta.page < response.meta.total_pages,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to search products on Instacart: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  async getProduct(productId: string, token: string): Promise<PlatformProductInfo | null> {
    try {
      const response = await this.makeRequest<any>(`/products/${productId}`, {}, token);
      return this.standardizeProductInfo(response);
    } catch (error) {
      if (error instanceof PlatformError && error.type === PlatformErrorType.PRODUCT_NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // 库存查询
  // --------------------------------------------------------------------------

  async queryStock(request: StockQueryRequest, token: string): Promise<StockQueryResponse> {
    try {
      const response = await this.makeRequest<{
        availability: Record<string, { available: boolean; quantity?: number }>;
      }>(
        "/products/availability",
        {
          method: "POST",
          body: JSON.stringify({ product_ids: request.productIds }),
        },
        token
      );

      const stocks: StockQueryResponse["stocks"] = {};
      for (const [productId, info] of Object.entries(response.availability)) {
        stocks[productId] = {
          stock: info.quantity || (info.available ? 100 : 0),
          isInStock: info.available,
          stockStatus: info.available ? "in_stock" : "out_of_stock",
        };
      }

      return { stocks };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to query stock from Instacart: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 购物车管理 (Instacart 特有)
  // --------------------------------------------------------------------------

  async createCart(
    items: InstacartCartItem[],
    retailerId: string,
    token: string
  ): Promise<InstacartCart> {
    try {
      const response = await this.makeRequest<{
        cart_id: string;
        checkout_url: string;
        deep_link: string;
        expires_at: string;
      }>(
        "/carts",
        {
          method: "POST",
          body: JSON.stringify({
            retailer_id: retailerId,
            items: items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
              unit: item.unit,
              special_instructions: item.notes,
            })),
            affiliate_id: this.affiliateId,
          }),
        },
        token
      );

      return {
        cartId: response.cart_id,
        items,
        retailerId,
        checkoutUrl: response.checkout_url,
        deepLink: response.deep_link,
        expiresAt: new Date(response.expires_at),
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to create Instacart cart: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  async getAvailableRetailers(zipCode: string, token: string): Promise<InstacartRetailer[]> {
    try {
      const response = await this.makeRequest<{
        retailers: Array<{
          id: string;
          name: string;
          logo_url: string;
          is_available: boolean;
          delivery_fee: number;
          min_order_amount: number;
        }>;
      }>(`/retailers?zip_code=${zipCode}`, {}, token);

      return response.retailers.map((r) => ({
        id: r.id,
        name: r.name,
        logoUrl: r.logo_url,
        isAvailable: r.is_available,
        deliveryFee: r.delivery_fee,
        minOrderAmount: r.min_order_amount,
      }));
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get retailers from Instacart: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  generateDeepLink(cartId: string): string {
    return `instacart://cart/${cartId}?affiliate_id=${this.affiliateId}`;
  }

  generateWebCheckoutUrl(cartId: string): string {
    return `https://www.instacart.com/store/checkout/${cartId}?affiliate_id=${this.affiliateId}`;
  }

  // --------------------------------------------------------------------------
  // 订单管理 (Instacart Connect 不直接创建订单，而是跳转结算)
  // --------------------------------------------------------------------------

  async createOrder(request: CreateOrderRequest, token: string): Promise<CreateOrderResponse> {
    // Instacart 模式：创建购物车 → 生成结算链接 → 用户在 Instacart 完成支付
    const cartItems: InstacartCartItem[] = request.items.map((item) => ({
      productId: item.platformProductId,
      quantity: item.quantity,
    }));

    // 默认使用第一个可用零售商
    const zipCode = request.deliveryAddress.postalCode || "10001";
    const retailers = await this.getAvailableRetailers(zipCode, token);
    const retailer = retailers.find((r) => r.isAvailable);

    if (!retailer) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: "No available retailers in your area",
        details: { zipCode },
      });
    }

    const cart = await this.createCart(cartItems, retailer.id, token);

    const subtotal = request.items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      platformOrderId: cart.cartId,
      status: "PENDING_PAYMENT" as OrderStatus,
      totalAmount: subtotal + retailer.deliveryFee,
      subtotal,
      shippingFee: retailer.deliveryFee,
      discount: 0,
      paymentUrl: cart.checkoutUrl,
      platformResponse: {
        deepLink: cart.deepLink,
        retailer: retailer.name,
        expiresAt: cart.expiresAt.toISOString(),
      },
    };
  }

  async getOrderStatus(orderId: string, token: string): Promise<OrderStatusResponse> {
    // Instacart 订单状态需要通过 webhook 或轮询获取
    try {
      const response = await this.makeRequest<{
        order_id: string;
        status: string;
        delivery_status?: string;
        tracking_url?: string;
        estimated_delivery?: string;
        delivered_at?: string;
      }>(`/orders/${orderId}`, {}, token);

      return {
        platformOrderId: response.order_id,
        status: this.mapInstacartStatus(response.status),
        deliveryStatus: response.delivery_status as DeliveryStatus | undefined,
        estimatedDeliveryTime: response.estimated_delivery,
        actualDeliveryTime: response.delivered_at,
        platformResponse: { trackingUrl: response.tracking_url },
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get order status from Instacart: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  async cancelOrder(orderId: string, token: string): Promise<boolean> {
    try {
      await this.makeRequest(`/orders/${orderId}/cancel`, { method: "POST" }, token);
      return true;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to cancel Instacart order: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 价格查询
  // --------------------------------------------------------------------------

  async getProductPrices(productIds: string[], token: string): Promise<Record<string, number>> {
    try {
      const response = await this.makeRequest<{
        prices: Record<string, { price: number; unit_price?: number }>;
      }>(
        "/products/prices",
        {
          method: "POST",
          body: JSON.stringify({ product_ids: productIds }),
        },
        token
      );

      const prices: Record<string, number> = {};
      for (const [id, info] of Object.entries(response.prices)) {
        prices[id] = info.price;
      }
      return prices;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get prices from Instacart: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 配送信息
  // --------------------------------------------------------------------------

  async getDeliveryOptions(address: DeliveryAddress, token: string): Promise<Record<string, any>> {
    try {
      const zipCode = address.postalCode || "10001";
      const retailers = await this.getAvailableRetailers(zipCode, token);

      return {
        retailers: retailers.map((r) => ({
          name: r.name,
          deliveryFee: r.deliveryFee,
          minOrder: r.minOrderAmount,
          available: r.isAvailable,
        })),
        deliveryWindows: [
          { label: "Priority (1 hour)", fee: 7.99 },
          { label: "Standard (2 hours)", fee: 3.99 },
          { label: "Scheduled", fee: 0 },
        ],
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get delivery options from Instacart: ${this.getErrorMessage(error)}`,
        details: { originalError: this.getErrorMessage(error) },
      });
    }
  }

  async estimateDeliveryTime(
    _orderItems: OrderItem[],
    _address: DeliveryAddress,
    _token: string
  ): Promise<string> {
    // Instacart 通常提供 1-2 小时配送
    return "1-2 hours";
  }

  // --------------------------------------------------------------------------
  // 工具方法
  // --------------------------------------------------------------------------

  private generateState(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  private mapInstacartStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      pending: "PENDING_PAYMENT",
      paid: "PAID",
      shopping: "PROCESSING",
      delivering: "SHIPPED",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
      refunded: "REFUNDED",
    };
    return statusMap[status.toLowerCase()] || "PROCESSING";
  }

  protected standardizeProductInfo(rawProduct: any): PlatformProductInfo {
    return {
      platformProductId: rawProduct.id || rawProduct.product_id,
      platform: this.platform,
      sku: rawProduct.upc || rawProduct.sku,
      name: rawProduct.name || rawProduct.title,
      description: rawProduct.description,
      brand: rawProduct.brand,
      category: rawProduct.department || rawProduct.aisle,
      imageUrl: rawProduct.image_url || rawProduct.thumbnail,
      specification: {
        size: rawProduct.size,
        unitCount: rawProduct.unit_count,
      },
      weight: rawProduct.weight_oz ? parseFloat(rawProduct.weight_oz) * 28.35 : undefined,
      unit: rawProduct.unit || "each",
      price: parseFloat(rawProduct.price) || 0,
      originalPrice: rawProduct.regular_price ? parseFloat(rawProduct.regular_price) : undefined,
      currency: "USD",
      priceUnit: rawProduct.price_per_unit,
      stock: rawProduct.in_stock ? 100 : 0,
      isInStock: rawProduct.in_stock !== false,
      stockStatus: rawProduct.in_stock ? "in_stock" : "out_of_stock",
      rating: rawProduct.rating ? parseFloat(rawProduct.rating) : undefined,
      reviewCount: rawProduct.review_count ? parseInt(rawProduct.review_count) : undefined,
      platformData: rawProduct,
    };
  }

  protected async validateTokenInternal(token: string): Promise<boolean> {
    try {
      await this.makeRequest("/user/me", {}, token);
      return true;
    } catch {
      return false;
    }
  }

  // 重写配送费计算 (美国市场)
  protected calculateShippingFee(
    subtotal: number,
    address: DeliveryAddress,
    platformRules?: Record<string, any>
  ): number {
    // Instacart 免配送费门槛通常是 $35
    if (subtotal >= 35) {
      return 0;
    }
    return platformRules?.defaultShippingFee || 5.99;
  }
}
