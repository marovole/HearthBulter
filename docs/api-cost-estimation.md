# AI API成本预估文档

## 概述

本文档提供健康管家AI系统API使用的详细成本分析和预估方法，帮助开发者和产品团队合理规划预算，优化使用效率。

## 成本模型

### 1. Token定价结构

#### OpenAI GPT模型定价（2024年标准）

| 模型 | 输入Token成本 | 输出Token成本 | 适用场景 |
|------|---------------|---------------|----------|
| GPT-3.5-turbo | $0.001/1K tokens | $0.002/1K tokens | 简单查询、快速响应 |
| GPT-4-turbo | $0.01/1K tokens | $0.03/1K tokens | 中等复杂度分析 |
| GPT-4 | $0.03/1K tokens | $0.06/1K tokens | 复杂健康分析、专业咨询 |

#### Anthropic Claude模型定价（备选方案）

| 模型 | 输入Token成本 | 输出Token成本 | 适用场景 |
|------|---------------|---------------|----------|
| Claude-3-haiku | $0.00025/1K tokens | $0.00125/1K tokens | 轻量级任务 |
| Claude-3-sonnet | $0.003/1K tokens | $0.015/1K tokens | 中等复杂度任务 |
| Claude-3-opus | $0.015/1K tokens | $0.075/1K tokens | 高复杂度专业分析 |

### 2. 系统API端点成本分析

#### 聊天咨询API (`/api/ai/chat`)
```
平均输入Token: 200-800 tokens
平均输出Token: 150-400 tokens
平均单次成本: $0.01-$0.15 (GPT-4-turbo)
```

#### 健康分析API (`/api/ai/analyze-health`)
```
平均输入Token: 500-1500 tokens
平均输出Token: 300-800 tokens
平均单次成本: $0.02-$0.35 (GPT-4-turbo)
```

#### 食谱优化API (`/api/ai/optimize-recipe`)
```
平均输入Token: 300-1000 tokens
平均输出Token: 200-600 tokens
平均单次成本: $0.015-$0.25 (GPT-4-turbo)
```

#### 报告生成API (`/api/ai/generate-report`)
```
平均输入Token: 800-2000 tokens
平均输出Token: 600-1500 tokens
平均单次成本: $0.03-$0.65 (GPT-4)
```

## 使用场景成本预估

### 1. 个人用户场景

#### 轻度用户（每月5-10次咨询）
```
月度咨询次数: 8次
平均单次成本: $0.05
月度总成本: $0.40
年度总成本: $4.80
```

#### 中度用户（每月20-30次咨询）
```
月度咨询次数: 25次
平均单次成本: $0.08
月度总成本: $2.00
年度总成本: $24.00
```

#### 重度用户（每月50+次咨询）
```
月度咨询次数: 50次
平均单次成本: $0.12
月度总成本: $6.00
年度总成本: $72.00
```

### 2. 家庭用户场景

#### 标准家庭（4人，每人每月15次咨询）
```
家庭月度咨询次数: 60次
平均单次成本: $0.10
家庭月度总成本: $6.00
家庭年度总成本: $72.00
```

#### 大家庭（6人，每人每月20次咨询）
```
家庭月度咨询次数: 120次
平均单次成本: $0.10
家庭月度总成本: $12.00
家庭年度总成本: $144.00
```

### 3. 企业用户场景

#### 小型企业（50名员工）
```
员工月度咨询次数: 10次/人
月度总咨询次数: 500次
平均单次成本: $0.08
企业月度总成本: $40.00
企业年度总成本: $480.00
```

#### 中型企业（200名员工）
```
员工月度咨询次数: 15次/人
月度总咨询次数: 3000次
平均单次成本: $0.10
企业月度总成本: $300.00
企业年度总成本: $3,600.00
```

## 成本优化策略

### 1. 模型选择优化

#### 智能模型路由
```javascript
function selectOptimalModel(taskComplexity, userTier) {
  const modelMap = {
    simple: {
      basic: 'gpt-3.5-turbo',
      premium: 'gpt-4-turbo',
      enterprise: 'gpt-4-turbo'
    },
    moderate: {
      basic: 'gpt-3.5-turbo',
      premium: 'gpt-4-turbo',
      enterprise: 'gpt-4'
    },
    complex: {
      basic: 'gpt-4-turbo',
      premium: 'gpt-4',
      enterprise: 'gpt-4'
    }
  };
  
  return modelMap[taskComplexity][userTier];
}
```

