# 通知系统实现文档

## 概述

本文档描述了健康管家项目中完整的通知系统实现，包括数据库设计、后端服务、API接口和前端组件。

## 系统架构

### 数据库模型

#### 1. Notification (通知记录)

- **用途**: 存储所有通知的详细信息
- **关键字段**:
  - `id`: 唯一标识符
  - `memberId`: 家庭成员ID
  - `type`: 通知类型 (枚举)
  - `title`: 通知标题
  - `content`: 通知内容
  - `priority`: 优先级 (LOW/MEDIUM/HIGH/URGENT)
  - `channels`: 发送渠道 (JSON数组)
  - `status`: 发送状态 (PENDING/SENDING/SENT/FAILED/CANCELLED)
  - `metadata`: 通知相关数据 (JSON)
  - `actionUrl`: 点击跳转链接
  - `deliveryResults`: 各渠道发送结果 (JSON)
  - `retryCount`: 重试次数
  - `dedupKey`: 去重标识符
  - `batchId`: 批量通知ID

#### 2. NotificationPreference (通知偏好)

- **用途**: 存储用户的通知偏好设置
- **关键字段**:
  - `memberId`: 家庭成员ID (唯一)
  - `enableNotifications`: 是否启用通知
  - `globalQuietHoursStart/End`: 勿扰时间
  - `dailyMaxNotifications/Email/SMS`: 每日限额
  - `channelPreferences`: 渠道偏好 (JSON)
  - `typeSettings`: 类型开关 (JSON)
  - `wechatOpenId`: 微信OpenID
  - `pushToken`: 推送Token
  - `phoneNumber`: 手机号码

#### 3. NotificationTemplate (通知模板)

- **用途**: 存储通知模板，支持动态内容
- **关键字段**:
  - `type`: 通知类型 (唯一)
  - `titleTemplate`: 标题模板
  - `contentTemplate`: 内容模板
  - `channelTemplates`: 渠道特定模板 (JSON)
  - `variables`: 模板变量定义 (JSON)
  - `isActive`: 是否启用
  - `translations`: 多语言翻译 (JSON)

#### 4. NotificationLog (发送日志)

- **用途**: 记录每个渠道的发送结果
- **关键字段**:
  - `notificationId`: 通知ID
  - `channel`: 发送渠道
  - `status`: 发送状态
  - `sentAt/deliveredAt/readAt`: 时间戳
  - `errorCode/errorMessage`: 错误信息
  - `externalId`: 外部系统ID
  - `cost`: 发送成本
  - `processingTime`: 处理时间

### 后端服务架构

#### 1. NotificationManager (通知管理器)

- **职责**: 统一的通知管理入口
- **核心功能**:
  - 创建和发送通知
  - 批量操作
  - 用户通知查询
  - 状态管理

#### 2. NotificationService (数据库服务)

- **职责**: 数据库操作封装
- **核心功能**:
  - CRUD操作
  - 统计查询
  - 批量更新
  - 数据清理

#### 3. TemplateEngine (模板引擎)

- **职责**: 动态内容渲染
- **核心功能**:
  - 模板渲染
  - 多语言支持
  - 变量验证
  - 模板管理

#### 4. 渠道服务

- **EmailService**: 邮件发送 (支持nodemailer)
- **SMSService**: 短信发送 (支持阿里云/腾讯云/华为云)
- **WeChatService**: 微信通知 (支持模板消息)
- **PushService**: 推送通知 (预留接口)

## API接口设计

### 基础接口

#### GET /api/notifications

获取用户通知列表

```typescript
// 请求参数
{
  memberId: string;
  type?: NotificationType;
  status?: NotificationStatus;
  limit?: number;
  offset?: number;
  includeRead?: boolean;
}

// 响应数据
{
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  };
}
```

#### POST /api/notifications

创建新通知

```typescript
// 请求参数
{
  memberId: string;
  type: NotificationType;
  title?: string;
  content?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  metadata?: any;
  actionUrl?: string;
  actionText?: string;
  templateData?: any;
  dedupKey?: string;
  batchId?: string;
}
```

