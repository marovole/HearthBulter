## Why

多个用户可见功能仍处于占位或不完整状态（预算分析/历史、食谱收藏与添加、报告导出与预览、食物识别、推送），且推荐引擎与 Supabase 适配存在不兼容风险。需要统一补齐功能链路并明确生产依赖策略，以满足完整可用与可验证发布门禁。

## What Changes

- 补齐预算分析与历史记录视图及相关统计数据
- 完成食谱收藏与一键添加到计划功能
- 实现报告图表预览与前端 PDF 导出
- 修复推荐引擎与 Supabase 适配层兼容性
- 完成食物识别链路（识别→确认→落库）
- Web Push 订阅、发送与点击跳转
- 统一环境变量命名并明确 USDA 必需、Upstash 可选降级策略
- 新增发布门禁验证要求（lint/type-check/test/build:cloudflare）

## Impact

- Affected specs: budget-optimization, meal-planning, health-analytics-reporting, smart-recipe-recommendation, nutrition-tracking, notification-system, deployment-migration, code-quality, testing
- Affected code: 预算与食谱计划页面、报告导出组件、推荐引擎与数据访问层、食物识别服务、通知系统、环境变量文档与校验
- Related changes: refactor-database-layer-to-supabase（需协调推荐引擎数据访问层改造）
