## Why
当前Health Butler项目面临Vercel Edge Function大小超限（1.05MB > 1MB限制）导致的部署失败问题，同时需要提升全球性能、降低运营成本并增强系统可扩展性。

## What Changes
- **BREAKING**: 从Vercel迁移到Cloudflare Pages + Supabase混合架构
- 重构Next.js为静态导出模式，移除服务端渲染依赖
- 替换NextAuth.js为Supabase Auth认证系统
- 迁移PostgreSQL数据库从Neon到Supabase平台
- 重构API路由从Next.js API Routes到Cloudflare Pages Functions
- 移除Prisma ORM，改用Supabase客户端直接访问数据库
- 实现零成本运营架构，利用免费层服务

## Impact
- **Affected specs**: architecture, authentication, deployment, migration, performance
- **Affected code**: 整个应用架构和部署流程需要重构
- **Breaking changes**: API接口、认证流程、数据库访问方式