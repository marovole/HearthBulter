# API安全指南

本文档提供Health Butler项目的API安全最佳实践和实施指南。

## 目录

1. [概述](#概述)
2. [输入验证](#输入验证)
3. [SQL注入防护](#sql注入防护)
4. [XSS防护](#xss防护)
5. [CSRF保护](#csrf保护)
6. [权限控制](#权限控制)
7. [频率限制](#频率限制)
8. [安全审计](#安全审计)
9. [最佳实践](#最佳实践)

## 概述

Health Butler实施了多层安全防护机制，确保API的安全性和稳定性。所有API端点都应遵循本指南中的安全要求。

### 安全架构

\`\`\`
请求 → 频率限制 → CSRF验证 → 输入验证 → 权限检查 → 业务逻辑 → 响应
          ↓            ↓           ↓          ↓
       审计日志    审计日志    审计日志   审计日志
\`\`\`

## 输入验证

### 使用Zod Schema验证

所有API端点必须使用Zod schema验证输入数据：

\`\`\`typescript
import { z } from 'zod'
import { validationMiddleware } from '@/lib/middleware/validation-middleware'

// 定义验证schema
const createFamilySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  members: z.array(z.string()).max(50).optional()
})

// 在API路由中使用
export async function POST(request: Request) {
  const body = await request.json()

  // 验证输入
  const validation = await validationMiddleware.validate(
    body,
    createFamilySchema
  )

  if (!validation.success) {
    return Response.json(
      { error: '输入验证失败', details: validation.errors },
      { status: 400 }
    )
  }

  // 使用验证后的数据
  const data = validation.data
  // ... 业务逻辑
}
\`\`\`

## SQL注入防护

### 使用Prisma ORM

**始终**使用Prisma ORM进行数据库操作：

\`\`\`typescript
// ✅ 正确：使用Prisma
const family = await prisma.family.findUnique({
  where: { id: familyId }
})

// ❌ 错误：原始SQL（除非必要）
const family = await prisma.\$queryRaw\`
  SELECT * FROM Family WHERE id = \${familyId}
\`
\`\`\`

## 权限控制

### RBAC模型

系统使用基于角色的访问控制（RBAC）：

**角色层级：**
- \`ADMIN\` - 管理员（所有权限）
- \`MEMBER\` - 成员（读写权限）
- \`GUEST\` - 访客（只读权限）

## 最佳实践

### 1. 始终验证输入

\`\`\`typescript
// ✅ 正确
const schema = z.object({ name: z.string().min(1) })
const result = schema.safeParse(input)
if (!result.success) return error

// ❌ 错误
const name = request.body.name // 未验证
\`\`\`

### 2. 最小权限原则

只授予必要的权限，不要过度授权。

### 3. 防御性编程

验证所有输入，不要假设数据总是有效的。

## 安全检查清单

在部署前确认：

- [ ] 所有API端点都有输入验证
- [ ] 所有修改操作都有CSRF保护
- [ ] 所有端点都有权限控制
- [ ] 关键端点都有频率限制
- [ ] 启用了安全审计日志
- [ ] 配置了安全HTTP头
- [ ] 使用HTTPS
- [ ] 敏感数据已加密
- [ ] 错误信息不泄露内部信息
- [ ] 依赖包已更新到最新安全版本

## 相关文档

- [权限管理文档](./PERMISSION_MANAGEMENT.md)
- [性能优化文档](../performance/PERFORMANCE_OPTIMIZATION.md)
- [部署检查清单](../deployment/DEPLOYMENT_CHECKLIST.md)
