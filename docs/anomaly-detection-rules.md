# 异常检测规则文档

## 概述

异常检测系统通过分析用户的健康数据，识别可能存在的异常模式和健康风险。系统基于统计学原理和医学指南，自动检测多种类型的异常情况，并及时发出预警。

## 检测类型

### 1. 突变异常 (Sudden Change)

#### 检测原理
基于3σ（三倍标准差）原则，检测数据点是否超出历史正常范围。

#### 规则详情
- **数据窗口**：过去30天的历史数据
- **最小样本量**：至少7个有效数据点
- **异常阈值**：|当前值 - 历史均值| > 3 × 历史标准差
- **适用指标**：体重、血压、心率、体脂率等

#### 严重程度分级
| 偏差倍数 | 严重程度 | 说明 |
|----------|----------|------|
| ≥ 4σ | CRITICAL | 极端异常，需立即关注 |
| 3.5σ - 4σ | HIGH | 高度异常，建议咨询医生 |
| 3σ - 3.5σ | MEDIUM | 中度异常，需要监控 |
| < 3σ | LOW | 轻度异常，注意观察 |

#### 示例场景
- 体重突然增加/减少超过正常波动范围
- 血压突然升高/降低超出个人基线
- 静息心率异常变化

### 2. 体重异常检测

#### 单日变化检测
- **异常阈值**：单日体重变化 > 2kg
- **严重程度**：
  - > 5kg：CRITICAL
  - 3-5kg：HIGH  
  - 2-3kg：MEDIUM

#### 检测逻辑
```typescript
if (|今日体重 - 昨日体重| > 2kg) {
  触发异常预警
}
```

#### 可能原因
- 测量误差（如不同时间、不同设备）
- 体液剧烈变化（脱水、水肿）
- 健康状况变化

### 3. 营养失衡检测

#### 蛋白质摄入不足
- **检测周期**：连续3天
- **异常阈值**：实际摄入 < 目标值 × 50%
- **严重程度**：HIGH
- **建议**：增加优质蛋白质食物摄入

#### 卡路里摄入超标
- **检测周期**：连续3天
- **异常阈值**：实际摄入 > 目标值 × 130%
- **严重程度**：MEDIUM
- **建议**：控制饮食量，增加运动

#### 营养素比例异常
- **检测指标**：碳水化合物、脂肪、蛋白质比例
- **异常阈值**：偏离推荐比例超过30%
- **严重程度**：MEDIUM

### 4. 运动异常检测

#### 运动量骤减
- **检测周期**：连续7天
- **基准对比**：过去4周平均运动量
- **异常阈值**：当前运动量 < 历史平均 × 50%
- **严重程度**：MEDIUM

#### 运动量骤增
- **检测周期**：连续3天
- **异常阈值**：当前运动量 > 历史平均 × 200%
- **严重程度**：LOW（过度运动风险）

#### 运动强度异常
- **检测指标**：心率区间、运动时长
- **异常模式**：高强度运动时间占比异常
- **严重程度**：MEDIUM

### 5. 睡眠异常检测

#### 睡眠时长异常
- **检测周期**：连续3天
- **异常阈值**：
  - < 5小时：严重不足
  - 5-6小时：睡眠不足
  - > 10小时：睡眠过多
- **严重程度**：MEDIUM

#### 睡眠质量下降
- **检测指标**：睡眠质量评分
- **检测周期**：连续5天
- **异常阈值**：质量评分持续下降
- **严重程度**：LOW

#### 作息不规律
- **检测指标**：睡眠时间一致性
- **异常阈值**：睡眠时间标准差 > 2小时
- **严重程度**：LOW

### 6. 健康评分异常

#### 评分持续下降
- **检测周期**：连续7天
- **异常阈值**：评分下降 > 15分
- **严重程度**：MEDIUM

#### 评分异常波动
- **检测指标**：评分日变化幅度
- **异常阈值**：标准差 > 历史标准差 × 2
- **严重程度**：LOW

## 检测算法

### 1. 统计学方法

#### 移动平均
```typescript
// 计算7天移动平均
const movingAvg = calculateMovingAverage(data, 7);
```

#### 标准差分析
```typescript
// 计算历史标准差
const stats = calculateStatistics(historicalData);
const upperBound = stats.mean + 3 * stats.stdDev;
const lowerBound = stats.mean - 3 * stats.stdDev;
```

#### 趋势分析
```typescript
// 线性回归趋势
const trend = calculateLinearTrend(data);
if (trend.slope < threshold) {
  // 下降趋势异常
}
```

### 2. 机器学习方法（可选）

#### 异常检测算法
- Isolation Forest
- One-Class SVM
- Local Outlier Factor

#### 时间序列异常
- ARIMA模型残差分析
- 季节性分解异常检测

## 规则配置

### 1. 阈值配置文件

```typescript
interface AnomalyThresholds {
  weight: {
    dailyChange: 2.0;        // kg
    weeklyChange: 5.0;       // kg
  };
  bloodPressure: {
    systolic: { min: 90, max: 140 };
    diastolic: { min: 60, max: 90 };
  };
  heartRate: {
    resting: { min: 50, max: 100 };
    max: { min: 120, max: 200 };
  };
  nutrition: {
    protein: { minRatio: 0.5, maxRatio: 2.0 };
    calories: { minRatio: 0.7, maxRatio: 1.3 };
  };
}
```

