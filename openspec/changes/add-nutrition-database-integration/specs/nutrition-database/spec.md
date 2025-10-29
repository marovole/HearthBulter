# Nutrition Database - Change Spec

## ADDED Requirements

### Requirement: Food Nutrition Query
系统必须（SHALL）提供准确的食物营养成分查询功能。

#### Scenario: Search food by name
- **GIVEN** 用户输入"鸡胸肉"
- **WHEN** 系统查询营养数据库
- **THEN** 返回鸡胸肉营养信息（每100g：蛋白质23g，脂肪1.2g，碳水0g）
- **AND** 显示热量165 kcal

#### Scenario: Get macro breakdown
- **GIVEN** 系统需要计算食谱营养
- **WHEN** 请求多种食材的宏量营养素
- **THEN** 返回碳水/蛋白质/脂肪详细数据
- **AND** 自动计算总热量

#### Scenario: Food not found
- **GIVEN** 用户搜索不存在的食物
- **WHEN** 本地库和USDA库均未找到
- **THEN** 系统提示"未找到该食物"
- **AND** 提供相似食物推荐

---

### Requirement: USDA API Integration
系统必须（SHALL）对接USDA FoodData Central API。

#### Scenario: Fetch data from USDA
- **GIVEN** 本地库不存在"牛油果"
- **WHEN** 系统调用USDA API
- **THEN** 获取完整营养数据并缓存
- **AND** 下次查询直接返回本地数据

#### Scenario: Handle API rate limit
- **GIVEN** 系统已达USDA API限额
- **WHEN** 新查询到达
- **THEN** 返回本地缓存数据
- **AND** 显示提示"当前使用缓存数据"

#### Scenario: Map Chinese to English
- **GIVEN** 用户输入"西兰花"
- **WHEN** 查询USDA
- **THEN** 自动翻译为"broccoli"
- **AND** 返回中英文名称

---

### Requirement: Nutrition Calculation
系统必须（SHALL）提供营养计算工具。

#### Scenario: Calculate meal nutrition
- **GIVEN** 一份食谱包含：米饭150g + 鸡胸肉100g
- **WHEN** 系统计算总营养
- **THEN** 返回总热量和宏量营养素总和
- **AND** 精度保留1位小数

#### Scenario: Portion size conversion
- **GIVEN** 数据库存储每100g营养
- **WHEN** 用户查询200g鸡胸肉
- **THEN** 系统按比例计算
- **AND** 支持多种单位转换

#### Scenario: Micronutrient tracking
- **GIVEN** 用户查询某食物维生素含量
- **WHEN** 请求微量营养素数据
- **THEN** 返回维生素A、C、D、钙、铁
- **AND** 标注每日推荐摄入量百分比
