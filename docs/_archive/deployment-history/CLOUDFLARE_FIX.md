# Cloudflare Pages 部署问题分析

## 问题诊断

通过 Cloudflare API 和 wrangler CLI 深入分析发现，所有部署都失败于构建阶段，错误信息显示 Node.js 内置模块（如 `async_hooks`, `fs`, `path`, `url`, `vm`, `buffer`, `crypto`, `stream`, `util`, `events`, `child_process`, `assert`, `dns`, `os`, `tls`, `https`, `http2`, `zlib`, `http`, `tty`, `net`, `string_decoder`, `querystring`, `util/types`, `diagnostics_channel` 等）无法解析。

## 根本原因

经过多次尝试和调试，发现问题的核心在于：

1. **@opennextjs/cloudflare 构建输出**：生成的 `handler.mjs` 文件中包含大量 Node.js 内置模块的 `require()` 调用
2. **Cloudflare Pages 重新 Bundling**：部署时 Cloudflare Pages 使用 `wrangler 3.101.0` 重新 bundle worker 文件
3. **兼容性标志无效**：即使在项目级别和 wrangler.toml 中配置了 `nodejs_compat` 和 `nodejs_als` 标志，wrangler bundling 过程仍然无法解析这些内置模块

从构建日志中可以看到：

```
Found wrangler.toml file. Reading build configuration...
Successfully read wrangler.toml file.
Found _worker.js in output directory. Uploading.
⛅️ wrangler 3.101.0
✘ [ERROR] Could not resolve "async_hooks"
    The package "async_hooks" wasn't found on the file system but is built into node.
```

## 尝试的解决方案

1. ✅ 通过 API 更新项目级别的 `compatibility_flags`
2. ❌ 在 `wrangler.toml` 中添加 `no_bundle = true`（配置验证失败）
3. ✅ 添加 `nodejs_als` 标志
4. ✅ 更新 `open-next.config.ts` 使用 `useWorkerdCondition`

所有这些方案都没有解决核心问题，因为 Cloudflare Pages 的 wrangler bundling 过程不支持在这个阶段正确处理 Node.js 内置模块。

## 技术限制

这是 **Next.js 15 + Cloudflare Pages + @opennextjs/cloudflare** 集成的已知限制：

- Next.js 15 使用了更多 Node.js 特性
- Cloudflare Workers 运行时是一个非 Node.js 环境
- @opennextjs/cloudflare 适配器仍在积极开发中以支持 Next.js 15
- Cloudflare Pages 的自动 bundling 流程与预构建的 worker 存在冲突

## 推荐方案

鉴于以上技术限制和项目已有的配置，**强烈建议使用 Vercel 部署**：

### 为什么选择 Vercel？

1. **原生支持**：Vercel 是 Next.js 的官方平台，完美支持 Next.js 15
2. **无需适配器**：不需要额外的构建工具或配置
3. **已有配置**：项目已包含 `vercel.json` 配置文件
4. **更好的性能**：针对 Next.js 优化的边缘网络
5. **开发体验**：更好的预览环境和部署反馈

### Vercel 部署步骤

1. 安装 Vercel CLI：

```bash
npm i -g vercel
```

2. 登录并部署：

```bash
vercel login
vercel --prod
```

3. 或者通过 Vercel Dashboard 连接 GitHub 仓库实现自动部署

## 当前配置状态

Cloudflare Pages 项目配置：

- ✅ `compatibility_flags`: `["nodejs_compat", "nodejs_als"]`
- ✅ `compatibility_date`: `"2024-01-01"`
- ❌ 部署仍然失败于 bundling 阶段

## 相关资源

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Platform](https://vercel.com/docs)
- [@opennextjs/cloudflare GitHub Issues](https://github.com/opennextjs/opennextjs-cloudflare/issues)
- [Cloudflare Workers Node.js Compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
