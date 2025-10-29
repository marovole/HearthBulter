# Health Tracking Dashboard Specification

## Purpose

健康追踪仪表盘提供可视化图表和数据分析，帮助用户直观了解健康趋势。

---

## Requirements

### Requirement: Weight Trend Visualization
系统必须（SHALL）可视化体重变化趋势。

#### Scenario: View 30-day weight chart
- **GIVEN** 成员过去30天有体重记录
- **WHEN** 打开仪表盘
- **THEN** 显示折线图展示每日体重
- **AND** 标注最高/最低点

#### Scenario: Compare with goal
- **GIVEN** 成员目标减重至70kg
- **WHEN** 查看趋势
- **THEN** 图表显示目标线
- **AND** 标注当前进度百分比

#### Scenario: Identify anomalies
- **GIVEN** 某天体重突增3kg
- **WHEN** 系统分析数据
- **THEN** 高亮异常点
- **AND** 提示可能原因

---

### Requirement: Nutrition Intake Analysis
系统必须（SHALL）分析营养摄入是否达标。

#### Scenario: Daily macro breakdown
- **GIVEN** 用户查看昨日营养摄入
- **WHEN** 打开营养分析页
- **THEN** 显示环形图：碳水45% / 蛋白30% / 脂肪25%
- **AND** 对比目标比例

#### Scenario: Detect macro imbalance
- **GIVEN** 用户连续7天蛋白质不足
- **WHEN** 系统分析
- **THEN** 显示警告"蛋白质摄入偏低"
- **AND** 推荐高蛋白食材

#### Scenario: Weekly summary report
- **GIVEN** 用户完成一周食谱
- **WHEN** 周日晚上
- **THEN** 自动生成周报
- **AND** 包含营养达标率、体重变化、建议改进

---

### Requirement: Health Score
系统必须（SHALL）计算综合健康评分。

#### Scenario: Calculate health score
- **GIVEN** 系统收集了多维度数据（体重、睡眠、运动）
- **WHEN** 计算健康评分
- **THEN** 生成0-100分数值
- **AND** 显示各维度贡献

#### Scenario: Track score changes
- **GIVEN** 用户坚持21天
- **WHEN** 对比初始评分
- **THEN** 显示评分提升曲线
- **AND** 庆祝里程碑

#### Scenario: Personalized insights
- **GIVEN** 系统分析用户数据
- **WHEN** 生成洞察
- **THEN** 提供个性化建议"增加有氧运动可提升5分"
- **AND** 推荐行动计划

---

## Performance Requirements

#### Scenario: Dashboard load time
- **GIVEN** 用户打开仪表盘
- **WHEN** 页面加载
- **THEN** 首屏渲染 <1.5s
- **AND** 图表动画流畅（60fps）
