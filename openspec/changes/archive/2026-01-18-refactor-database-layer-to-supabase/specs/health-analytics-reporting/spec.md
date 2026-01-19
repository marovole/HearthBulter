## MODIFIED Requirements

### Requirement: Trend Analysis
系统 SHALL 分析健康数据长期趋势并可视化，使用 Supabase 查询 health_records 表和 v_analytics_trends 视图，迁移 Trend Analyzer 服务。

#### Scenario: View weight trend data
- **WHEN** 用户访问「体重趋势」页面
- **THEN** 查询 Supabase v_analytics_trends 视图（Materialized View），返回过去30天的体重数据并标注目标体重线

#### Scenario: Multi-metric comparison
- **WHEN** 用户选择「体重」和「体脂率」进行对比
- **THEN** 查询 Supabase health_records 表，使用 time series 聚合，在同一图表中显示两条趋势线

#### Scenario: Trend prediction with linear regression
- **WHEN** 数据点足够（>7天）
- **THEN**: 迁移 TrendAnalyzer.predictFuture() 方法，使用 Supabase 查询历史数据并应用线性回归算法，显示未来7天的预测趋势

#### Scenario: Year-over-year analysis
- **WHEN** 用户查看本月数据
- **THEN**: 查询 Supabase health_records 表，对比上月同期数据，计算并显示变化百分比

### Requirement: Automated Report Generation
系统 SHALL 自动生成定期健康报告，查询 Supabase health_records、nutrition_records、exercise_records 表，生成报告并保存到 Storage。

#### Scenario: Auto-generate weekly reports
- **WHEN** 每周日晚上8点触发定时任务
- **THEN**: 查询 Supabase health_records、nutrition_records、exercise_records 表，汇总数据生成本周健康周报，保存到 supabase storage 并通知用户

#### Scenario: Manual generate monthly report
- **WHEN** 用户点击「生成月报」
- **THEN**: 查询 Supabase 本月数据，使用 ReportGenerator.generate() 方法生成完整报告

#### Scenario: Report content
- **WHEN** 查看报告
- **THEN**: 查询 Supabase 多个数据表（health_records、nutrition_records、achievement_records），生成包含数据汇总、趋势图表、健康评分、改进建议的报告

#### Scenario: Report history
- **WHEN** 用户访问「报告中心」
- **THEN**: 查询 Supabase generated_reports 表，按时间倒序显示所有历史报告列表

### Requirement: Performance Optimization
系统 SHALL 优化大规模历史数据集的查询和分析性能，保持 KV/DB/View 三层缓存架构，使用 Supabase 分页和查询缓存。

#### Scenario: Data caching with KV and DB
- **WHEN** 用户多次查询同一时间范围的趋势
- **THEN**: 使用 KV 缓存（Redis）+ DB 查询缓存（Supabase），确保响应时间<500ms

#### Scenario: Virtual scroll for large data
- **WHEN** 查询超过1年的历史数据
- **THEN**: 使用 Supabase pagination（limit/offset），实现虚拟滚动加载

#### Scenario: Pre-generated report caching
- **WHEN** 定时任务触发
- **THEN**: 查询 Supabase 生成常用报告，保存到 cache 并上传至 Supabase Storage，用户访问时直接返回缓存

### Requirement: Correlation Analysis
系统 SHALL 分析健康指标之间的相关性，使用 Supabase 查询和 SQL 窗口函数计算 Pearson correlation 系数，生成相关性图表。

#### Scenario: Nutrition and weight correlation
- **WHEN** 用户查看「营养分析」
- **THEN**: 查询 Supabase health_records 和 nutrition_records 表，使用 Pearson correlation 计算碳水摄入量与体重变化的相关性，生成相关性图表

#### Scenario: Exercise and sleep correlation
- **WHEN** 数据足够（>30天）
- **THEN**: 查询 Supabase exercise_records 和 sleep_records 表，分析运动量对睡眠质量的影响

#### Scenario: Insight prompts
- **WHEN** 发现强相关性（相关系数>0.7）
- **THEN**: 在分析结果中提示「您的体重变化与碳水摄入高度相关」