#### 成本节省效果
```
简单任务使用GPT-3.5-turbo：节省85%成本
中等任务智能路由：节省40-60%成本
复杂任务使用GPT-4：保证质量，成本可控
```

### 2. 缓存策略

#### 缓存命中率分析
```
当前缓存命中率: 35%
缓存节省成本: $0.015/次
目标缓存命中率: 50%
预期节省: $500/月（1000次请求/月）
```

#### 缓存策略实现
```javascript
const cacheStrategy = {
  // 常见问题缓存（24小时）
  commonQuestions: {
    ttl: 24 * 60 * 60 * 1000,
    hitRate: 0.65
  },
  
  // 个性化分析缓存（2小时）
  personalizedAnalysis: {
    ttl: 2 * 60 * 60 * 1000,
    hitRate: 0.25
  },
  
  // 健康数据缓存（直到数据更新）
  healthData: {
    ttl: null,
    hitRate: 0.80
  }
};
```

### 3. Token优化技术

#### Prompt优化效果
```
优化前平均Token: 800输入 + 400输出 = 1200总Token
优化后平均Token: 500输入 + 300输出 = 800总Token
Token节省: 33%
成本节省: 33%
```

#### 具体优化方法
```markdown
1. 简化指令语言
2. 使用缩写和符号
3. 移除重复信息
4. 结构化数据格式
5. 上下文压缩技术
```

## 预算规划工具

### 1. 成本计算器

#### JavaScript实现
```javascript
class AICostCalculator {
  constructor(pricing) {
    this.pricing = pricing;
  }
  
  calculateRequestCost(inputTokens, outputTokens, model) {
    const modelPricing = this.pricing[model];
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    return inputCost + outputCost;
  }
  
  estimateMonthlyCost(requestsPerMonth, avgInputTokens, avgOutputTokens, model) {
    const singleCost = this.calculateRequestCost(avgInputTokens, avgOutputTokens, model);
    return singleCost * requestsPerMonth;
  }
  
  compareModels(inputTokens, outputTokens) {
    return Object.keys(this.pricing).map(model => ({
      model,
      cost: this.calculateRequestCost(inputTokens, outputTokens, model)
    }));
  }
}

// 使用示例
const calculator = new AICostCalculator({
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 }
});

const monthlyCost = calculator.estimateMonthlyCost(100, 600, 300, 'gpt-4-turbo');
console.log(`月度预估成本: $${monthlyCost.toFixed(2)}`);
```

### 2. 预算预警系统

#### 阈值设置
```javascript
const budgetThresholds = {
  daily: {
    warning: 10.00,    // $10/日警告
    critical: 20.00    // $20/日严重警告
  },
  monthly: {
    warning: 200.00,   // $200/月警告
    critical: 500.00   // $500/月严重警告
  },
  perUser: {
    warning: 5.00,     // $5/用户/月警告
    critical: 10.00    // $10/用户/月严重警告
  }
};
```

#### 预警实现
```javascript
async function checkBudgetUsage(userId, requestCost) {
  const usage = await getUserUsage(userId);
  const newTotal = usage.total + requestCost;
  
  if (newTotal > budgetThresholds.perUser.critical) {
    // 停止服务，要求升级套餐
    return { allowed: false, reason: 'BUDGET_EXCEEDED' };
  } else if (newTotal > budgetThresholds.perUser.warning) {
    // 发送警告邮件
    await sendBudgetWarning(userId, newTotal);
    return { allowed: true, warning: 'BUDGET_WARNING' };
  }
  
  return { allowed: true };
}
```

## 监控和分析

### 1. 成本监控指标

#### 关键指标
```javascript
const costMetrics = {
  // 基础指标
  totalCost: 0,
  totalRequests: 0,
  averageCostPerRequest: 0,
  
  // 效率指标
  costPerUser: 0,
  costPerAnswer: 0,
  tokenEfficiency: 0,
  
  // 趋势指标
  dailyGrowthRate: 0,
  monthlyProjection: 0,
  yearlyForecast: 0,
  
  // 优化指标
  cacheHitRate: 0,
  costSavingsFromCache: 0,
  optimizationImpact: 0
};
```

