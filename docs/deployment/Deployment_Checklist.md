# 部署检查清单

本文档提供Health Butler项目部署前的完整检查清单。

## 目录

1. [部署前检查](#部署前检查)
2. [安全检查](#安全检查)
3. [性能检查](#性能检查)
4. [数据库检查](#数据库检查)
5. [环境配置](#环境配置)
6. [监控和日志](#监控和日志)
7. [测试验证](#测试验证)
8. [部署流程](#部署流程)

## 部署前检查

### 代码质量

- [ ] 所有代码已通过TypeScript类型检查
- [ ] 所有代码已通过ESLint检查
- [ ] 代码已经过代码审查
- [ ] 移除了所有console.log调试代码
- [ ] 移除了所有TODO注释（或转为issue）
- [ ] 更新了版本号

### 依赖管理

- [ ] 所有npm依赖已更新到最新稳定版本
- [ ] 运行了\`npm audit\`并修复了所有安全漏洞
- [ ] package-lock.json已提交
- [ ] 移除了未使用的依赖
- [ ] 检查了依赖许可证兼容性

## 安全检查

### API安全

- [ ] 所有API端点都有输入验证
- [ ] 所有修改操作都有CSRF保护
- [ ] 所有端点都有权限控制
- [ ] 关键端点都有频率限制
- [ ] 启用了安全审计日志

### 数据安全

- [ ] 敏感数据已加密存储
- [ ] 数据库连接使用SSL
- [ ] API密钥存储在环境变量中
- [ ] 移除了硬编码的密码/密钥
- [ ] 实施了数据备份策略

### HTTP安全

- [ ] 配置了HTTPS
- [ ] 设置了安全HTTP头
  - [ ] Content-Security-Policy
  - [ ] X-Content-Type-Options
  - [ ] X-Frame-Options
  - [ ] X-XSS-Protection
  - [ ] Strict-Transport-Security
- [ ] 配置了CORS策略
- [ ] 禁用了不必要的HTTP方法

### 认证和授权

- [ ] 实施了强密码策略
- [ ] 启用了会话超时
- [ ] 实施了多因素认证（MFA）
- [ ] 配置了OAuth/OIDC
- [ ] 实施了账户锁定机制

## 性能检查

### 查询优化

- [ ] 所有列表查询都有分页限制
- [ ] 数据库索引已优化
- [ ] 移除了N+1查询
- [ ] 实施了查询结果缓存
- [ ] 配置了查询超时

### 响应优化

- [ ] API响应时间 < 500ms (P95)
- [ ] 页面首屏渲染 < 1.5s
- [ ] 静态资源使用CDN
- [ ] 启用了Gzip压缩
- [ ] 图片已优化

### 缓存策略

- [ ] 配置了HTTP缓存头
- [ ] 实施了API响应缓存
- [ ] 配置了Redis/Memcached
- [ ] 实施了浏览器缓存策略

## 数据库检查

### Schema和迁移

- [ ] 所有数据库迁移已测试
- [ ] 迁移脚本可回滚
- [ ] 生产数据库已备份
- [ ] 索引已优化
- [ ] 外键约束已配置

### 数据完整性

- [ ] 实施了数据验证规则
- [ ] 配置了级联删除
- [ ] 实施了软删除机制
- [ ] 配置了数据保留策略
- [ ] 测试了数据恢复流程

### 连接和性能

- [ ] 配置了连接池
- [ ] 设置了连接超时
- [ ] 监控了慢查询
- [ ] 配置了只读副本（如需要）
- [ ] 实施了数据库监控

## 环境配置

### 环境变量

- [ ] 所有必需的环境变量已配置
- [ ] 环境变量文档已更新
- [ ] .env.example已更新
- [ ] 生产环境变量已验证
- [ ] 敏感变量已加密存储

### 必需环境变量

\`\`\`bash
# 数据库
DATABASE_URL=
DATABASE_POOL_SIZE=

# 认证
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# API密钥
OPENAI_API_KEY=
USDA_API_KEY=

# Redis
REDIS_URL=

# 监控
SENTRY_DSN=
ANALYTICS_ID=
\`\`\`

### 服务器配置

- [ ] Node.js版本匹配
- [ ] 配置了进程管理器（PM2/Systemd）
- [ ] 配置了负载均衡
- [ ] 配置了反向代理（Nginx/Apache）
- [ ] 配置了防火墙规则

## 监控和日志

### 应用监控

- [ ] 配置了APM工具（如Sentry）
- [ ] 配置了错误追踪
- [ ] 配置了性能监控
- [ ] 配置了用户行为分析
- [ ] 配置了健康检查端点

### 日志管理

- [ ] 配置了集中日志系统
- [ ] 实施了日志级别控制
- [ ] 配置了日志轮转
- [ ] 敏感信息已从日志中移除
- [ ] 配置了日志保留策略

### 告警配置

- [ ] 配置了错误率告警
- [ ] 配置了响应时间告警
- [ ] 配置了资源使用告警
- [ ] 配置了安全事件告警
- [ ] 配置了告警通知渠道

## 测试验证

### 自动化测试

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 所有E2E测试通过
- [ ] 测试覆盖率 >= 80%
- [ ] 性能测试通过

### 手动测试

- [ ] 用户注册/登录流程
- [ ] 关键业务流程
- [ ] 错误处理
- [ ] 边界条件
- [ ] 移动端兼容性

### 负载测试

- [ ] 并发用户测试通过
- [ ] 压力测试通过
- [ ] 峰值流量测试通过
- [ ] 数据库负载测试通过
- [ ] 恢复能力测试通过

## 部署流程

### 部署前

1. [ ] 创建部署分支
2. [ ] 运行完整测试套件
3. [ ] 备份生产数据库
4. [ ] 通知团队部署计划
5. [ ] 准备回滚计划

### 部署中

1. [ ] 设置维护模式（如需要）
2. [ ] 拉取最新代码
3. [ ] 安装/更新依赖
4. [ ] 运行数据库迁移
5. [ ] 构建生产版本
6. [ ] 重启应用服务
7. [ ] 验证服务状态

### 部署后

1. [ ] 运行冒烟测试
2. [ ] 检查错误日志
3. [ ] 验证关键功能
4. [ ] 监控性能指标
5. [ ] 通知团队部署完成

### 部署命令示例

\`\`\`bash
# 1. 拉取代码
git pull origin main

# 2. 安装依赖
npm ci

# 3. 运行数据库迁移
npx prisma migrate deploy

# 4. 生成Prisma客户端
npx prisma generate

# 5. 构建应用
npm run build

# 6. 重启服务（PM2示例）
pm2 restart health-butler

# 7. 检查状态
pm2 status
pm2 logs health-butler --lines 50
\`\`\`

## 回滚计划

### 快速回滚

如果部署后发现严重问题：

1. [ ] 立即回滚到上一个版本
   \`\`\`bash
   git checkout <previous-tag>
   npm ci
   npm run build
   pm2 restart health-butler
   \`\`\`

2. [ ] 回滚数据库迁移（如需要）
   \`\`\`bash
   npx prisma migrate resolve --rolled-back <migration-name>
   \`\`\`

3. [ ] 恢复数据库备份（最后手段）
   \`\`\`bash
   pg_restore -d health_butler backup.dump
   \`\`\`

4. [ ] 验证服务恢复
5. [ ] 通知团队
6. [ ] 分析问题原因

## 部署后验证

### 健康检查

\`\`\`bash
# API健康检查
curl https://api.healthbutler.com/health

# 数据库连接检查
curl https://api.healthbutler.com/health/db

# 服务状态检查
pm2 status
\`\`\`

### 关键功能验证

- [ ] 用户登录
- [ ] 数据创建
- [ ] 数据查询
- [ ] 数据更新
- [ ] 数据删除
- [ ] API响应时间
- [ ] 错误处理

### 监控检查

- [ ] 查看错误率
- [ ] 查看响应时间
- [ ] 查看资源使用
- [ ] 查看日志
- [ ] 验证告警配置

## 紧急联系方式

**运维团队**
- 主管: xxx@healthbutler.com
- 电话: +86-xxx-xxxx

**开发团队**
- 技术负责人: xxx@healthbutler.com
- 电话: +86-xxx-xxxx

**数据库团队**
- DBA: xxx@healthbutler.com
- 电话: +86-xxx-xxxx

## 相关文档

- [API安全指南](../security/API_SECURITY_GUIDE.md)
- [性能优化文档](../performance/PERFORMANCE_OPTIMIZATION.md)
- [权限管理文档](../security/PERMISSION_MANAGEMENT.md)
- [故障恢复指南](./FAILURE_RECOVERY_GUIDE.md)
