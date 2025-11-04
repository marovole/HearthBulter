# Cloudflare Pages 部署迁移规范

## ADDED Requirements

### 部署平台迁移要求

#### Requirement: Cloudflare Pages 构建配置
**场景**: 配置Next.js应用在Cloudflare Pages的构建流程
```gherkin
Given 当前应用使用Next.js 15和标准构建脚本
When 迁移到Cloudflare Pages
Then 应用必须能够成功构建和部署
And 构建时间不超过当前Vercel构建时间的120%
And 所有静态资源正确生成
```

#### Requirement: Workers运行时兼容性
**场景**: 确保中间件和API路由在Cloudflare Workers运行时正常工作
```gherkin
Given 当前应用使用Node.js运行时
When 迁移到Cloudflare Workers环境
Then 所有中间件功能必须正常工作
And 所有API路由响应正确
And 不依赖Node.js特定的API
```

### 中间件优化要求

#### Requirement: Edge Function大小限制
**场景**: 将中间件大小减少到Cloudflare可接受范围
```gherkin
Given 当前Edge Function大小为1.05MB超过限制
When 重构中间件和优化依赖
Then 中间件大小必须小于500KB
And 保持所有安全功能
And 保持所有认证功能
```

#### Requirement: 依赖分离
**场景**: 将重量级依赖从middleware中移除
```gherkin
Given 当前middleware导入Prisma和bcryptjs等大型依赖
When 重构中间件架构
Then 这些依赖必须移至API路由
And 中间件只保留轻量级验证逻辑
And 数据库查询通过API端点完成
```

### 环境变量迁移要求

#### Requirement: 环境变量格式适配
**场景**: 将Vercel环境变量格式转换为Cloudflare格式
```gherkin
Given 当前使用Vercel环境变量格式
When 迁移到Cloudflare Pages
Then 所有必需环境变量必须正确配置
And 应用能够访问数据库
And 认证系统正常工作
```

## MODIFIED Requirements

### 部署流程要求

#### Requirement: 构建命令更新
**场景**: 更新构建命令以支持Cloudflare适配器
```gherkin
Given 当前使用`npm run build`进行构建
When 配置Cloudflare Pages
Then 必须添加`@cloudflare/next-on-pages`构建步骤
And 构建输出适配Cloudflare Workers格式
And 保持现有开发环境构建不变
```

### 认证流程要求

#### Requirement: Session验证重构
**场景**: 将session验证从middleware移至API路由
```gherkin
Given 当前session验证在middleware中进行
When 重构认证流程
Then session验证必须通过专门的API端点完成
And 前端能够正确处理验证结果
And 保持安全性要求不变
```