import {
  IPlatformAdapter,
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
  PlatformError,
  PlatformErrorType,
  PlatformProductInfo,
} from './types';
import { EcommercePlatform } from '@prisma/client';

export abstract class BasePlatformAdapter implements IPlatformAdapter {
  abstract readonly platform: EcommercePlatform
  abstract readonly platformName: string
  abstract readonly baseUrl: string

  // HTTP请求基础方法
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HealthButler-Ecommerce-Integration/1.0',
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        timeout: 10000, // 10秒超时
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof PlatformError) {
        throw error;
      }
      throw new PlatformError({
        type: PlatformErrorType.NETWORK_ERROR,
        message: `Network error when calling ${endpoint}: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 处理HTTP错误
  protected async handleHttpError(response: Response): Promise<never> {
    let errorDetails: any = {};
    
    try {
      errorDetails = await response.json();
    } catch {
      // 如果无法解析错误响应，使用状态码
      errorDetails = { status: response.status, statusText: response.statusText };
    }

    const errorType = this.mapHttpStatusToErrorType(response.status);
    throw new PlatformError({
      type: errorType,
      message: errorDetails.message || `HTTP ${response.status}: ${response.statusText}`,
      code: response.status.toString(),
      details: errorDetails,
    });
  }

  // 映射HTTP状态码到平台错误类型
  protected mapHttpStatusToErrorType(status: number): PlatformErrorType {
    switch (status) {
    case 401:
      return PlatformErrorType.INVALID_TOKEN;
    case 403:
      return PlatformErrorType.INSUFFICIENT_PERMISSION;
    case 404:
      return PlatformErrorType.PRODUCT_NOT_FOUND;
    case 422:
      return PlatformErrorType.INVALID_REQUEST;
    case 429:
      return PlatformErrorType.RATE_LIMITED;
    case 500:
    case 502:
    case 503:
      return PlatformErrorType.PLATFORM_ERROR;
    default:
      return PlatformErrorType.NETWORK_ERROR;
    }
  }

  // 验证token格式
  protected validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // 基本的token格式检查
    return token.length > 10 && !token.includes(' ');
  }

  // 解析token过期时间
  protected parseTokenExpiry(expiresIn?: number, expiresAt?: string): Date | undefined {
    if (expiresAt) {
      return new Date(expiresAt);
    }
    
    if (expiresIn) {
      return new Date(Date.now() + expiresIn * 1000);
    }
    
    return undefined;
  }

  // 标准化商品信息
  protected standardizeProductInfo(rawProduct: any): PlatformProductInfo {
    return {
      platformProductId: rawProduct.id || rawProduct.productId,
      sku: rawProduct.sku,
      name: rawProduct.name || rawProduct.title,
      description: rawProduct.description,
      brand: rawProduct.brand,
      category: rawProduct.category,
      imageUrl: rawProduct.imageUrl || rawProduct.image,
      specification: rawProduct.specification,
      weight: rawProduct.weight,
      volume: rawProduct.volume,
      unit: rawProduct.unit,
      price: parseFloat(rawProduct.price) || 0,
      originalPrice: rawProduct.originalPrice ? parseFloat(rawProduct.originalPrice) : undefined,
      currency: rawProduct.currency || 'CNY',
      priceUnit: rawProduct.priceUnit,
      stock: parseInt(rawProduct.stock) || 0,
      isInStock: rawProduct.isInStock !== false && (rawProduct.stock || 0) > 0,
      stockStatus: rawProduct.stockStatus,
      salesCount: rawProduct.salesCount ? parseInt(rawProduct.salesCount) : undefined,
      rating: rawProduct.rating ? parseFloat(rawProduct.rating) : undefined,
      reviewCount: rawProduct.reviewCount ? parseInt(rawProduct.reviewCount) : undefined,
      deliveryOptions: rawProduct.deliveryOptions,
      deliveryTime: rawProduct.deliveryTime,
      shippingFee: rawProduct.shippingFee ? parseFloat(rawProduct.shippingFee) : undefined,
      platformData: rawProduct,
    };
  }

  // 标准化配送地址
  protected standardizeAddress(address: DeliveryAddress): Record<string, any> {
    return {
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      postalCode: address.postalCode,
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      fullAddress: `${address.province}${address.city}${address.district}${address.detail}`,
    };
  }

  // 计算配送费
  protected calculateShippingFee(
    subtotal: number,
    address: DeliveryAddress,
    platformRules?: Record<string, any>
  ): number {
    // 默认配送费计算逻辑，子类可以重写
    if (platformRules?.freeShippingThreshold && subtotal >= platformRules.freeShippingThreshold) {
      return 0;
    }
    
    return platformRules?.defaultShippingFee || 6;
  }

  // 抽象方法，子类必须实现
  abstract getAuthorizationUrl(request: OAuthRequest): Promise<OAuthResponse>
  abstract exchangeToken(request: TokenExchangeRequest): Promise<TokenInfo>
  abstract refreshToken(refreshToken: string): Promise<TokenInfo>
  abstract searchProducts(request: ProductSearchRequest, token: string): Promise<ProductSearchResponse>
  abstract getProduct(productId: string, token: string): Promise<PlatformProductInfo | null>
  abstract queryStock(request: StockQueryRequest, token: string): Promise<StockQueryResponse>
  abstract createOrder(request: CreateOrderRequest, token: string): Promise<CreateOrderResponse>
  abstract getOrderStatus(orderId: string, token: string): Promise<OrderStatusResponse>
  abstract cancelOrder(orderId: string, token: string): Promise<boolean>
  abstract getProductPrices(productIds: string[], token: string): Promise<Record<string, number>>
  abstract getDeliveryOptions(address: DeliveryAddress, token: string): Promise<Record<string, any>>
  abstract estimateDeliveryTime(orderItems: OrderItem[], address: DeliveryAddress, token: string): Promise<string>

  // 通用实现
  async validateToken(token: string): Promise<boolean> {
    try {
      if (!this.validateTokenFormat(token)) {
        return false;
      }

      // 调用平台特定的token验证接口
      return await this.validateTokenInternal(token);
    } catch (error) {
      console.error(`Token validation failed for ${this.platformName}:`, error);
      return false;
    }
  }

  async refreshTokenIfNeeded(token: string): Promise<string> {
    try {
      // 检查token是否即将过期（提前1小时刷新）
      const needsRefresh = await this.shouldRefreshToken(token);
      
      if (needsRefresh) {
        const newToken = await this.refreshTokenInternal(token);
        return newToken;
      }
      
      return token;
    } catch (error) {
      console.error(`Token refresh failed for ${this.platformName}:`, error);
      throw new PlatformError({
        type: PlatformErrorType.TOKEN_EXPIRED,
        message: `Failed to refresh token: ${error.message}`,
        details: { originalError: error },
      });
    }
  }

  // 子类可以重写的保护方法
  protected async validateTokenInternal(token: string): Promise<boolean> {
    // 默认实现：尝试获取用户信息来验证token
    try {
      await this.makeRequest('/user/profile', {}, token);
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async shouldRefreshToken(token: string): Promise<boolean> {
    // 默认实现：总是尝试刷新（由子类优化）
    return false;
  }

  protected async refreshTokenInternal(token: string): Promise<string> {
    // 默认实现：抛出错误，要求子类实现
    throw new Error('Token refresh not implemented');
  }
}
