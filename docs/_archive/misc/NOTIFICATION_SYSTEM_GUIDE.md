# 通知系统使用指南

## 概述

本项目已成功集成了完整的多平台通知系统，支持应用内、邮件、短信、微信和推送通知。系统具备模板管理、用户偏好、发送日志、重试机制、频率控制等功能。

## 系统架构

### 核心组件

1. **NotificationManager** - 通知管理器，统一处理所有通知逻辑
2. **NotificationService** - 通知数据服务，负责数据库操作
3. **EmailService** - 邮件发送服务
4. **SMSService** - 短信发送服务
5. **WeChatService** - 微信通知服务
6. **TemplateEngine** - 模板引擎，处理通知内容渲染

### 数据模型

- **Notification** - 通知记录
- **NotificationPreference** - 用户通知偏好设置
- **NotificationTemplate** - 通知模板
- **NotificationLog** - 发送日志

## 快速开始

### 1. 创建基本通知

```typescript
import { NotificationManager } from "@/lib/services/notification";
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from "@prisma/client";

const prisma = new PrismaClient();
const notificationManager = new NotificationManager(prisma);

// 创建简单通知
const result = await notificationManager.createNotification({
  memberId: "user-member-id",
  type: NotificationType.CHECK_IN_REMINDER,
  title: "打卡提醒",
  content: "该记录午餐了！",
  priority: NotificationPriority.MEDIUM,
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
});
```

### 2. 使用模板创建通知

```typescript
// 使用预定义模板
const result = await notificationManager.createNotification({
  memberId: "user-member-id",
  type: NotificationType.CHECK_IN_REMINDER,
  templateData: {
    userName: "张三",
    mealType: "午餐",
  },
  priority: NotificationPriority.MEDIUM,
  channels: [NotificationChannel.IN_APP],
});
```

### 3. 批量发送通知

```typescript
const requests = [
  {
    memberId: "member-1",
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: "系统维护通知",
    content: "系统将于今晚进行维护",
    priority: NotificationPriority.HIGH,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  },
  {
    memberId: "member-2",
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: "系统维护通知",
    content: "系统将于今晚进行维护",
    priority: NotificationPriority.HIGH,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  },
];

const results = await notificationManager.createBulkNotifications(requests);
```

## 通知类型

系统支持以下通知类型：

- `CHECK_IN_REMINDER` - 打卡提醒
- `TASK_NOTIFICATION` - 任务通知
- `EXPIRY_ALERT` - 过期提醒
- `BUDGET_WARNING` - 预算预警
- `HEALTH_ALERT` - 健康异常提醒
- `GOAL_ACHIEVEMENT` - 目标达成
- `FAMILY_ACTIVITY` - 家庭活动通知
- `SYSTEM_ANNOUNCEMENT` - 系统公告
- `MARKETING` - 营销通知
- `OTHER` - 其他

## 通知渠道

支持多种发送渠道：

- `IN_APP` - 应用内通知
- `EMAIL` - 邮件通知
- `SMS` - 短信通知
- `WECHAT` - 微信通知
- `PUSH` - 推送通知

## 优先级设置

- `LOW` - 低优先级
- `MEDIUM` - 中优先级
- `HIGH` - 高优先级
- `URGENT` - 紧急通知

## 用户偏好管理

### 获取用户偏好

```typescript
const preferences = await notificationManager.getUserPreferences(memberId);
```

### 设置通知偏好

```typescript
// 通过API设置
PUT /api/notifications/preferences
{
  "enableNotifications": true,
  "globalQuietHoursStart": 22,
  "globalQuietHoursEnd": 8,
  "dailyMaxNotifications": 50,
  "channelPreferences": {
    "CHECK_IN_REMINDER": ["IN_APP", "EMAIL"],
    "BUDGET_WARNING": ["IN_APP", "EMAIL", "SMS"]
  },
  "typeSettings": {
    "MARKETING": false,
    "CHECK_IN_REMINDER": true
  }
}
```

## 高级功能

### 1. 去重机制

```typescript
const result = await notificationManager.createNotification({
  memberId: "user-id",
  type: NotificationType.CHECK_IN_REMINDER,
  title: "打卡提醒",
  content: "该记录午餐了！",
  dedupKey: "lunch_reminder_2023_10_31", // 5分钟内相同dedupKey的通知会被去重
  channels: [NotificationChannel.IN_APP],
});
```

### 2. 批量操作

```typescript
// 批量标记为已读
await notificationManager.markAllAsRead(memberId);

// 获取未读数量
const unreadCount = await notificationManager.getUnreadCount(memberId);
```

### 3. 通知历史

```typescript
// 获取用户通知列表
const notifications = await notificationManager.getUserNotifications(memberId, {
  type: NotificationType.CHECK_IN_REMINDER,
  limit: 20,
  offset: 0,
  includeRead: false, // 只获取未读通知
});
```

