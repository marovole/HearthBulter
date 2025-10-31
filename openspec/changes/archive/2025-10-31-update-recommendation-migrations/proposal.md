## Why
Prisma schema 中已经新增推荐系统相关模型，但数据库未成功执行迁移，导致线上环境缺少必要表结构。为保证推荐引擎功能落地，需要补齐迁移执行与验证流程。

## What Changes
- 明确执行 Prisma 迁移/同步数据库的要求
- 记录迁移脚本与执行校验步骤
- 制定必要的数据一致性检查

## Impact
- Affected Specs: smart-recipe-recommendation
- Affected Code: prisma/schema.prisma, prisma/migrations/**
- Breaking Changes: 无
