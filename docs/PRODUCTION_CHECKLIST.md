# 🚀 Health Butler 生产环境配置清单

## 📋 配置前准备

### ✅ 必需账户
- [ ] Supabase 账户 (https://supabase.com)
- [ ] Cloudflare 账户 (https://cloudflare.com)
- [ ] 第三方 API 账户 (可选)
  - [ ] OpenAI API (https://platform.openai.com)
  - [ ] OpenRouter API (https://openrouter.ai)
  - [ ] USDA API (https://fdc.nal.usda.gov)

### ✅ 必需工具
- [ ] Node.js 20+ (https://nodejs.org)
- [ ] npm 或 pnpm
- [ ] Git
- [ ] Supabase CLI (npm install -g supabase)
- [ ] Wrangler CLI (npm install -g wrangler)
- [ ] curl 或 wget (用于测试)

---

## 🔧 步骤 1: Supabase 配置

### 1.1 创建项目
- [ ] 登录 Supabase Dashboard
- [ ] 创建新项目 `health-butler-prod`
- [ ] 选择合适地区 (推荐 East US 或 Southeast Asia)
- [ ] 保存数据库密码

### 1.2 获取凭据
- [ ] 复制 Project URL: `https://[ref].supabase.co`
- [ ] 复制 Service Role Key (服务端密钥)
- [ ] 复制 Anon Key (客户端密钥)
- [ ] 复制 Account ID (在 Settings → General)

### 1.3 数据库初始化
```bash
# 运行迁移脚本
supabase db push supabase/migrations/001_initial_schema.sql
supabase db push supabase/migrations/002_rls_policies.sql
supabase db push supabase/migrations/003_performance_indexes.sql
```

### 1.4 验证连接
```bash
# 测试连接
node scripts/test-supabase-connection.js

# 预期输出:
# ✅ 连接成功
# ✅ 用户认证成功 (如适用)
# ✅ 表结构正常
# ✅ 函数正常
```

---

## 🌐 步骤 2: Cloudflare 配置

### 2.1 获取 API 凭据
- [ ] 登录 Cloudflare Dashboard
- [ ] 获取 Account ID (右侧边栏)
- [ ] 创建 API Token:
  - 权限: `Cloudflare Pages:Edit`, `Account:Read`
  - 资源: 包含您的账户
  - 有效期: 1 年

### 2.2 创建 Pages 项目
- [ ] 访问 Cloudflare Dashboard → Pages
- [ ] 创建项目 `health-butler-supabase`
- [ ] 或使用 CLI: `wrangler pages project create health-butler-supabase`

### 2.3 配置自定义域名 (可选)
- [ ] 添加自定义域名
- [ ] 配置 DNS CNAME 记录
- [ ] 等待 DNS 传播

---

## 🔑 步骤 3: 环境变量配置

### 3.1 创建环境文件
```bash
# 复制示例文件
cp .env.production.example .env.production

# 或使用交互式配置
./scripts/setup-production-env.sh
```

### 3.2 必需环境变量
| 变量名 | 描述 | 获取位置 |
|--------|------|----------|
| `SUPABASE_URL` | Supabase 项目 URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | 服务端密钥 | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_URL` | 客户端 URL | 通常与 SUPABASE_URL 相同 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 客户端密钥 | Supabase Dashboard → Settings → API |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | Cloudflare Dashboard 右侧边栏 |
| `CLOUDFLARE_API_TOKEN` | API Token | Cloudflare Dashboard → My Profile → API Tokens |
| `NEXT_PUBLIC_SITE_URL` | 站点 URL | 您的域名或 Pages 默认域名 |

### 3.3 验证配置
```bash
# 运行环境检查
./scripts/check-environment.sh

# 预期输出:
# ✅ 必需配置: 8/8
# ✅ 所有必需配置已设置！
```

---

## 🧪 步骤 4: 测试和验证

### 4.1 本地测试
```bash
# 运行测试套件
npm test

# 类型检查
npm run type-check

# 代码质量检查
npm run lint
```

### 4.2 构建测试
```bash
# 构建应用
npm run build:cloudflare-hybrid

# 验证构建输出
ls -la .next/
```

### 4.3 数据库测试
```bash
# 测试数据库连接
node scripts/test-supabase-connection.js

# 测试 API 端点
curl -X GET "https://[your-pages-url]/api/v1/health"
```

---

## 🚀 步骤 5: 生产部署

### 5.1 运行部署脚本
```bash
# 自动部署
./scripts/deploy-production.sh

# 或手动部署
wrangler pages deploy .next --project-name=health-butler-supabase --env production
```

### 5.2 验证部署
```bash
# 运行部署验证
./scripts/validate-deployment.sh https://your-domain.pages.dev

# 预期输出:
# ✅ 所有测试通过！部署验证成功。
```

---

## 📊 步骤 6: 监控和优化

### 6.1 设置监控
- [ ] 启用 Cloudflare Analytics
- [ ] 配置 Supabase Dashboard 监控
- [ ] 设置错误告警
- [ ] 配置性能基准

### 6.2 性能优化
- [ ] 启用连接池
- [ ] 配置缓存策略
- [ ] 优化数据库索引
- [ ] 设置 CDN 缓存

---

## 🔒 安全配置检查

### 必需安全设置
- [ ] 所有表启用 RLS (行级安全)
- [ ] 使用强密码和密钥
- [ ] 启用 HTTPS (自动)
- [ ] 配置 CORS 策略
- [ ] 设置 JWT 过期时间

### 推荐安全设置
- [ ] 启用双因素认证
- [ ] 定期轮换 API 密钥
- [ ] 设置访问日志
- [ ] 配置异常检测
- [ ] 启用备份策略

---

## 📈 性能基准

### 目标性能指标
- [ ] API 响应时间 < 200ms
- [ ] 页面加载时间 < 2s
- [ ] 数据库查询 < 100ms
- [ ] 并发处理 > 1000 请求/秒

### 监控指标
- [ ] 错误率 < 1%
- [ ] 可用性 > 99.9%
- [ ] 缓存命中率 > 80%
- [ ] 数据库连接利用率 < 80%

---

## 🎯 部署后检查

### 功能验证
- [ ] 用户注册/登录正常
- [ ] 健康数据 CRUD 操作正常
- [ ] 食物搜索功能正常
- [ ] 实时数据更新正常
- [ ] 仪表板数据显示正常

### 数据完整性
- [ ] 数据库表结构完整
- [ ] RLS 策略生效
- [ ] 数据关联关系正确
- [ ] 备份和恢复功能正常

### 安全性验证
- [ ] 未授权访问被拒绝
- [ ] 数据加密传输
- [ ] 输入验证生效
- [ ] 错误处理安全

---

## 🆘 故障排除

### 常见问题

#### 部署失败
```bash
# 查看详细日志
wrangler tail

# 检查构建日志
wrangler pages deployment tail [deployment-id]
```

#### 数据库连接失败
```bash
# 测试连接
node scripts/test-supabase-connection.js

# 检查环境变量
./scripts/check-environment.sh
```

#### API 响应错误
```bash
# 查看 Functions 日志
wrangler tail

# 测试 API 端点
curl -v https://your-domain/api/v1/health
```

### 紧急联系
- [ ] Cloudflare 支持
- [ ] Supabase 支持
- [ ] 第三方 API 支持

---

## 📚 参考资源

### 官方文档
- [Supabase 文档](https://supabase.com/docs)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

### 最佳实践
- [安全最佳实践](./SECURITY_BEST_PRACTICES.md)
- [性能优化指南](./PERFORMANCE_GUIDE.md)
- [监控设置指南](./MONITORING_SETUP.md)

---

## ✅ 最终确认

### 部署完成确认
- [ ] 所有测试通过
- [ ] 功能正常运行
- [ ] 监控已配置
- [ ] 备份已设置
- [ ] 文档已更新

### 上线准备
- [ ] 用户通知已发送
- [ ] 回滚计划已制定
- [ ] 监控告警已配置
- [ ] 性能基准已建立

### 后续维护
- [ ] 定期检查更新
- [ ] 监控性能指标
- [ ] 备份验证
- [ ] 安全审计

---

🎉 **恭喜！您已完成 Health Butler 生产环境配置。**

**下一步**: 运行 `./scripts/deploy-production.sh` 开始部署！

**遇到问题？** 查看故障排除部分或联系技术支持。
