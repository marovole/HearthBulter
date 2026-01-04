## Why

多个 API 路由文件过长（超过 200 行），违反了 Clean Code 的单一职责原则：

- `src/app/api/ai/chat/route.ts` 约 270 行，包含认证、速率限制、同意检查、消息处理、响应生成等多个职责
- 长函数难以理解、测试和维护
- 重复的认证和验证逻辑散落在各个路由中

## What Changes

- **重构** `ai/chat/route.ts` 为多个独立的中间件和处理函数
- **抽取** 通用的认证检查逻辑到 `lib/middleware/auth-middleware.ts`
- **抽取** 速率限制逻辑到独立的中间件
- **抽取** 同意检查逻辑到独立的服务
- **创建** API 路由组合模式，支持中间件链式调用

**主要重构目标**：

- 每个函数不超过 50 行
- 每个文件不超过 150 行
- 职责单一，易于单元测试

## Impact

- **Affected specs**: `code-quality`
- **Affected code**:
  - `src/app/api/ai/chat/route.ts` - 主要重构目标
  - `src/app/api/ai/*.ts` - 类似模式的路由
  - `src/lib/middleware/` - 新增中间件文件
- **风险等级**: 中 - 需要仔细测试 API 行为不变
- **预计工作量**: 3-4 小时
