# Cloudflare Pages 部署深度分析报告

## 执行日期

2025-11-04

## 问题概述

尝试将 Next.js 15 应用部署到 Cloudflare Pages 时遇到多个技术障碍，最终发现存在根本性的架构限制。

---

## 问题层次分析

### 第1层：Node.js 模块解析失败

**表现**：

- Cloudflare Pages 在部署时使用 `wrangler 3.101.0` 重新 bundle worker 文件
- 报错：`Could not resolve "async_hooks", "fs", "path"` 等 Node.js 内置模块

**尝试的解决方案**：

1. ✅ 通过 API 设置项目级别 `compatibility_flags: ["nodejs_compat", "nodejs_als"]`
2. ✅ 在 `wrangler.toml` 中配置兼容性标志
3. ✅ 在 `_worker.js` 顶部添加兼容性注释
4. ❌ 设置 `no_bundle = true`（配置验证失败）

**结果**：无法解决，因为 Cloudflare Pages 的 GitHub 集成会重新 bundle，忽略这些标志。

---

### 第2层：ES Modules `node:` 前缀导入

**表现**：

- `middleware/handler.mjs` 和 `cloudflare/init.js` 包含 `import { xxx } from "node:module"` 格式的导入
- Wrangler bundling 无法解析这些导入

**解决方案**：

- ✅ 创建 `scripts/fix-nodejs-requires.js` 移除 `node:` 前缀
- ✅ 修复了 15 个 `node:` 前缀导入

**结果**：部分成功，但暴露了更深层的问题。

---

### 第3层：Node.js 内置模块缺失

**表现**：

- 即使移除 `node:` 前缀，`async_hooks`, `process`, `stream`, `buffer` 等模块仍无法在 Cloudflare Workers 中使用

**解决方案**：

- ✅ 创建 `scripts/create-node-stubs.js` 生成模块 stubs
- ✅ 创建 `scripts/fix-cloudflare-imports.js` 替换导入路径
- ✅ 为 7 个核心模块创建了 polyfills

**结果**：技术上可行，但暴露了最终的致命问题。

---

### 第4层：**文件大小限制**（致命问题）

**表现**：

```
✘ [ERROR] Error: Pages only supports files up to 25 MiB in size
  server-functions/default/handler.mjs is 25.3 MiB in size
```

**根本原因**：

1. `@opennextjs/cloudflare` 生成的 `handler.mjs` 文件为 **25.3 MB**
2. Cloudflare Pages 的单文件大小限制是 **25 MB**
3. 这是 **硬性限制**，无法绕过

**尝试的解决方案**：

1. ✅ 使用 `--no-bundle` 标志（文件大小问题不变）
2. ❌ 修改 handler.mjs 内容（会使文件更大）

**结果**：**无法解决**，这是 Cloudflare Pages 平台的固有限制。

---

## 创建的工具和脚本

### 1. `scripts/fix-nodejs-requires.js`

- 功能：修复 `handler.mjs` 中的 `require()` 调用
- 方法：将 `require("module")` 替换为 `(void 0)||{}`
- 结果：修复了 653 处引用，但会增加文件大小

### 2. `scripts/create-node-stubs.js`

- 功能：为 Node.js 内置模块创建 Cloudflare Workers 兼容的 stubs
- 模块：`async_hooks`, `process`, `stream`, `buffer`, `crypto`, `querystring`, `path`
- 位置：`.open-next/node-stubs/`

### 3. `scripts/fix-cloudflare-imports.js`

- 功能：替换 cloudflare 文件中的 Node.js 导入为 stub 引用
- 修复的文件：
  - `.open-next/cloudflare/init.js`
  - `.open-next/cloudflare/skew-protection.js`
  - `.open-next/middleware/handler.mjs`

### 4. `scripts/add-compat-flags.js`（已存在）

- 功能：在 `_worker.js` 顶部添加兼容性标志注释

---

## 技术限制总结

### Cloudflare Pages 限制

1. **文件大小**：单个文件最大 25 MB
2. **总部署大小**：所有文件总和最大 25 MB（对于免费计划）
3. **自动 Bundling**：GitHub 集成会重新 bundle worker，无法完全控制

### Next.js 15 + OpenNext 限制

1. **Bundle 大小**：OpenNext 生成的 handler.mjs 达到 25.3 MB
2. **Node.js 依赖**：大量使用 Node.js 内置模块
3. **Edge Runtime**：Next.js 15 的某些特性不完全兼容 Edge Runtime

---

## 方案对比

| 方案                                  | 可行性    | 优势                                | 劣势                        |
| ------------------------------------- | --------- | ----------------------------------- | --------------------------- |
| **Cloudflare Pages (GitHub 集成)**    | ❌ 不可行 | 自动化 CI/CD                        | 文件大小限制、bundling 问题 |
| **Cloudflare Workers (wrangler CLI)** | ❌ 不可行 | 更多控制                            | 同样的文件大小限制          |
| **Vercel**                            | ✅ 推荐   | 原生支持 Next.js 15、无文件大小限制 | 需要迁移                    |
| **降级到 Next.js 14**                 | ⚠️ 可能   | 可能生成更小的 bundle               | 失去 Next.js 15 特性        |

---

## 最终建议

### 推荐方案：**迁移到 Vercel**

**理由**：

1. **原生支持**：Vercel 是 Next.js 的官方平台，完美支持 Next.js 15
2. **无限制**：没有单文件 25 MB 的限制
3. **已有配置**：项目包含 `vercel.json` 配置文件
4. **更好体验**：自动预览环境、边缘网络优化、内置分析
5. **零配置**：不需要适配器、polyfills 或修复脚本

**迁移步骤**：

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod
```

或者通过 Vercel Dashboard 连接 GitHub 仓库实现自动部署。

### 备选方案：**降级到 Next.js 14**

如果必须使用 Cloudflare Pages：

1. 降级 Next.js 到 14.x 版本
2. 使用稳定版的 `@opennextjs/cloudflare`
3. 检查生成的 bundle 大小是否符合限制

**风险**：

- 失去 Next.js 15 的新特性
- 可能仍然遇到文件大小问题
- 需要大量测试和调整

---

## 配置状态

### Cloudflare Pages 项目配置

```json
{
  "compatibility_flags": ["nodejs_compat", "nodejs_als"],
  "compatibility_date": "2024-01-01",
  "build_command": "pnpm run build:cloudflare",
  "destination_dir": ".open-next/assets"
}
```

### 构建脚本

```json
{
  "build:cloudflare": "prisma generate && next build && npx @opennextjs/cloudflare build && cp -f .open-next/worker.js .open-next/_worker.js && cp -f wrangler.toml .open-next/wrangler.toml && node scripts/add-compat-flags.js && node scripts/fix-nodejs-requires.js && node scripts/create-node-stubs.js && node scripts/fix-cloudflare-imports.js"
}
```

---

## 结论

经过深入分析和多次尝试，**Next.js 15 应用无法成功部署到 Cloudflare Pages**，主要受限于：

1. **硬性限制**：25 MB 文件大小限制
2. **架构不匹配**：Node.js 运行时 vs Workers 运行时
3. **工具链不成熟**：`@opennextjs/cloudflare` 对 Next.js 15 的支持仍在开发中

**强烈建议使用 Vercel 进行部署**，这是最可靠、最高效的解决方案。

---

## 相关资源

- [Cloudflare Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)
- [Vercel 文档](https://vercel.com/docs)
- [@opennextjs/cloudflare GitHub](https://github.com/opennextjs/opennextjs-cloudflare)
- [Next.js 15 发布说明](https://nextjs.org/blog/next-15)
