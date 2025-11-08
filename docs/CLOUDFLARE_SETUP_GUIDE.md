# Cloudflare Pages 生产环境配置指南

## 1. Cloudflare 账户设置

### 步骤 1.1: 创建 Cloudflare 账户
1. 访问 [Cloudflare 官网](https://dash.cloudflare.com/sign-up)
2. 注册新账户或使用现有账户登录
3. 完成邮箱验证

### 步骤 1.2: 获取 API 凭据
1. 登录 Cloudflare Dashboard
2. 点击右上角头像 → "My Profile"
3. 选择 "API Tokens" 标签
4. 点击 "Create Token"
5. 选择 "Custom token" 模板

## 2. 创建 API Token

### 步骤 2.1: 配置 Token 权限
创建具有以下权限的 Token：

**权限设置：**
- `Cloudflare Pages:Edit` - 管理 Pages 项目
- `Account:Read` - 读取账户信息
- `User:Read` - 读取用户信息

**资源范围：**
- 包含特定账户或所有账户
- 选择适当的有效期（推荐 1 年）

**Token 名称：**
```
Health Butler Pages Deployment
```

### 步骤 2.2: 保存 Token
1. 生成 Token 后立即复制（只显示一次）
2. 保存在安全的地方
3. 设置环境变量：
```bash
export CLOUDFLARE_API_TOKEN="your-generated-token"
```

## 3. 获取账户 ID

### 步骤 3.1: 查找账户 ID
1. 在 Cloudflare Dashboard 右侧边栏
2. 找到 "Account ID" 字段
3. 复制账户 ID

或者通过 API 获取：
```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json"
```

### 步骤 3.2: 设置环境变量
```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

## 4. 安装 Wrangler CLI

### 步骤 4.1: 安装 Wrangler
```bash
# 安装 Wrangler
npm install -g wrangler

# 验证安装
wrangler --version
```

### 步骤 4.2: 认证 Wrangler
```bash
# 使用 API Token 认证
wrangler login

# 或者手动配置
wrangler config
```

## 5. 创建 Pages 项目

### 方法 1: 通过 Dashboard 创建

1. 登录 Cloudflare Dashboard
2. 点击左侧菜单 "Pages"
3. 点击 "Create a project"
4. 选择 "Upload assets"
5. 填写项目信息：
   - **项目名称**: `health-butler-supabase`
   - **生产分支**: `main`
6. 创建项目

### 方法 2: 通过 CLI 创建

```bash
# 创建 Pages 项目
wrangler pages project create health-butler-supabase

# 查看项目信息
wrangler pages project list
```

## 6. 配置 Pages 项目

### 步骤 6.1: 环境变量设置

在 Cloudflare Dashboard 中：

1. 进入 Pages 项目
2. 点击 "Settings" → "Environment variables"
3. 添加以下变量：

**生产环境变量：**
```bash
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_SERVICE_KEY=[your-service-role-key]
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_SITE_URL=https://health-butler-supabase.pages.dev
NODE_ENV=production
```

**构建环境变量：**
```bash
NODE_VERSION=20
```

### 步骤 6.2: 构建设置

1. 点击 "Settings" → "Builds & deployments"
2. 设置构建配置：
   - **Build command**: `npm run build:cloudflare-hybrid`
   - **Build output directory**: `.next`
   - **Root directory**: `/`
   - **Install command**: `npm ci`

### 步骤 6.3: 自定义域名（可选）

1. 点击 "Custom domains"
2. 点击 "Set up a custom domain"
3. 输入您的域名：
   ```
   health.yourdomain.com
   ```
4. 按照 DNS 配置说明设置 CNAME 记录
5. 等待 DNS 传播（通常 5-10 分钟）

## 7. 配置 Workers 和 Functions

### 步骤 7.1: 验证 Functions 配置
确保 `wrangler.toml` 正确配置：

```toml
name = "health-butler-supabase"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat", "nodejs_als"]

[env.production]
name = "health-butler-supabase-prod"

[env.production.vars]
NODE_ENV = "production"
SUPABASE_URL = "https://[your-project-ref].supabase.co"
SUPABASE_SERVICE_KEY = "[your-service-key]"
NEXT_PUBLIC_SUPABASE_URL = "https://[your-project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "[your-anon-key]"
NEXT_PUBLIC_SITE_URL = "https://health-butler-supabase.pages.dev"
```

### 步骤 7.2: 测试 Functions

```bash
# 本地测试 Functions
wrangler pages dev functions/

# 部署 Functions
wrangler pages deploy functions/ --project-name=health-butler-supabase
```

## 8. 安全配置

### 步骤 8.1: HTTPS 设置
Pages 自动提供 HTTPS，但可以额外配置：

1. 确保强制 HTTPS
2. 配置 HSTS 头
3. 设置安全头

### 步骤 8.2: 访问控制
1. 配置部署保护（可选）
2. 设置环境变量加密
3. 配置 API 访问限制

### 步骤 8.3: 监控设置
1. 启用 Web Analytics
2. 配置错误追踪
3. 设置性能监控

## 9. 部署验证

### 步骤 9.1: 基本部署测试
```bash
# 测试站点访问
curl -I https://health-butler-supabase.pages.dev

# 测试 API 端点
curl https://health-butler-supabase.pages.dev/api/v1/health
```

### 步骤 9.2: 运行验证脚本
```bash
# 使用验证脚本
./scripts/validate-deployment.sh https://health-butler-supabase.pages.dev
```

## 10. 监控和日志

### 步骤 10.1: 查看部署日志
```bash
# 实时日志
wrangler tail

# 构建日志
wrangler pages deployment tail
```

### 步骤 10.2: 性能监控
1. 访问 Cloudflare Dashboard
2. 查看 Pages Analytics
3. 监控 Functions 使用情况

## 11. 故障排除

### 常见问题

1. **部署失败**
   ```bash
   # 检查构建日志
   wrangler pages deployment list
   
   # 查看错误详情
   wrangler pages deployment tail [deployment-id]
   ```

2. **Functions 错误**
   ```bash
   # 查看 Functions 日志
   wrangler tail
   
   # 测试本地 Functions
   wrangler pages dev
   ```

3. **环境变量问题**
   - 检查变量名称是否正确
   - 验证变量值是否有效
   - 确保变量已保存

4. **构建错误**
   - 检查 Node.js 版本兼容性
   - 验证依赖包安装
   - 查看详细构建日志

### 性能优化

1. **缓存配置**
   ```toml
   # 在 wrangler.toml 中添加
   [[env.production.routes]]
   pattern = "/api/*"
   script = "api-cache"
   
   [env.production.routes.cache]
   ttl = 300
   ```

2. **压缩优化**
   - 启用 Brotli 压缩
   - 优化图片资源
   - 代码分割

3. **边缘优化**
   - 使用智能路由
   - 配置负载均衡
   - 启用 Argo Smart Routing

## 12. 成本管理

### 免费层限制
- **Pages**: 500 builds/month, 1GB transfer/day
- **Workers**: 100,000 requests/day, 30 CPU time/script
- **KV**: 1GB storage, 1000 reads/50 writes per second

### 监控使用情况
1. 定期查看 Dashboard 统计
2. 设置使用警报
3. 优化资源使用

## 13. 备份和恢复

### 数据备份
```bash
# 备份 Pages 配置
wrangler pages project get health-butler-supabase > pages-config.json

# 备份环境变量
wrangler pages project list > projects-list.json
```

### 灾难恢复
1. 保留配置文件备份
2. 文档化部署流程
3. 测试恢复程序

## 14. 最佳实践

### 安全建议
1. **密钥管理**
   - 使用环境变量存储敏感信息
   - 定期轮换 API Token
   - 限制 Token 权限范围

2. **访问控制**
   - 启用双因素认证
   - 定期审查访问权限
   - 监控异常活动

3. **代码安全**
   - 定期安全扫描
   - 使用最新的依赖版本
   - 遵循安全编码规范

### 性能优化
1. **资源优化**
   - 合理设置缓存策略
   - 优化数据库查询
   - 使用 CDN 加速

2. **监控优化**
   - 设置性能基准
   - 定期性能测试
   - 持续优化改进

## 下一步

完成 Cloudflare 配置后：

1. [运行生产部署](./deploy-production.sh)
2. [验证部署](./validate-deployment.sh)
3. [查看部署报告](./DEPLOYMENT_GUIDE_FINAL.md)

恭喜！您已成功配置 Cloudflare Pages 生产环境。🎉

## 支持资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Community](https://community.cloudflare.com/)
- [Pages 故障排除](https://developers.cloudflare.com/pages/platform/troubleshooting/)"}
