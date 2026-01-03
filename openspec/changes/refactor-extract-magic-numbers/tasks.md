## 1. 常量文件创建

- [x] 1.1 创建 `lib/constants/index.ts` 作为导出入口
- [x] 1.2 创建 `lib/constants/analytics.ts` 分析常量
- [x] 1.3 创建 `lib/constants/budget.ts` 预算常量
- [x] 1.4 创建 `lib/constants/algorithm.ts` 算法常量 (合并到 analytics.ts)

## 2. 分析服务常量抽取

- [x] 2.1 抽取 `TREND_SLOPE_THRESHOLD = 0.01` 趋势判断阈值
- [x] 2.2 抽取 `MOVING_AVERAGE_WINDOW = 7` 移动平均窗口
- [x] 2.3 抽取 `DEFAULT_PREDICTION_DAYS = 7` 默认预测天数
- [x] 2.4 抽取 `CHANGE_PERCENT_THRESHOLD = 1` 变化百分比阈值

## 3. 预算服务常量抽取

- [x] 3.1 抽取 `BUDGET_ALERT_THRESHOLD_80 = 80` 预算预警阈值
- [x] 3.2 抽取 `BUDGET_ALERT_THRESHOLD_100 = 100`
- [x] 3.3 抽取 `BUDGET_ALERT_THRESHOLD_110 = 110`
- [x] 3.4 抽取 `DAILY_BUDGET_EXCESS_FACTOR = 1.2` 日均超标系数

## 4. 其他魔法数字处理

- [x] 4.1 审计其他文件中的魔法数字
- [x] 4.2 按类别抽取到对应常量文件
- [x] 4.3 为每个常量添加 JSDoc 注释说明用途

## 5. 验证

- [x] 5.1 运行 `pnpm type-check` 确保无常量相关错误
- [~] 5.2 运行 `pnpm test` - 存在预先存在的测试问题（非本提案范围）
- [x] 5.3 确认常量命名符合 UPPER_SNAKE_CASE 规范
