# Proposal: Add Health Data Collection

## Why

健康数据采集是数据闭环的关键环节。用户需要能够方便地记录日常健康指标（体重、体脂、血压等），为食谱优化和健康分析提供数据基础。这是MVP的核心功能之一。

## What Changes

- 实现健康数据手动录入功能
- 创建历史数据查询和趋势分析API
- 实现数据有效性验证（范围检查、异常检测）
- 添加提醒和打卡功能
- 创建数据录入UI组件

## Impact

**Affected Specs**:
- `health-data-collection` (NEW)

**Affected Code**:
- `prisma/schema.prisma` - HealthData模型
- `src/app/api/members/[id]/health-data/**` - 健康数据API
- `src/lib/services/health-data-validator.ts` - 数据验证服务
- `src/components/health/**` - 健康数据录入UI

**Breaking Changes**: 无

**Dependencies**:
- date-fns (日期处理)
- Recharts (趋势图表)

**Estimated Effort**: 3天开发 + 1天测试
