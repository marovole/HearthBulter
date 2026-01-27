# Cloudflare Pages 部署状态

## 最新更新 (2025-11-08 23:25 UTC+8)

### ✅ 已修复的问题

#### 1. 构建配置错误 (Commit: a641c13) ✅

- ❌ 问题: `ENOENT: no such file or directory, pages-manifest.json`
- ✅ 修复: 移除 `next.config.js` 中的 `outputFileTracingRoot` 配置
- ✅ 修复: 简化 `open-next.config.ts`，移除 monorepo 相关配置
- ✅ 修复: 简化 `prepare-standalone-for-opennext.js` 脚本
- 结果: OpenNext 构建成功完成

#### 2. Bundle 大小超限 (Commit: 2e90dfa) ⏳

- ❌ 问题: `handler.mjs` 大小 25.7 MB，超过 Cloudflare Workers 25MB 限制
- ✅ 修复: 增强 `fix-prisma-bundle.js` 清理脚本
- ✅ 新增删除: TypeScript 定义、测试文件、文档、开发工具
- ✅ 新增删除: Next.js build/cli/telemetry 目录
- ✅ 新增删除: 测试相关包 (@testing-library, @playwright, jest)
- 状态: ⏳ 等待构建验证

### 🔧 主要修改

#### 1. next.config.js

```diff
- experimental: {
-   outputFileTracingRoot: path.join(__dirname, '../../'),
- }
+ experimental: {
+   scrollRestoration: true,
+ }
+ outputFileTracingExcludes: { ... }
```

#### 2. open-next.config.ts

```diff
- monorepoRoot: "/Users/marovole/GitHub",
- buildOutputPath: ".",
```

#### 3. prepare-standalone-for-opennext.js

- 从 298 行简化到 60 行
- 只复制 `.next/static` 目录
- 保持 Next.js 原始目录结构

#### 4. fix-prisma-bundle.js (增强版)

```diff
+ // 新增删除目标
+ '**/*.d.ts',              // TypeScript 定义
+ '**/*.test.js',           // 测试文件
+ '**/LICENSE*',            // 文档文件
+ '**/tsconfig.json',       // 开发工具配置
+ '**/next/dist/build/**',  // Next.js 构建工具
+ '**/next/dist/cli/**',    // Next.js CLI
```

优化：

- 新增 20+ 个文件/目录删除模式
- 改进 glob 模式匹配算法（支持 `**` 和 `*`）
- 更积极的目录删除策略
- 只打印大文件（>100KB）删除信息

### 📊 部署链接

- **Cloudflare Dashboard**: https://dash.cloudflare.com/b80eef96097fab92f15b574ed5fbb927/pages/view/hearthbulter
- **生产 URL**: https://hearthbulter-supabase.pages.dev (待部署成功)
- **GitHub 仓库**: https://github.com/marovole/HearthBulter

### 🎯 当前状态与下一步

**当前**: ⏳ 等待构建验证 (commit: 2e90dfa)

**预期结果**:

- ✅ handler.mjs 大小 < 25MB
- ✅ 构建成功完成
- ✅ 部署到生产环境

**如果仍超限，下一步优化**:

1. 分析 handler.mjs 组成，识别大型依赖
2. 考虑将某些依赖标记为 external
3. 使用 webpack-bundle-analyzer 分析 bundle
4. 考虑代码分割策略

### 📝 关键学习

#### 1. Next.js Standalone 输出

- `outputFileTracingRoot` 会创建嵌套目录结构
- OpenNext 期望特定的目录层级
- **最佳实践**: 保持简单，使用 Next.js 默认结构

#### 2. OpenNext 配置

- 非 monorepo 项目不要设置 `monorepoRoot`
- `buildOutputPath` 默认为 "." 即可
- **最佳实践**: 最小化配置，只配置必需项

#### 3. Bundle 大小优化

- **限制**: Cloudflare Workers 25 MB
- **删除优先级**: Prisma > Tests > Docs > Dev Tools > TypeScript
- **关键**: 删除 Next.js 的构建工具目录（build/cli/telemetry）
- **策略**: 删除文件模式 > 删除整个目录 > 检查剩余大小

### 🔗 相关提交

| Commit  | 说明                                                   | 状态           |
| ------- | ------------------------------------------------------ | -------------- |
| 2e90dfa | fix: enhance bundle size optimization script           | ⏳ 构建中      |
| a641c13 | fix: resolve Cloudflare Pages deployment build errors  | ✅ 部分成功    |
| b51670b | fix: correctly find source directory in CI environment | ❌ Bundle 超限 |

### 📋 部署清单

- [x] 修复 Next.js 配置
- [x] 修复 OpenNext 配置
- [x] 简化准备脚本
- [x] 增强清理脚本
- [ ] 验证 bundle 大小 < 25MB
- [ ] 部署成功
- [ ] 功能测试
- [ ] 性能测试

### 🔍 监控命令

```bash
# 检查本地构建
pnpm run build:cloudflare

# 检查 handler.mjs 大小
ls -lh .open-next/server-functions/default/handler.mjs

# 查看清理日志
node scripts/fix-prisma-bundle.js

# 分析 bundle 内容
du -sh .open-next/server-functions/default/*
```

### 📞 故障排除

**问题**: Bundle 仍然超过 25MB

**解决方案**:

1. 检查哪些文件最大：`du -sh .open-next/server-functions/default/* | sort -h`
2. 查找大型 node_modules：`find .open-next -type d -name node_modules -exec du -sh {} \;`
3. 分析未删除的文件：查看清理脚本输出
4. 考虑更激进的删除策略

---

_最后更新: 2025-11-08 23:25 UTC+8_
_状态: ⏳ 等待 Cloudflare Pages 构建完成_
_预计完成时间: 3-5 分钟_
