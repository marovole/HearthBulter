# Health Butler Cloudflare Pages + Supabase 部署指南

## 🚀 快速开始

本指南将帮助您将 Health Butler 从 Vercel Edge Functions 迁移到 Cloudflare Pages + Supabase 混合架构。

## 📋 部署前准备

### 必需条件

1. **Cloudflare 账户** - 用于部署 Pages 和 Workers
2. **Supabase 账户** - 用于数据库和后端服务
3. **Node.js 20+** - 本地开发环境
4. **Wrangler CLI** - Cloudflare 部署工具

### 环境变量配置

创建 `.env.production` 文件：

```bash
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 站点配置
NEXT_PUBLIC_SITE_URL=https://your-domain.pages.dev

# Cloudflare 配置
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

## 🔧 实施步骤

### 步骤 1: 设置 Supabase 项目

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 创建新项目，选择地区（建议选择靠近用户的地区）
3. 复制项目 URL 和 API 密钥到环境变量

### 步骤 2: 配置数据库

运行数据库迁移脚本：

```bash
# 应用数据库架构
supabase db push supabase/migrations/001_initial_schema.sql
supabase db push supabase/migrations/002_rls_policies.sql
supabase db push supabase/migrations/003_performance_indexes.sql
```

### 步骤 3: 数据迁移（如果适用）

如果从现有数据库迁移：

```bash
# 设置源数据库连接
export DATABASE_URL="your-neon-database-url"
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-key"

# 运行迁移脚本
node scripts/migrate-to-supabase.js
```

### 步骤 4: 本地测试

```bash
# 安装依赖
npm install

# 运行测试
npm test
npm run type-check

# 构建应用
npm run build:cloudflare-hybrid
```

### 步骤 5: 部署到 Cloudflare Pages

#### 方法一：使用部署脚本

```bash
# 设置环境变量
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-key"
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
export NEXT_PUBLIC_SITE_URL="your-site-url"

# 运行部署脚本
./scripts/deploy-production.sh
```

#### 方法二：手动部署

```bash
# 构建静态导出
npm run build

# 部署到 Cloudflare Pages
wrangler pages deploy .next --project-name=hearthbutler-supabase --env production
```

### 步骤 6: 验证部署

运行验证脚本：

```bash
./scripts/validate-deployment.sh https://your-domain.pages.dev
```

## 📊 架构概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户浏览器     │    │  Cloudflare CDN │    │   Supabase      │
│                 │◄──►│                 │◄──►│   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Pages Functions│
                       │   (边缘函数)     │
                       └─────────────────┘
```

## 🎯 关键功能

### ✅ 已迁移的 API 端点

- **健康数据 API** - `/api/v1/health`
- **食物搜索 API** - `/api/v1/foods/search`
- **用户认证 API** - `/api/auth/login`, `/api/auth/register`
- **用户偏好 API** - `/api/v1/users/preferences`
- **仪表板 API** - `/api/v1/dashboard/overview`

### 🔄 实时功能

- 健康数据实时更新
- 家庭数据同步
- 通知系统

### 🔐 安全特性

- JWT 认证
- 行级安全 (RLS)
- 输入验证和清理
- CORS 保护
- HTTPS 强制

## 📈 性能优化

### 缓存策略

- **静态资源**: CDN 缓存 1 年
- **API 响应**: 智能缓存（5分钟-24小时）
- **数据库查询**: 索引优化

### 边缘优化

- 全球 CDN 分发
- 边缘计算处理
- 就近访问优化

## 🔍 监控和调试

### 日志查看

```bash
# Cloudflare 日志
wrangler tail

# Supabase 日志
supabase logs
```

### 性能监控

- **Cloudflare Analytics**: https://dash.cloudflare.com
- **Supabase Dashboard**: https://app.supabase.com
- **Web Analytics**: 内置分析功能

## 🚨 常见问题解决

### 部署失败

1. **检查环境变量**

   ```bash
   # 验证所有必需的环境变量
   ./scripts/check-environment.sh
   ```

