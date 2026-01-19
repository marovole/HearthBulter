## ADDED Requirements

### Requirement: Favorite Meal Library

系统 SHALL 提供收藏食谱的管理与浏览能力。

#### Scenario: 查看收藏列表

- **WHEN** 用户进入收藏页
- **THEN** 展示收藏食谱列表与筛选条件

#### Scenario: 取消收藏

- **WHEN** 用户在收藏列表取消某食谱
- **THEN** 列表中移除该食谱且不再优先推荐

### Requirement: Quick Add to Meal Plan

系统 SHALL 支持将食谱快速添加到指定日期与餐次。

#### Scenario: 快速添加

- **WHEN** 用户点击“添加到计划”
- **THEN** 选择日期与餐次并写入计划

#### Scenario: 冲突处理

- **WHEN** 目标日期餐次已有内容
- **THEN** 提示替换或新增并保留用户选择
