## Why

美国市场用户需要智能食物规划 + 快捷购物能力。现有电商集成仅支持中国平台（山姆、盒马、叮咚），需要新增 Instacart 集成，并增强智能时机触发能力，实现 AI 主动推荐周计划 → 用户对话调整 → 一键跳转 Instacart 下单的完整闭环。

## What Changes

### 新增功能

- **Instacart API 集成**: OAuth 授权、购物车 API、商品搜索 API
- **智能时机触发引擎**: 基于日历事件、消费周期、库存状态、行为习惯的多维度触发
- **周计划邮件通知**: 智能时机触发后发送周计划摘要邮件
- **全局悬浮 AI 助手**: 任意页面可呼出的对话式计划调整
- **食材→Instacart 商品匹配**: 将菜谱食材映射到 Instacart 商品

### 修改功能

- **电商集成模块**: 扩展支持 Instacart 平台
- **通知系统**: 新增周计划邮件模板

### 技术决策

- 单一平台深度集成（Instacart）
- 跳转平台结算（非应用内闭环）
- MVP 先用样品数据验证流程

## Impact

- Affected specs: `ecommerce-integration`, `meal-planning`, `notification-system`
- Affected code:
  - `src/lib/services/platforms/` - 新增 Instacart 服务
  - `src/lib/services/smart-trigger/` - 智能时机触发引擎
  - `src/components/features/ai-assistant/` - 全局悬浮助手
  - `src/app/api/instacart/` - Instacart API 端点
  - `prisma/schema.prisma` - 可能需要新增表
