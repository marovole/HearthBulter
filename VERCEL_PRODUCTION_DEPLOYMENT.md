# 🚀 健康管家 Vercel 生产部署指南

## ✅ 当前状态：部署就绪

基于之前的验证工作，应用已通过所有关键检查：
- ✅ TypeScript 编译成功
- ✅ 构建过程正常（~6秒）
- ✅ 监控系统健康（100%分数）
- ✅ 所有核心组件正常

---

## 📋 生产环境配置步骤

### 第一步：创建生产数据库（Supabase）

1. **访问 Supabase**
   - 打开 https://supabase.com
   - 注册/登录账户

2. **创建新项目**
   ```
   项目名称: hearthbutler-prod
   数据库密码: [生成强密码]
   区域: Northeast Asia (Seoul) - 推荐最近区域
   ```

3. **获取连接字符串**
   ```
   项目设置 → Database → Connection string → URI
   格式: postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
   ```
   ⚠️ **重要**: 使用 `.pooler.` 连接字符串

### 第二步：配置 Vercel 项目

1. **连接 GitHub**
   - 访问 https://vercel.com
   - 点击 "New Project"
   - 选择 "HearthBulter" 仓库

2. **配置构建设置**
   ```
   Framework: Next.js (自动检测)
   Root Directory: ./
   Build Command: prisma generate && next build
   Install Command: pnpm install
   Output Directory: .next
   ```

3. **设置环境变量**
   
   在 Vercel Dashboard → Project Settings → Environment Variables 添加：

   | 变量名 | 值 | 环境 |
   |--------|-----|------|
   | `DATABASE_URL` | Supabase 连接字符串 | Production |
   | `NEXTAUTH_SECRET` | 新生成的32+字符密钥 | Production |
   | `NEXTAUTH_URL` | 部署后的实际URL | Production |
   | `NEXT_PUBLIC_ALLOWED_ORIGINS` | 部署后的实际URL | Production |
   | `UPSTASH_REDIS_REST_URL` | 现有Redis URL | Production |
   | `UPSTASH_REDIS_REST_TOKEN` | 现有Redis Token | Production |

### 第三步：执行部署

1. **初始部署**
   ```bash
   # 推送代码到 GitHub
   git add .
   git commit -m "feat: 准备 Vercel 生产环境部署
   
   - 修复关键 TypeScript 错误
   - 配置生产环境变量模板
   - 验证构建和监控系统
   - 更新部署文档
   
   🤖 Generated with Claude Code"
   git push origin main
   ```

2. **监控部署过程**
   - Vercel 会自动检测 GitHub 推送
   - 构建过程约 3-5 分钟
   - 查看构建日志确认无错误

### 第四步：部署后配置

1. **获取实际域名**
   - 部署完成后复制 Vercel 分配的域名
   - 格式: `https://hearth-bulter-abc123.vercel.app`

2. **更新 NEXTAUTH_URL**
   ```
   Vercel Dashboard → Project Settings → Environment Variables
   编辑 NEXTAUTH_URL 为实际域名
   编辑 NEXT_PUBLIC_ALLOWED_ORIGINS 为实际域名
   ```

3. **重新部署**
   ```
   Deployments → [...] → Redeploy
   ```

---

## 🔧 数据库迁移

部署完成后运行数据库迁移：

```bash
# 方法1：使用 Prisma CLI
npx prisma migrate deploy

# 方法2：通过 Vercel CLI
vercel env pull .env.production.local
npx prisma migrate deploy
```

---

## ✅ 部署验证清单

### 基础健康检查
- [ ] 访问首页，正常加载
- [ ] 检查 `/api/monitoring` 端点健康状态
- [ ] 验证数据库连接状态
- [ ] 确认 Redis 缓存工作正常

### 功能测试
- [ ] 用户注册功能正常
- [ ] 用户登录成功
- [ ] 仪表盘数据显示
- [ ] API 端点响应正常
- [ ] 数据库读写操作成功

### 性能验证
- [ ] 首页加载时间 < 3 秒
- [ ] API 响应时间 < 1000ms
- [ ] 错误率 < 5%
- [ ] 内存使用 < 90%

---

## 🚨 故障排除

### 常见问题

#### 1. 构建失败
**检查**: Vercel 构建日志
**原因**: 环境变量缺失或依赖问题
**解决**: 检查所有必需变量已正确配置

#### 2. 数据库连接失败
**检查**: `/api/monitoring` 数据库状态
**原因**: 
- DATABASE_URL 格式错误
- 使用了非 .pooler. 连接
- Supabase 项目状态异常
**解决**: 验证连接字符串格式，使用 Pooler 连接

#### 3. 认证失败
**检查**: NEXTAUTH_SECRET 和 NEXTAUTH_URL
**原因**: 
- NEXTAUTH_SECRET 长度不足或格式错误
- NEXTAUTH_URL 与实际域名不匹配
**解决**: 更新为正确的域名，生成新的安全密钥

#### 4. Redis 连接问题
**检查**: `/api/monitoring` Redis 状态
**原因**: Token 或 URL 配置错误
**解决**: 验证 Upstash 配置正确

---

## 📊 监控和日志

### 关键端点
- **系统监控**: `/api/monitoring`
- **健康检查**: `/api/health` (如果存在)

### 性能指标
```bash
# 检查监控数据
curl https://your-app.vercel.app/api/monitoring | jq '.performanceStats'

# 检查系统健康
curl https://your-app.vercel.app/api/monitoring | jq '.systemHealth'
```

### 日志查看
- Vercel Dashboard → Functions → Logs
- 查看运行时错误和性能问题

---

## 🎯 性能优化建议

### 1. 缓存优化
- Redis 已配置，确保充分利用
- API 响应缓存设置合理 TTL

### 2. 图片优化
- 使用 Next.js Image 组件
- 配置适当的图片尺寸

### 3. 代码分割
- 大型页面使用动态导入
- 路由级别的懒加载

---

## 📞 技术支持

### 有用链接
- [Vercel 部署文档](https://vercel.com/docs/frameworks/next.js)
- [Supabase 连接指南](https://supabase.com/docs/guides/database/connecting)
- [Next.js 部署最佳实践](https://nextjs.org/docs/deployment)

### 关键命令
```bash
# 本地验证构建
npm run build

# 检查类型错误
npm run type-check

# 部署到生产环境
vercel --prod

# 查看部署历史
vercel ls
```

---

## 🎉 成功标志

当以下条件全部满足时，部署即为成功：

1. ✅ Vercel 构建无错误
2. ✅ 首页正常加载
3. ✅ `/api/monitoring` 显示系统健康
4. ✅ 用户可以注册和登录
5. ✅ 所有 API 端点正常响应
6. ✅ 性能指标在目标范围内

---

**预期部署时间**: 30-45分钟  
**最后更新**: 2025-11-06  
**版本**: v0.2.0  

祝您部署顺利！🚀