#### 实时监控面板
```javascript
const realTimeDashboard = {
  currentDayCost: 45.67,
  currentMonthCost: 1250.34,
  budgetUtilization: 62.5,
  
  topCostUsers: [
    { userId: 'user123', cost: 125.50, requests: 156 },
    { userId: 'user456', cost: 98.25, requests: 124 }
  ],
  
  costByEndpoint: [
    { endpoint: '/api/ai/chat', cost: 680.45, percentage: 54.4 },
    { endpoint: '/api/ai/analyze-health', cost: 420.30, percentage: 33.6 },
    { endpoint: '/api/ai/optimize-recipe', cost: 149.59, percentage: 12.0 }
  ]
};
```

### 2. 成本分析报告

#### 月度报告模板
```markdown
# AI API成本分析报告 - 2024年1月

## 总体概况
- 总成本: $2,340.56
- 总请求: 15,678次
- 平均成本/请求: $0.149
- 环比增长: +12.3%

## 成本构成
### 按API端点
- 聊天咨询: $1,260.78 (53.9%)
- 健康分析: $789.45 (33.7%)
- 食谱优化: $290.33 (12.4%)

### 按模型使用
- GPT-4-turbo: $1,456.23 (62.2%)
- GPT-3.5-turbo: $567.89 (24.3%)
- GPT-4: $316.44 (13.5%)

## 优化效果
- 缓存节省: $234.56 (10.0%)
- Prompt优化节省: $156.78 (6.7%)
- 模型路由节省: $89.34 (3.8%)

## 预算执行
- 月度预算: $3,000.00
- 已使用: 78.0%
- 剩余预算: $659.44
- 预计超支: 否

## 改进建议
1. 提高缓存命中率至45%（当前35%）
2. 扩大GPT-3.5-turbo使用范围
3. 实施更精细的模型路由策略
```

## 成本控制最佳实践

### 1. 架构层面
- ✅ 实施多模型路由策略
- ✅ 建立完善的缓存机制
- ✅ 使用Token优化技术
- ✅ 实施请求去重和合并

### 2. 产品层面
- ✅ 设置合理的用户使用限额
- ✅ 提供不同价格的服务套餐
- ✅ 实施成本预警和通知
- ✅ 优化用户体验减少重复请求

### 3. 运营层面
- ✅ 定期分析成本数据
- ✅ 持续优化Prompt模板
- ✅ 监控异常使用模式
- ✅ 建立成本预算管理流程

## 故障预案

### 1. 成本超限处理
```javascript
const costOverrunPlan = {
  level1: { // 超预算10%
    action: 'send_warning',
    throttle: false,
    notify: ['user', 'admin']
  },
  level2: { // 超预算25%
    action: 'throttle_requests',
    throttle: 0.8, // 限制到80%流量
    notify: ['user', 'admin', 'finance']
  },
  level3: { // 超预算50%
    action: 'upgrade_required',
    throttle: 0.5, // 限制到50%流量
    notify: ['user', 'admin', 'finance', 'management']
  }
};
```

### 2. API价格变动应对
- 建立价格监控机制
- 准备备选API提供商
- 制定紧急切换方案
- 用户沟通和价格调整策略

## 附录

### A. Token计算工具
```python
import tiktoken

def count_tokens(text, model="gpt-4"):
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def estimate_prompt_cost(prompt, response, model="gpt-4"):
    input_tokens = count_tokens(prompt, model)
    output_tokens = count_tokens(response, model)
    
    pricing = {
        "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
        "gpt-4-turbo": {"input": 0.01, "output": 0.03},
        "gpt-4": {"input": 0.03, "output": 0.06}
    }
    
    input_cost = (input_tokens / 1000) * pricing[model]["input"]
    output_cost = (output_tokens / 1000) * pricing[model]["output"]
    
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_cost": input_cost + output_cost
    }
```

### B. 成本优化检查清单
```
□ 实施智能模型路由
□ 建立多级缓存策略
□ 优化Prompt模板长度
□ 设置合理的使用限额
□ 建立成本监控体系
□ 定期分析使用数据
□ 实施预警机制
□ 准备故障预案
```

---

本文档将根据API价格变化和使用情况持续更新。如有疑问，请联系技术团队或财务部门。
