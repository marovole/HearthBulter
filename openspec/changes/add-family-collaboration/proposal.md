# Proposal: Add Family Collaboration Features

## Why

健康管理不是个人行为，而是家庭行为。当前系统虽支持家庭成员档案，但缺乏协作功能。开发家庭成员协作系统，让家人共同参与健康管理、共享购物清单、分配烹饪任务，提升执行效率和家庭凝聚力。

## What Changes

- 开发共享购物清单功能
- 实现任务分配系统（谁负责采购、烹饪）
- 添加家庭健康看板（所有成员健康概览）
- 开发打卡互相监督和鼓励
- 实现家庭活动日志（共同记录）
- 添加权限管理（管理员、成员）
- 开发家庭目标设定和追踪
- 实现消息通知和评论功能

## Impact

**Affected Specs**:
- `family-collaboration` (NEW)
- `family-profile-management` (MODIFIED - 添加协作功能)
- `shopping-list-generation` (MODIFIED - 支持共享)

**Affected Code**:
- `src/lib/services/collaboration/` - 协作服务（新增）
  - `task-manager.ts` - 任务管理
  - `shared-list.ts` - 共享清单
  - `activity-logger.ts` - 活动日志
  - `permission-manager.ts` - 权限管理
- `src/app/api/collaboration/**` - 协作API路由
- `src/components/collaboration/` - 协作组件（新增）
  - `FamilyDashboard.tsx` - 家庭看板
  - `TaskAssignment.tsx` - 任务分配
  - `SharedShoppingList.tsx` - 共享购物清单
  - `ActivityFeed.tsx` - 活动流
- Prisma Schema - 添加Task, Activity, Comment模型

**Breaking Changes**: 无

**Dependencies**:
- 实时通信（可选）：Pusher或WebSocket

**Estimated Effort**: 6天开发 + 2天测试

**Risks**:
- 多人并发编辑冲突
- 通知推送的频率控制

