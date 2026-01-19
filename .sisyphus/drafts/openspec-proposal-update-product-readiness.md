# OpenSpec Proposal Draft — update-product-readiness

> 注意：当前为“规划草案”，用于后续运行 `/openspec-proposal` 时填充。已按 OpenSpec 结构组织。

## proposal.md (草案)

### Summary

本变更补齐预算分析/历史、食谱收藏与添加、健康报告 PDF 导出与图表预览、食物识别、Web Push 推送，并修复推荐引擎与 Supabase 适配层不兼容问题；同时统一环境变量命名并明确生产降级策略，确保功能完整且发布门禁可验证。

### Scope

**包含**

- 预算分析与历史记录功能落地
- 食谱收藏/固定/添加到计划
- 健康报告图表预览 + 前端 PDF 导出
- 推荐引擎与 Supabase 适配层兼容（去除 `as any`，补齐 join/orderBy/json 差异）
- 食物识别完整链路（识别→确认→落库）
- Web Push 订阅/发送/点击跳转
- 环境变量命名一致性与降级策略
- 质量门禁与验证流程

**不包含**

- 移动端推送（FCM/APNs）
- 后端 PDF 服务生成

### Constraints

- Web Push only
- PDF 前端生成
- USDA API 免费额度（每 IP 每小时 1000 次）足够
- Upstash Redis 设为可选依赖，未配置需降级

### Risks

- 推荐引擎兼容 Supabase 需要跨层改造
- PDF 导出与图表预览牵涉前端性能与依赖
- Web Push 涉及浏览器权限/用户授权体验

### Dependencies

- 现有 `refactor-database-layer-to-supabase` 变更进行中（12/43），需协调避免冲突

### Success Criteria

- 预算分析/历史、食谱收藏/添加、报告导出/预览、识别、推送均可用
- UI 无“开发中”占位
- `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build:cloudflare` 全部通过

---

## design.md (草案)

### Decision Drivers

- 兼容 Supabase 的推荐引擎需要数据访问抽象层
- PDF 前端生成需在性能与可维护性间取平衡
- Web Push 需确保授权/订阅/投递可追踪

### Architecture

- 推荐引擎：引入 RecommendationDataSource 接口，提供 Supabase 实现；统一 join/orderBy/json 查询语义
- 报告导出：前端生成 PDF（基于当前报告 HTML/图表模块），导出前提供预览与模块选择
- 推送系统：Web Push 订阅存储 → 发送队列 → 投递状态回写

### Alternatives Considered

- 服务端生成 PDF：复杂度高，暂不采用
- 移动端推送（FCM/APNs）：超出当前范围

---

## specs/<capability>/spec.md (草案)

### budget-optimization

```
## ADDED Requirements
### Requirement: Budget Analysis Dashboard
系统 SHALL 提供预算分类支出占比与趋势分析。

#### Scenario: 查看预算分析
- WHEN 用户进入预算分析
- THEN 显示分类支出占比、趋势图表与建议

### Requirement: Budget History
系统 SHALL 提供预算历史记录与对比。

#### Scenario: 查看历史记录
- WHEN 用户查看历史预算
- THEN 展示按周期（周/月/季/年）的预算与实际支出
```

### meal-planning

```
## ADDED Requirements
### Requirement: Favorites and Quick Add
系统 SHALL 支持食谱收藏与一键添加到计划。

#### Scenario: 收藏食谱
- WHEN 用户点击收藏
- THEN 该食谱进入收藏列表

#### Scenario: 添加到计划
- WHEN 用户点击“添加到计划”
- THEN 该食谱被写入指定日期与餐次
```

### health-analytics-reporting

```
## MODIFIED Requirements
### Requirement: Report Export
系统 SHALL 支持前端生成 PDF 导出，并提供图表预览。

#### Scenario: 导出 PDF
- WHEN 用户点击“导出 PDF”
- THEN 预览图表并下载 PDF 文件
```

### smart-recipe-recommendation

```
## MODIFIED Requirements
### Requirement: Supabase-Compatible Recommendation Engine
系统 SHALL 使用 Supabase 兼容的数据访问层运行推荐引擎。

#### Scenario: 推荐查询
- WHEN 用户请求推荐
- THEN 引擎执行无兼容性错误且返回完整推荐
```

### nutrition-tracking

```
## MODIFIED Requirements
### Requirement: Food Recognition Pipeline
系统 SHALL 支持食物图片识别到入库的完整链路。

#### Scenario: 识别与确认
- WHEN 识别完成
- THEN 提供结果确认后写入营养记录
```

### notification-system

```
## MODIFIED Requirements
### Requirement: Web Push Notifications
系统 SHALL 支持 Web Push 订阅、发送与点击跳转。

#### Scenario: 订阅推送
- WHEN 用户授权推送
- THEN 存储订阅并可发送通知
```

### deployment-migration

```
## MODIFIED Requirements
### Requirement: Env Naming Consistency
系统 SHALL 保证 env 示例、文档与代码命名一致。

#### Scenario: 配置校验
- WHEN 开发者根据文档配置
- THEN 可成功运行且不需额外映射
```

### code-quality

```
## MODIFIED Requirements
### Requirement: Log Hygiene in Production
系统 SHALL 在生产环境减少 console.log 噪音。

#### Scenario: 生产日志
- WHEN NODE_ENV=production
- THEN 仅保留 warn/error 或结构化日志
```

### testing

```
## MODIFIED Requirements
### Requirement: Release Gates
系统 SHALL 在发布前通过 lint/type-check/test/build:cloudflare。

#### Scenario: 发布门禁
- WHEN 合并到 main 前
- THEN 所有门禁命令通过
```

---

## tasks.md (草案)

```
## 1. Specification
- [ ] 1.1 创建 changes 目录与 proposal/tasks/design
- [ ] 1.2 为 9 个 specs 写 delta

## 2. Budget Analysis & History
- [ ] 2.1 后端统计与查询接口
- [ ] 2.2 前端分析/历史视图
- [ ] 2.3 测试覆盖

## 3. Meal Planning Favorites & Add Meal
- [ ] 3.1 收藏/取消收藏
- [ ] 3.2 添加到计划
- [ ] 3.3 计划生成权重

## 4. Health Report PDF & Chart Preview
- [ ] 4.1 图表预览
- [ ] 4.2 前端 PDF 导出
- [ ] 4.3 测试覆盖

## 5. Recommendation Engine Compatibility
- [ ] 5.1 Supabase 兼容数据访问层
- [ ] 5.2 修复 join/orderBy/json 差异
- [ ] 5.3 回归测试

## 6. Food Recognition
- [ ] 6.1 识别服务对接
- [ ] 6.2 低置信度兜底
- [ ] 6.3 测试覆盖

## 7. Web Push
- [ ] 7.1 订阅/存储
- [ ] 7.2 发送/点击跳转
- [ ] 7.3 状态回写

## 8. Env & Log Hygiene
- [ ] 8.1 统一命名
- [ ] 8.2 生产降噪
- [ ] 8.3 文档更新

## 9. Verification
- [ ] 9.1 pnpm lint
- [ ] 9.2 pnpm type-check
- [ ] 9.3 pnpm test
- [ ] 9.4 pnpm build:cloudflare
```
