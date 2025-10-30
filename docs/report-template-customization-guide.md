# 报告模板定制指南

## 概述

健康报告系统支持灵活的模板定制，允许用户根据需求调整报告的样式、内容和布局。本指南将详细介绍如何定制和个性化健康报告模板。

## 报告模板结构

### 1. HTML模板基础

报告模板基于HTML生成，包含以下主要部分：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <!-- 元数据和样式 -->
</head>
<body>
  <div class="container">
    <div class="header">
      <!-- 报告头部 -->
    </div>
    <div class="content">
      <!-- 报告内容 -->
    </div>
    <div class="footer">
      <!-- 报告底部 -->
    </div>
  </div>
</body>
</html>
```

### 2. 主要组件

#### 头部组件 (Header)
- 用户姓名和报告类型
- 统计时间范围
- 渐变背景和标题样式

#### 内容组件 (Content)
- 数据概览（统计卡片）
- 成就列表
- 关注点提醒
- 异常检测记录
- 改进建议

#### 底部组件 (Footer)
- 生成时间
- 系统标识

## 样式定制

### 1. 颜色主题

#### 主色调配置
```css
:root {
  --primary-color: #667eea;     /* 主色调 */
  --secondary-color: #764ba2;   /* 辅助色 */
  --success-color: #10b981;     /* 成功色 */
  --warning-color: #f59e0b;     /* 警告色 */
  --error-color: #ef4444;       /* 错误色 */
  --text-primary: #1f2937;      /* 主文本色 */
  --text-secondary: #6b7280;    /* 次要文本色 */
  --background: #f3f4f6;        /* 背景色 */
}
```

#### 评分等级颜色
```css
.grade-excellent { color: #10b981; }  /* 优秀：绿色 */
.grade-good { color: #3b82f6; }       /* 良好：蓝色 */
.grade-fair { color: #f59e0b; }       /* 一般：橙色 */
.grade-poor { color: #ef4444; }       /* 较差：红色 */
```

### 2. 字体定制

#### 字体族设置
```css
body {
  font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

#### 字体大小层级
```css
.text-xl { font-size: 2rem; }    /* 主标题 */
.text-lg { font-size: 1.5rem; }  /* 章节标题 */
.text-md { font-size: 1.125rem; } /* 小标题 */
.text-base { font-size: 1rem; }  /* 正文 */
.text-sm { font-size: 0.9rem; }  /* 辅助文本 */
```

### 3. 布局定制

#### 容器宽度
```css
.container {
  max-width: 800px;  /* 可调整为 600px - 1200px */
  margin: 0 auto;
}
```

#### 网格布局
```css
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

/* 两列布局 */
.two-column {
  grid-template-columns: 1fr 1fr;
}

/* 三列布局 */
.three-column {
  grid-template-columns: repeat(3, 1fr);
}
```

## 内容定制

### 1. 数据概览定制

#### 统计卡片配置
```typescript
interface SummaryCard {
  title: string;      // 卡片标题
  value: string;      // 显示值
  unit?: string;      // 单位
  icon?: string;      // 图标
  color?: string;     // 主题色
}
```

#### 可选统计指标
- 统计天数
- 记录天数
- 平均健康评分
- 最高连续打卡
- 完成率百分比
- 体重变化
- 运动总时长

### 2. 成就列表定制

#### 成就类型配置
```typescript
interface Achievement {
  icon: string;       // 图标（emoji或图标类名）
  title: string;      // 成就标题
  description: string; // 详细描述
  category: string;   // 分类：streak, score, goal, consistency
}
```

#### 成就触发条件
- 连续打卡天数：7、30、100天
- 健康评分：≥90分、≥75分
- 目标完成：体重目标完成度≥25%
- 数据完整度：≥80%

### 3. 关注点定制

#### 关注级别分类
```typescript
interface Concern {
  level: 'info' | 'warning' | 'error';  // 关注级别
  title: string;                         // 标题
  description: string;                   // 描述
  actionable: boolean;                   // 是否可操作
}
```

#### 关注点触发规则
- 高严重异常记录
- 数据记录完整度低
- 健康评分下降趋势
- 目标偏离较大

### 4. 改进建议定制

#### 建议分类
```typescript
interface Recommendation {
  type: 'nutrition' | 'exercise' | 'sleep' | 'general';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
}
```

#### 建议生成规则
- 基于评分最低的维度
- 结合历史数据趋势
- 考虑个人目标设定
- 参考医学指南

## 模板定制方法

### 1. 创建自定义模板

```typescript
// 创建自定义报告模板
export function createCustomTemplate(config: ReportTemplateConfig) {
  return (data: ReportData): string => {
    // 使用配置生成HTML
    return generateHTMLWithConfig(data, config);
  };
}
```

### 2. 模板配置接口

```typescript
interface ReportTemplateConfig {
  // 样式配置
  theme: {
    primaryColor: string;
    fontFamily: string;
    containerWidth: number;
  };
  
  // 内容配置
  sections: {
    showSummary: boolean;
    showAchievements: boolean;
    showConcerns: boolean;
    showAnomalies: boolean;
    showRecommendations: boolean;
  };
  
  // 数据配置
  metrics: {
    includeWeightTrend: boolean;
    includeExerciseStats: boolean;
    includeSleepAnalysis: boolean;
    includeNutritionBreakdown: boolean;
  };
  
  // 自定义内容
  customSections?: CustomSection[];
}
```

### 3. 注册自定义模板

```typescript
// 注册模板到系统
import { registerReportTemplate } from '@/lib/services/analytics/report-generator';

const customTemplate = createCustomTemplate({
  theme: {
    primaryColor: '#2563eb',
    fontFamily: 'Arial, sans-serif',
    containerWidth: 900,
  },
  sections: {
    showSummary: true,
    showAchievements: true,
    showConcerns: true,
    showAnomalies: false,  // 隐藏异常检测
    showRecommendations: true,
  },
  metrics: {
    includeWeightTrend: true,
    includeExerciseStats: true,
    includeSleepAnalysis: true,
    includeNutritionBreakdown: false,
  }
});

registerReportTemplate('custom-minimal', customTemplate);
```

## 高级定制

### 1. 动态内容注入

```typescript
// 添加动态图表
const addChartSection = (data: ReportData): string => {
  return `
    <div class="section">
      <h2>📈 趋势图表</h2>
      <div class="chart-container">
        ${generateTrendChart(data.trends)}
      </div>
    </div>
  `;
};
```

### 2. 多语言支持

```typescript
// 多语言文本配置
const texts = {
  'zh-CN': {
    title: '健康报告',
    achievements: '本期成就',
    concerns: '需要关注',
    recommendations: '改进建议',
  },
  'en-US': {
    title: 'Health Report',
    achievements: 'Achievements',
    concerns: 'Areas for Concern',
    recommendations: 'Recommendations',
  }
};
```

### 3. 条件显示逻辑

```typescript
// 根据数据条件显示不同内容
const generateConditionalContent = (data: ReportData): string => {
  let content = '';
  
  if (data.summary.averageScore >= 90) {
    content += '<div class="excellent-badge">🏆 健康达人</div>';
  }
  
  if (data.achievements.length > 5) {
    content += '<div class="high-achiever">表现突出！</div>';
  }
  
  return content;
};
```

## 模板示例

### 1. 简约风格模板

```css
.minimal-theme {
  --primary-color: #000000;
  --background: #ffffff;
  --text-primary: #333333;
}

.minimal-theme .header {
  background: #000000;
  color: #ffffff;
}

.minimal-theme .summary-card {
  border: 1px solid #e5e7eb;
  background: #ffffff;
}
```

### 2. 医疗风格模板

```css
.medical-theme {
  --primary-color: #0ea5e9;
  --secondary-color: #0284c7;
  --success-color: #059669;
}

.medical-theme .header {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
}

.medical-theme .anomaly {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}
```

### 3. 运动风格模板

```css
.fitness-theme {
  --primary-color: #dc2626;
  --secondary-color: #b91c1c;
}

.fitness-theme .header {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

.fitness-theme .achievement {
  background: #fee2e2;
  border-left-color: #dc2626;
}
```

## 部署和使用

### 1. 模板文件组织

```
src/
├── lib/
│   └── services/
│       └── analytics/
│           ├── templates/
│           │   ├── default.ts
│           │   ├── minimal.ts
│           │   ├── medical.ts
│           │   └── fitness.ts
│           └── report-generator.ts
```

### 2. 应用模板

```typescript
// 生成报告时指定模板
const report = await createReport(memberId, 'WEEKLY', {
  template: 'medical',  // 使用医疗风格模板
  language: 'zh-CN',
});
```

### 3. 用户偏好保存

```typescript
// 保存用户的模板偏好
await saveUserPreference(userId, {
  reportTemplate: 'minimal',
  language: 'zh-CN',
  includeCharts: true,
});
```

## 最佳实践

### 1. 性能优化
- 模板缓存机制
- 图片压缩和优化
- CSS样式压缩
- 懒加载图表组件

### 2. 可访问性
- 语义化HTML标签
- 适当的颜色对比度
- 支持屏幕阅读器
- 键盘导航支持

### 3. 打印优化
```css
@media print {
  .no-print { display: none; }
  .container { box-shadow: none; }
  .page-break { page-break-before: always; }
}
```

### 4. 响应式设计
```css
@media (max-width: 768px) {
  .container { padding: 1rem; }
  .summary-grid { grid-template-columns: 1fr; }
}
```

## 故障排除

### 常见问题

1. **模板不生效**
   - 检查模板注册是否正确
   - 确认模板文件路径
   - 验证配置格式

2. **样式显示异常**
   - 检查CSS语法
   - 确认颜色值格式
   - 验证选择器优先级

3. **数据显示错误**
   - 检查数据结构
   - 确认字段映射
   - 验证数据类型

### 调试工具

```typescript
// 模板调试模式
const debugTemplate = (data: ReportData) => {
  console.log('Template data:', data);
  console.log('Generated HTML:', generateHTMLReport(data));
};
```

## 总结

报告模板定制系统提供了灵活的配置选项，允许根据不同需求创建个性化的健康报告。通过合理使用样式定制、内容配置和高级功能，可以创建出既美观又实用的报告模板。

建议在定制时遵循以下原则：
- 保持简洁明了的设计
- 确保数据的准确性和可读性
- 考虑不同用户群体的需求
- 注重移动端体验
- 定期收集用户反馈并优化
