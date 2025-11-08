# 架构设计能力规范

## 概述
本规范定义了Cloudflare Pages + Supabase混合架构的核心架构设计要求和能力标准。

## ADDED Requirements

### Requirement: 混合架构设计
系统SHALL实现静态内容与动态API的智能分离，确保最优性能和成本效益。

#### Scenario: 静态与动态内容分离

**验收标准**：
- 静态资源（HTML、CSS、JS、图片）通过Cloudflare Pages CDN分发
- 动态API请求通过Pages Functions处理，响应时间<200ms
- 实现智能路由，根据请求类型自动选择最优路径
- 支持全球CDN加速，确保各地用户访问延迟<100ms

**技术实现**：
```typescript
// src/lib/router.ts
export class HybridRouter {
  static isStaticResource(path: string): boolean {
    const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.svg'];
    return staticExtensions.some(ext => path.endsWith(ext));
  }

  static getOptimalRoute(path: string): string {
    if (this.isStaticResource(path)) {
      return `https://cdn.health-butler.com${path}`;
    }
    return `https://api.health-butler.com${path}`;
  }
}
```

### Requirement: 边缘计算架构
系统SHALL利用Cloudflare的边缘网络，在用户就近位置处理请求。

#### Scenario: 全球用户访问优化

**验收标准**：
- 部署在Cloudflare全球300+边缘节点
- 边缘函数执行时间<50ms
- 支持地理分布式数据处理
- 实现边缘缓存策略，缓存命中率>80%

**性能指标**：
- 北美用户：响应时间<50ms
- 欧洲用户：响应时间<80ms
- 亚洲用户：响应时间<120ms
- 其他地区：响应时间<200ms

### Requirement: 零成本运营架构
系统SHALL充分利用免费层服务，实现$0/月的运营成本。

#### Scenario: 成本效益最大化

**验收标准**：
- Cloudflare Pages：免费层（无大小限制）
- Pages Functions：免费层（100万次/月请求）
- Supabase：免费层（500MB存储，50k月活用户）
- 总运营成本：$0/月（在免费层限制内）

**监控告警**：
- 当使用量达到免费层80%时发出警告
- 提供成本优化建议和升级路径
- 实现用量监控和自动告警

## MODIFIED Requirements

### Requirement: 前端架构重构
系统SHALL将现有的服务端渲染架构重构为静态导出模式。

#### Scenario: Next.js静态导出适配

**变更内容**：
- 移除getServerSideProps，改用getStaticProps
- 实现客户端数据获取和状态管理
- 优化构建输出，确保兼容性
- 添加渐进式增强支持

**技术规范**：
```typescript
// 重构前（服务端渲染）
export async function getServerSideProps(context) {
  const data = await fetchUserData(context.req.user.id);
  return { props: { data } };
}

// 重构后（静态导出 + 客户端获取）
export async function getStaticProps() {
  return {
    props: {},
    revalidate: 60, // ISR重新验证
  };
}

// 客户端数据获取
function UserDashboard() {
  const { data, loading, error } = useUserData();

  if (loading) return <LoadingSpinner /\u003e;
  if (error) return <ErrorMessage error={error} /\u003e;

  return <Dashboard data={data} /\u003e;
}
```

### Requirement: API架构优化
系统SHALL将现有的Next.js API路由重构为Pages Functions。

#### Scenario: Pages Functions适配

**变更内容**：
- 拆分大型API路由为多个轻量级函数（每个<1MB）
- 实现边缘优化的API设计
- 添加请求限流和错误处理
- 优化冷启动时间

**函数大小限制**：
- 单个函数大小：<1MB（压缩后）
- 总函数数量：无限制
- 执行时间限制：30秒
- 内存限制：128MB

## 技术架构规范

### Requirement: 静态资源架构
#### Scenario: 全球CDN分发
**需求**：静态资源必须实现最优的全球分发策略。

**技术规范**：
- 构建输出目录：`.next/static`
- 缓存策略：`public, max-age=31536000, immutable`
- 压缩算法：Brotli + Gzip双压缩
- 图片优化：WebP格式 + 自适应尺寸

**缓存控制**：
```javascript
// 静态资源缓存头
{
  'Cache-Control': 'public, max-age=31536000, immutable',
  'CDN-Cache-Control': 'max-age=31536000',
  'Cloudflare-CDN-Cache-Control': 'max-age=31536000, stale-while-revalidate=86400'
}