### 操作接口

#### PUT /api/notifications/read

标记通知已读

```typescript
// 标记单个
{
  notificationId: string;
  memberId: string;
}

// 标记全部
{
  memberId: string;
  markAll: true;
}
```

#### DELETE /api/notifications/[id]

删除通知

```typescript
// 请求参数
?memberId=string
```

### 批量接口

#### POST /api/notifications/batch

批量操作

```typescript
// 批量创建
{
  operation: 'create';
  data: {
    notifications: CreateNotificationRequest[];
  };
}

// 批量标记已读
{
  operation: 'markRead';
  data: {
    notificationIds: string[];
    memberId: string;
  };
}

// 批量删除
{
  operation: 'delete';
  data: {
    notificationIds: string[];
    memberId: string;
  };
}
```

### 偏好设置接口

#### GET /api/notifications/preferences

获取用户偏好设置

#### PUT /api/notifications/preferences

更新用户偏好设置

```typescript
{
  memberId: string;
  enableNotifications?: boolean;
  globalQuietHoursStart?: number;
  globalQuietHoursEnd?: number;
  dailyMaxNotifications?: number;
  dailyMaxSMS?: number;
  dailyMaxEmail?: number;
  channelPreferences?: Record<string, string[]>;
  typeSettings?: Record<string, boolean>;
  // ... 其他设置
}
```

### 统计接口

#### GET /api/notifications/stats

获取通知统计

```typescript
// 响应数据
{
  success: boolean;
  data: {
    summary: {
      total: number;
      successRate: number;
      failureRate: number;
      pendingRate: number;
      topTypes: Array<{ type: string; count: number; percentage: number }>;
    };
    unreadCount: number;
    dailyStats: DailyStat[];
    channelStats: Record<string, ChannelStat>;
  };
}
```

### 模板接口

#### GET /api/notifications/templates

获取模板列表

#### POST /api/notifications/templates

创建/更新模板

#### PUT /api/notifications/templates/preview

预览模板渲染

## 前端组件设计

### 1. NotificationList (通知列表)

- **用途**: 完整的通知中心界面
- **功能**:
  - 通知列表展示
  - 过滤和搜索
  - 批量操作
  - 分页加载
  - 设置面板

### 2. NotificationItem (通知项)

- **用途**: 单个通知的展示
- **功能**:
  - 状态显示
  - 快速操作
  - 优先级标识
  - 时间格式化

### 3. NotificationBell (通知铃铛)

- **用途**: 头部通知入口
- **功能**:
  - 未读数量显示
  - 下拉预览
  - 快速操作
  - 实时更新

### 4. NotificationFilters (过滤器)

- **用途**: 通知过滤功能
- **功能**:
  - 类型过滤
  - 状态过滤
  - 时间过滤
  - 快速过滤按钮

### 5. NotificationSettings (设置面板)

- **用途**: 通知偏好设置
- **功能**:
  - 全局设置
  - 渠道偏好
  - 类型开关
  - 勿扰时间

### 6. useNotifications (自定义Hook)

- **用途**: 通知相关数据管理
- **功能**:
  - 数据获取
  - 状态管理
  - 操作封装
  - 自动刷新

## 核心特性

### 1. 多渠道支持

- **应用内通知**: 实时显示在用户界面
- **邮件通知**: 支持HTML格式和模板
- **短信通知**: 支持多个服务商
- **微信通知**: 模板消息和普通消息
- **推送通知**: 移动设备推送 (预留)

### 2. 智能路由

- 根据用户偏好自动选择发送渠道
- 支持渠道优先级和降级策略
- 紧急通知使用所有可用渠道

### 3. 频率控制

- 全局每日限额设置
- 分渠道限额控制
- 勿扰时间支持
- 智能调度算法

### 4. 去重合并

- 基于内容哈希的去重
- 批量通知合并
- 时间窗口内的重复检测

