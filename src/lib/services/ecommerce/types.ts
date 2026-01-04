import { EcommercePlatform, OrderStatus, DeliveryStatus } from "@prisma/client";

// 平台商品信息接口
export interface PlatformProductInfo {
  platformProductId: string;
  sku?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  specification?: Record<string, any>;
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
  deliveryOptions?: Record<string, any>;
  deliveryTime?: Record<string, any>;
  shippingFee?: number;
  platformData?: Record<string, any>;
}

// 订单商品项接口
export interface OrderItem {
  platformProductId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  specification?: Record<string, any>;
}

// 配送地址接口
export interface DeliveryAddress {
  province: string;
  city: string;
  district: string;
  detail: string;
  postalCode?: string;
  contactName: string;
  contactPhone: string;
}

// 订单创建请求接口
export interface CreateOrderRequest {
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  deliveryNotes?: string;
  couponCode?: string;
  paymentMethod?: string;
}

// 订单创建响应接口
export interface CreateOrderResponse {
  platformOrderId: string;
  status: OrderStatus;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  estimatedDeliveryTime?: string;
  paymentUrl?: string;
  platformResponse?: Record<string, any>;
}

// 订单状态查询响应接口
export interface OrderStatusResponse {
  platformOrderId: string;
  status: OrderStatus;
  paymentStatus?: string;
  deliveryStatus?: DeliveryStatus;
  trackingNumber?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  platformResponse?: Record<string, any>;
}

// OAuth授权请求接口
export interface OAuthRequest {
  redirectUri: string;
  state?: string;
  scope?: string[];
}

// OAuth授权响应接口
export interface OAuthResponse {
  authorizationUrl: string;
  state: string;
  expiresIn?: number;
}

// Token交换请求接口
export interface TokenExchangeRequest {
  code: string;
  redirectUri: string;
  state?: string;
}

// Token信息接口
export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string;
  expiresAt?: Date;
  platformUserId?: string;
}

// 商品搜索请求接口
export interface ProductSearchRequest {
  keyword: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: "price" | "sales" | "rating" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// 商品搜索响应接口
export interface ProductSearchResponse {
  products: PlatformProductInfo[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 库存查询请求接口
export interface StockQueryRequest {
  productIds: string[];
}

// 库存查询响应接口
export interface StockQueryResponse {
  stocks: Record<
    string,
    {
      stock: number;
      isInStock: boolean;
      stockStatus?: string;
    }
  >;
}

// 平台适配器接口
export interface IPlatformAdapter {
  // 平台信息
  readonly platform: EcommercePlatform;
  readonly platformName: string;
  readonly baseUrl: string;

  // OAuth 认证
  getAuthorizationUrl(request: OAuthRequest): Promise<OAuthResponse>;
  exchangeToken(request: TokenExchangeRequest): Promise<TokenInfo>;
  refreshToken(refreshToken: string): Promise<TokenInfo>;

  // 商品搜索
  searchProducts(
    request: ProductSearchRequest,
    token: string,
  ): Promise<ProductSearchResponse>;
  getProduct(
    productId: string,
    token: string,
  ): Promise<PlatformProductInfo | null>;

  // 库存查询
  queryStock(
    request: StockQueryRequest,
    token: string,
  ): Promise<StockQueryResponse>;

  // 订单管理
  createOrder(
    request: CreateOrderRequest,
    token: string,
  ): Promise<CreateOrderResponse>;
  getOrderStatus(orderId: string, token: string): Promise<OrderStatusResponse>;
  cancelOrder(orderId: string, token: string): Promise<boolean>;

  // 价格查询
  getProductPrices(
    productIds: string[],
    token: string,
  ): Promise<Record<string, number>>;

  // 配送信息
  getDeliveryOptions(
    address: DeliveryAddress,
    token: string,
  ): Promise<Record<string, any>>;
  estimateDeliveryTime(
    orderItems: OrderItem[],
    address: DeliveryAddress,
    token: string,
  ): Promise<string>;

  // 工具方法
  validateToken(token: string): Promise<boolean>;
  refreshTokenIfNeeded(token: string): Promise<string>;
}

// 平台错误类型
export enum PlatformErrorType {
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INSUFFICIENT_PERMISSION = "INSUFFICIENT_PERMISSION",
  PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
  OUT_OF_STOCK = "OUT_OF_STOCK",
  INVALID_REQUEST = "INVALID_REQUEST",
  RATE_LIMITED = "RATE_LIMITED",
  PLATFORM_ERROR = "PLATFORM_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

// 平台错误类
export class PlatformError extends Error {
  type: PlatformErrorType;
  code?: string;
  details?: Record<string, any>;

  constructor(
    type: PlatformErrorType,
    message: string,
    code?: string,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = "PlatformError";
    this.type = type;
    this.code = code;
    this.details = details;

    // 维护原型链以支持 instanceof
    Object.setPrototypeOf(this, PlatformError.prototype);
  }
}

// 平台适配器工厂接口
export interface IPlatformAdapterFactory {
  createAdapter(platform: EcommercePlatform): IPlatformAdapter;
  getSupportedPlatforms(): EcommercePlatform[];
}

// SKU匹配结果接口
export interface SKUMatchResult {
  platformProduct: PlatformProductInfo;
  confidence: number;
  matchedKeywords: string[];
  matchReasons: string[];
}

// 价格比较结果接口
export interface PriceComparisonResult {
  foodId: string;
  foodName: string;
  matches: SKUMatchResult[];
  bestPrice?: {
    platform: EcommercePlatform;
    product: PlatformProductInfo;
    totalPrice: number;
    unitPrice: number;
  };
}

// 购物车聚合结果接口
export interface CartAggregationResult {
  items: CartItem[];
  totalByPlatform: Record<
    EcommercePlatform,
    {
      subtotal: number;
      shippingFee: number;
      total: number;
      itemCount: number;
    }
  >;
  grandTotal: number;
  recommendations: CartRecommendation[];
}

// 购物车项接口
export interface CartItem {
  foodId: string;
  foodName: string;
  quantity: number;
  matches: SKUMatchResult[];
  selectedPlatform?: EcommercePlatform;
  selectedProduct?: PlatformProductInfo;
}

// 购物车推荐接口
export interface CartRecommendation {
  type: "price_optimization" | "platform_consolidation" | "substitution";
  message: string;
  potentialSavings?: number;
  suggestedActions?: string[];
}
