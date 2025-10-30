# nutrition-tracking Specification

## Purpose
TBD - created by archiving change add-nutrition-tracking. Update Purpose after archive.
## Requirements
### Requirement: Meal Check-in
The system SHALL allow users to record daily meal intake.

系统应当允许用户记录每日三餐实际摄入。

#### Scenario: 记录早餐
- **WHEN** 用户吃完早餐并点击「记录早餐」
- **THEN** 可选择食物、调整份量并保存

#### Scenario: 搜索食物
- **WHEN** 用户输入「鸡蛋」
- **THEN** 显示相关食物列表（煮鸡蛋、炒鸡蛋、蛋花汤等）

#### Scenario: 调整份量
- **WHEN** 用户选择「鸡蛋」
- **THEN** 可调整数量（1个、2个、3个）并实时显示营养值

#### Scenario: 快速添加
- **WHEN** 用户点击「最近吃过」
- **THEN** 显示最近7天常吃的食物供快速选择

### Requirement: Food Photo Recognition
The system SHALL support photo recognition for automatic food logging.

系统应当支持拍照识别食物并自动记录。

#### Scenario: 上传食物照片
- **WHEN** 用户拍摄食物照片并上传
- **THEN** AI识别食物种类和估算份量

#### Scenario: 识别结果确认
- **WHEN** 识别完成
- **THEN** 显示识别结果（如「番茄炒蛋，约200g」）供用户确认或修正

#### Scenario: 低置信度提示
- **WHEN** 识别置信度<70%
- **THEN** 提示「识别可能不准确，请手动确认」

#### Scenario: 识别失败
- **WHEN** 无法识别食物
- **THEN** 提示用户手动搜索添加

### Requirement: Real-time Nutrition Progress
The system SHALL display real-time daily nutrition intake progress.

系统应当实时显示当日营养摄入进度。

#### Scenario: 查看进度
- **WHEN** 用户记录餐饮后
- **THEN** 更新当日营养进度条（蛋白质50/100g，碳水150/250g）

#### Scenario: 目标达成
- **WHEN** 某营养素达到目标值
- **THEN** 进度条变绿并显示「已达标✓」

#### Scenario: 超标提醒
- **WHEN** 某营养素超过目标值20%
- **THEN** 进度条变红并提示「碳水已超标30g」

#### Scenario: 剩余餐次建议
- **WHEN** 查看进度
- **THEN** 显示「晚餐建议摄入：蛋白质40g，碳水80g」

### Requirement: Deviation Analysis
The system SHALL analyze nutrition intake deviations and provide adjustment recommendations.

系统应当分析营养摄入偏差并提供调整建议。

#### Scenario: 检测偏差
- **WHEN** 连续3天蛋白质摄入<目标值80%
- **THEN** 标记为「蛋白质摄入不足」

#### Scenario: 偏差警告
- **WHEN** 发现营养偏差
- **THEN** 在仪表盘显示警告卡片并提供建议

#### Scenario: 周期性报告
- **WHEN** 每周日晚上
- **THEN** 生成本周营养偏差分析报告

#### Scenario: 调整建议
- **WHEN** 查看偏差详情
- **THEN** 提供具体建议（如「增加鸡蛋、豆制品摄入」）

### Requirement: Quick Templates
The system SHALL support quick logging templates to improve efficiency.

系统应当支持快速记录模板以提高效率。

#### Scenario: 创建模板
- **WHEN** 用户将某次早餐保存为模板
- **THEN** 命名为「工作日标准早餐」

#### Scenario: 使用模板
- **WHEN** 用户点击「标准早餐」模板
- **THEN** 一键添加该模板的所有食物

#### Scenario: 智能推荐模板
- **WHEN** 早上8点打开打卡界面
- **THEN** 自动推荐常用的早餐模板

#### Scenario: 编辑模板
- **WHEN** 用户点击「编辑模板」
- **THEN** 可修改食物种类和份量

### Requirement: Tracking History
The system SHALL record and display check-in history.

系统应当记录并展示打卡历史。

#### Scenario: 查看日历
- **WHEN** 用户访问打卡日历
- **THEN** 显示每天的打卡状态（✓已打卡，×未打卡）

#### Scenario: 查看历史详情
- **WHEN** 用户点击某天
- **THEN** 显示当天所有餐饮记录和营养统计

#### Scenario: 编辑历史记录
- **WHEN** 用户发现某条记录有误
- **THEN** 可编辑或删除该记录

#### Scenario: 打卡率统计
- **WHEN** 查看统计数据
- **THEN** 显示本周打卡率（5/7天，71%）

### Requirement: Streak Tracking
The system SHALL track consecutive check-in days and motivate users.

系统应当追踪连续打卡天数并激励用户。

#### Scenario: 连续打卡
- **WHEN** 用户连续7天打卡
- **THEN** 显示「🔥 7天连续打卡」徽章

#### Scenario: 里程碑奖励
- **WHEN** 达到30天连续打卡
- **THEN** 弹出祝贺动画和特殊徽章

#### Scenario: 断连提醒
- **WHEN** 当天未打卡且连续打卡>7天
- **THEN** 晚上9点推送「别让连续打卡中断哦」

#### Scenario: 成就展示
- **WHEN** 用户查看成就
- **THEN** 显示所有获得的徽章和最长连续天数

### Requirement: Additional Tracking
The system SHALL support water intake, exercise, and other auxiliary tracking.

系统应当支持饮水、运动等辅助打卡。

#### Scenario: 饮水打卡
- **WHEN** 用户点击「喝水+250ml」
- **THEN** 累加到今日饮水量并显示进度

#### Scenario: 运动打卡
- **WHEN** 用户记录跑步30分钟
- **THEN** 估算消耗300kcal并更新热量平衡

#### Scenario: 体重打卡
- **WHEN** 用户每天早上称重
- **THEN** 记录体重并更新趋势曲线

#### Scenario: 统一视图
- **WHEN** 用户查看今日打卡
- **THEN** 在一个页面显示餐饮、饮水、运动、体重等所有数据

### Requirement: Smart Reminders
The system SHALL provide intelligent reminders for user check-ins.

系统应当智能提醒用户打卡。

#### Scenario: 定时提醒
- **WHEN** 到达打卡时间（早8点、午12点、晚6点）
- **THEN** 推送「该记录早餐啦」提醒

#### Scenario: 未打卡提醒
- **WHEN** 超过打卡时间2小时仍未记录
- **THEN** 再次提醒「还没记录午餐哦」

#### Scenario: 营养不足提醒
- **WHEN** 晚餐前发现蛋白质严重不足
- **THEN** 提示「今日蛋白质还差40g，晚餐建议吃...」

#### Scenario: 自定义提醒
- **WHEN** 用户设置提醒时间
- **THEN** 按照用户设定的时间推送

