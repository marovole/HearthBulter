# 组件重构指南

本文档提供组件重构的最佳实践和模式。

## 概述

大型组件（>400行）应该拆分为更小的、可维护的模块。已完成的重构示例：DataHistoryTable (497行 → 14个模块化文件)。

## 重构原则

### 1. 单一职责原则
每个组件只做一件事并做好。

### 2. 关注点分离
- **状态管理**: 使用自定义Hook
- **业务逻辑**: 在Hook中处理
- **UI渲染**: 在组件中处理
- **工具函数**: 独立的utils文件
- **类型定义**: 独立的types文件

### 3. 组合优于继承
使用小组件组合成大组件。

## 重构步骤

### Step 1: 分析现有组件

```bash
# 检查组件大小
wc -l src/components/YourComponent.tsx

# 识别职责
# - 状态管理
# - 数据加载
# - 用户交互
# - UI渲染
```

### Step 2: 创建模块化结构

```
ComponentName/
├── types.ts              # 类型定义
├── utils.ts              # 工具函数
├── useComponentName.ts   # 自定义Hook
├── SubComponent1.tsx     # 子组件
├── SubComponent2.tsx     # 子组件
├── ComponentName.tsx     # 主组件
└── index.ts              # 导出
```

### Step 3: 提取类型定义

```typescript
// types.ts
export interface ComponentProps {
  // ...
}

export interface DataItem {
  // ...
}

export type SortField = 'field1' | 'field2'
```

### Step 4: 提取工具函数

```typescript
// utils.ts
export const formatData = (data: RawData): FormattedData => {
  // ...
}

export const validateInput = (input: string): boolean => {
  // ...
}
```

### Step 5: 创建自定义Hook

```typescript
// useComponentName.ts
export function useComponentName(props: ComponentProps) {
  // 状态管理
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 业务逻辑
  const loadData = useCallback(async () => {
    // ...
  }, [])
  
  const handleAction = useCallback(() => {
    // ...
  }, [])
  
  // 返回状态和方法
  return {
    data,
    loading,
    loadData,
    handleAction
  }
}
```

### Step 6: 创建子组件

```typescript
// SubComponent.tsx
interface SubComponentProps {
  data: DataItem
  onAction: () => void
}

export function SubComponent({ data, onAction }: SubComponentProps) {
  return (
    <div>
      {/* UI渲染 */}
    </div>
  )
}
```

### Step 7: 重构主组件

```typescript
// ComponentName.tsx
'use client'

import { useComponentName } from './useComponentName'
import { SubComponent1 } from './SubComponent1'
import { SubComponent2 } from './SubComponent2'

export function ComponentName(props: ComponentProps) {
  const {
    data,
    loading,
    handleAction
  } = useComponentName(props)
  
  if (loading) return <LoadingState />
  
  return (
    <div>
      <SubComponent1 data={data} />
      <SubComponent2 onAction={handleAction} />
    </div>
  )
}
```

### Step 8: 创建导出文件

```typescript
// index.ts
export { ComponentName } from './ComponentName'
export type { ComponentProps } from './types'
```

## 已完成的重构

### DataHistoryTable

**原始状态**:
- 单一文件: 497行
- 包含10+个useState
- 混合了状态管理、业务逻辑和UI

**重构后**:
- 14个模块化文件
- 主组件减少到85行（83%减少）
- 清晰的职责分离

**结构**:
```
DataHistoryTable/
├── types.ts              (60行) - 类型定义
├── utils.ts              (35行) - 工具函数
├── useHealthDataTable.ts (157行) - 状态和逻辑
├── LoadingState.tsx      (10行) - 加载状态
├── ErrorState.tsx        (11行) - 错误状态
├── EmptyState.tsx        (8行) - 空状态
├── BatchActions.tsx      (48行) - 批量操作
├── TableFilters.tsx      (86行) - 筛选面板
├── TableHeader.tsx       (65行) - 表头
├── TableRow.tsx          (116行) - 表格行
├── TablePagination.tsx   (76行) - 分页
├── DataHistoryTable.tsx  (85行) - 主组件
└── index.ts              (3行) - 导出
```

## 待重构组件

### EnhancedDashboard.tsx (243行)
- 优先级: 中
- 建议拆分: 
  - DashboardHeader
  - MetricsCard
  - ChartSection
  - ActivityFeed

### MealCalendarView.tsx (434行)
- 优先级: 高
- 建议拆分:
  - CalendarHeader
  - CalendarGrid
  - DayCell
  - MealDetailModal

### Shopping List组件
- 已经比较模块化
- 可以进一步优化导入和导出

## 重构检查清单

- [ ] 组件文件 < 200行
- [ ] 每个文件单一职责
- [ ] 提取了自定义Hook
- [ ] 创建了类型定义文件
- [ ] 提取了工具函数
- [ ] 子组件可复用
- [ ] 保持向后兼容
- [ ] 更新了导入路径（如需要）
- [ ] 添加了文档注释
- [ ] 测试仍然通过

## 最佳实践

### 命名约定
- 组件: PascalCase
- Hook: use前缀 + PascalCase
- 工具函数: camelCase
- 类型: PascalCase + Type/Interface后缀

### 文件组织
- 相关文件放在同一目录
- 使用index.ts简化导入
- 按功能而非类型组织

### 性能优化
- 使用useCallback避免不必要的重新渲染
- 使用useMemo缓存计算结果
- 懒加载大型组件

### 可测试性
- 单元测试Hook
- 集成测试组件组合
- 模拟外部依赖

## 相关文档

- [React最佳实践](https://react.dev/learn)
- [TypeScript指南](../typescript-guide.md)
- [测试指南](../testing-guide.md)
