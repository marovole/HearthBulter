# 营养摄入打卡系统实现文档

## 概述

本文档记录了营养摄入打卡系统的完整实现过程，包括数据模型、服务层、API路由和前端组件。

## 实现时间

开始：2025年10月30日
完成：2025年10月30日

## 功能清单

### ✅ 已完成功能

#### 1. 数据模型设计

- **MealLog** - 餐饮记录表
- **MealLogFood** - 餐饮记录食物关联表
- **FoodPhoto** - 食物照片表
- **TrackingStreak** - 连续打卡记录表
- **QuickTemplate** - 快速模板表
- **TemplateFood** - 模板食物关联表
- **DailyNutritionTarget** - 每日营养目标追踪表
- **AuxiliaryTracking** - 辅助打卡表（饮水、运动、睡眠、体重）

数据库迁移文件：`prisma/migrations/add_nutrition_tracking.sql`

#### 2. 服务层

##### 餐饮打卡服务 (`src/lib/services/tracking/meal-tracker.ts`)
- 创建餐饮记录
- 计算营养成分
- 获取今日/历史餐饮记录
- 更新和删除餐饮记录
- 获取最近常吃的食物
- 自动更新每日营养目标追踪
- 自动更新连续打卡记录

##### 连续打卡管理服务 (`src/lib/services/tracking/streak-manager.ts`)
- 获取连续打卡记录
- 徽章系统（7天、30天、100天、365天）
- 打卡统计（周、月、年）
- 打卡日历
- 家庭排行榜
- 自动解锁徽章

##### 快速模板管理服务 (`src/lib/services/tracking/template-manager.ts`)
- 创建快速模板
- 从餐饮记录创建模板
- 获取模板列表
- 智能推荐模板
- 模板使用统计
- 自动生成模板

##### 食物识别服务 (`src/lib/services/tracking/food-recognition.ts`)
- 上传食物照片
- AI识别食物（占位实现，待集成真实AI服务）
- 获取识别结果
- 手动修正识别结果
- 批量上传照片

##### 偏差分析服务 (`src/lib/services/tracking/deviation-analyzer.ts`)
- 单日营养偏差分析
- 周期性偏差分析
- 生成周报告
- 剩余餐次建议
- 营养调整建议

##### 辅助打卡服务 (`src/lib/services/tracking/auxiliary-tracker.ts`)
- 饮水打卡
- 运动打卡（含卡路里估算）
- 睡眠打卡
- 体重打卡（自动更新BMI）
- 历史数据统计
- 趋势分析

#### 3. API路由

##### 餐饮打卡 API
- `POST /api/tracking/meals` - 创建餐饮记录
- `GET /api/tracking/meals` - 获取餐饮记录
- `PATCH /api/tracking/meals/[id]` - 更新餐饮记录
- `DELETE /api/tracking/meals/[id]` - 删除餐饮记录
- `GET /api/tracking/meals/recent-foods` - 获取最近常吃的食物

##### 模板管理 API
- `POST /api/tracking/templates` - 创建模板
- `GET /api/tracking/templates` - 获取模板列表
- `PATCH /api/tracking/templates/[id]` - 更新模板
- `DELETE /api/tracking/templates/[id]` - 删除模板
- `POST /api/tracking/templates/[id]/use` - 使用模板

##### 连续打卡 API
- `GET /api/tracking/streak` - 获取连续打卡记录
- `GET /api/tracking/streak/stats` - 获取打卡统计
- `GET /api/tracking/streak/calendar` - 获取打卡日历
- `GET /api/tracking/streak/leaderboard` - 获取家庭排行榜

##### 辅助打卡 API
- `POST /api/tracking/auxiliary` - 创建辅助打卡记录
- `GET /api/tracking/auxiliary` - 获取今日辅助打卡数据
- `GET /api/tracking/auxiliary/stats` - 获取辅助打卡统计

##### 偏差分析 API
- `GET /api/tracking/deviation` - 获取营养偏差分析

#### 4. 前端组件

##### 核心组件
- **MealCheckIn** (`src/components/tracking/MealCheckIn.tsx`)
  - 餐食类型选择（早/午/晚/加餐）
  - 食物添加和份量调整
  - 营养摘要显示
  - 备注功能

- **NutritionProgress** (`src/components/tracking/NutritionProgress.tsx`)
  - 单个营养素进度条
  - 每日营养进度总览
  - 超标/不足提示
  - 实时进度更新