// API响应缓存头
{
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  'CDN-Cache-Control': 'no-cache'
}
```

### Requirement: 边缘函数架构
#### Scenario: 轻量级API处理
**需求**：边缘函数必须实现高效的请求处理和响应。

**设计原则**：
- 单一职责：每个函数只处理一个具体功能
- 无状态设计：不依赖本地状态存储
- 快速启动：冷启动时间<100ms
- 错误恢复：优雅处理异常和错误

**函数模板**：
```javascript
// 标准边缘函数模板
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    // 1. 请求验证
    const validation = await validateRequest(request);
    if (!validation.valid) {
      return createErrorResponse(validation.error, 400);
    }

    // 2. 业务逻辑处理
    const result = await handleBusinessLogic(validation.data, env);

    // 3. 响应构建
    return createSuccessResponse(result);

  } catch (error) {
    // 4. 错误处理
    return handleError(error);
  }
}
```

### Requirement: 数据库连接架构
#### Scenario: Supabase客户端集成
**需求**：实现高效、安全的Supabase数据库连接。

**连接策略**：
- 连接池复用：每个函数复用数据库连接
- 认证令牌：JWT令牌验证和刷新
- 查询优化：预编译语句和索引优化
- 错误处理：连接失败的重试机制

**客户端配置**：
```typescript
// Supabase客户端配置
const supabaseConfig = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'health-butler',
      'x-deployment-version': process.env.DEPLOYMENT_VERSION,
    },
  },
  db: {
    schema: 'public',
  },
};
```

## 性能架构要求

### Requirement: 响应时间要求
#### Scenario: 用户体验优化
**需求**：系统必须满足严格的响应时间要求。

**性能目标**：
- 静态资源加载：<100ms（CDN缓存命中）
- API响应时间：<200ms（边缘函数处理）
- 数据库查询：<100ms（简单查询）
- 页面完全加载：<2秒（3G网络）

**监控指标**：
```typescript
// 性能监控指标
interface PerformanceMetrics {
  edgeResponseTime: number;      // 边缘响应时间
  databaseQueryTime: number;     // 数据库查询时间
  functionColdStart: boolean;    // 是否冷启动
  cacheHitRatio: number;         // 缓存命中率
  errorRate: number;             // 错误率
}
```

### Requirement: 可扩展性架构
#### Scenario: 业务增长支持
**需求**：架构必须支持业务的线性扩展。

**扩展能力**：
- 用户容量：支持1M+注册用户
- 并发请求：支持10k+并发连接
- 数据存储：支持TB级数据存储
- 地理扩展：支持全球用户访问

**自动扩缩容**：
- 基于请求量的自动扩容
- 基于资源使用的自动调整
- 基于地理位置的智能路由
- 基于成本的优化策略

## 安全架构要求

### Requirement: 边缘安全架构
#### Scenario: 分布式安全控制
**需求**：在边缘节点实现统一的安全策略。

**安全控制**：
- DDoS防护：自动检测和缓解攻击
- WAF规则：Web应用防火墙保护
- 速率限制：防止API滥用
- 地理封锁：基于IP的访问控制

**安全头配置**：
```javascript
// 安全响应头
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

### Requirement: 数据安全架构
#### Scenario: 端到端数据保护
**需求**：实现从客户端到数据库的全链路数据安全。

**安全措施**：
- 传输加密：TLS 1.3加密所有通信
- 数据加密：敏感数据字段级加密
- 访问控制：基于角色的权限管理
- 审计日志：完整的操作审计跟踪

**加密策略**：
```typescript
// 数据加密配置
const encryptionConfig = {
  algorithm: 'AES-256-GCM',
  keyRotation: '30d', // 30天密钥轮换
  fieldEncryption: [
    'user.email',
    'user.phone',
    'health_data.value'
  ],
};
```

## 监控架构要求

### Requirement: 可观测性架构
#### Scenario: 分布式系统监控
**需求**：实现全面的系统可观测性和监控能力。

**监控维度**：
- 基础设施监控：CPU、内存、网络使用率
- 应用性能监控：响应时间、错误率、吞吐量
- 业务指标监控：用户活跃度、功能使用率
- 成本监控：资源使用成本、预算告警

**监控架构**：
```typescript
// 监控数据模型
interface MonitoringMetrics {
  timestamp: number;
  service: string;
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
  labels: Record<string, string>;
}
```

这些架构设计规范确保了Cloudflare Pages + Supabase混合架构能够满足性能、可扩展性、安全性和可观测性的全面要求。所有组件都必须严格按照这些规范进行设计和实现，以确保系统的整体质量和可靠性。