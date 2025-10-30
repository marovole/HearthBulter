# Specification: Budget Optimization

## ADDED Requirements

### Requirement: Budget Setting and Tracking
系统应当允许用户设定并追踪饮食预算。

#### Scenario: 设定周预算
- **WHEN** 用户设定周预算为500元
- **THEN** 系统记录预算并开始追踪支出

#### Scenario: 分类预算
- **WHEN** 用户设定蔬菜预算100元、肉类预算200元
- **THEN** 分别追踪各类别支出

#### Scenario: 实时预算显示
- **WHEN** 用户查看预算状态
- **THEN** 显示已使用金额、剩余金额、使用百分比

#### Scenario: 自动记录支出
- **WHEN** 用户通过系统下单
- **THEN** 自动记录支出并更新预算余额

### Requirement: Cost Optimization
系统应当在满足营养目标的前提下优化采购成本。

#### Scenario: 最小化总成本
- **WHEN** 生成购物清单
- **THEN** 选择满足营养目标的最便宜食材组合

#### Scenario: 营养约束
- **WHEN** 进行成本优化
- **THEN** 确保蛋白质、碳水、脂肪等营养素达标

#### Scenario: 显示优化结果
- **WHEN** 优化完成
- **THEN** 显示原始成本、优化后成本、节省金额

#### Scenario: 食材替换建议
- **WHEN** 某高价食材可替换
- **THEN** 推荐营养相似的平价替代品

### Requirement: Cross-Platform Price Comparison
系统应当比较各平台价格并推荐最优选择。

#### Scenario: 单品价格对比
- **WHEN** 查看「鸡胸肉」
- **THEN** 显示各平台价格及单位价格（元/kg）

#### Scenario: 综合成本计算
- **WHEN** 比较总成本
- **THEN** 包含商品价格、运费、满减等因素

#### Scenario: 最优平台推荐
- **WHEN** 用户点击「成本最优方案」
- **THEN** 推荐总成本最低的平台组合

#### Scenario: 组合购买优化
- **WHEN** 不同食材在不同平台更便宜
- **THEN** 推荐分平台购买方案并显示节省金额

### Requirement: Price History and Trends
系统应当追踪食材价格历史并预测趋势。

#### Scenario: 查看价格历史
- **WHEN** 用户查看「鸡胸肉」价格
- **THEN** 显示过去30天的价格曲线

#### Scenario: 价格趋势预测
- **WHEN** 数据足够
- **THEN** 预测未来7天价格走势

#### Scenario: 价格异常提醒
- **WHEN** 某食材价格上涨>20%
- **THEN** 推送提醒并建议延后购买或替换

#### Scenario: 最佳购买时机
- **WHEN** 某食材价格处于历史低位
- **THEN** 提示「当前价格较低，建议购买」

### Requirement: Savings Recommendations
系统应当主动推荐节省方案。

#### Scenario: 促销商品推荐
- **WHEN** 检测到平台促销
- **THEN** 推荐使用促销商品的食谱

#### Scenario: 团购建议
- **WHEN** 某食材团购价格低20%
- **THEN** 建议参与团购并提示团购规则

#### Scenario: 季节性替代
- **WHEN** 某食材不是当季
- **THEN** 推荐当季平价替代品

#### Scenario: 批量采购建议
- **WHEN** 某食材频繁使用
- **THEN** 建议批量采购并计算节省金额

### Requirement: Spending Analysis
系统应当分析用户饮食支出并生成报告。

#### Scenario: 月度支出统计
- **WHEN** 用户查看支出分析
- **THEN** 显示本月总支出、日均支出、分类支出占比

#### Scenario: 支出趋势
- **WHEN** 查看历史数据
- **THEN** 显示过去6个月的支出曲线

#### Scenario: 高支出分析
- **WHEN** 某品类支出占比>50%
- **THEN** 标注为「高支出品类」并提供优化建议

#### Scenario: 人均成本
- **WHEN** 有多个家庭成员
- **THEN** 计算并显示人均饮食成本

### Requirement: Budget Alerts
系统应当在预算即将或已经超支时预警。

#### Scenario: 预算预警
- **WHEN** 预算使用达到80%
- **THEN** 显示黄色警告「预算即将用完」

#### Scenario: 超支提醒
- **WHEN** 支出超过预算
- **THEN** 显示红色提醒并分析超支原因

#### Scenario: 分类预警
- **WHEN** 某分类预算超支
- **THEN** 单独提示该分类并建议减少采购

#### Scenario: 日均超标
- **WHEN** 日均支出超过预算/天数
- **THEN** 提示「当前消费速度过快，建议调整」

### Requirement: Economy Mode
系统应当提供「经济模式」以最小化支出。

#### Scenario: 启用经济模式
- **WHEN** 用户打开「经济模式」
- **THEN** 食谱生成优先考虑成本而非其他因素

#### Scenario: 低成本食谱
- **WHEN** 经济模式生成食谱
- **THEN** 使用平价食材（如豆腐、鸡蛋、时令蔬菜）

#### Scenario: 节省金额显示
- **WHEN** 经济模式推荐食谱
- **THEN** 显示「相比标准食谱节省XX元」

#### Scenario: 营养保证
- **WHEN** 经济模式运行
- **THEN** 仍确保满足最低营养目标

### Requirement: Integration with Meal Planning
预算约束应当集成到食谱生成流程。

#### Scenario: 预算约束食谱生成
- **WHEN** 生成7天食谱
- **THEN** 确保总成本不超过周预算

#### Scenario: 预算不足提示
- **WHEN** 无法在预算内满足营养目标
- **THEN** 提示「当前预算不足，建议增加XX元或降低标准」

#### Scenario: 动态调整
- **WHEN** 生成过程中发现超预算
- **THEN** 自动替换为更便宜的食材