- **StreakBadge** (`src/components/tracking/StreakBadge.tsx`)
  - 连续打卡天数展示
  - 徽章系统
  - 下一个徽章进度
  - 鼓励语

- **TrackingCalendar** (`src/components/tracking/TrackingCalendar.tsx`)
  - 月度打卡日历
  - 打卡状态标识
  - 打卡统计

- **AuxiliaryTracking** (`src/components/tracking/AuxiliaryTracking.tsx`)
  - 饮水打卡组件
  - 运动打卡组件
  - 体重打卡组件
  - 睡眠打卡组件

## 技术栈

- **数据库**: PostgreSQL (Prisma ORM)
- **后端**: Next.js API Routes
- **前端**: React + TypeScript
- **验证**: Zod
- **认证**: NextAuth.js

## 数据流程

### 1. 餐饮打卡流程

```
用户选择餐食类型 → 添加食物和份量 → 系统计算营养成分 →
创建MealLog记录 → 更新DailyNutritionTarget → 更新TrackingStreak
```

### 2. 营养分析流程

```
获取每日MealLog → 汇总计算实际摄入 → 对比目标值 →
计算偏差百分比 → 生成建议 → 前端展示
```

### 3. 连续打卡流程

```
创建打卡记录 → 检查是否连续 → 更新currentStreak →
检查徽章解锁条件 → 解锁新徽章 → 更新longestStreak
```

## 核心算法

### 1. 营养成分计算

```typescript
// 基于100g的营养数据按份量比例计算
const ratio = amount / 100;
nutrition.calories += foodInfo.calories * ratio;
nutrition.protein += foodInfo.protein * ratio;
// ... 其他营养素
```

### 2. 偏差分析

```typescript
// 计算偏差百分比
const deviation = ((actual - target) / target) * 100;

// 判断严重程度
if (Math.abs(deviation) < 10) status = 'normal';
else if (Math.abs(deviation) < 20) severity = 'mild';
else if (Math.abs(deviation) < 30) severity = 'moderate';
else severity = 'severe';
```

### 3. 连续打卡判断

```typescript
// 检查是否是连续的一天
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const isConsecutive = lastCheckIn.getTime() === yesterday.getTime();
const newStreak = isConsecutive ? currentStreak + 1 : 1;
```

## 待优化项

### 1. 食物识别

当前是占位实现，需要集成真实的AI服务：
- TensorFlow.js + 食物识别模型
- Clarifai Food Model API
- Google Cloud Vision API
- 自定义训练模型

### 2. 智能提醒

需要集成推送服务：
- Web Push Notifications
- 邮件提醒
- 微信/钉钉机器人推送

### 3. 性能优化

- 添加数据缓存（Redis）
- 优化数据库查询（索引优化）
- 实现分页和懒加载
- 图片压缩和CDN

### 4. 测试覆盖

需要添加：
- 单元测试
- 集成测试
- E2E测试
- 性能测试

## 使用指南

### 1. 数据库迁移

```bash
# 生成Prisma客户端
npx prisma generate

# 运行迁移
npx prisma db push

# 或手动执行SQL
psql -d your_database -f prisma/migrations/add_nutrition_tracking.sql
```

### 2. API调用示例

#### 创建餐饮记录

```typescript
const response = await fetch('/api/tracking/meals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    memberId: 'xxx',
    date: new Date(),
    mealType: 'BREAKFAST',
    foods: [
      { foodId: 'food1', amount: 100 },
      { foodId: 'food2', amount: 50 },
    ],
    notes: '早餐很美味',
  }),
});
```

#### 获取打卡统计

```typescript
const response = await fetch(
  '/api/tracking/streak/stats?memberId=xxx&period=week'
);
const stats = await response.json();
```

### 3. 组件使用示例

```tsx
import { MealCheckIn } from '@/components/tracking/MealCheckIn';
import { DailyNutritionProgress } from '@/components/tracking/NutritionProgress';

function TrackingPage() {
  const handleSubmit = async (data) => {
    await fetch('/api/tracking/meals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <div>
      <MealCheckIn memberId="xxx" onSubmit={handleSubmit} />
      <DailyNutritionProgress targets={targets} />
    </div>
  );
}
```

## 参考资料

- [Prisma文档](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Zod验证库](https://zod.dev/)
- [USDA食物数据库](https://fdc.nal.usda.gov/)

## 贡献者

- Ronn Huang - 初始实现

## 许可证

本项目采用 MIT 许可证

