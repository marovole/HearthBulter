# Proposal: Add Family Profile Management

## Why

家庭档案管理是Health Butler的基础能力，所有其他功能（健康数据、食谱生成等）都依赖于此模块提供的成员身份数据。这是MVP的第一优先级功能。

## What Changes

- 实现用户认证系统（邮箱+OAuth）
- 创建家庭和成员档案管理
- 实现健康目标设定功能
- 添加过敏史和饮食禁忌记录
- 实现基于角色的权限控制（管理员/成员）

## Impact

**Affected Specs**:
- `family-profile-management` (NEW)

**Affected Code**:
- `src/app/api/auth/**` - NextAuth配置
- `src/app/api/families/**` - 家庭管理API
- `src/app/api/members/**` - 成员管理API
- `prisma/schema.prisma` - 数据模型
- `src/components/family/**` - 家庭管理UI

**Breaking Changes**: 无（全新功能）

**Dependencies**:
- NextAuth.js v5
- Prisma 6
- bcrypt (密码加密)

**Estimated Effort**: 5天开发 + 2天测试
