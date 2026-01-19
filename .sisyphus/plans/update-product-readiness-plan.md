# OpenSpec 变更计划：产品完整功能实现（ULW）

## 1. 背景与范围

目标：补齐当前“开发中/占位”与关键后端空缺，达到完整可用的用户体验与可验证的生产就绪。

已确认的缺口（来自代码现状）：

- 预算：支出分析/历史记录为占位文案（`src/app/dashboard/budget/page.tsx:162`, `src/app/dashboard/budget/page.tsx:180`）。
- 食谱：收藏功能占位、添加餐食为 toast 占位（`src/app/meal-planning/page.tsx:355`, `src/components/meal-planning/MealCalendarView.tsx:234`）。
- 报告：PDF 导出占位、图表预览占位（`src/components/advisor/HealthReportViewer.tsx:179`, `src/components/advisor/HealthReportViewer.tsx:428`）。
- 推荐引擎：Supabase 适配器不兼容导致生产崩溃风险，且使用 `as any`（`src/app/api/recommendations/route.ts:2`）。
- 食物识别：存在 TODO 占位（`src/lib/services/tracking/food-recognition.ts:77`）。
- 推送通知：集成 TODO 占位（`src/lib/services/notification/notification-manager.ts:513`）。
- 环境变量命名不一致：`.env.example` 使用 `SUPABASE_SERVICE_KEY`，文档仍出现 `SUPABASE_SERVICE_ROLE_KEY`（`/Users/marovole/GitHub/HearthBulter/.env.example:9`, `/Users/marovole/GitHub/HearthBulter/docs/supabase-setup-guide.md:72`）。
- 生产环境强校验 USDA/Upstash 等（`src/lib/security/env-security.ts:35`），需明确“必需/可选”策略。

## 2. Change-id 建议

- `update-product-readiness`（推荐）
- `update-user-ready-features`
- `update-production-readiness-gates`

## 3. 受影响 Specs（来自 `openspec list --specs`）

- `budget-optimization`
- `meal-planning`
- `health-analytics-reporting`
- `smart-recipe-recommendation`
- `nutrition-tracking`
- `notification-system`
- `deployment-migration`
- `code-quality`
- `testing`

## 4. 成功标准（必须在实施前确认）

| 类型      | 描述                                                              | 例子                                                                             |
| --------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 功能      | 预算分析/历史可用，食谱收藏/添加可用，报告可导出 PDF 且有图表预览 | “点击导出 → PDF 下载成功”                                                        |
| 可观察    | UI 不再出现“开发中”占位，核心流程无运行时错误                     | 页面无占位文案/alert                                                             |
| Pass/Fail | 质量门禁全通过                                                    | `pnpm lint`、`pnpm type-check`、`pnpm test`、`pnpm build:cloudflare` 全部 0 失败 |

## 5. OpenSpec Proposal 交付物

创建目录：`openspec/changes/<change-id>/`

- `proposal.md`
- `tasks.md`
- `design.md`（建议：推荐引擎适配与 PDF 导出属于跨模块架构变更）
- `specs/<capability>/spec.md`（每个受影响能力一份 delta）

### 5.1 Delta 需求草案（示例片段，需在 proposal 中细化）

> 真实 delta 需按 OpenSpec 格式：`## ADDED|MODIFIED Requirements` + `#### Scenario:`。

**budget-optimization**

- ADDED: 预算历史、分类支出分析、趋势图表

**meal-planning**

- ADDED: 收藏、固定、快速添加到计划

**health-analytics-reporting**

- MODIFIED: 报告导出支持 PDF + 图表预览
- ADDED: 图表模块选择与预览确认

**smart-recipe-recommendation**

- MODIFIED: 推荐引擎数据层兼容 Supabase（去除 `as any`）

**nutrition-tracking**

- MODIFIED: 食物识别从占位变为可用（识别→确认→落库）

**notification-system**

- MODIFIED: 推送通知集成与投递状态

