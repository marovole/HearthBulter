## Why

认证系统已完全迁移到 Clerk + Convex，但 Prisma 残留代码仍存在于代码库中。这导致：

1. **架构混乱**: 同时存在 Prisma 和 Convex 两套数据访问层
2. **维护负担**: 需要同时维护两套 Schema 和 Repository
3. **依赖冗余**: package.json 中保留了不再需要的 Prisma 依赖
4. **文档过时**: CLAUDE.md 和其他文档仍引用已废弃的技术栈

## What Changes

- 删除 `prisma/schema.prisma` 及相关配置
- 移除 `@prisma/client` 和 `prisma` 依赖
- 删除 `src/lib/repositories/prisma/` 目录
- 迁移剩余 74 次 Prisma API 调用到 Convex
- 统一 Repository Singletons 使用 Convex 实现
- 清理 Supabase/NextAuth 文档残留
- 更新 CLAUDE.md 反映当前架构

## Impact

- Affected specs: data-access, code-quality
- Affected code: Prisma repositories, API routes using Prisma, package.json, documentation
- Risk level: Low (Prisma 代码路径已不再被主流程使用)

## Priority

**P2 (低优先级)** - 原因：

1. 当前混合架构可正常运行
2. 无数据不一致的紧急风险
3. 可在功能开发间隙逐步清理

## Estimated Effort

约 2-3 天工作量
