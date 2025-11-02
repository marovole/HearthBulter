# TODO项分析报告

本文档分析代码库中的TODO项，并提供处理计划。

## 总览

通过扫描代码库发现了多个TODO项，按优先级和类别进行分类。

## TODO分类

### 高优先级 (P1)

#### 1. 价格估算功能
**位置**: `src/lib/services/price-estimator.ts`  
**TODO**: 从历史采购记录中获取平均价格  
**当前状态**: 使用估算值  
**建议实现**:
```typescript
// 实现历史价格查询
async function getHistoricalPrice(foodId: string): Promise<number | null> {
  const purchases = await prisma.purchase.findMany({
    where: { foodId },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  if (purchases.length === 0) return null
  
  const avgPrice = purchases.reduce((sum, p) => sum + p.price, 0) / purchases.length
  return avgPrice
}
```

#### 2. 健康评分计算
**位置**: `src/lib/services/health-score-calculator.ts`  
**TODO**: 基于实际营养摄入计算达标率  
**当前状态**: 使用模拟数据  
**建议实现**:
```typescript
// 连接实际营养追踪数据
async function calculateNutritionScore(memberId: string): Promise<number> {
  const meals = await prisma.meal.findMany({
    where: { memberId, date: { gte: last30Days } },
    include: { foods: true }
  })
  
  // 计算实际营养摄入
  const nutrition = aggregateNutrition(meals)
  const target = await getUserNutritionTarget(memberId)
  
  return calculateComplianceRate(nutrition, target)
}
```

#### 3. 食物识别功能
**位置**: `src/lib/services/tracking/food-recognition.ts`  
**TODO**: 实际的图像识别逻辑  
**当前状态**: 占位符实现  
**建议实现**: 集成第三方API（如Google Vision API、Clarifai）

### 中优先级 (P2)

#### 4. 邀请邮件发送
**位置**: `src/app/api/families/[id]/invite/route.ts`  
**TODO**: 发送邀请邮件  
**当前状态**: 仅返回邀请信息  
**建议实现**: 使用邮件服务（SendGrid、Resend等）

#### 5. 库存扫码功能
**位置**: `src/components/inventory/AddInventoryItem.tsx`  
**TODO**: 扫码功能  
**建议实现**: 使用条形码扫描库（react-qr-scanner、quagga2）

#### 6. 报告生成
**位置**: `src/lib/services/report-generator.ts`  
**TODO**: 实现周度分解逻辑  
**建议实现**: 创建时间序列分析函数

### 低优先级 (P3)

#### 7. 仪表盘交互
**位置**: `src/__tests__/integration/dashboard.integration.test.tsx`  
**TODO**: 
- 成员选择交互测试
- 标签页切换测试

**建议**: 等待UI完全实现后添加测试

## 处理计划

### 第1阶段：数据依赖TODO（1-2周）

1. ✅ **价格估算** - 连接历史采购数据
2. ✅ **健康评分** - 连接实际营养数据
3. ✅ **营养分析** - 使用real meal data

**实施方式**: 
- 创建数据聚合服务
- 实现数据迁移（如需要）
- 添加单元测试

### 第2阶段：第三方集成TODO（2-3周）

1. **食物识别** - 集成图像识别API
2. **条码扫描** - 集成扫码库
3. **邮件发送** - 集成邮件服务

**实施方式**:
- 评估和选择第三方服务
- 实现API封装层
- 添加错误处理和重试逻辑

### 第3阶段：功能完善TODO（1周）

1. **报告生成** - 时间序列分析
2. **测试补充** - 交互测试

**实施方式**:
- 实现核心算法
- 编写完整测试

## 实施建议

### 开发工作流

1. **创建Issue**: 为每个TODO创建GitHub Issue
2. **分配优先级**: 使用P1/P2/P3标签
3. **关联PR**: 实现时关联到相应Issue
4. **更新代码**: 实现后删除TODO注释

### 代码规范

```typescript
// ✅ 好的TODO（临时的、有明确计划）
// TODO(username): 实现XX功能 - 预计2024-Q1完成
// 相关Issue: #123

// ❌ 不好的TODO（永久的、没有计划）
// TODO: 可能需要优化
```

### 跟踪工具

使用GitHub Projects跟踪TODO项：
- 列：To Do → In Progress → Done
- 标签：P1-Critical, P2-Important, P3-Nice-to-Have
- 里程碑：按实施阶段分组

## TODO转换为Issues

### 模板

```markdown
## Description
[TODO描述]

## Location
File: `src/path/to/file.ts`
Line: 123

## Current State
[当前实现状态]

## Proposed Solution
[建议的实现方案]

## Acceptance Criteria
- [ ] 功能实现
- [ ] 单元测试
- [ ] 文档更新
- [ ] 代码审查

## Priority
[P1/P2/P3]

## Estimated Effort
[小时/天/周]
```

## 清理计划

### 立即处理
- 删除已过时的TODO
- 合并重复的TODO
- 更新TODO描述使其更清晰

### 定期审查
- 每月审查TODO列表
- 评估优先级变化
- 清理已完成的TODO

## 相关文档

- [开发工作流程](../DEVELOPER_GUIDE.md)
- [代码质量标准](../CODE_QUALITY_STANDARDS.md)
- [项目管理指南](../PROJECT_MANAGEMENT.md)