**deployment-migration / code-quality / testing**

- MODIFIED: 环境变量命名一致性、生产日志规范、发布门禁明确

## 6. Tasks.md 草案（分阶段）

```
## 1. Specification
- [ ] 1.1 确认 change-id，创建 changes 目录
- [ ] 1.2 为 9 个能力补齐 delta specs
- [ ] 1.3 评估并编写 design.md（推荐引擎 + PDF/图表链路）

## 2. Budget Analysis & History
- [ ] 2.1 后端统计/查询（预算历史、分类支出、趋势）
- [ ] 2.2 前端分析/历史 UI
- [ ] 2.3 预算相关测试

## 3. Meal Planning Favorites & Add Meal
- [ ] 3.1 收藏/取消收藏接口与存储
- [ ] 3.2 “添加餐食”接口与 UI
- [ ] 3.3 计划生成策略与收藏权重

## 4. Health Report PDF & Chart Preview
- [ ] 4.1 图表预览模块与数据绑定
- [ ] 4.2 PDF 导出实现（前端或服务端方案确认）
- [ ] 4.3 导出/预览测试

## 5. Recommendation Engine Compatibility
- [ ] 5.1 定义数据访问接口，替换 `as any`
- [ ] 5.2 修复 include/join/orderBy/JSON 查询差异
- [ ] 5.3 推荐 API 回归测试

## 6. Food Recognition Completion
- [ ] 6.1 识别服务对接（模型/外部 API）
- [ ] 6.2 低置信度兜底与人工纠正
- [ ] 6.3 测试覆盖

## 7. Push Notifications Completion
- [ ] 7.1 Web Push 订阅/存储
- [ ] 7.2 推送发送与点击跳转
- [ ] 7.3 发送失败/重试策略

## 8. Env Naming & Log Hygiene
- [ ] 8.1 统一 env 命名（代码/文档/示例）
- [ ] 8.2 生产环境日志降噪
- [ ] 8.3 门禁与文档更新

## 9. Verification
- [ ] 9.1 pnpm lint
- [ ] 9.2 pnpm type-check
- [ ] 9.3 pnpm test
- [ ] 9.4 pnpm build:cloudflare
```

## 7. 测试计划（执行模板）

### Objective

验证功能完成度与发布门禁通过。

### Prerequisites

- 完整生产/测试环境变量
- 推荐引擎/推送/识别所需第三方服务可用

### Test Cases

1. 预算分析/历史：UI 展示正确 → 数据一致 → 无报错
2. 食谱收藏/添加：收藏成功 → 计划可见 → 取消可生效
3. 报告导出：预览可见 → PDF 下载成功
4. 推荐引擎：接口稳定 → 无 500 → 结果完整
5. 识别/推送：功能链路端到端可用
6. 质量门禁：lint/type-check/test/build 全绿

### How to Execute

`pnpm lint`
`pnpm type-check`
`pnpm test`
`pnpm build:cloudflare`

## 8. 关键风险与依赖

- 推荐引擎与 Supabase 适配差异大，可能涉及数据访问层改造（需 design.md）。
- PDF 导出方案需确认（前端渲染 vs 服务端生成）。
- 推送与识别需要第三方服务或本地替代实现。

## 9. 未决问题（请确认）

1. 推送仅 Web Push 还是包含移动端（FCM/APNs）？
2. PDF 导出采用前端生成还是服务端生成？
3. USDA/Upstash 是否仍作为生产“必需”，还是支持降级？
4. Env 命名以 `.env.example` 为权威吗？

### 已确认

- USDA FoodData Central API：默认限流为每 IP 每小时 1000 次请求；免费额度认为足够。
- Upstash Redis：设为可选依赖，无配置时执行降级处理（缓存/限流退化或关闭，需记录降级原因）。

## 10. 关联的现有变更

- `refactor-database-layer-to-supabase`（当前进行中 12/43），与推荐引擎适配可能冲突，需协调。
