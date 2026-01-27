## ADDED Requirements

### Requirement: Smart Trigger Engine

系统 SHALL 基于多维度因素智能判断最佳时机，主动触发周计划推荐。

#### Scenario: 日历事件触发

- **WHEN** 检测到用户日历中有即将到来的事件（节日、生日、聚会）
- **THEN** 系统在事件前 3-5 天触发周计划推荐
- **AND** 推荐内容考虑事件类型（如生日蛋糕、节日大餐）

#### Scenario: 消费周期触发

- **WHEN** 用户距离上次购物已超过其平均购物周期
- **THEN** 系统触发周计划推荐
- **AND** 推荐内容基于用户历史购买偏好

#### Scenario: 库存状态触发

- **WHEN** 用户标记的库存中有多个食材即将过期或已用完
- **THEN** 系统触发周计划推荐
- **AND** 推荐内容优先使用即将过期的食材

#### Scenario: 行为习惯触发

- **WHEN** 当前时间接近用户历史上常用的规划时间（如周日下午）
- **THEN** 系统触发周计划推荐

#### Scenario: 触发冷却期

- **WHEN** 用户在过去 7 天内已收到过周计划推荐
- **THEN** 系统不再触发新的推荐
- **AND** 等待冷却期结束

### Requirement: Conversational Plan Adjustment

系统 SHALL 支持用户通过自然语言对话调整周计划。

#### Scenario: 替换菜品

- **WHEN** 用户说「把周三的晚餐换成不辣的」
- **THEN** AI 理解意图并推荐符合条件的替代菜品
- **AND** 用户确认后更新周计划

#### Scenario: 添加菜品

- **WHEN** 用户说「周六加一道海鲜」
- **THEN** AI 推荐适合的海鲜菜品
- **AND** 用户确认后添加到周计划

#### Scenario: 删除菜品

- **WHEN** 用户说「删掉周一的早餐」
- **THEN** AI 确认删除意图
- **AND** 用户确认后从周计划中移除

#### Scenario: 调整数量

- **WHEN** 用户说「这周要招待 6 个人」
- **THEN** AI 自动调整所有菜品的份量
- **AND** 更新购物清单中的食材数量

#### Scenario: 复杂调整

- **WHEN** 用户说「我这周想吃清淡点，少油少盐」
- **THEN** AI 分析当前周计划
- **AND** 推荐多个调整方案供用户选择

### Requirement: Global Floating AI Assistant

系统 SHALL 提供全局悬浮 AI 助手，用户可在任意页面呼出进行对话。

#### Scenario: 呼出助手

- **WHEN** 用户点击悬浮按钮或使用快捷键
- **THEN** 显示 AI 助手对话框
- **AND** 保持之前的对话上下文

#### Scenario: 收起助手

- **WHEN** 用户点击关闭按钮或点击对话框外部
- **THEN** 助手收起为悬浮按钮
- **AND** 对话上下文保持不丢失

#### Scenario: 跨页面保持

- **WHEN** 用户在助手打开状态下切换页面
- **THEN** 助手保持打开状态
- **AND** 对话内容不丢失
