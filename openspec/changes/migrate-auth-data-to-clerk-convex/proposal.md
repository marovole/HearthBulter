## Why

当前系统的认证与数据层仍保留 NextAuth + Prisma + Supabase 依赖，导致架构复杂、重复维护与迁移冲突。需要一次性完成到 Clerk + Convex 的完整迁移，统一身份源与数据源，减少运行时依赖与运维成本。

## What Changes

- **BREAKING** 将认证系统从 NextAuth 迁移到 Clerk（含 Google OAuth）。
- **BREAKING** 将数据层从 Prisma/Supabase 迁移到 Convex Functions + Queries。
- 统一用户身份标识为 Clerk user id，并在 Convex 中持久化用户档案。
- 移除 Supabase/Prisma 相关依赖、脚本、运行时服务与 API 端点。
- 强化资源级授权校验（memberId/familyId/budgetId 等）以防止 IDOR。
- 替换 Supabase Storage 为 Convex Storage，统一文件上传/下载与访问控制。
- 实现基于 Convex 的分布式限流，替代当前进程内内存限流。

## Impact

- Affected specs: user-authentication, data-access, code-quality
- Affected code: NextAuth API routes, auth/session middleware, Prisma repositories, Supabase adapters, Convex schema/functions, file storage services, rate limiting, environment configuration.
