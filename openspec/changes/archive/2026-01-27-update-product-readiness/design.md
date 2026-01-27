## Context

当前存在多处占位功能与数据层不兼容问题，需要补齐完整用户体验并保证生产可用。推荐引擎与 Supabase 适配存在 join/orderBy/JSON 查询差异，报告导出与推送涉及跨模块实现。

## Goals / Non-Goals

- Goals:
  - 完整实现预算分析/历史、收藏与添加、报告预览与 PDF 导出、识别、Web Push
  - 推荐引擎 Supabase 兼容，移除 `as any`
  - 明确 USDA 必需与 Upstash 可选降级策略
- Non-Goals:
  - 移动端推送（FCM/APNs）
  - 服务端 PDF 生成

## Decisions

- Recommendation Engine 使用数据访问抽象（RecommendationDataSource）实现 Supabase 兼容，补齐 include/join/orderBy/json 语义差异。
- 报告导出采用前端生成 PDF，并在导出前提供图表预览与模块选择。
- 推送仅支持 Web Push（Service Worker + Push API），包含订阅、发送与点击跳转。
- Upstash Redis 作为可选依赖，未配置时降级（缓存/限流退化或关闭）并记录原因。

## Risks / Trade-offs

- 推荐引擎适配会影响多个 API 路由，需与 `refactor-database-layer-to-supabase` 协调。
- 前端 PDF 导出可能引入性能成本，需要按需渲染并避免阻塞主线程。
- Web Push 在不同浏览器授权流程差异较大，需提供清晰提示。

## Migration Plan

1. 完成 OpenSpec 变更并通过 strict 校验。
2. 先修复推荐引擎数据访问层，再逐步落地 UI 与服务。
3. 引入前端 PDF 导出与 Web Push 订阅流程。
4. 统一 env 命名与降级策略后开启发布门禁验证。

## Open Questions

- 无（范围已确认）。
