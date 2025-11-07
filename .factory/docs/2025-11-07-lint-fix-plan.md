计划概览：
1. 修复 CommonJS 导入：
   - `src/__tests__/api/nutrition/meal-planning.test.ts` 中将 `require('@/lib/services/nutrition-calculator')` 换成 ESM `import * as nutritionCalculator ...`，并确保引用保持一致。
   - `src/__tests__/social/achievement-system.test.ts` 与 `src/__tests__/social/share-generator.test.ts` 改为 `import { PrismaClient } from '@prisma/client'`（或 `import * as Prisma`）后直接实例化，去掉 `require`。
   - 验证 jest.mock 仍然正确返回模拟对象，必要时为 `PrismaClient` 实例声明明确类型。

2. Dashboard 性能测试文件的 ESLint 修复：
   - 在 `src/__tests__/performance/dashboard.performance.test.tsx` 中为 `MockHeavyComponent`、`VirtualList`、`MeasuredComponent`（HOC 返回组件）显式设置 `displayName`，避免 `react/display-name`。
   - 用具名函数或类型别名替换 `Function`，实现泛型 `debounce<T extends any[]>(fn: (...args: T) => Promise<unknown> | void, delay: number)` 等写法，去除 `@typescript-eslint/no-unsafe-function-type`。
   - 提取 `VirtualListProps`、`MemoizedComponentProps` 等接口，减少 `any` 使用，保证类型推断清晰。

3. 移除 `permissions` 中的 namespace：
   - 在 `src/middleware/permissions.ts` 删除 `declare global { namespace NodeJS { ... } }`，改为局部类型声明（例如 `type PermissionEnv = NodeJS.ProcessEnv & { NEXTAUTH_SECRET?: string }`）或直接依赖 `process.env`，以满足 `@typescript-eslint/no-namespace`。
   - 确保无额外副作用，相关注释同步更新。

4. 验证与收尾：
   - 运行 `npm run lint --fix` 确认 ESLint 通过。
   - 若时间允许再执行 `npm run build` 以确保构建未受影响。
   - 根据结果更新 TODO 或向用户报告剩余警告（如未使用变量、console 仍为警告）。