### 2. 个性化配置

```typescript
interface PersonalizedRules {
  ageGroup: 'young' | 'adult' | 'elderly';
  gender: 'male' | 'female';
  healthConditions: string[];
  medications: string[];
  customThresholds: Partial<AnomalyThresholds>;
}
```

### 3. 动态调整

```typescript
// 根据历史准确率调整阈值
function adjustThresholds(
  currentThresholds: AnomalyThresholds,
  accuracy: number
): AnomalyThresholds {
  if (accuracy < 0.8) {
    // 降低敏感度
    return { ...currentThresholds, sensitivity: 0.9 };
  }
  return currentThresholds;
}
```

## 异常处理流程

### 1. 检测触发

```typescript
// 数据录入时触发检测
async function onDataEntry(data: HealthData) {
  const anomalies = await detectAnomalies(data.memberId, data);
  
  if (anomalies.length > 0) {
    await saveAnomalies(anomalies);
    await notifyUser(anomalies);
  }
}
```

### 2. 异常验证

#### 初步验证
- 检查数据合理性
- 排除明显错误值
- 确认测量条件

#### 二次验证
- 等待后续数据确认
- 比较相关指标
- 人工审核机制

### 3. 预警发送

#### 通知渠道
- 应用内通知
- 短信提醒（高严重程度）
- 邮件报告
- 微信推送

#### 通知内容
```typescript
interface AnomalyNotification {
  title: string;
  description: string;
  severity: AnomalySeverity;
  recommendations: string[];
  actionRequired: boolean;
  timestamp: Date;
}
```

## 规则优化

### 1. 准确率监控

#### 指标计算
```typescript
// 计算检测准确率
const accuracy = truePositives / (truePositives + falsePositives);
const recall = truePositives / (truePositives + falseNegatives);
const f1Score = 2 * (accuracy * recall) / (accuracy + recall);
```

#### 反馈收集
- 用户确认异常
- 误报标记
- 医生验证结果

### 2. 规则调优

#### 阈值优化
- 基于历史数据调整
- 考虑季节性变化
- 个性化定制

#### 算法改进
- 引入更多特征
- 使用深度学习模型
- 集成多种检测方法

### 3. A/B测试

```typescript
// 对比不同规则版本
const experiment = {
  groupA: { thresholds: currentThresholds },
  groupB: { thresholds: optimizedThresholds },
  metrics: ['accuracy', 'userSatisfaction', 'falsePositiveRate']
};
```

## 特殊情况处理

### 1. 数据缺失

#### 缺失策略
- 降低检测敏感度
- 延长检测窗口
- 使用插值方法

#### 最小数据要求
- 体重：至少7天数据
- 血压：至少5次测量
- 营养：至少3天完整记录

### 2. 测量误差

#### 误差识别
- 异常值过滤
- 设备一致性检查
- 时间模式分析

#### 误差处理
- 自动校正
- 重新测量建议
- 数据标记

### 3. 个人差异

#### 基线建立
- 个人正常范围
- 生理周期考虑
- 生活习惯影响

#### 适应性调整
- 学习个人模式
- 动态阈值更新
- 季节性适应

## 医学参考标准

### 1. 血压标准
- 正常：收缩压<120，舒张压<80 mmHg
- 偏高：收缩压120-129，舒张压<80 mmHg
- 高血压1期：收缩压130-139 或 舒张压80-89 mmHg
- 高血压2期：收缩压≥140 或 舒张压≥90 mmHg

### 2. 心率标准
- 静息心率：60-100 bpm
- 运动心率：220-年龄（最大心率估算）
- 目标区间：最大心率的50-85%

### 3. BMI标准
- 偏瘦：< 18.5
- 正常：18.5-23.9
- 超重：24-27.9
- 肥胖：≥ 28

### 4. 体脂率标准
- 男性：15-20%
- 女性：20-25%
- 年龄调整：每10岁增加2-3%

## 最佳实践

### 1. 规则设计原则
- **敏感性**：及时发现问题
- **特异性**：减少误报
- **可解释性**：用户能理解原因
- **可操作性**：提供明确建议

### 2. 用户体验
- 渐进式提醒
- 教育性内容
- 个性化建议
- 正向激励

### 3. 安全考虑
- 不替代医疗诊断
- 明确免责声明
- 紧急情况处理
- 数据隐私保护

## 技术实现

### 1. 检测调度
```typescript
// 每6小时执行一次检测
cron.schedule('0 */6 * * *', async () => {
  await runAnomalyDetection();
});
```

### 2. 性能优化
- 批量数据处理
- 缓存计算结果
- 异步检测执行
- 结果缓存机制

### 3. 监控指标
- 检测执行时间
- 异常发现数量
- 误报率统计
- 用户反馈收集

## 总结

异常检测规则系统通过多维度的健康数据分析，能够及时发现潜在的健康风险。系统设计遵循科学性、实用性和个性化的原则，为用户提供准确、及时的健康预警。

持续的规则优化和用户反馈是系统改进的关键，建议定期评估检测效果，并根据医学进展和用户需求调整检测策略。