2. **查看构建日志**

   ```bash
   # 详细构建日志
   npm run build:cloudflare-hybrid -- --verbose
   ```

3. **验证数据库连接**
   ```bash
   # 测试 Supabase 连接
   node scripts/test-supabase-connection.js
   ```

### API 响应慢

1. **检查数据库索引**

   ```sql
   -- 查看慢查询
   SELECT * FROM pg_stat_statements WHERE mean_time > 100;
   ```

2. **优化查询**

   ```sql
   -- 添加缺失的索引
   CREATE INDEX idx_health_data_composite ON health_data(member_id, data_type, recorded_at);
   ```

3. **启用缓存**
   ```javascript
   // 在 API 中添加缓存头
   return createSuccessResponse(data, 200, {
     "Cache-Control": "public, max-age=300",
   });
   ```

### 认证问题

1. **检查 JWT 配置**

   ```javascript
   // 验证令牌
   const {
     data: { user },
     error,
   } = await supabase.auth.getUser(token);
   ```

2. **检查 RLS 策略**
   ```sql
   -- 查看策略
   SELECT * FROM pg_policies WHERE tablename = 'health_data';
   ```

## 📚 API 使用示例

### 获取健康数据

```javascript
import { useHealthData } from "@/hooks/use-supabase-data";

function HealthDashboard({ memberId }) {
  const { data, loading, error } = useHealthData(memberId, {
    limit: 20,
    type: "weight",
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.data.map((record) => (
        <div key={record.id}>
          {record.data_type}: {record.value} {record.unit}
        </div>
      ))}
    </div>
  );
}
```

### 创建健康数据

```javascript
const response = await fetch("/api/v1/health", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    data_type: "weight",
    value: 70.5,
    unit: "kg",
    recorded_at: new Date().toISOString(),
  }),
});

const result = await response.json();
```

### 实时数据订阅

```javascript
import { useRealtimeData } from "@/hooks/use-supabase-data";

function RealtimeHealth({ memberId }) {
  const { data, loading } = useRealtimeData(
    `health-${memberId}`,
    "health_data",
    { member_id: memberId },
  );

  return (
    <div>
      {data.map((record) => (
        <div key={record.id}>
          {record.value} {record.unit}
        </div>
      ))}
    </div>
  );
}
```

## 🔧 维护指南

### 定期维护任务

1. **监控性能指标**
   - 检查 API 响应时间
   - 监控数据库查询性能
   - 查看错误率

2. **更新依赖**

   ```bash
   # 检查过时包
   npm outdated

   # 更新依赖
   npm update
   ```

3. **备份数据**

   ```bash
   # 创建数据库备份
   supabase db dump --schema public > backup.sql
   ```

4. **审查安全设置**
   - 检查 RLS 策略
   - 更新 API 密钥
   - 审查访问日志

### 扩展指南

#### 添加新的 API 端点

1. 在 `functions/api/v1/` 创建新的端点文件
2. 实现请求处理逻辑
3. 添加测试用例
4. 更新 API 文档

#### 添加新的数据表

1. 创建迁移文件
2. 添加 RLS 策略
3. 创建对应的 Functions
4. 更新前端 Hook

## 📞 支持

如果遇到问题：

1. **查看日志**: `wrangler tail`
2. **检查文档**: 查看本指南和相关文档
3. **社区支持**: [GitHub Issues](https://github.com/your-repo/issues)
4. **官方文档**:
   - [Cloudflare Pages](https://developers.cloudflare.com/pages/)
   - [Supabase Documentation](https://supabase.com/docs)

## 🎉 恭喜！

您已成功将 Health Butler 迁移到 Cloudflare Pages + Supabase 混合架构。这个新的架构提供了：

- **零成本运营** - 利用免费层服务
- **全球性能** - 边缘计算和 CDN
- **无限扩展** - 无服务器架构
- **现代开发体验** - TypeScript、实时功能

享受您的新架构吧！🚀
