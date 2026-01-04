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
} from "./types";
import { EcommercePlatform, OrderStatus, DeliveryStatus } from "@prisma/client";

export class SamsClubAdapter extends BasePlatformAdapter {
  readonly platform = EcommercePlatform.SAMS_CLUB;
  readonly platformName = "山姆会员商店";
  readonly baseUrl =
    process.env.SAMS_CLUB_API_URL || "https://api.samsclub.com.cn/v1";

  // OAuth 认证
  async getAuthorizationUrl(request: OAuthRequest): Promise<OAuthResponse> {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.SAMS_CLUB_CLIENT_ID!,
      redirect_uri: request.redirectUri,
      scope: (request.scope || ["read", "write"]).join(" "),
      state: request.state || this.generateState(),
    });

    return {
      authorizationUrl: `${this.baseUrl}/oauth/authorize?${params.toString()}`,
      state: params.get("state")!,
      expiresIn: 3600, // 1小时
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
        user_id?: string;
      }>("/oauth/token", {
        method: "POST",
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: request.code,
          redirect_uri: request.redirectUri,
          client_id: process.env.SAMS_CLUB_CLIENT_ID!,
          client_secret: process.env.SAMS_CLUB_CLIENT_SECRET!,
        }),
      });

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type || "Bearer",
        scope: response.scope,
        expiresAt: this.parseTokenExpiry(response.expires_in),
        platformUserId: response.user_id,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to exchange token with Sam's Club: ${error.message}`,
        details: { originalError: error },
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
        user_id?: string;
      }>("/oauth/token", {
        method: "POST",
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env.SAMS_CLUB_CLIENT_ID!,
          client_secret: process.env.SAMS_CLUB_CLIENT_SECRET!,
        }),
      });

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token || refreshToken,
        tokenType: response.token_type || "Bearer",
        scope: response.scope,
        expiresAt: this.parseTokenExpiry(response.expires_in),
        platformUserId: response.user_id,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.TOKEN_EXPIRED,
        message: `Failed to refresh Sam's Club token: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 商品搜索
  async searchProducts(
    request: ProductSearchRequest,
    token: string,
  ): Promise<ProductSearchResponse> {
    try {
      const params = new URLSearchParams({
        q: request.keyword,
        page: (request.page || 1).toString(),
        page_size: (request.pageSize || 20).toString(),
        sort_by: request.sortBy || "relevance",
        sort_order: request.sortOrder || "desc",
      });

      if (request.category) {
        params.append("category", request.category);
      }
      if (request.brand) {
        params.append("brand", request.brand);
      }
      if (request.minPrice) {
        params.append("min_price", request.minPrice.toString());
      }
      if (request.maxPrice) {
        params.append("max_price", request.maxPrice.toString());
      }
      if (request.inStock !== undefined) {
        params.append("in_stock", request.inStock.toString());
      }

      const response = await this.makeRequest<{
        products: any[];
        total: number;
        page: number;
        page_size: number;
        has_more: boolean;
      }>(`/products/search?${params.toString()}`, {}, token);

      return {
        products: response.products.map((product) =>
          this.standardizeProductInfo(product),
        ),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        hasMore: response.has_more,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to search products on Sam's Club: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  async getProduct(
    productId: string,
    token: string,
  ): Promise<PlatformProductInfo | null> {
    try {
      const response = await this.makeRequest<any>(
        `/products/${productId}`,
        {},
        token,
      );
      return this.standardizeProductInfo(response);
    } catch (error) {
      if (error.type === PlatformErrorType.PRODUCT_NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  // 库存查询
  async queryStock(
    request: StockQueryRequest,
    token: string,
  ): Promise<StockQueryResponse> {
    try {
      const response = await this.makeRequest<
        Record<
          string,
          {
            stock: number;
            in_stock: boolean;
            stock_status?: string;
          }
        >
      >(
        "/products/stock",
        {
          method: "POST",
          body: JSON.stringify({
            product_ids: request.productIds,
          }),
        },
        token,
      );

      const stocks: Record<
        string,
        {
          stock: number;
          isInStock: boolean;
          stockStatus?: string;
        }
      > = {};

      for (const [productId, stockInfo] of Object.entries(response)) {
        stocks[productId] = {
          stock: stockInfo.stock,
          isInStock: stockInfo.in_stock,
          stockStatus: stockInfo.stock_status,
        };
      }

      return { stocks };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to query stock from Sam's Club: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 订单管理
  async createOrder(
    request: CreateOrderRequest,
    token: string,
  ): Promise<CreateOrderResponse> {
    try {
      const orderData = {
        items: request.items.map((item) => ({
          product_id: item.platformProductId,
          quantity: item.quantity,
          specification: item.specification,
        })),
        delivery_address: this.standardizeAddress(request.deliveryAddress),
        delivery_notes: request.deliveryNotes,
        coupon_code: request.couponCode,
        payment_method: request.paymentMethod || "wechat_pay",
      };

      const response = await this.makeRequest<{
        order_id: string;
        status: OrderStatus;
        total_amount: number;
        subtotal: number;
        shipping_fee: number;
        discount: number;
        estimated_delivery_time?: string;
        payment_url?: string;
      }>(
        "/orders",
        {
          method: "POST",
          body: JSON.stringify(orderData),
        },
        token,
      );

      return {
        platformOrderId: response.order_id,
        status: response.status,
        totalAmount: response.total_amount,
        subtotal: response.subtotal,
        shippingFee: response.shipping_fee,
        discount: response.discount,
        estimatedDeliveryTime: response.estimated_delivery_time,
        paymentUrl: response.payment_url,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to create order on Sam's Club: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  async getOrderStatus(
    orderId: string,
    token: string,
  ): Promise<OrderStatusResponse> {
    try {
      const response = await this.makeRequest<{
        order_id: string;
        status: OrderStatus;
        payment_status?: string;
        delivery_status?: DeliveryStatus;
        tracking_number?: string;
        estimated_delivery_time?: string;
        actual_delivery_time?: string;
      }>(`/orders/${orderId}`, {}, token);

      return {
        platformOrderId: response.order_id,
        status: response.status,
        paymentStatus: response.payment_status,
        deliveryStatus: response.delivery_status,
        trackingNumber: response.tracking_number,
        estimatedDeliveryTime: response.estimated_delivery_time,
        actualDeliveryTime: response.actual_delivery_time,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get order status from Sam's Club: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  async cancelOrder(orderId: string, token: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `/orders/${orderId}/cancel`,
        {
          method: "POST",
        },
        token,
      );
      return true;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to cancel order on Sam's Club: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 价格查询
  async getProductPrices(
    productIds: string[],
    token: string,
  ): Promise<Record<string, number>> {
    try {
      const response = await this.makeRequest<Record<string, number>>(
        "/products/prices",
        {
          method: "POST",
          body: JSON.stringify({
            product_ids: productIds,
          }),
        },
        token,
      );

      return response;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get product prices from Sam's Club: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 配送信息
  async getDeliveryOptions(
    address: DeliveryAddress,
    token: string,
  ): Promise<Record<string, any>> {
    try {
      const response = await this.makeRequest<{
        standard: { time: string; fee: number };
        express: { time: string; fee: number };
        pickup?: { time: string; fee: number };
      }>(
        "/delivery/options",
        {
          method: "POST",
          body: JSON.stringify({
            address: this.standardizeAddress(address),
          }),
        },
        token,
      );

      return response;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get delivery options from Sam's Club: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  async estimateDeliveryTime(
    orderItems: OrderItem[],
    address: DeliveryAddress,
    token: string,
  ): Promise<string> {
    try {
      const response = await this.makeRequest<{
        estimated_time: string;
        delivery_options: any[];
      }>(
        "/delivery/estimate",
        {
          method: "POST",
          body: JSON.stringify({
            items: orderItems.map((item) => ({
              product_id: item.platformProductId,
              quantity: item.quantity,
            })),
            address: this.standardizeAddress(address),
          }),
        },
        token,
      );

      return response.estimated_time;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to estimate delivery time from Sam's Club: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 工具方法
  private generateState(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  // 重写token验证逻辑
  protected async validateTokenInternal(token: string): Promise<boolean> {
    try {
      await this.makeRequest("/user/profile", {}, token);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 山姆会员商店特定的商品信息标准化
  protected standardizeProductInfo(rawProduct: any): PlatformProductInfo {
    return {
      platformProductId: rawProduct.product_id || rawProduct.id,
      sku: rawProduct.sku,
      name: rawProduct.product_name || rawProduct.name,
      description: rawProduct.description,
      brand: rawProduct.brand,
      category: rawProduct.category_name || rawProduct.category,
      imageUrl: rawProduct.image_url || rawProduct.main_image,
      specification: rawProduct.specification,
      weight: rawProduct.weight_grams
        ? parseFloat(rawProduct.weight_grams)
        : undefined,
      volume: rawProduct.volume_ml
        ? parseFloat(rawProduct.volume_ml)
        : undefined,
      unit: rawProduct.unit,
      price: parseFloat(rawProduct.member_price || rawProduct.price),
      originalPrice: rawProduct.original_price
        ? parseFloat(rawProduct.original_price)
        : undefined,
      currency: rawProduct.currency || "CNY",
      priceUnit: rawProduct.price_unit,
      stock: parseInt(rawProduct.available_quantity) || 0,
      isInStock:
        rawProduct.in_stock !== false &&
        (rawProduct.available_quantity || 0) > 0,
      stockStatus: rawProduct.stock_status,
      salesCount: rawProduct.sales_count
        ? parseInt(rawProduct.sales_count)
        : undefined,
      rating: rawProduct.average_rating
        ? parseFloat(rawProduct.average_rating)
        : undefined,
      reviewCount: rawProduct.review_count
        ? parseInt(rawProduct.review_count)
        : undefined,
      deliveryOptions: rawProduct.delivery_options,
      deliveryTime: rawProduct.delivery_time,
      shippingFee: rawProduct.shipping_fee
        ? parseFloat(rawProduct.shipping_fee)
        : undefined,
      platformData: rawProduct,
    };
  }
}
