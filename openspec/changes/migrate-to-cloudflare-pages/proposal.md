# 迁移到Cloudflare Pages部署

## Why

当前部署在Vercel遇到了**关键性阻碍**，系统无法完成生产部署：

### 当前问题
1. **Edge Function大小限制超限** (1.05MB > 1MB)
   - 根目录 `middleware.ts` (247行) 包含复杂安全中间件
   - 导入大型依赖：Prisma Client、bcryptjs、安全审计模块
   - Next.js 自动使用根目录middleware，忽略 `src/middleware.ts`

2. **Vercel部署限制**
   - 免费计划严格的Edge Function大小限制
   - 复杂的安全中间件与认证逻辑冲突
   - 构建成功但部署失败的最后一步问题

### 迁移动机
- **解决大小限制**: Cloudflare Pages Workers没有1MB限制
- **降低成本**: Cloudflare更优惠的定价模式
- **提升性能**: 全球CDN网络，更低的延迟
- **简化架构**: 统一中间件，优化依赖结构

## What Changes

### 阶段1: 中间件重构 (核心问题解决)
- **合并中间件**: 整合根目录和src目录的两个middleware文件
- **依赖优化**: 将重量级依赖(Prisma, bcryptjs)从middleware移至API路由
- **认证流程重构**: 数据库查询从middleware移到专门的API端点
- **Cloudflare Workers适配**: 重写middleware以兼容Workers运行时

### 阶段2: Cloudflare配置
- **安装适配器**: 添加 `@cloudflare/next-on-pages` 依赖
- **构建配置**: 创建 `wrangler.toml` 和 Cloudflare 特定配置
- **环境变量迁移**: 适配Cloudflare环境变量格式
- **数据库连接**: 优化Neon PostgreSQL连接(无需更换数据库)

### 阶段3: 部署和验证
- **创建Cloudflare Pages项目**: 连接GitHub仓库
- **配置构建流程**: 设置Cloudflare特定的构建命令
- **功能验证**: 确保所有认证、API路由、页面功能正常
- **性能测试**: 验证Cloudflare部署的性能提升

## Impact

### Affected Specs
- `deployment` - MODIFIED: 从Vercel迁移到Cloudflare Pages
- `middleware` - MODIFIED: 中间件架构和依赖优化
- `authentication` - MODIFIED: 认证流程重构，数据库查询分离

### Affected Code
- **Middleware**:
  - `/middleware.ts` (247行，将被重构)
  - `/src/middleware.ts` (42行，将被合并)
- **Authentication**:
  - `/src/lib/auth.ts` (移除middleware中的数据库依赖)
  - 新增认证API端点处理session验证
- **Configuration**:
  - 新增 `wrangler.toml` (Cloudflare配置)
  - 新增 `@cloudflare/next-on-pages` 适配
  - 更新 `package.json` 构建脚本

### Breaking Changes
- **Middleware结构**: 统一为一个优化的middleware文件
- **认证流程**: session验证从middleware移至API路由
- **构建命令**: 添加Cloudflare特定的构建步骤

### Risk Assessment
- **Low风险**: 数据库无需变更，业务逻辑保持一致
- **Medium风险**: 中间件重构需要仔细测试认证流程
- **Mitigation**: 分阶段执行，保留Vercel配置作为回滚方案

## Success Criteria

### Must Pass (P0)
- [ ] Cloudflare Pages构建成功
- [ ] 中间件大小 < 500KB (相比当前1.05MB大幅减少)
- [ ] 所有认证功能正常工作
- [ ] API路由响应正常
- [ ] 数据库连接稳定

### Should Pass (P1)
- [ ] 页面加载时间改善
- [ ] 全球访问延迟降低
- [ ] 部署成本控制在预算内
- [ ] 监控和日志功能正常

## Timeline Estimate
- **阶段1 (中间件重构)**: 4-6小时
- **阶段2 (Cloudflare配置)**: 2-3小时
- **阶段3 (部署验证)**: 2-3小时
- **总计**: 8-12小时 (1-2个工作日)

## Dependencies
- Cloudflare Pages账户和项目设置
- Neon PostgreSQL数据库连接(已存在)
- GitHub仓库集成(已存在)
- Cloudflare CLI工具 (`wrangler`)