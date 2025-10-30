# Proposal: Add Nutrition Tracking System

## Why

虽然系统可以生成食谱，但缺乏用户实际执行情况的追踪。开发营养摄入打卡系统，让用户记录每日三餐实际食用情况，与计划对比，发现偏差并调整，形成完整的健康管理闭环。

## What Changes

- 开发每日三餐打卡功能
- 实现食物拍照识别（AI图像识别）
- 添加快速记录模板（常吃食物）
- 开发实际摄入vs目标对比
- 实现营养偏差分析和提醒
- 添加打卡历史和统计
- 开发连续打卡激励机制
- 实现饮水、运动等辅助打卡

## Impact

**Affected Specs**:
- `nutrition-tracking` (NEW)
- `health-tracking-dashboard` (MODIFIED - 添加打卡数据展示)

**Affected Code**:
- `src/lib/services/tracking/` - 打卡服务（新增）
  - `meal-tracker.ts` - 餐饮打卡
  - `food-recognition.ts` - 食物识别
  - `nutrition-calculator.ts` - 营养计算（扩展）
  - `streak-manager.ts` - 连续打卡管理
- `src/app/api/tracking/**` - 打卡API路由
- `src/components/tracking/` - 打卡组件（新增）
  - `MealCheckIn.tsx` - 餐饮打卡
  - `FoodPhotoUpload.tsx` - 拍照上传
  - `NutritionProgress.tsx` - 营养进度
  - `StreakBadge.tsx` - 连续打卡徽章
- Prisma Schema - 添加MealLog, FoodPhoto, TrackingStreak模型

**Breaking Changes**: 无

**Dependencies**:
- 图像识别API：TensorFlow.js或第三方服务（如Clarifai Food Model）
- 图片存储：Vercel Blob或AWS S3

**Estimated Effort**: 6天开发 + 2天测试 + 1天AI模型调优

**Risks**:
- 食物识别准确率（可能需要用户手动确认）
- 图片存储成本

