## Why

TypeScript 编译错误导致项目无法成功构建，这是部署的阻塞问题。必须修复这些基础语法和依赖问题才能确保项目可以正常部署和运行。

## What Changes

- 修复 `src/app/api/social/stats/route.ts:442` 中的函数声明语法错误
- 修复 `src/components/ui/code-review-panel.tsx` 中未正确闭合的 JSX 标签
- 修复 `src/lib/services/budget/budget-notification-service.ts:211` 中非异步函数使用 await 的问题
- 创建缺失的 UI 组件依赖
- 修复组件导入路径问题

## Impact

- **Affected specs**: `code-quality`
- **Affected code**:
  - API 路由文件
  - React 组件文件
  - 服务层文件
  - 组件库结构

**Priority**: P0 - 部署阻塞
**Estimated effort**: 2-4 hours