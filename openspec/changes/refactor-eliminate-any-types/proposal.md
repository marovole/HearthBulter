## Why

项目中存在约 100+ 处 `any` 类型的使用，违反了 TypeScript 严格模式的最佳实践，导致：
- 编译时类型检查失效，运行时错误难以发现
- IDE 自动补全和重构支持丧失
- 代码可维护性和可读性降低

这与 `project.md` 中明确规定的"避免 `any`，必要时使用 `unknown` + 类型守卫"原则相违背。

## What Changes

- **重构** `services/` 目录下所有 `any` 类型为明确类型定义
- **重构** `lib/services/` 目录下所有 `any` 类型为明确类型定义
- **添加** 缺失的类型定义文件到 `types/` 目录
- **修改** `as any` 类型断言为正确的类型守卫或类型缩窄
- **修改** 函数参数的 `any` 类型为具体接口定义

**受影响文件清单**（主要）：
- `src/services/task-management.ts` - whereCondition, updateData, metadata
- `src/services/inventory-analyzer.ts` - items, usageRecords, wasteRecords 参数
- `src/services/inventory-notification.ts` - prismaProxy, whereClause
- `src/services/shopping-list.ts` - metadata 参数
- `src/services/expiry-monitor.ts` - item 参数
- `src/lib/repositories/implementations/*.ts` - 部分映射函数

## Impact

- **Affected specs**: `code-quality`
- **Affected code**: 
  - `src/services/*.ts` (~8 文件)
  - `src/lib/services/**/*.ts` (~15 文件)
  - `src/lib/repositories/implementations/*.ts` (~5 文件)
- **风险等级**: 低 - 纯类型重构，不改变运行时行为
- **预计工作量**: 4-6 小时
