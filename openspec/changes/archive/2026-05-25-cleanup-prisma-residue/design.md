## Overview

本提案旨在清理 Prisma 残留代码，完成向 Convex 的完整迁移。

## Current State Analysis

### Prisma 残留统计

| 类别            | 数量 | 位置                           |
| --------------- | ---- | ------------------------------ |
| Schema Models   | 68   | `prisma/schema.prisma`         |
| API 调用        | 74   | `src/app/api/**/*.ts`          |
| Repository 文件 | ~20  | `src/lib/repositories/prisma/` |
| 依赖包          | 2    | `@prisma/client`, `prisma`     |

### Convex 已完成

| 类别            | 数量     | 位置                           |
| --------------- | -------- | ------------------------------ |
| Schema Tables   | 62       | `convex/schema.ts`             |
| Functions       | 31 files | `convex/`                      |
| Repository 实现 | ~15      | `src/lib/repositories/convex/` |

## Migration Strategy

### Phase 1: 识别活跃 Prisma 调用

1. 使用 grep 定位所有 `prisma.` 调用
2. 分析每个调用是否有对应 Convex 实现
3. 标记需要迁移 vs 可直接删除的代码

### Phase 2: 逐模块迁移

按业务模块迁移，优先级：

1. 用户相关 (User, Profile)
2. 家庭相关 (Family, Member)
3. 预算相关 (Budget, Transaction)
4. 其他模块

### Phase 3: 清理

1. 删除 Prisma Schema
2. 移除依赖
3. 删除 Repository 目录
4. 更新文档

## Risk Mitigation

- 每次迁移后运行 `pnpm type-check`
- 保持 Prisma 代码直到 Convex 替代验证通过
- 使用 feature flag 控制切换（如需要）

## Success Criteria

- [ ] `prisma/` 目录已删除
- [ ] `@prisma/client` 依赖已移除
- [ ] 所有 API 端点使用 Convex
- [ ] `pnpm type-check` 通过
- [ ] `pnpm test` 通过
