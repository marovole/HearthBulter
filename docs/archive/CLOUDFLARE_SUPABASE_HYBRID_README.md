# Cloudflare Pages + Supabase 混合架构

本文档描述了 Health Butler 项目从 Vercel Edge Functions 迁移到 Cloudflare Pages + Supabase 混合架构的实现方案。

## 架构概述

新的混合架构采用以下技术栈：

- **前端**: Next.js 15 静态导出部署到 Cloudflare Pages
- **后端 API**: Cloudflare Pages Functions (边缘函数)
- **数据库**: Supabase PostgreSQL
- **认证**: Supabase Auth
- **存储**: Supabase Storage
- **实时功能**: Supabase Realtime

## 主要变更

### 1. Next.js 配置变更

- 启用静态导出模式 (`output: 'export'`)
- 禁用图片优化 (`images.unoptimized: true`)
- 配置静态资源路径

### 2. 后端架构重构

- 从 Next.js API Routes 迁移到 Cloudflare Pages Functions
- 实现边缘计算优化
- 添加多层缓存策略

### 3. 数据库访问重构

- 从 Prisma ORM 迁移到 Supabase 客户端
- 实现行级安全 (RLS) 策略
- 优化查询性能

### 4. 认证系统迁移

- 从 NextAuth.js 迁移到 Supabase Auth
- 实现 JWT 令牌管理
- 支持社交登录

## 文件结构

```
functions/                    # Cloudflare Pages Functions
├── api/v1/                  # API 版本 1
│   ├── health/             # 健康数据 API
│   ├── nutrition/          # 营养分析 API
│   ├── recipes/            # 食谱管理 API
│   ├── users/              # 用户管理 API
│   └── family/             # 家庭协作 API
├── api/auth/               # 认证相关 API
├── middleware/             # 中间件
├── utils/                  # 工具函数
└── config/                 # 配置文件

src/
├── lib/
│   ├── supabase-client.ts  # Supabase 客户端
│   └── data-fetching.ts    # 数据获取工具
└── ...                     # 其他前端代码
```

## 环境变量配置

### 必需环境变量

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# 站点配置
NEXT_PUBLIC_SITE_URL=https://your-domain.pages.dev
```

### 可选环境变量

```bash
# 第三方 API
OPENAI_API_KEY=your-openai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
USDA_API_KEY=your-usda-api-key

# 邮件服务
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 部署步骤

### 1. 环境准备

```bash
# 安装依赖
npm install

# 设置环境变量
cp .env.cloudflare .env.local
# 编辑 .env.local 填入实际值
```

### 2. 构建项目

```bash
# 构建静态导出版本
npm run build:cloudflare-hybrid

# 或者使用传统构建
npm run build
```

### 3. 部署到 Cloudflare Pages

```bash
# 自动部署
npm run deploy:cloudflare-hybrid

# 或者手动部署
wrangler pages deploy .next --project-name=hearthbutler-supabase
```

## 开发指南

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm test

# 类型检查
npm run type-check
```

### 添加新的 API 端点

1. 在 `functions/api/v1/` 目录下创建新的函数文件
2. 实现请求处理逻辑
3. 添加输入验证和错误处理
4. 编写测试用例

示例：

```javascript
// functions/api/v1/example/index.js
import { withAuth } from "../../middleware/auth.js";
import { withErrorHandler } from "../../utils/error-handler.js";
import { createSuccessResponse } from "../../utils/response.js";

export const onRequestGet = withErrorHandler(
  withAuth(async (context) => {
    const { user } = context;

    // 实现业务逻辑
    const data = { message: "Hello World", user };

    return createSuccessResponse(data);
  }),
);
```

### 数据库操作

使用 Supabase 客户端进行数据库操作：

```javascript
import { createSupabaseClient } from "../utils/supabase.js";

const supabase = createSupabaseClient(env);

// 查询数据
const { data, error } = await supabase
  .from("health_data")
  .select("*")
  .eq("user_id", user.id);

// 插入数据
const { data, error } = await supabase.from("health_data").insert({
  user_id: user.id,
  data_type: "weight",
  value: 70.5,
  unit: "kg",
});
```

## 性能优化

### 1. 缓存策略

- **静态资源**: CDN 缓存 1 年
- **API 响应**: 根据数据变化频率设置不同缓存时间
- **数据库查询**: 使用 Supabase 查询缓存

### 2. 边缘优化

- **就近访问**: 利用 Cloudflare 的全球 CDN
- **边缘计算**: 在靠近用户的边缘节点处理请求
- **智能路由**: 根据用户地理位置路由到最优节点

### 3. 前端优化

- **代码分割**: 按需加载 JavaScript
- **图片优化**: 使用 WebP 格式
- **预加载**: 关键资源预加载

## 监控和调试

### 1. 日志记录

- 使用 `console.log` 记录重要事件
- Cloudflare Dashboard 查看函数日志
- 设置告警监控错误率

### 2. 性能监控

- Cloudflare Analytics 监控网站性能
- Supabase Dashboard 监控数据库性能
- 自定义指标收集

### 3. 错误处理

- 统一的错误处理中间件
- 详细的错误日志记录
- 用户友好的错误提示

## 安全考虑

### 1. 认证安全

- JWT 令牌短期有效
- 自动令牌刷新
- 安全的会话管理

### 2. 数据安全

- PostgreSQL 行级安全 (RLS)
- 数据加密传输和存储
- 定期数据备份

### 3. 网络安全

- HTTPS 强制加密
- CORS 跨域请求控制
- DDoS 防护

## 故障排除

### 常见问题

1. **构建失败**
   - 检查 Next.js 静态导出配置
   - 验证环境变量设置
   - 查看构建日志

2. **API 调用失败**
   - 检查 Functions 部署状态
   - 验证 Supabase 连接
   - 查看函数日志

3. **认证问题**
   - 检查 JWT 令牌有效性
   - 验证 Supabase Auth 配置
   - 查看认证中间件日志

### 调试工具

- Cloudflare Dashboard 日志查看器
- Supabase Dashboard 查询编辑器
- 浏览器开发者工具

## 成本优化

### 1. 免费层利用

- Cloudflare Pages 免费层
- Supabase 免费层
- 优化 API 调用频率

### 2. 资源优化

- 图片压缩和优化
- 代码分割和懒加载
- 缓存策略优化

### 3. 监控成本

- 设置使用上限告警
- 定期审查资源使用
- 优化数据库查询

## 扩展计划

### 1. 功能扩展

- 添加更多健康数据类型
- 实现 AI 营养建议
- 增加社交功能

### 2. 性能扩展

- 实现全球多区域部署
- 添加边缘缓存策略
- 优化数据库性能

### 3. 架构扩展

- 微服务架构拆分
- 事件驱动架构
- 容器化部署

## 支持和维护

### 1. 文档维护

- 定期更新 API 文档
- 维护部署指南
- 更新故障排除手册

### 2. 依赖管理

- 定期更新依赖包
- 安全漏洞扫描
- 性能基准测试

### 3. 用户支持

- 建立用户反馈渠道
- 提供技术支持
- 定期收集用户反馈

---

如需更多帮助，请参考 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/) 和 [Supabase 文档](https://supabase.com/docs)。
