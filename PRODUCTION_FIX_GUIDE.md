# 🔧 健康管家生产环境修复指南

## 🚨 当前问题分析

基于部署测试结果，发现以下问题：

### 问题1：API 端点 500 错误
- **症状**: `/api/health` 返回 500 内部服务器错误
- **原因**: 环境变量配置不完整或错误
- **影响**: 系统健康检查和基础功能无法正常工作

### 问题2：监控端点 404 错误  
- **症状**: `/api/monitoring` 返回 404 页面未找到
- **原因**: 可能是构建问题或路径配置错误
- **影响**: 无法访问系统监控和性能数据

---

## 🔧 立即修复步骤

### 第一步：检查 Vercel 环境变量配置

#### 访问 Vercel Dashboard
1. **打开**: https://vercel.com/dashboard
2. **进入项目**: 找到 "HearthBulter" 项目
3. **进入设置**: 点击 "Settings" 标签
4. **环境变量**: 选择 "Environment Variables"

#### 检查和修复必需变量

| 变量名 | 检查要点 | 修复方法 |
|--------|---------|---------|
| `DATABASE_URL` | 格式必须正确，推荐 Supabase | 需要创建 Supabase 项目 |
| `NEXTAUTH_SECRET` | 必须 32+ 字符 | 使用生成的安全密钥 |
| `NEXTAUTH_URL` | 必须为实际部署域名 | `https://hearth-bulter.vercel.app` |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | 与 NEXTAUTH_URL 相同 | `https://hearth-bulter.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | 现有配置是否正确 | 检查 .env 文件中的值 |
| `UPSTASH_REDIS_REST_TOKEN` | 现有配置是否正确 | 检查 .env 文件中的值 |

#### 环境变量配置详情

**DATABASE_URL 配置（推荐 Supabase）**：
```bash
# 1. 访问 https://supabase.com
# 2. 创建新项目: hearthbutler-prod
# 3. 获取连接字符串 (使用 .pooler.)
# 格式: postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**NEXTAUTH_SECRET 配置**：
```bash
# 已生成的安全密钥
ntZl8q4ZA3c2LIWf+rpJKTDBYJzYeUpjCEY/X0Jy5Ho=
```

**域名配置**：
```bash
NEXTAUTH_URL=https://hearth-bulter.vercel.app
NEXT_PUBLIC_ALLOWED_ORIGINS=https://hearth-bulter.vercel.app
```

---

### 第二步：重新部署应用

#### 方法A：通过 Vercel Dashboard
1. **保存环境变量**后 Vercel 会自动重新部署
2. **等待 3-5 分钟**构建完成
3. **检查最新部署状态**

#### 方法B：使用 CLI
```bash
# 强制重新部署
vercel --prod

# 或者重新触发构建
vercel deploy --prod
```

---

### 第三步：验证修复结果

#### 运行自动化检查
```bash
npm run check:deployment https://hearth-bulter.vercel.app
```

#### 手动验证检查
- [ ] 访问首页: https://hearth-bulter.vercel.app
- [ ] 健康检查: https://hearth-bulter.vercel.app/api/health
- [ ] 监控端点: https://hearth-bulter.vercel.app/api/monitoring
- [ ] 用户注册功能测试
- [ ] 用户登录功能测试

---

## 🔍 详细故障诊断

### 如果问题仍然存在，按以下步骤诊断：

#### 1. 检查 Vercel 构建日志
- **路径**: Vercel Dashboard → Deployments → [latest] → Building
- **关注**: TypeScript 编译错误、依赖安装问题
- **解决**: 根据具体错误信息修复

#### 2. 检查 Vercel 运行时日志
- **路径**: Vercel Dashboard → Functions → Logs
- **关注**: 环境变量错误、数据库连接失败
- **解决**: 根据错误日志调整配置

#### 3. 测试环境变量
```bash
# 拉取生产环境变量到本地测试
vercel env pull .env.production.local

# 使用生产变量本地测试
NODE_ENV=production npm run build
```

---

## 🛠️ 常见问题和解决方案

### 问题：DATABASE_URL 格式错误
**症状**: 数据库连接失败
**解决**: 
```bash
# 正确格式 (Supabase)
postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres

# 错误格式
postgresql://postgres:password@localhost:5432/health_butler
```

### 问题：NEXTAUTH_SECRET 长度不足
**症状**: 认证功能异常
**解决**: 确保密钥长度 ≥ 32 字符

### 问题：NEXTAUTH_URL 不匹配
**症状**: 登录失败或回调错误
**解决**: 确认 URL 与实际部署域名完全一致

### 问题：Redis 连接失败
**症状**: 缓存功能异常
**解决**: 验证 UPSTASH_REDIS_* 变量正确性

---

## 📊 预期修复后的状态

### 成功指标
- ✅ 首页正常加载 (HTTP 200)
- ✅ 健康检查端点正常 (HTTP 200)
- ✅ 监控端点正常 (HTTP 200)
- ✅ 用户可以注册新账户
- ✅ 用户可以成功登录
- ✅ 系统健康分数 > 80%

### 性能目标
- **页面加载时间**: < 3 秒
- **API 响应时间**: < 1000ms
- **错误率**: < 5%
- **系统可用性**: > 99.9%

---

## 🚀 修复完成后

### 立即验证
```bash
# 运行完整验证
npm run check:deployment https://hearth-bulter.vercel.app

# 访问监控面板
open https://hearth-bulter.vercel.app/api/monitoring
```

### 设置监控告警
- 在 `/api/monitoring` 中设置告警阈值
- 监控错误率 > 5% 的情况
- 跟踪响应时间 > 1000ms 的问题

### 用户体验测试
- 完整的用户注册流程
- 仪表盘数据展示验证
- 核心功能操作测试

---

## 📞 需要帮助？

### 技术支持资源
- **Vercel Dashboard**: https://vercel.com/dashboard
- **构建日志**: Deployments → [latest] → Building
- **运行时日志**: Functions → Logs
- **监控端点**: `/api/monitoring`

### 快速诊断命令
```bash
# 检查本地构建
npm run build

# 检查环境变量
./scripts/setup-production-env.sh

# 验证部署状态
npm run check:deployment https://hearth-bulter.vercel.app
```

---

## 🎯 修复时间估算

- **环境变量配置**: 10 分钟
- **重新部署**: 5 分钟  
- **验证测试**: 10 分钟
- **总计**: 约 25 分钟

---

**修复优先级**: 🔴 高 - 影响核心功能
**预期成功率**: >90%（基于明确的问题诊断）

---

**创建时间**: 2025-11-06  
**状态**: 🛠️ 等待修复执行  
**版本**: v0.2.0  

🔧 **按照本指南操作，你的健康管家应用将很快恢复正常！**
