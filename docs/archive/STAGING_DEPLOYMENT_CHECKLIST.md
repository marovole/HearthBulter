# Staging环境部署清单

**项目**: HearthBulter v0.2.0
**创建时间**: 2025-11-03
**OpenSpec Change**: fix-pre-launch-critical-issues (已完成)

---

## 📋 部署前准备清单

### ✅ 代码准备 (已完成)

- [x] P0修复完成并验证
- [x] 生产构建成功 (`npm run build`)
- [x] 安全审计通过 (0漏洞)
- [x] 代码已提交到main分支
- [x] 代码已推送到GitHub
- [x] OpenSpec验证通过

### 🔧 环境配置 (待完成)

#### Staging环境变量配置

创建 `.env.staging` 文件，包含以下必需变量：

```bash
# 数据库配置
DATABASE_URL="postgresql://user:password@staging-db-host:5432/hearthbutler_staging"

# 认证配置
NEXTAUTH_SECRET=<REDACTED>"[生成新的staging密钥]"
NEXTAUTH_URL="https://staging.hearthbutler.com"

# CORS配置
NEXT_PUBLIC_ALLOWED_ORIGINS="https://staging.hearthbutler.com"

# 外部API (使用测试/开发密钥)
USDA_API_KEY=<REDACTED>"[staging密钥]"
OPENAI_API_KEY=<REDACTED>"[staging密钥]"

# Redis缓存 (Upstash)
UPSTASH_REDIS_REST_URL="[staging Redis URL]"
UPSTASH_REDIS_REST_TOKEN="[staging Redis token]"

# 监控和日志
NODE_ENV="staging"
NEXT_PUBLIC_APP_URL="https://staging.hearthbutler.com"

# 可选：功能开关
ENABLE_AI_FEATURES="true"
ENABLE_ECOMMERCE="false"  # staging可以关闭非核心功能
```

**生成新密钥的命令**:

```bash
# 生成NEXTAUTH_SECRET
openssl rand -base64 32
```

#### 任务清单

- [ ] 创建staging数据库
- [ ] 配置staging环境变量
- [ ] 验证所有API密钥可用
- [ ] 配置Redis缓存连接
- [ ] 设置监控和日志系统

---

## 🗄️ 数据库准备

### 1. 创建Staging数据库

```bash
# 连接到PostgreSQL服务器
psql -h staging-db-host -U postgres

# 创建数据库
CREATE DATABASE hearthbutler_staging;

# 创建用户（如果需要）
CREATE USER hearthbutler_staging WITH PASSWORD 'secure_password';

# 授权
GRANT ALL PRIVILEGES ON DATABASE hearthbutler_staging TO hearthbutler_staging;
```

### 2. 运行数据库迁移

```bash
# 设置DATABASE_URL环境变量
export DATABASE_URL="postgresql://user:password@staging-db-host:5432/hearthbutler_staging"

# 生成Prisma客户端
npx prisma generate

# 运行迁移
npx prisma migrate deploy

# 验证迁移
npx prisma migrate status
```

### 3. (可选) 导入测试数据

```bash
# 导入种子数据
npx prisma db seed

# 或者从生产环境导入匿名化数据
# pg_dump production_db | psql staging_db
```

**任务清单**:

- [ ] 创建staging数据库
- [ ] 运行所有迁移脚本
- [ ] 验证数据库schema正确
- [ ] (可选) 导入测试数据

---

## 🚀 部署流程

### 选项1: Vercel部署 (推荐)

#### 步骤

