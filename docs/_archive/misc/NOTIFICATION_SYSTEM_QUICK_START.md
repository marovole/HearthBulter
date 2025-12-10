# 通知系统快速设置指南

## 🚀 快速开始

### 1. 运行数据库迁移

```bash
# 应用通知系统数据库迁移
npx prisma migrate dev --name add_notification_system

# 或者手动执行迁移文件
npx prisma db push
```

### 2. 配置环境变量

在 `.env.local` 文件中添加以下配置：

```env
# 邮件配置 (可选)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=健康管家 <noreply@healthbutler.com>

# 短信配置 (可选)
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY=your-access-key
SMS_SECRET_KEY=your-secret-key
SMS_SIGN_NAME=健康管家

# 微信配置 (可选)
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret
WECHAT_TOKEN=your-token
WECHAT_ENCODING_AES_KEY=your-encoding-key
```

### 3. 在代码中使用通知系统

#### 创建通知

```typescript
import { NotificationManager } from "@/lib/services/notification";

const manager = new NotificationManager(prisma);

// 创建简单通知
await manager.createNotification({
  memberId: "user123",
  type: "CHECK_IN_REMINDER",
  title: "打卡提醒",
  content: "该记录午餐了！",
  priority: "MEDIUM",
});

// 使用模板创建通知
await manager.createNotification({
  memberId: "user123",
  type: "HEALTH_ALERT",
  templateData: {
    userName: "张三",
    alertType: "血压异常",
    value: "140/90",
  },
  actionUrl: "/health/monitoring",
  actionText: "查看详情",
});
```

#### 使用前端组件

```typescript
import { NotificationList, NotificationBell } from '@/components/notifications';

// 通知列表页面
function NotificationPage() {
  return (
    <NotificationList
      memberId="user123"
      showSettings={true}
      maxItems={20}
    />
  );
}

// 头部通知铃铛
function Header() {
  return (
    <header>
      <NotificationBell
        memberId="user123"
        maxDropdownItems={5}
      />
    </header>
  );
}
```

### 4. 测试系统

```bash
# 运行测试脚本
npx ts-node src/__tests__/notification-system.test.ts
```

## 📋 功能特性

### ✅ 已实现功能

- [x] 多渠道通知 (应用内、邮件、短信、微信)
- [x] 智能路由和用户偏好
- [x] 模板系统和动态内容
- [x] 批量操作和去重
- [x] 重试机制和错误处理
- [x] 统计分析和报告
- [x] 前端组件和交互
- [x] API接口和文档

### 🔄 可选配置

- [ ] Redis缓存集成
- [ ] 消息队列 (RabbitMQ/Redis)
- [ ] 推送通知集成
- [ ] 多语言国际化
- [ ] 高级统计分析

## 🛠️ 常用操作

### 查看通知

```bash
# 获取用户通知列表
GET /api/notifications?memberId=user123&limit=20

# 获取未读数量
GET /api/notifications/stats?memberId=user123
```

### 管理通知

```bash
# 标记为已读
PUT /api/notifications/read
{
  "notificationId": "notif123",
  "memberId": "user123"
}

# 删除通知
DELETE /api/notifications/notif123?memberId=user123
```

### 设置偏好

```bash
# 获取用户偏好
GET /api/notifications/preferences?memberId=user123

# 更新用户偏好
PUT /api/notifications/preferences
{
  "memberId": "user123",
  "enableNotifications": true,
  "globalQuietHoursStart": 22,
  "globalQuietHoursEnd": 8
}
```

## 🔧 故障排除

### 常见问题

1. **通知未发送**
   - 检查用户偏好设置
   - 验证渠道配置 (SMTP、短信等)
   - 查看发送日志

2. **前端组件不显示**
   - 确认 memberId 参数正确
   - 检查 API 接口响应
   - 验证组件导入路径

3. **数据库错误**
   - 运行数据库迁移
   - 检查 Prisma 配置
   - 验证数据库连接

### 调试模式

```typescript
// 启用详细日志
const manager = new NotificationManager(prisma, {
  debug: true,
  logLevel: "verbose",
});
```

## 📚 更多文档

- [完整实现文档](./NOTIFICATION_SYSTEM_IMPLEMENTATION.md)
- [API接口文档](./docs/api/notifications.md)
- [组件使用指南](./docs/components/notifications.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进通知系统！

---

**注意**: 这是一个企业级的通知系统，包含完整的前后端实现。在生产环境使用前，请确保：

1. 配置适当的安全措施
2. 设置监控和日志
3. 进行充分的测试
4. 根据业务需求调整配置