## 集成示例

### 1. 预算系统集成

```typescript
import { BudgetNotificationService } from "@/lib/services/budget/budget-notification-service";

const budgetNotificationService = new BudgetNotificationService(prisma);

// 发送预算预警
await budgetNotificationService.sendBudgetAlert(memberId, {
  budgetName: "10月食品预算",
  usagePercentage: 85.5,
  threshold: 80,
  remainingBudget: 500,
  totalBudget: 3000,
});
```

### 2. 打卡系统集成

```typescript
import { CheckInNotificationService } from "@/lib/services/tracking/checkin-notification-service";

const checkInService = new CheckInNotificationService(prisma);

// 发送打卡提醒
await checkInService.sendCheckInReminder(memberId, "午餐");

// 发送连续打卡成就
await checkInService.sendStreakAchievement(memberId, 7);
```

### 3. 任务系统集成

```typescript
import { TaskNotificationService } from "@/lib/services/tasks/task-notification-service";

const taskService = new TaskNotificationService(prisma);

// 发送任务分配通知
await taskService.sendTaskAssignment(memberId, {
  taskTitle: "购买食材",
  description: "购买本周所需食材",
  dueDate: "2023-10-31",
  assignerName: "张三",
});
```

## API 接口

### 获取通知列表

```http
GET /api/notifications?memberId=xxx&limit=20&includeRead=false
```

### 创建通知

```http
POST /api/notifications
{
  "memberId": "user-member-id",
  "type": "CHECK_IN_REMINDER",
  "title": "打卡提醒",
  "content": "该记录午餐了！",
  "priority": "MEDIUM",
  "channels": ["IN_APP", "EMAIL"]
}
```

### 标记为已读

```http
PUT /api/notifications/read
{
  "notificationIds": ["id1", "id2"]
}
```

### 批量操作

```http
POST /api/notifications/batch
{
  "action": "mark_all_read",
  "memberId": "user-member-id"
}
```

## 前端组件

### 1. NotificationBell - 通知铃铛

```typescript
import { NotificationBell } from '@/components/notifications';

<NotificationBell
  memberId="user-member-id"
  onNotificationClick={(notification) => {
    // 处理通知点击
  }}
/>
```

### 2. NotificationCenter - 通知中心

```typescript
import { NotificationCenter } from '@/components/notifications';

<NotificationCenter
  memberId="user-member-id"
  showFilters={true}
  maxItems={50}
/>
```

### 3. NotificationSettings - 通知设置

```typescript
import { NotificationSettings } from '@/components/notifications';

<NotificationSettings
  memberId="user-member-id"
  onSave={(preferences) => {
    // 保存偏好设置
  }}
/>
```

## 配置说明

### 环境变量

```env
# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# 短信配置
SMS_ACCESS_KEY=your-access-key
SMS_SECRET_KEY=your-secret-key

# 微信配置
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret

# 推送配置
FIREBASE_SERVER_KEY=your-firebase-key
```

### 模板管理

通知模板存储在 `notification_templates` 表中，支持：

- 多语言模板
- 变量替换
- 渠道特定模板
- 版本控制

## 监控和分析

### 发送统计

```typescript
// 获取通知统计
const stats = await notificationManager.getNotificationStats(memberId, {
  startDate: new Date("2023-10-01"),
  endDate: new Date("2023-10-31"),
});
```

### 日志查询

```typescript
// 查询发送日志
const logs = await prisma.notificationLog.findMany({
  where: {
    notificationId: "notification-id",
    channel: NotificationChannel.EMAIL,
  },
  orderBy: { createdAt: "desc" },
});
```

## 最佳实践

1. **合理设置优先级** - 紧急通知使用多渠道，普通通知使用应用内
2. **控制发送频率** - 避免过度打扰用户
3. **使用模板** - 保持通知内容一致性
4. **设置勿扰时间** - 尊重用户休息时间
5. **提供退订选项** - 让用户控制通知接收
6. **监控发送成功率** - 及时发现和解决问题

## 故障排除

### 常见问题

1. **通知未发送** - 检查用户偏好设置和渠道配置
2. **邮件发送失败** - 验证SMTP配置和网络连接
3. **短信发送失败** - 检查短信服务商配置和余额
4. **微信通知失败** - 确认用户关注状态和access_token

### 调试方法

```typescript
// 启用调试模式
const notificationManager = new NotificationManager(prisma, {
  debug: true,
  logLevel: "verbose",
});
```

## 更新日志

### v1.0.0 (2023-10-31)

- 完整的通知系统实现
- 支持多渠道发送
- 模板管理功能
- 用户偏好设置
- 发送日志和统计
- 前端组件集成
- 预算系统集成
- 打卡系统集成
- 任务系统集成
