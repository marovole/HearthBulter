# Health Data Collection - Change Spec

## ADDED Requirements

### Requirement: Manual Health Data Entry
系统必须（SHALL）支持用户手动录入多种健康指标。

#### Scenario: Record daily weight
- **GIVEN** 成员在早晨测量体重75.2kg
- **WHEN** 打开Health Butler并录入体重
- **THEN** 系统保存数据并自动关联当前时间戳
- **AND** 计算与上次测量的变化（如 +0.3kg）

#### Scenario: Record blood pressure
- **GIVEN** 成员测量血压120/80 mmHg
- **WHEN** 录入收缩压120和舒张压80
- **THEN** 系统验证数值在合理范围内（60-200）
- **AND** 标注健康状态为"正常"

#### Scenario: Invalid data is rejected
- **GIVEN** 用户尝试录入体重500kg
- **WHEN** 提交数据
- **THEN** 系统显示错误"体重超出合理范围（20-300kg）"
- **AND** 数据不被保存

---

### Requirement: Historical Data Query
系统必须（SHALL）提供历史数据查询和趋势可视化。

#### Scenario: View weekly weight trend
- **GIVEN** 成员过去7天每天记录体重
- **WHEN** 查看体重趋势图
- **THEN** 系统展示折线图显示每日变化
- **AND** 计算平均值和标准差

#### Scenario: Compare month-over-month
- **GIVEN** 成员查询最近3个月数据
- **WHEN** 选择时间范围
- **THEN** 系统生成对比分析报告
- **AND** 标注关键变化点（如体重突增）

#### Scenario: Export data for medical use
- **GIVEN** 成员需要向医生提供健康数据
- **WHEN** 点击"导出数据"
- **THEN** 系统生成PDF报告包含所有健康指标
- **AND** 包含时间线和统计摘要

---

### Requirement: Data Validation
系统必须（SHALL）验证输入数据的有效性和合理性。

#### Scenario: Detect anomaly data
- **GIVEN** 成员昨天体重75kg，今天录入50kg
- **WHEN** 系统接收数据
- **THEN** 显示警告"数据异常：体重骤降25kg，请确认"
- **AND** 要求用户二次确认

#### Scenario: Required fields validation
- **GIVEN** 用户尝试仅录入体重而不选择成员
- **WHEN** 提交表单
- **THEN** 系统提示"请选择要记录的成员"
- **AND** 阻止提交

---

### Requirement: Reminder System
系统必须（SHALL）提醒用户定期记录健康数据。

#### Scenario: Daily weight reminder
- **GIVEN** 用户设置每天早上8点体重提醒
- **WHEN** 时间到达
- **THEN** 系统发送通知"该记录今天的体重了"
- **AND** 用户可一键打开录入界面

#### Scenario: Streak tracking
- **GIVEN** 用户连续7天记录数据
- **WHEN** 第7天完成记录
- **THEN** 系统显示庆祝消息"连续打卡7天！"
- **AND** 鼓励用户继续保持习惯
