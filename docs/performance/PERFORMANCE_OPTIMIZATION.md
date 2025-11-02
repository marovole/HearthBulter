# 性能优化文档

本文档提供Health Butler项目的性能优化指南和最佳实践。

## 目录

1. [概述](#概述)
2. [数据库查询优化](#数据库查询优化)
3. [API响应时间优化](#api响应时间优化)
4. [缓存策略](#缓存策略)
5. [性能监控](#性能监控)
6. [性能基准](#性能基准)
7. [最佳实践](#最佳实践)

## 概述

Health Butler实施了全面的性能优化措施，确保系统在高负载下保持稳定和响应快速。

### 性能目标

- API响应时间 < 500ms (P95)
- 数据库查询时间 < 100ms (平均)
- 支持100+并发用户
- 页面首屏渲染 < 1.5s

## 数据库查询优化

### 1. 使用分页

所有列表查询必须使用分页：

\`\`\`typescript
import { optimizedQuery } from '@/lib/middleware/query-optimization'

// ✅ 正确：带分页
const families = await optimizedQuery.findMany('family', {
  take: 20,
  skip: (page - 1) * 20,
  where: { deletedAt: null }
})

// ❌ 错误：无限制查询
const families = await prisma.family.findMany()
\`\`\`

### 2. 索引优化

确保常用查询字段都有索引：

\`\`\`prisma
model Family {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  deletedAt DateTime?

  @@index([deletedAt])
  @@index([createdAt])
}
\`\`\`

### 3. 选择性查询

只查询需要的字段：

\`\`\`typescript
// ✅ 正确：只查询需要的字段
const family = await prisma.family.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    members: {
      select: { id: true, name: true }
    }
  }
})

// ❌ 错误：查询所有字段
const family = await prisma.family.findUnique({
  where: { id },
  include: { members: true }
})
\`\`\`

### 4. 批量操作

使用批量操作替代循环查询：

\`\`\`typescript
// ✅ 正确：批量创建
await prisma.familyMember.createMany({
  data: members.map(m => ({ ...m, familyId }))
})

// ❌ 错误：循环创建
for (const member of members) {
  await prisma.familyMember.create({
    data: { ...member, familyId }
  })
}
\`\`\`

## API响应时间优化

### 1. 查询超时保护

设置查询超时防止慢查询：

\`\`\`typescript
const result = await optimizedQuery.findMany('family', {
  take: 20,
  timeout: 5000 // 5秒超时
})
\`\`\`

### 2. 并行处理

使用Promise.all并行处理独立操作：

\`\`\`typescript
// ✅ 正确：并行查询
const [families, members, tasks] = await Promise.all([
  prisma.family.findMany({ take: 20 }),
  prisma.familyMember.findMany({ take: 50 }),
  prisma.task.findMany({ take: 30 })
])

// ❌ 错误：串行查询
const families = await prisma.family.findMany({ take: 20 })
const members = await prisma.familyMember.findMany({ take: 50 })
const tasks = await prisma.task.findMany({ take: 30 })
\`\`\`

### 3. 数据预加载

使用include预加载关联数据：

\`\`\`typescript
const family = await prisma.family.findUnique({
  where: { id },
  include: {
    members: {
      where: { deletedAt: null },
      take: 10
    }
  }
})
\`\`\`

## 缓存策略

### 1. 查询结果缓存

缓存常用查询结果：

\`\`\`typescript
import { optimizedQuery } from '@/lib/middleware/query-optimization'

const families = await optimizedQuery.findMany('family', {
  take: 20,
  cache: {
    enabled: true,
    ttl: 300000 // 5分钟
  }
})
\`\`\`

### 2. 权限缓存

缓存用户权限信息：

\`\`\`typescript
import { permissionMiddleware } from '@/lib/middleware/permission-middleware'

// 自动使用缓存
const result = await permissionMiddleware.checkPermissions(
  request,
  requirements,
  context
)
\`\`\`

### 3. 缓存失效

在数据更新时失效相关缓存：

\`\`\`typescript
// 更新家庭信息后失效缓存
await prisma.family.update({ where: { id }, data })
optimizedQuery.invalidateCache('family', id)
\`\`\`

## 性能监控

### 1. 响应时间监控

使用性能监控中间件：

\`\`\`typescript
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'

export async function GET(request: Request) {
  const requestId = performanceMonitor.startMonitoring(request)

  try {
    // 处理请求
    const response = await handleRequest(request)
    
    performanceMonitor.endMonitoring(requestId, 200, response)
    return response
  } catch (error) {
    performanceMonitor.endMonitoring(requestId, 500)
    throw error
  }
}
\`\`\`

### 2. 查询性能追踪

自动追踪慢查询：

\`\`\`typescript
// optimizedQuery自动记录慢查询
const result = await optimizedQuery.findMany('family', {
  take: 20,
  slowQueryThreshold: 100 // 超过100ms记录
})
\`\`\`

### 3. 性能指标

查看性能统计：

\`\`\`typescript
const metrics = performanceMonitor.getMetrics()

console.log({
  平均响应时间: metrics.responseTime.avg,
  P95响应时间: metrics.responseTime.p95,
  P99响应时间: metrics.responseTime.p99,
  总请求数: metrics.responseTime.total
})
\`\`\`

## 性能基准

### API响应时间基准

| 端点类型 | 目标 (平均) | 目标 (P95) | 目标 (P99) |
|---------|-----------|-----------|-----------|
| GET列表  | < 200ms   | < 500ms   | < 1000ms  |
| GET详情  | < 100ms   | < 300ms   | < 500ms   |
| POST创建 | < 300ms   | < 700ms   | < 1200ms  |
| PUT更新  | < 200ms   | < 500ms   | < 800ms   |
| DELETE删除| < 150ms  | < 400ms   | < 600ms   |

### 数据库查询基准

| 查询类型 | 目标 (平均) | 目标 (最大) |
|---------|-----------|-----------|
| 简单查询 | < 50ms    | < 100ms   |
| 关联查询 | < 100ms   | < 300ms   |
| 聚合查询 | < 200ms   | < 500ms   |
| 计数查询 | < 30ms    | < 100ms   |

## 最佳实践

### 1. 避免N+1查询

\`\`\`typescript
// ✅ 正确：使用include预加载
const families = await prisma.family.findMany({
  include: { members: true }
})

// ❌ 错误：N+1查询
const families = await prisma.family.findMany()
for (const family of families) {
  family.members = await prisma.familyMember.findMany({
    where: { familyId: family.id }
  })
}
\`\`\`

### 2. 使用连接池

Prisma自动管理连接池，但可以调整配置：

\`\`\`typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // 连接池配置
  // connection_limit = 20
  // pool_timeout = 10
}
\`\`\`

### 3. 定期清理数据

使用软删除并定期清理旧数据：

\`\`\`typescript
// 标记删除
await prisma.family.update({
  where: { id },
  data: { deletedAt: new Date() }
})

// 定期物理删除（定时任务）
await prisma.family.deleteMany({
  where: {
    deletedAt: {
      lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90天前
    }
  }
})
\`\`\`

### 4. 监控和告警

设置性能告警：

\`\`\`typescript
if (metrics.responseTime.p95 > 1000) {
  console.error('P95响应时间超过阈值', metrics.responseTime.p95)
  // 发送告警
}
\`\`\`

## 性能检查清单

部署前检查：

- [ ] 所有列表查询都有分页限制
- [ ] 常用查询字段都有索引
- [ ] 使用了查询结果缓存
- [ ] 避免了N+1查询问题
- [ ] 实施了查询超时保护
- [ ] 启用了性能监控
- [ ] 运行了性能基准测试
- [ ] 设置了性能告警阈值
- [ ] 优化了前端资源加载
- [ ] 使用了CDN加速静态资源

## 相关文档

- [API安全指南](../security/API_SECURITY_GUIDE.md)
- [部署检查清单](../deployment/DEPLOYMENT_CHECKLIST.md)
- [故障恢复指南](../deployment/FAILURE_RECOVERY_GUIDE.md)
