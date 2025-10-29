# Nutrition Database Specification

## Purpose

营养数据库是Health Butler的数据支撑核心，负责提供食物营养成分查询、食材信息管理和营养计算支持。该能力为食谱生成、营养分析和购物清单生成提供基础数据。

**能力范围**:
- 食物营养成分查询（宏量/微量营养素）
- 对接第三方营养数据库（USDA FoodData Central）
- 本地食物库管理与缓存
- 食材分类与标签系统
- 食物别名与搜索优化

---

## Requirements

### Requirement: Food Nutrition Query
系统必须（SHALL）提供准确的食物营养成分查询功能，支持多种查询方式。

#### Scenario: Search food by name
- **GIVEN** 用户在食谱编辑器中输入"鸡胸肉"
- **WHEN** 系统查询营养数据库
- **THEN** 返回鸡胸肉营养信息（每100g：蛋白质23g，脂肪1.2g，碳水0g）
- **AND** 显示热量165 kcal

#### Scenario: Get macro breakdown
- **GIVEN** 系统需要计算一份食谱的营养
- **WHEN** 请求多种食材的宏量营养素
- **THEN** 返回碳水/蛋白质/脂肪的详细数据
- **AND** 自动计算总热量（kcal）

#### Scenario: Food not found in database
- **GIVEN** 用户搜索"自制家常菜"
- **WHEN** 本地库和USDA库均未找到
- **THEN** 系统提示"未找到该食物，建议手动添加"
- **AND** 提供相似食物推荐（基于模糊匹配）

---

### Requirement: USDA API Integration
系统必须（SHALL）对接USDA FoodData Central API获取权威营养数据。

#### Scenario: Fetch data from USDA
- **GIVEN** 本地库中不存在"牛油果"
- **WHEN** 系统调用USDA API查询"avocado"
- **THEN** 获取完整营养数据并缓存到本地库
- **AND** 下次查询直接从本地返回（提高性能）

#### Scenario: Handle API rate limit
- **GIVEN** 系统已达到USDA API每小时限额（1000次）
- **WHEN** 新的查询请求到达
- **THEN** 系统返回本地缓存数据
- **AND** 显示提示"当前使用缓存数据，更新将在X分钟后恢复"

#### Scenario: Map Chinese to English food names
- **GIVEN** 用户输入中文食物名"西兰花"
- **WHEN** 系统需要查询USDA（英文库）
- **THEN** 自动翻译为"broccoli"并查询
- **AND** 返回结果时展示中英文名称

---

### Requirement: Local Food Library
系统必须（SHALL）维护本地食物数据库，包含常用中文食材和自定义食物。

#### Scenario: Admin adds custom food
- **GIVEN** 管理员需要添加"油条"（中式早餐，USDA无数据）
- **WHEN** 手动录入营养成分（每100g）
- **THEN** 系统保存到本地库
- **AND** 标记为"自定义食物"（区别于USDA数据）

#### Scenario: Update cached food data
- **GIVEN** 某食物缓存数据已过期（90天未更新）
- **WHEN** 用户查询该食物
- **THEN** 系统异步更新USDA数据
- **AND** 本次返回旧数据，下次返回新数据

#### Scenario: Food categories and tags
- **GIVEN** 食物库包含1000+种食材
- **WHEN** 用户按类别筛选"蔬菜类"
- **THEN** 返回所有蔬菜食材列表
- **AND** 支持进一步按标签筛选（如"低碳水"、"高蛋白"）

---

### Requirement: Nutrition Calculation
系统必须（SHALL）提供营养计算工具，支持多食材配比计算。

#### Scenario: Calculate meal nutrition
- **GIVEN** 一份食谱包含：米饭150g + 鸡胸肉100g + 西兰花50g
- **WHEN** 系统计算总营养
- **THEN** 返回总热量、宏量营养素和微量营养素总和
- **AND** 计算精度保留1位小数

#### Scenario: Portion size conversion
- **GIVEN** 食物数据库存储每100g的营养
- **WHEN** 用户查询200g鸡胸肉的营养
- **THEN** 系统自动按比例计算（蛋白质23g × 2 = 46g）
- **AND** 支持多种单位转换（g、kg、杯、勺）

#### Scenario: Micronutrient tracking
- **GIVEN** 用户查询某食物的维生素含量
- **WHEN** 请求微量营养素数据
- **THEN** 返回维生素A、C、D、钙、铁等关键营养素
- **AND** 标注每日推荐摄入量（RDA）百分比

---

### Requirement: Food Aliases and Search
系统必须（SHALL）支持食物别名和智能搜索，提升用户体验。

#### Scenario: Search with aliases
- **GIVEN** 用户输入"番茄"
- **WHEN** 系统搜索食物库
- **THEN** 同时匹配"西红柿"（别名）
- **AND** 返回相同食物记录

#### Scenario: Fuzzy search
- **GIVEN** 用户输入拼写错误"鸡xiong肉"
- **WHEN** 系统执行模糊搜索
- **THEN** 自动纠正为"鸡胸肉"并返回结果
- **AND** 提示"您可能在找：鸡胸肉"

#### Scenario: Popular foods quick access
- **GIVEN** 系统统计用户查询频率
- **WHEN** 用户打开食物选择器
- **THEN** 优先展示常用食材（Top 50）
- **AND** 减少搜索时间

---

## Data Quality Requirements

### Requirement: Nutrition Data Accuracy
系统必须（SHALL）确保营养数据的准确性和可信度。

#### Scenario: Validate USDA data
- **GIVEN** 从USDA API获取新食物数据
- **WHEN** 系统接收数据
- **THEN** 验证必需字段（calories, protein, carbs, fat）完整
- **AND** 拒绝不完整数据并记录日志

#### Scenario: Mark data source
- **GIVEN** 食物库包含多个数据来源（USDA、自定义、用户上传）
- **WHEN** 用户查看食物详情
- **THEN** 明确标注数据来源和最后更新时间
- **AND** USDA数据标记为"权威来源"

#### Scenario: User-reported data review
- **GIVEN** 用户提交自定义食物数据
- **WHEN** 系统接收提交
- **THEN** 标记为"待审核"状态
- **AND** 管理员审核通过后才能在公共库显示

---

## Performance Requirements

### Requirement: Query Response Time
食物查询必须（SHALL）在可接受时间内完成，确保流畅体验。

#### Scenario: Local cache hit
- **GIVEN** 食物已在本地缓存
- **WHEN** 用户查询该食物
- **THEN** 响应时间 <50ms
- **AND** 无需调用外部API

#### Scenario: USDA API call
- **GIVEN** 食物不在本地库
- **WHEN** 调用USDA API查询
- **THEN** 响应时间 <2s（包含网络延迟）
- **AND** 查询结果自动缓存

#### Scenario: Batch food query
- **GIVEN** 食谱包含10种食材
- **WHEN** 系统批量查询营养数据
- **THEN** 使用批量查询优化（单次请求）
- **AND** 总响应时间 <1s
