# Supabase 生产环境配置指南

## 1. 创建 Supabase 项目

### 步骤 1.1: 注册和登录
1. 访问 [Supabase 官网](https://supabase.com)
2. 点击 "Start your project"
3. 使用 GitHub 或邮箱注册账号
4. 登录到 Supabase Dashboard

### 步骤 1.2: 创建新项目
1. 点击 "New Project"
2. 填写项目信息：
   - **项目名称**: `health-butler-prod`
   - **数据库密码**: 生成强密码并保存
   - **地区**: 选择离用户最近的地区（推荐 `East US` 或 `Southeast Asia`）
3. 等待项目创建完成（约 2-3 分钟）

## 2. 获取项目凭据

### 步骤 2.1: 项目 URL 和密钥
1. 进入项目 Dashboard
2. 点击左侧菜单 "Settings" → "API"
3. 复制以下信息：
   - **Project URL**: `https://[your-project-ref].supabase.co`
   - **anon key**: 用于客户端的公开密钥
   - **service_role key**: 用于服务端的管理密钥

### 步骤 2.2: 数据库连接信息
1. 点击 "Settings" → "Database"
2. 找到连接信息：
   - **Host**: `db.[your-project-ref].supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`

## 3. 数据库初始化

### 步骤 3.1: 运行架构迁移
```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录 Supabase
supabase login

# 初始化项目连接
supabase init
supabase link --project-ref [your-project-ref]

# 应用数据库架构
supabase db push supabase/migrations/001_initial_schema.sql
supabase db push supabase/migrations/002_rls_policies.sql
supabase db push supabase/migrations/003_performance_indexes.sql
```

### 步骤 3.2: 验证数据库连接
```bash
# 测试连接
supabase status

# 查看数据库表
supabase db dump --schema public
```

## 4. 安全配置

### 步骤 4.1: 启用行级安全 (RLS)
迁移文件已包含 RLS 策略，确保所有表都已启用 RLS。

### 步骤 4.2: 配置认证设置
1. 点击 "Authentication" → "Settings"
2. 配置：
   - **Site URL**: 您的生产域名
   - **JWT Expiry**: 3600 (1小时)
   - **Enable Email Confirmations**: 根据需要启用

### 步骤 4.3: 设置邮件服务（可选）
1. 点击 "Authentication" → "Email Templates"
2. 配置 SMTP 或使用默认的 Supabase 邮件服务

## 5. 性能优化

### 步骤 5.1: 连接池配置
1. 点击 "Settings" → "Database"
2. 找到 "Connection pooling" 设置
3. 启用连接池，设置适当的连接数

### 步骤 5.2: 备份设置
1. 点击 "Settings" → "Database"
2. 配置自动备份计划
3. 设置备份保留策略

## 6. 监控设置

### 步骤 6.1: 启用 API 统计
1. 点击 "Settings" → "API"
2. 启用 "API Usage Stats"

### 步骤 6.2: 配置警报（可选）
1. 点击 "Settings" → "Billing"
2. 设置使用限制警报

## 7. 获取最终凭据

创建 `.env.production` 文件：

```bash
# Supabase 项目凭据
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_SERVICE_KEY=[your-service-role-key]
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]

# 数据库连接（可选，用于直接连接）
DATABASE_URL=postgresql://postgres:[password]@db.[your-project-ref].supabase.co:5432/postgres

# 站点配置
NEXT_PUBLIC_SITE_URL=https://your-domain.pages.dev
```

## 8. 验证设置

### 步骤 8.1: 测试数据库连接
```bash
# 创建测试连接脚本
cat > test-supabase-connection.js << 'EOF'
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function testConnection() {
  const { data, error } = await supabase.rpc('test_connection')
  
  if (error) {
    console.error('❌ 连接失败:', error.message)
    process.exit(1)
  } else {
    console.log('✅ 连接成功')
    
    // 测试表结构
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    console.log('📊 数据库表:', tables?.map(t => t.table_name))
  }
}

testConnection()
EOF

node test-supabase-connection.js
```

### 步骤 8.2: 测试 API 端点
```bash
# 测试健康检查端点
curl -X GET "https://[your-project-ref].supabase.co/rest/v1/health_data" \
  -H "apikey: [your-anon-key]" \
  -H "Authorization: Bearer [your-anon-key]"
```

## 9. 故障排除

### 常见问题

1. **连接超时**
   - 检查网络连接
   - 验证项目 URL 正确性
   - 检查防火墙设置

2. **权限错误**
   - 确认使用了正确的密钥类型
   - 检查 RLS 策略配置
   - 验证用户权限

3. **表不存在**
   - 重新运行迁移脚本
   - 检查迁移文件路径
   - 验证数据库连接

## 10. 最佳实践

### 安全建议

1. **密钥管理**
   - 使用不同的密钥用于不同环境
   - 定期轮换密钥
   - 不要在代码中硬编码密钥

2. **访问控制**
   - 启用 RLS 策略
   - 使用最小权限原则
   - 监控异常访问

3. **数据保护**
   - 启用自动备份
   - 加密敏感数据
   - 定期审计访问日志

### 性能优化

1. **索引优化**
   - 为常用查询字段创建索引
   - 使用复合索引优化复杂查询
   - 定期分析和优化查询

2. **连接管理**
   - 使用连接池
   - 合理设置连接数限制
   - 监控连接使用情况

## 下一步

完成 Supabase 配置后，继续配置 Cloudflare Pages：

1. [Cloudflare Pages 设置指南](./CLOUDFLARE_SETUP_GUIDE.md)
2. [生产环境部署](./DEPLOYMENT_GUIDE_FINAL.md)

恭喜！您已成功配置 Supabase 生产环境。🎉