1. **连接GitHub仓库**
   - 登录 [Vercel](https://vercel.com)
   - Import Project → 选择HearthBulter仓库
   - 选择main分支

2. **配置环境变量**
   - 在Vercel项目设置中添加所有staging环境变量
   - 确保设置 `NODE_ENV=staging`

3. **配置构建设置**

   ```
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   Development Command: npm run dev
   ```

4. **部署**
   - 点击Deploy
   - 等待构建完成（预计2-3分钟）

5. **配置自定义域名**
   - 添加 `staging.hearthbutler.com`
   - 配置DNS记录

#### 任务清单

- [ ] 连接GitHub到Vercel
- [ ] 配置所有环境变量
- [ ] 配置构建设置
- [ ] 执行首次部署
- [ ] 配置自定义域名
- [ ] 验证HTTPS证书

---

### 选项2: 自托管部署 (Docker)

#### 准备Docker镜像

```bash
# 构建生产镜像
docker build -t hearthbutler:staging .

# 或使用docker-compose
docker-compose -f docker-compose.staging.yml up -d
```

#### docker-compose.staging.yml 示例

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=<REDACTED>${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=hearthbutler_staging
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 任务清单

- [ ] 准备Docker镜像
- [ ] 配置docker-compose
- [ ] 启动所有容器
- [ ] 验证服务运行状态
- [ ] 配置nginx反向代理
- [ ] 配置SSL证书 (Let's Encrypt)

---

## ✅ 部署后验证

### 1. 健康检查

```bash
# 检查应用状态
curl https://staging.hearthbutler.com/api/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2025-11-03T...",
  "version": "0.2.0"
}
```

### 2. 核心功能Smoke测试

#### 手动测试清单

- [ ] **用户认证**
  - [ ] 用户注册
  - [ ] 用户登录
  - [ ] 密码重置
  - [ ] 登出

- [ ] **家庭管理**
  - [ ] 创建家庭
  - [ ] 添加家庭成员
  - [ ] 查看家庭详情

- [ ] **健康数据**
  - [ ] 记录健康数据
  - [ ] 查看健康趋势
  - [ ] 生成健康报告

- [ ] **购物清单**
  - [ ] 创建购物清单
  - [ ] 添加商品
  - [ ] 标记已购买

- [ ] **API端点**
  - [ ] GET /api/families - 获取家庭列表
  - [ ] POST /api/families - 创建家庭
  - [ ] GET /api/health/data - 获取健康数据
  - [ ] POST /api/shopping-lists - 创建购物清单

### 3. 性能基准测试

```bash
# 使用k6进行负载测试（可选）
k6 run load-test.js

# 检查响应时间
# 目标: p95 < 500ms, p99 < 1000ms
```

### 4. 错误监控设置

推荐工具:

- **Sentry**: 错误追踪
- **Vercel Analytics**: 性能监控
- **Upstash Redis Insights**: 缓存监控

#### 任务清单

- [ ] 配置Sentry错误追踪
- [ ] 设置性能监控
- [ ] 配置日志聚合
- [ ] 设置告警规则

---

## 🔍 监控指标

### 关键指标监控

| 指标              | 目标   | 警报阈值 |
| ----------------- | ------ | -------- |
| API响应时间 (p95) | <500ms | >1000ms  |
| 错误率            | <1%    | >5%      |
| 数据库连接池      | <80%   | >90%     |
| Redis缓存命中率   | >80%   | <50%     |
| CPU使用率         | <70%   | >85%     |
| 内存使用率        | <80%   | >90%     |

### 监控清单

- [ ] 设置Uptime监控（每5分钟）
- [ ] 配置错误率告警
- [ ] 配置性能告警
- [ ] 设置数据库监控
- [ ] 配置缓存监控

---

## 🐛 已知问题和限制

### 当前状态 (来自P0修复)

✅ **已解决**:

- 生产构建成功
- 安全漏洞修复
- Next.js 15兼容

⚠️ **已知限制**:

- 测试覆盖率: 4.86% (目标25%)
- 测试失败率: 41.7%
- TypeScript错误: ~7000个 (非阻塞)

### Staging环境注意事项

1. **测试数据隔离**: 确保staging不连接生产数据库
2. **API限流**: 某些第三方API可能有不同的限流
3. **功能开关**: 可以关闭非核心功能减少复杂度
4. **性能差异**: Staging可能使用较小的实例

---

## 🔄 回滚计划

### 如果发现重大问题

#### 快速回滚到上一个稳定版本

```bash
# 在Vercel上回滚
# Dashboard → Deployments → 选择上一个稳定部署 → Promote to Production

# 或使用Git回滚
git revert 4d5c6ed
git push origin main
```

#### 部分功能回滚

如果只需要回滚特定功能:

1. 使用功能开关关闭问题功能
2. 或cherry-pick特定的修复提交

---

## 📊 部署时间表

### 推荐时间表

| 阶段         | 时间      | 任务                 |
| ------------ | --------- | -------------------- |
| **准备阶段** | 2-4小时   | 环境配置、数据库设置 |
| **部署阶段** | 30-60分钟 | 执行部署、DNS配置    |
| **验证阶段** | 2-3小时   | Smoke测试、监控配置  |
| **观察期**   | 1-2天     | 监控稳定性、收集反馈 |

**建议部署时间**: 工作日早上10:00-11:00 (避免周五和节假日前)

---

## ✅ 最终检查清单

### 部署前确认

- [ ] 所有环境变量已配置
- [ ] 数据库迁移已完成
- [ ] Redis缓存已连接
- [ ] 域名DNS已配置
- [ ] SSL证书已生效
- [ ] 监控系统已就绪
- [ ] 回滚计划已准备

### 部署执行

- [ ] 执行部署
- [ ] 验证部署成功
- [ ] 运行健康检查
- [ ] 执行Smoke测试
- [ ] 检查错误日志

### 部署后观察

- [ ] 监控错误率（第1小时）
- [ ] 检查性能指标（第1天）
- [ ] 收集用户反馈（第2-3天）
- [ ] 评估是否继续到生产

---

## 🎯 成功标准

部署被认为成功，如果:

- ✅ 所有核心功能可正常使用
- ✅ 错误率 < 2%
- ✅ API响应时间 p95 < 500ms
- ✅ 无严重性能问题
- ✅ 无安全漏洞发现
- ✅ 24小时内无重大故障

---

## 📞 支持和联系

### 问题升级流程

1. **P0严重问题** (服务不可用): 立即回滚
2. **P1高优先级** (核心功能受影响): 4小时内修复
3. **P2中等问题** (部分功能受影响): 1天内修复
4. **P3低优先级** (小问题): 下个迭代修复

### 相关文档

- [OPENSPEC_IMPLEMENTATION_REPORT.md](./OPENSPEC_IMPLEMENTATION_REPORT.md)
- [PRE_LAUNCH_REVIEW.md](./PRE_LAUNCH_REVIEW.md)
- [OpenSpec提案](./openspec/changes/fix-pre-launch-critical-issues/proposal.md)

---

**最后更新**: 2025-11-03
**状态**: ✅ 准备就绪
**下一步**: 执行staging部署
