# 权限管理文档

本文档详细说明Health Butler的权限管理系统（RBAC - 基于角色的访问控制）。

## 目录

1. [概述](#概述)
2. [角色定义](#角色定义)
3. [权限列表](#权限列表)
4. [权限验证](#权限验证)
5. [中间件使用](#中间件使用)
6. [最佳实践](#最佳实践)

## 概述

Health Butler使用基于角色的访问控制（RBAC）模型，通过为用户分配角色来管理访问权限。

### 权限架构

\`\`\`
用户 (User)
  ↓
家庭成员 (FamilyMember) + 角色 (Role)
  ↓
权限 (Permissions)
  ↓
资源访问 (Resources)
\`\`\`

## 角色定义

系统定义了三个主要角色：

### 1. ADMIN（管理员）

**描述**: 家庭管理员，拥有所有权限

**权限**:
- 所有读取权限
- 所有创建权限
- 所有更新权限
- 所有删除权限
- 管理家庭设置
- 管理成员
- 邀请/移除成员

**适用场景**:
- 家庭创建者
- 家庭负责人

### 2. MEMBER（成员）

**描述**: 普通家庭成员，拥有大部分读写权限

**权限**:
- 查看家庭数据
- 创建/更新/删除自己的任务
- 创建/更新/删除自己的活动
- 查看其他成员的数据
- 创建评论
- 查看目标

**限制**:
- 不能管理家庭设置
- 不能管理其他成员
- 不能邀请/移除成员
- 不能修改他人创建的内容

**适用场景**:
- 家庭普通成员
- 日常使用者

### 3. GUEST（访客）

**描述**: 访客用户，只有只读权限

**权限**:
- 查看家庭数据
- 查看任务
- 查看活动
- 查看评论
- 查看目标

**限制**:
- 不能创建任何内容
- 不能更新任何内容
- 不能删除任何内容
- 不能管理家庭或成员

**适用场景**:
- 临时访客
- 受邀观察者
- 只读用户

## 权限列表

完整权限列表（定义在 \`src/lib/permissions.ts\`）：

### 家庭管理权限
- \`READ_FAMILY_DATA\` - 查看家庭数据
- \`MANAGE_FAMILY\` - 管理家庭设置
- \`MANAGE_MEMBERS\` - 管理成员
- \`INVITE_MEMBERS\` - 邀请成员
- \`REMOVE_MEMBERS\` - 移除成员

### 任务管理权限
- \`CREATE_TASK\` - 创建任务
- \`READ_TASK\` - 查看任务
- \`UPDATE_TASK\` - 更新任务
- \`DELETE_TASK\` - 删除任务

### 活动管理权限
- \`CREATE_ACTIVITY\` - 创建活动
- \`READ_ACTIVITY\` - 查看活动
- \`UPDATE_ACTIVITY\` - 更新活动
- \`DELETE_ACTIVITY\` - 删除活动

### 评论管理权限
- \`CREATE_COMMENT\` - 创建评论
- \`READ_COMMENT\` - 查看评论
- \`UPDATE_COMMENT\` - 更新评论
- \`DELETE_COMMENT\` - 删除评论

### 目标管理权限
- \`CREATE_GOAL\` - 创建目标
- \`READ_GOAL\` - 查看目标
- \`UPDATE_GOAL\` - 更新目标
- \`DELETE_GOAL\` - 删除目标

### 其他权限
- \`VIEW_FAMILY_DATA\` - 查看家庭数据
- \`EXPORT_DATA\` - 导出数据
- \`VIEW_ANALYTICS\` - 查看分析报告

## 权限验证

### 基础权限检查

\`\`\`typescript
import { hasPermission, FamilyMemberRole, Permission } from '@/lib/permissions'

// 检查角色是否有权限
const canManageFamily = hasPermission(
  FamilyMemberRole.MEMBER,
  Permission.MANAGE_FAMILY
)

console.log(canManageFamily) // false
\`\`\`

### 资源所有权检查

\`\`\`typescript
// 检查用户是否可以修改资源
const canUpdate = hasPermission(
  FamilyMemberRole.MEMBER,
  Permission.UPDATE_TASK,
  resourceOwnerId,  // 资源创建者ID
  currentUserId     // 当前用户ID
)

// 只有资源创建者或管理员可以修改
\`\`\`

### API端点权限验证

\`\`\`typescript
import { withPermissions } from '@/lib/middleware/permission-middleware'
import { Permission } from '@/lib/permissions'

// 保护API端点
export const POST = withPermissions(
  [
    {
      permissions: [Permission.MANAGE_FAMILY],
      requireFamilyMembership: true
    }
  ],
  async (request: Request, context: any) => {
    // 只有管理员可以访问
    // context包含：
    // - userRole: 用户角色
    // - familyId: 家庭ID
    // - memberId: 成员ID
    
    // 处理请求
    return Response.json({ success: true })
  }
)
\`\`\`

### 复杂权限需求

\`\`\`typescript
export const PUT = withPermissions(
  [
    {
      // 需要更新权限
      permissions: [Permission.UPDATE_TASK],
      requireFamilyMembership: true,
      // 自定义验证：只有任务创建者可以更新
      customValidator: async (context) => {
        const task = await prisma.task.findUnique({
          where: { id: context.params.id }
        })
        
        return task?.createdById === context.userId || 
               context.userRole === FamilyMemberRole.ADMIN
      }
    }
  ],
  async (request: Request, context: any) => {
    // 处理更新
  }
)
\`\`\`

## 中间件使用

### permissionMiddleware

权限验证中间件提供以下功能：

#### 1. 检查权限

\`\`\`typescript
import { permissionMiddleware } from '@/lib/middleware/permission-middleware'

const result = await permissionMiddleware.checkPermissions(
  request,
  requirements,
  {
    familyId: 'family-id',
    memberId: 'member-id'
  }
)

if (!result.allowed) {
  return Response.json(
    { error: result.reason },
    { status: 403 }
  )
}
\`\`\`

#### 2. 权限缓存

权限检查结果会自动缓存，提高性能：

\`\`\`typescript
// 第一次查询：从数据库获取
const result1 = await permissionMiddleware.checkPermissions(...)

// 第二次查询：从缓存获取（更快）
const result2 = await permissionMiddleware.checkPermissions(...)
\`\`\`

#### 3. 缓存失效

当用户角色变更时，需要失效缓存：

\`\`\`typescript
// 更新用户角色
await prisma.familyMember.update({
  where: { id: memberId },
  data: { role: FamilyMemberRole.ADMIN }
})

// 失效权限缓存
permissionMiddleware.invalidateUserCache(userId, familyId)
\`\`\`

#### 4. 缓存统计

查看缓存使用情况：

\`\`\`typescript
const stats = permissionMiddleware.getCacheStats()

console.log({
  缓存大小: stats.size,
  命中率: stats.hitRate
})
\`\`\`

## 最佳实践

### 1. 最小权限原则

只授予完成任务所需的最小权限：

\`\`\`typescript
// ✅ 正确：只检查需要的权限
if (!hasPermission(role, Permission.READ_TASK)) {
  return error
}

// ❌ 错误：过度权限
if (role !== 'ADMIN') {
  return error
}
\`\`\`

### 2. 资源所有权验证

对于修改操作，验证资源所有权：

\`\`\`typescript
// ✅ 正确
const resource = await prisma.task.findUnique({ where: { id } })

if (!hasPermission(
  userRole,
  Permission.UPDATE_TASK,
  resource.createdById,
  userId
)) {
  return Response.json({ error: '无权修改' }, { status: 403 })
}

// ❌ 错误：只检查角色
if (!hasPermission(userRole, Permission.UPDATE_TASK)) {
  return error
}
\`\`\`

### 3. 使用中间件保护端点

使用withPermissions装饰器保护所有API端点：

\`\`\`typescript
// ✅ 正确：使用中间件
export const POST = withPermissions(
  [{ permissions: [Permission.CREATE_TASK] }],
  handler
)

// ❌ 错误：手动验证（容易遗漏）
export async function POST(request: Request) {
  // 手动权限检查...
}
\`\`\`

### 4. 清晰的错误消息

提供清晰的权限错误消息：

\`\`\`typescript
// ✅ 正确
return Response.json(
  { error: '需要管理员权限才能执行此操作' },
  { status: 403 }
)

// ❌ 错误
return Response.json(
  { error: 'Forbidden' },
  { status: 403 }
)
\`\`\`

### 5. 审计日志

记录权限验证失败的审计日志：

\`\`\`typescript
if (!result.allowed) {
  console.warn('权限验证失败', {
    userId,
    familyId,
    permission: Permission.MANAGE_FAMILY,
    reason: result.reason,
    timestamp: new Date()
  })
}
\`\`\`

## 权限矩阵

| 权限 | ADMIN | MEMBER | GUEST |
|-----|-------|--------|-------|
| READ_FAMILY_DATA | ✅ | ✅ | ✅ |
| MANAGE_FAMILY | ✅ | ❌ | ❌ |
| MANAGE_MEMBERS | ✅ | ❌ | ❌ |
| CREATE_TASK | ✅ | ✅ | ❌ |
| READ_TASK | ✅ | ✅ | ✅ |
| UPDATE_TASK | ✅ | ✅* | ❌ |
| DELETE_TASK | ✅ | ✅* | ❌ |
| CREATE_ACTIVITY | ✅ | ✅ | ❌ |
| READ_ACTIVITY | ✅ | ✅ | ✅ |
| UPDATE_ACTIVITY | ✅ | ✅* | ❌ |
| DELETE_ACTIVITY | ✅ | ✅* | ❌ |

\`*\` 仅限自己创建的资源

## 常见场景

### 场景1：用户创建任务

\`\`\`typescript
// 需要CREATE_TASK权限
// ADMIN和MEMBER可以，GUEST不可以
export const POST = withPermissions(
  [{ permissions: [Permission.CREATE_TASK] }],
  async (request, context) => {
    const task = await prisma.task.create({
      data: {
        ...data,
        createdById: context.userId
      }
    })
    return Response.json(task)
  }
)
\`\`\`

### 场景2：用户更新自己的任务

\`\`\`typescript
// 需要UPDATE_TASK权限 + 资源所有权
export const PUT = withPermissions(
  [
    {
      permissions: [Permission.UPDATE_TASK],
      customValidator: async (context) => {
        const task = await prisma.task.findUnique({
          where: { id: context.params.id }
        })
        return task?.createdById === context.userId ||
               context.userRole === FamilyMemberRole.ADMIN
      }
    }
  ],
  async (request, context) => {
    // 更新任务
  }
)
\`\`\`

### 场景3：管理员管理家庭

\`\`\`typescript
// 只有ADMIN可以访问
export const PUT = withPermissions(
  [{ permissions: [Permission.MANAGE_FAMILY] }],
  async (request, context) => {
    // 更新家庭设置
  }
)
\`\`\`

## 相关文档

- [API安全指南](./API_SECURITY_GUIDE.md)
- [性能优化文档](../performance/PERFORMANCE_OPTIMIZATION.md)
- [部署检查清单](../deployment/DEPLOYMENT_CHECKLIST.md)
