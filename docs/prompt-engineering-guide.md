# Prompt工程指南

## 概述

本指南旨在为开发者和内容创作者提供关于健康营养AI系统的Prompt工程最佳实践。通过优化Prompt设计，我们可以提高AI响应的质量、一致性和安全性，同时控制成本和响应时间。

## 核心原则

### 1. 清晰性 (Clarity)
- 使用明确、具体的语言
- 避免模糊或多义的表述
- 提供充足的上下文信息

### 2. 结构化 (Structure)
- 采用一致的Prompt模板格式
- 合理组织信息层次
- 使用标准化的数据格式

### 3. 安全性 (Safety)
- 包含必要的免责声明
- 避免诱导医疗诊断
- 设置适当的内容边界

### 4. 效率性 (Efficiency)
- 优化Token使用量
- 减少不必要的重复信息
- 合理使用缓存机制

## Prompt模板设计

### 基础模板结构

```markdown
# 角色定义
你是一位专业的{role}，拥有{experience}年经验。

# 任务目标
{task_description}

# 输入数据
{input_data}

# 输出要求
- 格式：{output_format}
- 长度：{length_limit}
- 风格：{style_requirements}

# 约束条件
{constraints}

# 免责声明
{disclaimer}
```

### 健康分析Prompt模板

```markdown
你是一位专业的营养师和健康顾问，拥有10年临床营养经验。请根据用户提供的体检数据进行全面分析。

## 体检数据
{{medical_data}}

## 用户信息
- 年龄：{{age}}岁
- 性别：{{gender}}
- 身高：{{height}}cm
- 体重：{{weight}}kg
- 运动习惯：{{exercise_habits}}
- 饮食偏好：{{dietary_preferences}}

## 分析要求
请按以下结构输出分析结果：

### 1. 健康状况评估
- 总体健康评分（1-10分）
- 主要健康风险识别
- 需要关注的指标

### 2. 营养状况分析
- 宏量营养素评估
- 微量营养素缺乏风险
- 饮食结构问题

### 3. 个性化建议
- 饮食调整方案
- 营养补充建议
- 生活方式改善

### 4. 食谱推荐
- 适合的食材选择
- 避免的食物类型
- 一周食谱示例

## 输出格式
请使用JSON格式返回结果：
```json
{
  "healthScore": number,
  "risks": string[],
  "nutrientAnalysis": object,
  "recommendations": object,
  "mealSuggestions": object
}
```

## 重要提醒
- 本分析仅供参考，不能替代专业医疗诊断
- 如指标严重异常，强烈建议用户及时就医
- 建议内容应基于科学证据，避免极端或危险的饮食推荐
```

### 营养咨询Prompt模板

```markdown
你是一位专业的营养咨询师，擅长提供个性化、实用的营养建议。

## 用户问题
{{user_question}}

## 用户背景
{{user_context}}

## 对话历史
{{conversation_history}}

## 回答要求
1. 专业性：基于营养科学和医学证据
2. 个性化：考虑用户的具体情况
3. 实用性：提供可执行的建议
4. 安全性：避免医疗诊断，必要时建议就医

## 回答结构
- 直接回答用户问题
- 提供科学依据
- 给出具体建议
- 说明注意事项
- 推荐进一步行动

## 安全边界
- 不提供具体疾病诊断
- 不开具处方药物建议
- 不承诺治疗效果
- 异常情况及时建议就医

## 回答格式
{{response_format}}
```

## 优化策略

### 1. Token优化

#### 减少冗余信息
```markdown
# 不推荐（冗余）
请分析以下用户的体检数据，用户是一位35岁的男性，他的身高是175cm，体重是80kg，他的体检数据显示总胆固醇为6.5mmol/L，低密度脂蛋白为4.2mmol/L，高密度脂蛋白为1.1mmol/L，甘油三酯为2.0mmol/L，空腹血糖为6.1mmol/L，请根据这些数据给出营养建议。

# 推荐（简洁）
用户：35岁男性，175cm，80kg
体检：总胆固醇6.5，低密度4.2，高密度1.1，甘油三酯2.0，血糖6.1（单位：mmol/L）
请分析并给出营养建议。
```

#### 使用缩写和符号
```markdown
# 不推荐
总胆固醇：6.5mmol/L，低密度脂蛋白胆固醇：4.2mmol/L

# 推荐
TC:6.5, LDL-C:4.2, HDL-C:1.1, TG:2.0, FBG:6.1 (mmol/L)
```

### 2. 上下文管理

#### 分层上下文设计
```markdown
# 系统级上下文（固定）
你是一位专业营养师...

# 会话级上下文（可变）
用户基本信息：{{user_profile}}
健康目标：{{health_goals}}

# 当前请求上下文
具体问题：{{current_question}}
相关历史：{{relevant_history}}
```

#### 上下文压缩策略
```markdown
# 完整历史（早期对话）
用户：我的胆固醇偏高
AI：建议减少饱和脂肪摄入...

# 压缩摘要（后期对话）
用户背景：胆固醇偏高，已了解基础饮食建议
当前问题：具体食谱推荐
```

### 3. 响应质量控制

#### 结构化输出约束
```markdown
请严格按照以下JSON格式返回：
{
  "mainPoints": ["要点1", "要点2"],
  "detailedAdvice": {
    "diet": "饮食建议",
    "exercise": "运动建议",
    "lifestyle": "生活方式"
  },
  "warnings": ["注意事项"],
  "nextSteps": ["下一步行动"]
}

不得添加JSON格式外的任何文字说明。
```

