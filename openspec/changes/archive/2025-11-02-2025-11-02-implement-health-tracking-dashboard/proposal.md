## Why
健康追踪仪表盘是Health Butler的核心用户界面，但目前缺少可视化图表和数据分析功能。用户无法直观了解健康趋势，影响了产品价值和用户粘性。实施仪表盘功能将显著提升用户体验，帮助用户更好地理解和管理自己的健康状况。

## What Changes
- 创建健康数据可视化图表（体重趋势、营养分析、健康评分）
- 实现数据分析和洞察功能
- 添加响应式仪表盘布局
- 集成图表库和动画效果
- 创建健康评分计算算法
- 实现个性化健康建议系统

## Impact
- Affected specs: `health-tracking-dashboard` (NEW)
- Affected code: 
  - `src/app/dashboard/` - 仪表盘页面
  - `src/components/dashboard/` - 仪表盘组件
  - `src/lib/services/` - 数据分析服务
  - `src/lib/utils/` - 图表工具函数
- Dependencies: 图表库（Chart.js 或 Recharts）
- Estimated Effort: 1-2周开发 + 3天测试
