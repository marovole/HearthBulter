## MODIFIED Requirements

### Requirement: Meal Check-in
系统 SHALL 允许用户记录每日三餐实际摄入，并使用 Supabase Client 查询 nutrition_database 和 meal_records 表。

#### Scenario: 记录早餐
- **WHEN** 用户吃完早餐并点击「记录早餐」
- **THEN** 可选择食物、调整份量并保存到 Supabase 数据库

#### Scenario: 搜索食物
- **WHEN** 用户输入「鸡蛋」
- **THEN** 查询 Supabase nutrition_database 表，显示相关食物列表（煮鸡蛋、炒鸡蛋、蛋花汤等）

#### Scenario: 调整份量
- **WHEN** 用户选择「鸡蛋」
- **THEN** 从 Supabase 获取营养数据，可调整数量（1个、2个、3个）并实时显示营养值

#### Scenario: 快速添加
- **WHEN** 用户点击「最近吃过」
- **THEN** 查询 Supabase meal_records 表，显示最近7天常吃的食物供快速选择

### Requirement: Real-time Nutrition Progress
系统 SHALL 实时显示当日营养摄入进度，查询 Supabase meal_records 和 nutrition_goals 表，并使用 KV/DB 三层缓存架构。

#### Scenario: 查看进度
- **WHEN** 用户记录餐饮后
- **THEN** 查询 Supabase meal_records、nutrition_goals 表，更新当日营养进度条（蛋白质50/100g，碳水150/250g）

#### Scenario: 目标达成
- **WHEN** 某营养素达到目标值
- **THEN** 进度条变绿并显示「已达标✓」

#### Scenario: 超标提醒
- **WHEN** 某营养素超过目标值20%
- **THEN** 进度条变红并提示「碳水已超标30g」

#### Scenario: 剩余餐次建议
- **WHEN** 查看进度
- **THEN** 查询 Supabase 计算剩余建议摄入量，显示「晚餐建议摄入：蛋白质40g，碳水80g」
