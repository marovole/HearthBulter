# Shopping List Generation Specification

## Purpose

购物清单生成从食谱计划中自动提取食材，生成分类清单并支持电商SKU匹配。

---

## Requirements

### Requirement: Auto Extract Ingredients
系统必须（SHALL）从食谱自动提取食材并生成购物清单。

#### Scenario: Generate weekly shopping list
- **GIVEN** 用户生成了7天食谱
- **WHEN** 点击"生成购物清单"
- **THEN** 系统提取所有食材并去重
- **AND** 计算总重量（如鸡胸肉700g = 7天×100g）

#### Scenario: Categorize ingredients
- **GIVEN** 清单包含20种食材
- **WHEN** 系统生成清单
- **THEN** 自动分类为 蔬菜/肉类/谷物/调料
- **AND** 按类别分组显示

#### Scenario: Mark perishable items
- **GIVEN** 清单包含叶菜类
- **WHEN** 生成清单
- **THEN** 标注"建议3天内购买"
- **AND** 优先级排序

---

### Requirement: Budget Control
系统必须（SHALL）支持预算控制和成本估算。

#### Scenario: Set weekly budget
- **GIVEN** 用户设置预算500元/周
- **WHEN** 生成购物清单
- **THEN** 估算总成本（基于历史价格）
- **AND** 超预算时推荐替代食材

#### Scenario: Price comparison
- **GIVEN** 系统对接多个电商平台
- **WHEN** 用户查看某食材
- **THEN** 显示各平台价格对比
- **AND** 标注最优选择

#### Scenario: Track spending
- **GIVEN** 用户完成采购
- **WHEN** 标记清单为已购
- **THEN** 记录实际花费
- **AND** 更新预算余额

---

## Performance Requirements

#### Scenario: List generation speed
- **GIVEN** 7天食谱包含50种食材
- **WHEN** 生成购物清单
- **THEN** 在1秒内完成
- **AND** 实时更新界面
