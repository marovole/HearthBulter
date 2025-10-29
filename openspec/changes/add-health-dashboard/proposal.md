# Proposal: Add Health Tracking Dashboard

## Why

健康追踪仪表盘是数据闭环的最后一环，将分散的健康数据可视化，帮助用户直观了解健康趋势、营养摄入和目标进度。数据分析和洞察是用户持续使用的核心动力。

## What Changes

- 实现体重/体脂趋势图表
- 创建营养摄入分析（宏量/微量营养素）
- 实现健康评分计算
- 添加周报/月报自动生成
- 创建可视化仪表盘UI

## Impact

**Affected Specs**:
- `health-tracking-dashboard` (NEW)

**Affected Code**:
- `src/lib/services/analytics-service.ts` - 数据分析
- `src/lib/services/health-score-calculator.ts` - 评分计算
- `src/app/api/dashboard/**` - 仪表盘API
- `src/components/dashboard/**` - 图表组件

**Breaking Changes**: 无

**Dependencies**:
- Recharts（图表库）
- date-fns（日期处理）
- 依赖health-data-collection（健康数据）
- 依赖meal-planning（营养数据）

**Estimated Effort**: 4天开发 + 1天测试