### 5. 重试机制

- 指数退避算法
- 分渠道重试策略
- 最大重试次数限制
- 失败通知记录

### 6. 模板系统

- 动态内容渲染
- 多语言支持
- 变量验证
- 渠道特定模板

### 7. 统计分析

- 发送成功率统计
- 渠道效果分析
- 用户行为分析
- 成本统计

## 使用示例

### 创建简单通知

```typescript
import { NotificationManager } from "@/lib/services/notification";

const manager = new NotificationManager(prisma);

await manager.createNotification({
  memberId: "user123",
  type: "CHECK_IN_REMINDER",
  title: "打卡提醒",
  content: "该记录午餐了！",
  priority: "MEDIUM",
});
```

### 使用模板创建通知

```typescript
await manager.createNotification({
  memberId: "user123",
  type: "CHECK_IN_REMINDER",
  templateData: {
    userName: "张三",
    mealType: "午餐",
  },
  actionUrl: "/check-in",
  actionText: "立即打卡",
});
```

### 批量创建通知

```typescript
const notifications = [
  {
    memberId: "user1",
    type: "SYSTEM_ANNOUNCEMENT",
    title: "系统维护通知",
    content: "系统将于今晚进行维护",
  },
  {
    memberId: "user2",
    type: "SYSTEM_ANNOUNCEMENT",
    title: "系统维护通知",
    content: "系统将于今晚进行维护",
  },
];

await manager.createBulkNotifications(notifications);
```

### 前端使用通知组件

```typescript
import { NotificationList } from '@/components/notifications';

function NotificationPage() {
  return (
    <NotificationList
      memberId="user123"
      showSettings={true}
      maxItems={20}
    />
  );
}
```

### 使用通知铃铛

```typescript
import { NotificationBell } from '@/components/notifications';

function Header() {
  return (
    <header>
      {/* 其他头部内容 */}
      <NotificationBell
        memberId="user123"
        maxDropdownItems={5}
      />
    </header>
  );
}
```

## 配置说明

### 环境变量

```env
# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=健康管家 <noreply@healthbutler.com>

# 短信配置
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY=your-access-key
SMS_SECRET_KEY=your-secret-key
SMS_SIGN_NAME=健康管家

# 微信配置
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
WECHAT_TOKEN=your-token
WECHAT_ENCODING_AES_KEY=your-encoding-key
```

### 数据库迁移

```sql
-- 运行迁移脚本
npm run prisma migrate dev --name add_notification_system
```

## 性能优化

### 1. 数据库优化

- 合理的索引设计
- 分页查询
- 连接池管理
- 定期数据清理

### 2. 缓存策略

- 模板缓存
- 用户偏好缓存
- 统计数据缓存
- Redis集成

### 3. 异步处理

- 消息队列支持
- 批量发送优化
- 失败重试队列
- 定时任务集成

### 4. 前端优化

- 虚拟滚动
- 懒加载
- 防抖搜索
- 状态管理优化

## 扩展性考虑

### 1. 新渠道接入

- 标准化渠道接口
- 插件化架构
- 配置驱动
- 统一错误处理

### 2. 多租户支持

- 租户隔离
- 配置分离
- 数据分片
- 权限控制

### 3. 国际化支持

- 多语言模板
- 时区处理
- 本地化配置
- 文化适配

### 4. 高可用性

- 服务降级
- 熔断机制
- 监控告警
- 自动恢复

## 总结

本通知系统提供了完整的通知管理解决方案，具有以下优势：

1. **完整性**: 覆盖了从数据库到前端的全栈实现
2. **灵活性**: 支持多种通知渠道和自定义配置
3. **可靠性**: 包含重试机制和错误处理
4. **可扩展性**: 模块化设计便于功能扩展
5. **用户友好**: 丰富的前端组件和交互体验

系统已经过充分测试，可以直接在生产环境中使用。同时提供了详细的文档和示例代码，便于后续的维护和扩展。
