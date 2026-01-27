## 1. Implementation

### Phase 1: 识别与分析

- [ ] 1.1 统计所有 Prisma API 调用位置和数量
- [ ] 1.2 分析每个调用对应的 Convex 替代方案
- [ ] 1.3 标记可直接删除 vs 需要迁移的代码

### Phase 2: 迁移 Prisma 调用

- [ ] 2.1 迁移用户相关 API (User, Profile)
- [ ] 2.2 迁移家庭相关 API (Family, Member)
- [ ] 2.3 迁移预算相关 API (Budget, Transaction)
- [ ] 2.4 迁移其他模块 API

### Phase 3: 清理残留

- [ ] 3.1 删除 `prisma/schema.prisma`
- [ ] 3.2 删除 `src/lib/repositories/prisma/` 目录
- [ ] 3.3 移除 `@prisma/client` 和 `prisma` 依赖
- [ ] 3.4 删除 `src/lib/db/prisma.ts` 客户端文件
- [ ] 3.5 清理 package.json 中的 Prisma 脚本

### Phase 4: 文档更新

- [ ] 4.1 更新 CLAUDE.md 移除 Prisma 相关内容
- [ ] 4.2 清理 Supabase/NextAuth 文档残留
- [ ] 4.3 更新技术栈描述

## 2. Verification

- [ ] 5.1 `pnpm type-check` 通过
- [ ] 5.2 `pnpm lint` 通过
- [ ] 5.3 `pnpm test` 通过
- [ ] 5.4 `pnpm build` 成功
- [ ] 5.5 核心功能手动验证通过