#### 质量检查Prompt
```markdown
请检查以下AI建议的质量：

{{ai_response}}

检查标准：
1. 是否包含医疗诊断（应避免）
2. 建议是否科学合理
3. 是否有安全风险
4. 语言是否清晰易懂

返回检查结果：
{
  "approved": boolean,
  "issues": string[],
  "suggestions": string[]
}
```

## 安全机制

### 1. 内容过滤

#### 敏感内容检测
```markdown
检查以下内容是否包含敏感信息：

{{user_input}}

检测项目：
- 个人身份信息（身份证、电话等）
- 具体疾病诊断
- 药物处方信息
- 极端饮食方法

如发现敏感信息，请标记为[已过滤]并继续处理。
```

#### 医疗边界设定
```markdown
# 医疗免责声明模板
重要提醒：
1. 本建议仅供参考，不能替代专业医疗诊断
2. 如有以下症状，请立即就医：
   - 胸痛、呼吸困难
   - 血糖>10mmol/L或<3.9mmol/L
   - 血压>180/110mmHg
3. 本建议不适用于孕妇、儿童、特殊疾病患者
```

### 2. 风险评估

#### 高风险指标识别
```markdown
# 风险评估规则
if (血糖 > 10) or (血糖 < 3.9) -> 高风险，建议立即就医
if (收缩压 > 180) or (舒张压 > 110) -> 高风险，建议立即就医
if (总胆固醇 > 7.5) -> 中高风险，建议就医检查
```

#### 建议强度分级
```markdown
# 建议强度分类
强烈建议：涉及安全风险，必须执行
建议：基于科学证据，推荐执行
可选建议：个性化优化，可以参考
```

## 性能优化

### 1. 缓存策略

#### 缓存键设计
```javascript
// 基于问题类型和关键参数生成缓存键
const cacheKey = `nutrition_advice_${questionType}_${age}_${gender}_${keyHealthParams}`;
```

#### 缓存失效策略
```markdown
# 缓存失效条件
- 用户健康数据更新
- 新的科学研究发布
- Prompt模板版本更新
- 超过24小时
```

### 2. 模型选择策略

#### 根据任务复杂度选择模型
```javascript
function selectModel(complexity) {
  if (complexity === 'simple') {
    return 'gpt-3.5-turbo'; // 成本低，速度快
  } else if (complexity === 'moderate') {
    return 'gpt-4-turbo';   // 平衡性能和成本
  } else {
    return 'gpt-4';         // 高复杂度任务
  }
}
```

## 测试和验证

### 1. Prompt测试框架

#### 自动化测试
```javascript
describe('Nutrition Analysis Prompt', () => {
  test('should handle high cholesterol case', async () => {
    const input = generateTestCase('high_cholesterol');
    const response = await callAI(input);
    expect(response).toContain('减少饱和脂肪');
    expect(response).not.toContain('停止服用药物');
  });
});
```

#### 质量评估指标
```javascript
const qualityMetrics = {
  relevance: 0.95,      // 相关性
  accuracy: 0.90,       // 准确性
  safety: 0.98,         // 安全性
  clarity: 0.85,        // 清晰度
  completeness: 0.80    // 完整性
};
```

### 2. A/B测试

#### Prompt版本对比
```markdown
# 版本A（详细版）
请详细分析用户的体检数据，包括...

# 版本B（简洁版）
分析体检数据：{{data}}，给出建议。

# 测试指标
- 响应时间
- Token消耗
- 用户满意度
- 建议准确性
```

## 最佳实践总结

### DO's（推荐做法）
1. ✅ 使用结构化模板确保一致性
2. ✅ 包含必要的安全免责声明
3. ✅ 定期更新基于最新科学研究
4. ✅ 实施多层次的内容审核
5. ✅ 优化Token使用以控制成本
6. ✅ 建立完善的测试和监控机制

### DON'Ts（避免做法）
1. ❌ 提供具体医疗诊断
2. ❌ 开具药物处方建议
3. ❌ 承诺治疗效果
4. ❌ 使用极端或危险的饮食建议
5. ❌ 忽略用户个体差异
6. ❌ 缺乏科学依据的建议

## 持续改进

### 1. 数据收集
- 用户反馈收集
- 建议质量评分
- 使用统计分析
- 成本效益评估

### 2. 迭代优化
- 定期Prompt模板更新
- 基于反馈的调整
- 新功能集成
- 性能持续监控

### 3. 团队协作
- 营养专家审核
- AI工程师优化
- 产品经理反馈
- 用户体验改进

## 附录

### A. 常用健康指标参考范围
```markdown
血脂正常范围：
- 总胆固醇：<5.2 mmol/L
- 低密度脂蛋白：<3.4 mmol/L  
- 高密度脂蛋白：>1.0 mmol/L（男性），>1.2 mmol/L（女性）
- 甘油三酯：<1.7 mmol/L

血糖正常范围：
- 空腹血糖：3.9-6.1 mmol/L
- 餐后2小时：<7.8 mmol/L
```

### B. 营养建议常用术语
```markdown
宏量营养素：
- 蛋白质：占总热量10-20%
- 脂肪：占总热量20-30%
- 碳水化合物：占总热量50-65%

微量营养素：
- 维生素：A、B族、C、D、E、K
- 矿物质：钙、铁、锌、镁、钾
```

### C. 成本控制参考
```markdown
不同模型的预估成本（每1000 Token）：
- GPT-3.5-turbo：$0.002-0.004
- GPT-4-turbo：$0.01-0.03
- GPT-4：$0.03-0.06

优化建议：
- 简单查询使用GPT-3.5-turbo
- 复杂分析使用GPT-4-turbo
- 专业咨询使用GPT-4
```

---

本指南将根据实际使用情况和技术发展持续更新。如有问题或建议，请联系AI工程团队。
