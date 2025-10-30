# E-commerce Integration Documentation

## Overview

The e-commerce integration feature allows users to connect their shopping accounts from multiple platforms (Sam's Club, Hema, Dingdong) to automatically match food items with available products, compare prices, and create optimized shopping carts.

## Architecture

### Core Components

1. **Platform Adapters** - Abstract interface for interacting with different e-commerce platforms
2. **SKU Matcher** - Fuzzy matching algorithm to match food items with platform products
3. **Price Comparator** - Cross-platform price comparison and analysis
4. **Cart Aggregator** - Shopping cart optimization and order management
5. **Database Models** - Data persistence for accounts, products, and orders

### Database Schema

#### PlatformAccount
- User's platform account binding information
- OAuth tokens and refresh mechanisms
- Account status and synchronization data

#### PlatformProduct
- Cached product information from platforms
- Standardized product data format
- Match confidence and metadata

#### Order
- Unified order management across platforms
- Order items, status tracking, and delivery information
- Platform-specific order IDs and responses

## API Endpoints

### Authentication

#### GET `/api/ecommerce/auth/[platform]`
Get authorization URL for platform OAuth flow.

**Parameters:**
- `platform` - Platform code (SAMS_CLUB, HEMA, DINGDONG)
- `redirect_uri` - OAuth callback URL
- `state` - Optional state parameter

**Response:**
```json
{
  "authorizationUrl": "https://platform.com/oauth/authorize?...",
  "state": "random_state_string",
  "expiresIn": 3600
}
```

#### POST `/api/ecommerce/auth/[platform]`
Exchange authorization code for access token.

**Body:**
```json
{
  "code": "authorization_code",
  "redirectUri": "https://yourapp.com/callback",
  "state": "random_state_string"
}
```

### Product Search

#### GET `/api/ecommerce/products/search`
Search products across platforms or from cache.

**Query Parameters:**
- `keyword` - Search keyword (required)
- `platform` - Specific platform (optional)
- `category` - Product category filter
- `brand` - Brand filter
- `minPrice` / `maxPrice` - Price range
- `inStock` - Stock availability filter
- `sortBy` - Sort field (price, sales, rating, name)
- `sortOrder` - Sort direction (asc, desc)
- `page` / `pageSize` - Pagination

**Response:**
```json
{
  "success": true,
  "products": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "hasMore": true
}
```

### SKU Matching

#### POST `/api/ecommerce/match`
Match multiple food items to platform products.

**Body:**
```json
{
  "foodIds": ["food1", "food2", "food3"],
  "config": {
    "minConfidence": 0.6,
    "maxResults": 5,
    "includeOutOfStock": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "foodId": "food1",
      "foodName": "西红柿",
      "matches": [
        {
          "platform": "HEMA",
          "platformProductId": "prod123",
          "name": "新鲜西红柿 500g",
          "price": 8.9,
          "confidence": 0.85,
          "matchedKeywords": ["西红柿", "新鲜"],
          "matchReasons": ["高度匹配：名称和关键词高度吻合"]
        }
      ]
    }
  ]
}
```

#### GET `/api/ecommerce/match`
Match a single food item.

**Query Parameters:**
- `foodId` - Food item ID (required)

### Price Comparison

#### POST `/api/ecommerce/compare`
Compare prices across platforms for multiple foods.

**Body:**
```json
{
  "foodIds": ["food1", "food2"],
  "config": {
    "includeShipping": true,
    "minConfidence": 0.6,
    "maxResultsPerFood": 5,
    "considerDiscounts": true,
    "preferInStock": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [...],
  "statistics": {
    "totalFoods": 2,
    "totalMatches": 12,
    "foodsWithBestPrice": 2,
    "averageSavings": 3.5,
    "platformDistribution": {
      "SAMS_CLUB": 4,
      "HEMA": 5,
      "DINGDONG": 3
    }
  }
}
```

### Cart Management

#### POST `/api/ecommerce/cart`
Aggregate shopping cart with optimization.

**Body:**
```json
{
  "items": [
    {
      "foodId": "food1",
      "quantity": 2
    },
    {
      "foodId": "food2",
      "quantity": 1
    }
  ],
  "address": {
    "province": "上海市",
    "city": "上海市",
    "district": "浦东新区",
    "detail": "张江高科技园区",
    "contactName": "张三",
    "contactPhone": "13800138000"
  },
  "config": {
    "includeShipping": true,
    "allowCrossPlatform": true,
    "optimizeFor": "balance"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "items": [...],
    "totalByPlatform": {
      "SAMS_CLUB": {
        "subtotal": 25.8,
        "shippingFee": 6,
        "total": 31.8,
        "itemCount": 2
      },
      "HEMA": {
        "subtotal": 12.9,
        "shippingFee": 0,
        "total": 12.9,
        "itemCount": 1
      }
    },
    "grandTotal": 44.7,
    "recommendations": [...],
    "statistics": {
      "totalItems": 3,
      "platformsUsed": 2,
      "averageConfidence": 0.78
    }
  }
}
```

### Order Management

#### POST `/api/ecommerce/orders`
Create orders across platforms.

**Body:**
```json
{
  "items": [...],
  "address": {...},
  "paymentMethod": "wechat_pay",
  "config": {
    "allowCrossPlatform": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "order123",
      "platformOrderId": "SAMS_123456",
      "platform": "SAMS_CLUB",
      "status": "PENDING",
      "totalAmount": 31.8,
      "estimatedDeliveryTime": "24小时",
      "items": [...]
    }
  ],
  "summary": {
    "totalOrders": 2,
    "grandTotal": 44.7,
    "platformsUsed": ["SAMS_CLUB", "HEMA"]
  }
}
```

#### GET `/api/ecommerce/orders`
Get user's order history.

**Query Parameters:**
- `status` - Order status filter
- `platform` - Platform filter
- `page` / `pageSize` - Pagination

#### GET `/api/ecommerce/orders/[orderId]`
Get specific order status with platform synchronization.

#### PUT `/api/ecommerce/orders/[orderId]`
Cancel an order.

**Body:**
```json
{
  "action": "cancel"
}
```

## Platform Adapters

### Supported Platforms

1. **Sam's Club (SAMS_CLUB)**
   - Bulk purchasing focus
   - Membership-based pricing
   - 24-hour delivery

2. **Hema (HEMA)**
   - Fresh food specialization
   - 30-minute delivery
   - Real-time inventory

3. **Dingdong (DINGDONG)**
   - Fast delivery focus
   - 29-minute delivery promise
   - Per-item shipping fees

### Adapter Interface

All platform adapters implement the `IPlatformAdapter` interface:

```typescript
interface IPlatformAdapter {
  readonly platform: EcommercePlatform
  readonly platformName: string
  readonly baseUrl: string

  // OAuth Authentication
  getAuthorizationUrl(request: OAuthRequest): Promise<OAuthResponse>
  exchangeToken(request: TokenExchangeRequest): Promise<TokenInfo>
  refreshToken(refreshToken: string): Promise<TokenInfo>

  // Product Operations
  searchProducts(request: ProductSearchRequest, token: string): Promise<ProductSearchResponse>
  getProduct(productId: string, token: string): Promise<PlatformProductInfo | null>
  queryStock(request: StockQueryRequest, token: string): Promise<StockQueryResponse>

  // Order Operations
  createOrder(request: CreateOrderRequest, token: string): Promise<CreateOrderResponse>
  getOrderStatus(orderId: string, token: string): Promise<OrderStatusResponse>
  cancelOrder(orderId: string, token: string): Promise<boolean>

  // Utility Methods
  getProductPrices(productIds: string[], token: string): Promise<Record<string, number>>
  getDeliveryOptions(address: DeliveryAddress, token: string): Promise<Record<string, any>>
  validateToken(token: string): Promise<boolean>
}
```

## SKU Matching Algorithm

### Matching Process

1. **Text Normalization**
   - Remove common modifiers (fresh, organic, imported)
   - Standardize units and specifications
   - Extract keywords and tokens

2. **Fuzzy Matching**
   - Jaccard similarity for text matching
   - Keyword overlap scoring
   - Category and brand matching
   - Price reasonableness checks

3. **Confidence Scoring**
   - Name matching (40% weight)
   - Keyword matching (30% weight)
   - Category matching (20% weight)
   - Attribute matching (10% weight)

4. **Result Filtering**
   - Minimum confidence threshold
   - Stock availability filter
   - Price range filtering
   - Maximum result limits

### Match Result Structure

```typescript
interface SKUMatchResult {
  platformProduct: PlatformProductInfo
  confidence: number           // 0.0 - 1.0
  matchedKeywords: string[]    // Matched keywords
  matchReasons: string[]       // Explanation of match
}
```

## Price Comparison Features

### Price Analysis

- **Total Price Calculation**: Product price + shipping fees - discounts
- **Unit Price Calculation**: Price per kg/l/standard unit
- **Value Score**: Composite score considering price, quality, and platform
- **Discount Detection**: Compare current price with original price

### Cross-Platform Comparison

- Real-time price fetching from platform APIs
- Cached price data for performance
- Price history tracking
- Trend analysis and alerts

### Shipping Fee Calculation

Platform-specific shipping rules:
- **Sam's Club**: ¥6 flat fee, free over ¥99
- **Hema**: Free shipping for orders over ¥39
- **Dingdong**: ¥3 base + ¥1 per additional item

## Cart Optimization

### Optimization Strategies

1. **Price Optimization**: Minimize total cost across all platforms
2. **Speed Optimization**: Prioritize fastest delivery platforms
3. **Balance**: Optimize for both price and delivery time

### Platform Consolidation

- Analyze item distribution across platforms
- Recommend consolidation to reduce shipping fees
- Consider platform-specific advantages

### Smart Recommendations

- **Price Optimization**: Suggest alternative products for savings
- **Platform Consolidation**: Recommend platform consolidation
- **Substitution**: Suggest similar products with better value

## Error Handling

### Error Types

```typescript
enum PlatformErrorType {
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  INVALID_REQUEST = 'INVALID_REQUEST',
  RATE_LIMITED = 'RATE_LIMITED',
  PLATFORM_ERROR = 'PLATFORM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}
```

### Error Response Format

```json
{
  "error": "Error message",
  "type": "PLATFORM_ERROR",
  "code": "500",
  "details": {
    "platform": "SAMS_CLUB",
    "originalError": "..."
  }
}
```

## Configuration

### Environment Variables

```bash
# Sam's Club
SAMS_CLUB_API_URL=https://api.samsclub.com.cn/v1
SAMS_CLUB_CLIENT_ID=your_client_id
SAMS_CLUB_CLIENT_SECRET=your_client_secret

# Hema
HEMA_API_URL=https://api.freshhema.com/v2
HEMA_APP_ID=your_app_id
HEMA_APP_SECRET=your_app_secret

# Dingdong
DINGDONG_API_URL=https://api.ddxq.com/v1
DINGDONG_CLIENT_ID=your_client_id
DINGDONG_CLIENT_SECRET=your_client_secret
```

### Database Configuration

The integration uses Prisma ORM with the following models:
- `PlatformAccount` - User platform bindings
- `PlatformProduct` - Cached product data
- `Order` - Unified order management
- `PriceHistory` - Price tracking data

## Security Considerations

### Token Management

- Access tokens are encrypted in database
- Automatic token refresh before expiration
- Secure token storage with limited lifetime
- Token validation on each API call

### OAuth Security

- State parameter validation for CSRF protection
- PKCE support for enhanced security
- Secure redirect URI validation
- Limited scope permissions

### Data Privacy

- Minimal data collection from platforms
- User consent for account linking
- Data encryption at rest
- GDPR compliance considerations

## Performance Optimization

### Caching Strategy

- Product data cached with TTL
- Match results cached for repeated queries
- Price history aggregated for trends
- CDN for product images

### Rate Limiting

- Platform-specific rate limits
- Exponential backoff for retries
- Request queuing for bulk operations
- Concurrent request limiting

### Batch Operations

- Bulk price fetching
- Batch order creation
- Mass inventory updates
- Efficient database queries

## Testing

### Unit Tests

- Platform adapter mocking
- SKU matching algorithm tests
- Price calculation verification
- Error handling validation

### Integration Tests

- End-to-end API testing
- Platform connectivity tests
- OAuth flow testing
- Database integration tests

### Performance Tests

- Load testing for high traffic
- Memory usage optimization
- Database query performance
- API response time benchmarks

## Monitoring and Analytics

### Metrics Tracking

- API response times
- Platform success rates
- Matching accuracy metrics
- User engagement analytics

### Error Monitoring

- Platform error tracking
- Token failure alerts
- Performance degradation alerts
- User feedback collection

### Business Intelligence

- Price trend analysis
- Platform preference insights
- Cost savings calculations
- User behavior patterns

## Future Enhancements

### Planned Features

1. **Additional Platforms**
   - JD.com integration
   - Taobao/Tmall support
   - Local supermarket chains

2. **Advanced Matching**
   - Machine learning improvements
   - Image recognition for products
   - Nutritional information matching

3. **Enhanced Analytics**
   - Predictive pricing
   - Demand forecasting
   - Personalized recommendations

4. **Mobile Optimization**
   - React Native app
   - Push notifications
   - Offline functionality

### Technical Improvements

1. **Performance**
   - GraphQL API migration
   - Redis caching layer
   - Microservices architecture

2. **Scalability**
   - Horizontal scaling support
   - Database sharding
   - CDN optimization

3. **Security**
   - Advanced token management
   - API key rotation
   - Enhanced audit logging

## Troubleshooting

### Common Issues

1. **Token Refresh Failures**
   - Check platform credentials
   - Verify redirect URI configuration
   - Review platform API status

2. **Matching Accuracy**
   - Adjust confidence thresholds
   - Update keyword mappings
   - Review food item data quality

3. **Price Discrepancies**
   - Check cache freshness
   - Verify platform API responses
   - Review discount calculations

### Debug Tools

- Platform API testing endpoints
- Database query analysis
- Performance monitoring dashboard
- Error log analysis tools

## Support

For technical support and questions:
- Development team: dev@healthbutler.com
- Documentation: https://docs.healthbutler.com/ecommerce
- Issue tracking: https://github.com/healthbutler/issues
