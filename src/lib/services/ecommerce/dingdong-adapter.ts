import { BasePlatformAdapter } from './base-adapter';
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
} from './types';
import { EcommercePlatform, OrderStatus, DeliveryStatus } from '@prisma/client';

export class DingdongAdapter extends BasePlatformAdapter {
  readonly platform = EcommercePlatform.DINGDONG;
  readonly platformName = '叮咚买菜';
  readonly baseUrl = process.env.DINGDONG_API_URL || 'https://api.ddxq.com/v1';

  // OAuth 认证
  async getAuthorizationUrl(request: OAuthRequest): Promise<OAuthResponse> {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.DINGDONG_CLIENT_ID!,
      redirect_uri: request.redirectUri,
      scope: (request.scope || ['user', 'order']).join(' '),
      state: request.state || this.generateState(),
    });

    return {
      authorizationUrl: `${this.baseUrl}/oauth/authorize?${params.toString()}`,
      state: params.get('state')!,
      expiresIn: 2400, // 40分钟
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
        uid?: string;
      }>('/oauth/access_token', {
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: request.code,
          redirect_uri: request.redirectUri,
          client_id: process.env.DINGDONG_CLIENT_ID!,
          client_secret: process.env.DINGDONG_CLIENT_SECRET!,
        }),
      });

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type || 'Bearer',
        scope: response.scope,
        expiresAt: this.parseTokenExpiry(response.expires_in),
        platformUserId: response.uid,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to exchange token with Dingdong: ${error.message}`,
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
        uid?: string;
      }>('/oauth/access_token', {
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.DINGDONG_CLIENT_ID!,
          client_secret: process.env.DINGDONG_CLIENT_SECRET!,
        }),
      });

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token || refreshToken,
        tokenType: response.token_type || 'Bearer',
        scope: response.scope,
        expiresAt: this.parseTokenExpiry(response.expires_in),
        platformUserId: response.uid,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.TOKEN_EXPIRED,
        message: `Failed to refresh Dingdong token: ${error.message}`,
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
        keyword: request.keyword,
        page: (request.page || 1).toString(),
        size: (request.pageSize || 20).toString(),
        sort_type: this.mapSortType(request.sortBy || 'default'),
        sort: request.sortOrder || 'desc',
      });

      if (request.category) {
        params.append('category_id', request.category);
      }
      if (request.brand) {
        params.append('brand_name', request.brand);
      }
      if (request.minPrice) {
        params.append('min_price', request.minPrice.toString());
      }
      if (request.maxPrice) {
        params.append('max_price', request.maxPrice.toString());
      }
      if (request.inStock !== undefined) {
        params.append('stock', request.inStock ? '1' : '0');
      }

      const response = await this.makeRequest<{
        list: any[];
        total: number;
        page: number;
        size: number;
        is_last: boolean;
      }>(`/product/search?${params.toString()}`, {}, token);

      return {
        products: response.list.map((product) =>
          this.standardizeProductInfo(product),
        ),
        total: response.total,
        page: response.page,
        pageSize: response.size,
        hasMore: !response.is_last,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to search products on Dingdong: ${error.message}`,
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
        `/product/detail/${productId}`,
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
            is_stock: boolean;
            stock_status: string;
          }
        >
      >(
        '/product/stock/batch',
        {
          method: 'POST',
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
          isInStock: stockInfo.is_stock,
          stockStatus: stockInfo.stock_status,
        };
      }

      return { stocks };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to query stock from Dingdong: ${error.message}`,
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
        products: request.items.map((item) => ({
          product_id: item.platformProductId,
          count: item.quantity,
          spec: item.specification,
        })),
        address: this.standardizeAddress(request.deliveryAddress),
        remark: request.deliveryNotes,
        coupon_code: request.couponCode,
        payment_type: request.paymentMethod || 'wechat',
      };

      const response = await this.makeRequest<{
        order_id: string;
        order_status: OrderStatus;
        total_money: number;
        original_money: number;
        delivery_fee: number;
        discount_money: number;
        deliver_time: string;
        pay_info?: {
          pay_url: string;
        };
      }>(
        '/order/create',
        {
          method: 'POST',
          body: JSON.stringify(orderData),
        },
        token,
      );

      return {
        platformOrderId: response.order_id,
        status: response.order_status,
        totalAmount: response.total_money,
        subtotal: response.original_money,
        shippingFee: response.delivery_fee,
        discount: response.discount_money,
        estimatedDeliveryTime: response.deliver_time,
        paymentUrl: response.pay_info?.pay_url,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to create order on Dingdong: ${error.message}`,
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
        order_status: OrderStatus;
        payment_status: string;
        delivery_status: DeliveryStatus;
        logistic_info?: {
          tracking_no: string;
        };
        deliver_time: string;
        actual_deliver_time?: string;
      }>(`/order/detail/${orderId}`, {}, token);

      return {
        platformOrderId: response.order_id,
        status: response.order_status,
        paymentStatus: response.payment_status,
        deliveryStatus: response.delivery_status,
        trackingNumber: response.logistic_info?.tracking_no,
        estimatedDeliveryTime: response.deliver_time,
        actualDeliveryTime: response.actual_deliver_time,
      };
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get order status from Dingdong: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  async cancelOrder(orderId: string, token: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `/order/cancel/${orderId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            cancel_reason: '用户主动取消',
          }),
        },
        token,
      );
      return true;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to cancel order on Dingdong: ${error.message}`,
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
      const response = await this.makeRequest<
        Record<
          string,
          {
            price: number;
            activity_price?: number;
          }
        >
      >(
        '/product/price/batch',
        {
          method: 'POST',
          body: JSON.stringify({
            product_ids: productIds,
          }),
        },
        token,
      );

      const prices: Record<string, number> = {};
      for (const [productId, priceInfo] of Object.entries(response)) {
        prices[productId] = priceInfo.activity_price || priceInfo.price;
      }
      return prices;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get product prices from Dingdong: ${error.message}`,
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
        immediate: { time: string; fee: number };
        next_day: { time: string; fee: number };
        scheduled?: { time: string; fee: number };
      }>(
        '/delivery/time/fee',
        {
          method: 'POST',
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
        message: `Failed to get delivery options from Dingdong: ${error.message}`,
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
        deliver_time: string;
        time_ranges: Array<{
          start_time: string;
          end_time: string;
          fee: number;
        }>;
      }>(
        '/delivery/estimate',
        {
          method: 'POST',
          body: JSON.stringify({
            products: orderItems.map((item) => ({
              product_id: item.platformProductId,
              count: item.quantity,
            })),
            address: this.standardizeAddress(address),
          }),
        },
        token,
      );

      return response.deliver_time;
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to estimate delivery time from Dingdong: ${error.message}`,
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

  private mapSortType(sortBy?: string): string {
    switch (sortBy) {
      case 'price':
        return 'price';
      case 'sales':
        return 'sales';
      case 'rating':
        return 'rating';
      case 'name':
        return 'name';
      default:
        return 'default';
    }
  }

  // 叮咚买菜特定的商品信息标准化
  protected standardizeProductInfo(rawProduct: any): PlatformProductInfo {
    return {
      platformProductId: rawProduct.id || rawProduct.product_id,
      sku: rawProduct.sku,
      name: rawProduct.name || rawProduct.product_name,
      description: rawProduct.description || rawProduct.desc,
      brand: rawProduct.brand_name || rawProduct.brand,
      category: rawProduct.category_name || rawProduct.category,
      imageUrl: rawProduct.img || rawProduct.image_url,
      specification: rawProduct.specification || rawProduct.spec,
      weight: rawProduct.weight ? parseFloat(rawProduct.weight) : undefined,
      volume: rawProduct.volume ? parseFloat(rawProduct.volume) : undefined,
      unit: rawProduct.unit,
      price: parseFloat(rawProduct.price || rawProduct.sale_price),
      originalPrice: rawProduct.original_price
        ? parseFloat(rawProduct.original_price)
        : undefined,
      currency: rawProduct.currency || 'CNY',
      priceUnit: rawProduct.price_unit || rawProduct.unit,
      stock: parseInt(rawProduct.stock || rawProduct.available_num) || 0,
      isInStock:
        rawProduct.is_stock !== false &&
        (rawProduct.stock || rawProduct.available_num || 0) > 0,
      stockStatus:
        rawProduct.stock_status || (rawProduct.is_stock ? '有货' : '无货'),
      salesCount:
        rawProduct.sales || rawProduct.monthly_sales
          ? parseInt(rawProduct.sales || rawProduct.monthly_sales)
          : undefined,
      rating: rawProduct.rating ? parseFloat(rawProduct.rating) : undefined,
      reviewCount: rawProduct.review_count
        ? parseInt(rawProduct.review_count)
        : undefined,
      deliveryOptions: rawProduct.delivery_info,
      deliveryTime: rawProduct.delivery_time,
      shippingFee: rawProduct.delivery_fee
        ? parseFloat(rawProduct.delivery_fee)
        : undefined,
      platformData: rawProduct,
    };
  }
}
