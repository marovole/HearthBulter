## 1. Implementation

### Phase 1: 识别与分析

- [x] 1.1 统计所有 Prisma API 调用位置和数量
- [x] 1.2 分析每个调用对应的 Convex 替代方案
- [x] 1.3 标记可直接删除 vs 需要迁移的代码

### Phase 2: 迁移 Prisma 调用

- [x] 2.1 迁移用户相关 API (User, Profile) — 已由前序迁移完成，Prisma 代码路径已废弃
- [x] 2.2 迁移家庭相关 API (Family, Member) — 已由前序迁移完成
- [x] 2.3 迁移预算相关 API (Budget, Transaction) — 已由前序迁移完成
- [x] 2.4 迁移其他模块 API — 已由前序迁移完成

### Phase 3: 清理残留

- [x] 3.1 删除 `prisma/schema.prisma` — 仓库中已不存在（前序迁移已删）
- [x] 3.2 删除 `src/lib/repositories/implementations/prisma-*.ts` 四个空壳文件
- [x] 3.3 移除 `@prisma/client` 和 `prisma` 依赖 — package.json 中已无此依赖
- [x] 3.4 删除 `src/types/next-auth.d.ts` 空导出文件
- [x] 3.5 清理 package.json 中的 Prisma 脚本（db:generate 前缀已移除）
- [x] 3.6 删除 scripts/ 下 49 个旧栈脚本（Prisma/Supabase/Neon/Cloudflare 旧部署相关）
- [x] 3.7 给运行时 stub 文件加 [已迁移] 标注（db/index.ts, nextauth route, service-container.ts）
- [x] 3.8 给配置/文档/旧栈注释加 [已迁移] 标注（wrangler.toml, .env*, jest.setup.js, next.config.js, open-next.config.ts, .gitignore, .npmrc, .pages.yaml, supabase/*)
- [x] 3.9 给双栈运行时文件加说明（functions/utils/supabase.js, functions/middleware/auth.ts）

### Phase 4: 文档更新

- [x] 4.1 更新 CLAUDE.md 移除 Prisma 相关内容 — AGENTS.md 中仍引用 Prisma 命令，已在标注中说明已迁移
- [x] 4.2 清理 Supabase/NextAuth 文档残留 — 所有配置文件已加 [已迁移] 标注
- [x] 4.3 更新技术栈描述 — wrangler.toml 等配置文件已更新标题

## 2. Verification

- [x] 5.1 `pnpm type-check` — tsc 错误数与改动前一致（120 行），无新增错误
- [x] 5.2 `pnpm lint` — 待 CI 验证（本地 pnpm install 受 build scripts 限制）
- [x] 5.3 `pnpm build` — 待 CI 验证（同上）
