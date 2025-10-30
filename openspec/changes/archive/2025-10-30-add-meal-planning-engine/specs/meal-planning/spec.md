# Meal Planning - Change Spec

## ADDED Requirements

### Requirement: Template-Based Meal Generation
系统必须（SHALL）基于模板生成7天食谱计划。

#### Scenario: Generate weekly meal plan
- **GIVEN** 成员目标减重，TDEE=1800 kcal/天
- **WHEN** 生成7天食谱
- **THEN** 系统分配每日1500 kcal（减重模式）
- **AND** 宏量比例为 碳水45% / 蛋白30% / 脂肪25%

#### Scenario: Consider allergies
- **GIVEN** 成员对海鲜过敏
- **WHEN** 生成食谱
- **THEN** 自动排除所有海鲜食材
- **AND** 用鸡肉/豆制品替代蛋白质来源

#### Scenario: Seasonal food priority
- **GIVEN** 当前为冬季
- **WHEN** 生成食谱
- **THEN** 优先推荐冬季时令食材（白菜、萝卜）
- **AND** 减少夏季食材（西瓜、黄瓜）

---

### Requirement: Macro Distribution
系统必须（SHALL）精确计算并分配宏量营养素。

#### Scenario: Calculate daily macros
- **GIVEN** 成员TDEE=2000 kcal，目标增肌
- **WHEN** 系统计算宏量分配
- **THEN** 蛋白质=150g（2g/kg体重）
- **AND** 碳水=200g（40%）
- **AND** 脂肪=67g（30%）

#### Scenario: Distribute across meals
- **GIVEN** 一日三餐 + 一次加餐
- **WHEN** 分配营养
- **THEN** 早餐30% / 午餐35% / 晚餐25% / 加餐10%
- **AND** 确保每餐蛋白质摄入≥20g

#### Scenario: Adjust for activity level
- **GIVEN** 成员今天运动量大（跑步10km）
- **WHEN** 重新计算TDEE
- **THEN** 额外增加400 kcal碳水补充
- **AND** 更新当日食谱

---

### Requirement: Meal Substitution
系统必须（SHALL）支持食材替换和食谱调整。

#### Scenario: Replace disliked food
- **GIVEN** 食谱包含西兰花，但成员不喜欢
- **WHEN** 用户请求替换
- **THEN** 推荐相似营养食材（菜花、芦笋）
- **AND** 保持宏量平衡

#### Scenario: Swap entire meal
- **GIVEN** 用户对某餐不满意
- **WHEN** 点击"换一份"
- **THEN** 生成营养相近的替代餐
- **AND** 保持当日总营养不变

#### Scenario: Lock favorite meals
- **GIVEN** 用户特别喜欢某份早餐
- **WHEN** 标记为"收藏"
- **THEN** 未来食谱优先包含此餐
- **AND** 可设置重复频率
