## Why

代码中存在多处"魔法数字"（未命名的数字常量），降低了代码可读性和可维护性：
- `0.01` 用于判断趋势稳定性（trend-analyzer.ts）
- `1.2` 用于日均预算超标阈值（budget-tracker.ts）
- `7` 用于移动平均窗口大小（trend-analyzer.ts）
- `80, 100, 110` 用于预算预警阈值

这违反了 Clean Code 的"避免魔法数字"原则，使代码意图不明确。

## What Changes

- **抽取** 算法相关常量到 `lib/constants/` 目录
- **抽取** 业务阈值常量到对应的 service 文件或配置文件
- **创建** `lib/constants/analytics.ts` - 分析相关常量
- **创建** `lib/constants/budget.ts` - 预算相关常量
- **更新** 所有使用魔法数字的代码为常量引用

## Impact

- **Affected specs**: `code-quality`
- **Affected code**:
  - `src/lib/services/analytics/trend-analyzer.ts`
  - `src/lib/services/budget/budget-tracker.ts`
  - `src/lib/services/budget/budget-notification-service.ts`
  - 其他包含魔法数字的文件
- **风险等级**: 低 - 纯重构，不改变运行时行为
- **预计工作量**: 1-2 小时
