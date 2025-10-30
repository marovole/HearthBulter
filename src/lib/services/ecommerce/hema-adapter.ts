import { BasePlatformAdapter } from './base-adapter'
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
  PlatformErrorType
} from './types'
import { EcommercePlatform, OrderStatus, DeliveryStatus } from '@prisma/client'

export class HemaAdapter extends BasePlatformAdapter {
  readonly platform = EcommercePlatform.HEMA
  readonly platformName = '盒马鲜生'
  readonly baseUrl = process.env.HEMA_API_URL || 'https://api.freshhema.com/v2'

  // OAuth 认证
  async getAuthorizationUrl(request: OAuthRequest): Promise<OAuthResponse> {
    const params = new URLSearchParams({
      response_type: 'code',
      app_id: process.env.HEMA_APP_ID!,
      redirect_uri: request.redirectUri,
      scope: (request.scope || ['user_info', 'order_write']).join(' '),
      state: request.state || this.generateState()
    })

    return {
      authorizationUrl: `${this.baseUrl}/oauth/authorize?${params.toString()}`,
      state: params.get('state')!,
      expiresIn: 1800 // 30分钟
    }
  }

  async exchangeToken(request: TokenExchangeRequest): Promise<TokenInfo> {
    try {
      const response = await this.makeRequest<{
        access_token: string
        refresh_token?: string
        token_type: string
        scope?: string
        expires_in?: number
        user_id?: string
      }>('/oauth/token', {
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: request.code,
          redirect_uri: request.redirectUri,
          app_id: process.env.HEMA_APP_ID!,
          app_secret: process.env.HEMA_APP_SECRET!
        })
      })

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type || 'Bearer',
        scope: response.scope,
        expiresAt: this.parseTokenExpiry(response.expires_in),
        platformUserId: response.user_id
      }
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to exchange token with Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenInfo> {
    try {
      const response = await this.makeRequest<{
        access_token: string
        refresh_token?: string
        token_type: string
        scope?: string
        expires_in?: number
        user_id?: string
      }>('/oauth/token', {
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          app_id: process.env.HEMA_APP_ID!,
          app_secret: process.env.HEMA_APP_SECRET!
        })
      })

      return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token || refreshToken,
        tokenType: response.token_type || 'Bearer',
        scope: response.scope,
        expiresAt: this.parseTokenExpiry(response.expires_in),
        platformUserId: response.user_id
      }
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.TOKEN_EXPIRED,
        message: `Failed to refresh Hema token: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  // 商品搜索
  async searchProducts(request: ProductSearchRequest, token: string): Promise<ProductSearchResponse> {
    try {
      const params = new URLSearchParams({
        keyword: request.keyword,
        page: (request.page || 1).toString(),
        page_size: (request.pageSize || 20).toString(),
        sort: request.sortBy || 'default',
        order: request.sortOrder || 'desc'
      })

      if (request.category) {
        params.append('category_id', request.category)
      }
      if (request.brand) {
        params.append('brand', request.brand)
      }
      if (request.minPrice) {
        params.append('min_price', request.minPrice.toString())
      }
      if (request.maxPrice) {
        params.append('max_price', request.maxPrice.toString())
      }
      if (request.inStock !== undefined) {
        params.append('stock_status', request.inStock ? 'in_stock' : 'out_of_stock')
      }

      const response = await this.makeRequest<{
        items: any[]
        total_count: number
        current_page: number
        page_size: number
        has_next: boolean
      }>(`/products/search?${params.toString()}`, {}, token)

      return {
        products: response.items.map(product => this.standardizeProductInfo(product)),
        total: response.total_count,
        page: response.current_page,
        pageSize: response.page_size,
        hasMore: response.has_next
      }
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to search products on Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  async getProduct(productId: string, token: string): Promise<PlatformProductInfo | null> {
    try {
      const response = await this.makeRequest<any>(`/products/${productId}`, {}, token)
      return this.standardizeProductInfo(response)
    } catch (error) {
      if (error.type === PlatformErrorType.PRODUCT_NOT_FOUND) {
        return null
      }
      throw error
    }
  }

  // 库存查询
  async queryStock(request: StockQueryRequest, token: string): Promise<StockQueryResponse> {
    try {
      const response = await this.makeRequest<Record<string, {
        available_stock: number
        stock_status: string
        is_available: boolean
      }>>('/products/stock/batch', {
        method: 'POST',
        body: JSON.stringify({
          product_ids: request.productIds
        })
      }, token)

      const stocks: Record<string, {
        stock: number
        isInStock: boolean
        stockStatus?: string
      }> = {}

      for (const [productId, stockInfo] of Object.entries(response)) {
        stocks[productId] = {
          stock: stockInfo.available_stock,
          isInStock: stockInfo.is_available,
          stockStatus: stockInfo.stock_status
        }
      }

      return { stocks }
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to query stock from Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  // 订单管理
  async createOrder(request: CreateOrderRequest, token: string): Promise<CreateOrderResponse> {
    try {
      const orderData = {
        items: request.items.map(item => ({
          product_id: item.platformProductId,
          quantity: item.quantity,
          sku_spec: item.specification
        })),
        address: this.standardizeAddress(request.deliveryAddress),
        remark: request.deliveryNotes,
        coupon_code: request.couponCode,
        payment_type: request.paymentMethod || 'alipay'
      }

      const response = await this.makeRequest<{
        order_code: string
        order_status: OrderStatus
        total_amount: number
        product_amount: number
        delivery_fee: number
        discount_amount: number
        estimated_delivery_time: string
        payment_info?: {
          payment_url: string
        }
      }>('/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData)
      }, token)

      return {
        platformOrderId: response.order_code,
        status: response.order_status,
        totalAmount: response.total_amount,
        subtotal: response.product_amount,
        shippingFee: response.delivery_fee,
        discount: response.discount_amount,
        estimatedDeliveryTime: response.estimated_delivery_time,
        paymentUrl: response.payment_info?.payment_url
      }
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to create order on Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  async getOrderStatus(orderId: string, token: string): Promise<OrderStatusResponse> {
    try {
      const response = await this.makeRequest<{
        order_code: string
        order_status: OrderStatus
        payment_status: string
        delivery_status: DeliveryStatus
        logistics_info?: {
          tracking_number: string
        }
        estimated_delivery_time: string
        actual_delivery_time?: string
      }>(`/orders/${orderId}`, {}, token)

      return {
        platformOrderId: response.order_code,
        status: response.order_status,
        paymentStatus: response.payment_status,
        deliveryStatus: response.delivery_status,
        trackingNumber: response.logistics_info?.tracking_number,
        estimatedDeliveryTime: response.estimated_delivery_time,
        actualDeliveryTime: response.actual_delivery_time
      }
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get order status from Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  async cancelOrder(orderId: string, token: string): Promise<boolean> {
    try {
      await this.makeRequest(`/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          cancel_reason: '用户取消'
        })
      }, token)
      return true
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to cancel order on Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  // 价格查询
  async getProductPrices(productIds: string[], token: string): Promise<Record<string, number>> {
    try {
      const response = await this.makeRequest<Record<string, {
        price: number
        promotional_price?: number
      }>>('/products/price/batch', {
        method: 'POST',
        body: JSON.stringify({
          product_ids: productIds
        })
      }, token)

      const prices: Record<string, number> = {}
      for (const [productId, priceInfo] of Object.entries(response)) {
        prices[productId] = priceInfo.promotional_price || priceInfo.price
      }
      return prices
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get product prices from Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  // 配送信息
  async getDeliveryOptions(address: DeliveryAddress, token: string): Promise<Record<string, any>> {
    try {
      const response = await this.makeRequest<{
        immediate: { time: string; fee: number }
        scheduled: { time: string; fee: number }
        pickup?: { time: string; fee: number }
      }>('/delivery/options', {
        method: 'POST',
        body: JSON.stringify({
          address: this.standardizeAddress(address)
        })
      }, token)

      return response
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to get delivery options from Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  async estimateDeliveryTime(
    orderItems: OrderItem[],
    address: DeliveryAddress,
    token: string
  ): Promise<string> {
    try {
      const response = await this.makeRequest<{
        delivery_time: string
        time_slots: Array<{
          start_time: string
          end_time: string
          fee: number
        }>
      }>('/delivery/estimate', {
        method: 'POST',
        body: JSON.stringify({
          items: orderItems.map(item => ({
            product_id: item.platformProductId,
            quantity: item.quantity
          })),
          address: this.standardizeAddress(address)
        })
      }, token)

      return response.delivery_time
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to estimate delivery time from Hema: ${error.message}`,
        details: { originalError: error }
      })
    }
  }

  // 工具方法
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  // 盒马特定的商品信息标准化
  protected standardizeProductInfo(rawProduct: any): PlatformProductInfo {
    return {
      platformProductId: rawProduct.product_id || rawProduct.id,
      sku: rawProduct.sku_code,
      name: rawProduct.product_name || rawProduct.name,
      description: rawProduct.description,
      brand: rawProduct.brand_name,
      category: rawProduct.category_name,
      imageUrl: rawProduct.product_img || rawProduct.image_url,
      specification: rawProduct.specification,
      weight: rawProduct.weight ? parseFloat(rawProduct.weight) : undefined,
      volume: rawProduct.volume ? parseFloat(rawProduct.volume) : undefined,
      unit: rawProduct.unit,
      price: parseFloat(rawProduct.sale_price || rawProduct.price),
      originalPrice: rawProduct.original_price ? parseFloat(rawProduct.original_price) : undefined,
      currency: rawProduct.currency || 'CNY',
      priceUnit: rawProduct.price_unit,
      stock: parseInt(rawProduct.available_stock) || 0,
      isInStock: rawProduct.stock_status === '有货' && (rawProduct.available_stock || 0) > 0,
      stockStatus: rawProduct.stock_status,
      salesCount: rawProduct.monthly_sales ? parseInt(rawProduct.monthly_sales) : undefined,
      rating: rawProduct.rating ? parseFloat(rawProduct.rating) : undefined,
      reviewCount: rawProduct.review_count ? parseInt(rawProduct.review_count) : undefined,
      deliveryOptions: rawProduct.delivery_info,
      deliveryTime: rawProduct.delivery_time,
      shippingFee: rawProduct.delivery_fee ? parseFloat(rawProduct.delivery_fee) : undefined,
      platformData: rawProduct
    }
  }
}
