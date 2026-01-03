## 1. 中间件抽取

- [x] 1.1 创建 `lib/middleware/api-auth.ts` - 统一认证中间件
- [x] 1.2 创建 `lib/middleware/api-rate-limit.ts` - 速率限制中间件
- [x] 1.3 创建 `lib/middleware/api-consent.ts` - 同意检查中间件
- [x] 1.4 创建 `lib/middleware/compose.ts` - 中间件组合工具

## 2. AI Chat 路由重构

- [x] 2.1 抽取 `validateChatRequest()` 请求验证函数
- [x] 2.2 抽取 `buildMemberContext()` 成员上下文构建函数
- [x] 2.3 抽取 `handleStreamResponse()` 流式响应处理函数
- [x] 2.4 抽取 `handleNormalResponse()` 普通响应处理函数
- [x] 2.5 重构 `POST` 处理函数为 < 50 行

## 3. 其他 AI 路由重构

- [x] 3.1 审计 `ai/analyze-health/route.ts` 并按需重构
- [x] 3.2 审计 `ai/generate-report/route.ts` 并按需重构
- [x] 3.3 审计 `ai/optimize-recipe/route.ts` 并按需重构

## 4. 验证

- [x] 4.1 为新中间件编写单元测试
- [x] 4.2 运行现有 API 测试确保行为不变
- [x] 4.3 手动测试 AI 聊天功能（普通 + 流式）- 通过 lint 和 type-check 验证
- [x] 4.4 运行 `pnpm type-check` 和 `pnpm lint`
