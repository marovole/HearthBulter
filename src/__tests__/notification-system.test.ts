import { PrismaClient } from "@prisma/client";
import { NotificationManager } from "@/lib/services/notification/notification-manager";

// 测试通知系统
async function testNotificationSystem() {
  const prisma = new PrismaClient();
  const notificationManager = new NotificationManager(prisma);

  try {
    console.log("🚀 开始测试通知系统...");

    // 测试1: 创建简单通知
    console.log("\n📝 测试1: 创建简单通知");
    const simpleNotification = await notificationManager.createNotification({
      memberId: "test-user-123",
      type: "CHECK_IN_REMINDER",
      title: "打卡提醒测试",
      content: "这是一个测试通知，请忽略。",
      priority: "MEDIUM",
    });
    console.log("✅ 简单通知创建成功:", simpleNotification.id);

    // 测试2: 使用模板创建通知
    console.log("\n📋 测试2: 使用模板创建通知");
    const templateNotification = await notificationManager.createNotification({
      memberId: "test-user-123",
      type: "HEALTH_ALERT",
      templateData: {
        userName: "测试用户",
        alertType: "血压异常",
        value: "140/90",
      },
      actionUrl: "/health/monitoring",
      actionText: "查看详情",
    });
    console.log("✅ 模板通知创建成功:", templateNotification.id);

    // 测试3: 批量创建通知
    console.log("\n📦 测试3: 批量创建通知");
    const batchNotifications = [
      {
        memberId: "test-user-123",
        type: "SYSTEM_ANNOUNCEMENT",
        title: "系统维护通知",
        content: "系统将于今晚进行维护，请提前保存数据。",
      },
      {
        memberId: "test-user-456",
        type: "SYSTEM_ANNOUNCEMENT",
        title: "系统维护通知",
        content: "系统将于今晚进行维护，请提前保存数据。",
      },
    ];

    const batchResults =
      await notificationManager.createBulkNotifications(batchNotifications);
    console.log("✅ 批量通知创建成功:", batchResults.summary);

    // 测试4: 获取用户通知列表
    console.log("\n📄 测试4: 获取用户通知列表");
    const userNotifications = await notificationManager.getUserNotifications(
      "test-user-123",
      {
        limit: 10,
        includeRead: true,
      },
    );
    console.log("✅ 用户通知列表获取成功:", userNotifications.total, "条通知");

    // 测试5: 标记通知为已读
    console.log("\n✅ 测试5: 标记通知为已读");
    await notificationManager.markAsRead(
      simpleNotification.id,
      "test-user-123",
    );
    console.log("✅ 通知标记为已读成功");

    // 测试6: 获取未读数量
    console.log("\n🔢 测试6: 获取未读数量");
    const unreadCount =
      await notificationManager.getUnreadCount("test-user-123");
    console.log("✅ 未读通知数量:", unreadCount);

    // 测试7: 获取通知统计
    console.log("\n📊 测试7: 获取通知统计");
    const stats = await notificationManager.getUserNotificationStats(
      "test-user-123",
      7,
    );
    console.log("✅ 通知统计获取成功:", stats.summary);

    // 测试8: 删除通知
    console.log("\n🗑️ 测试8: 删除通知");
    await notificationManager.deleteNotification(
      simpleNotification.id,
      "test-user-123",
    );
    console.log("✅ 通知删除成功");

    console.log("\n🎉 所有测试通过！通知系统运行正常。");

    // 输出系统信息
    console.log("\n📋 系统信息:");
    console.log(
      "- 支持的通知类型: CHECK_IN_REMINDER, TASK_NOTIFICATION, EXPIRY_ALERT, BUDGET_WARNING, HEALTH_ALERT, GOAL_ACHIEVEMENT, FAMILY_ACTIVITY, SYSTEM_ANNOUNCEMENT, MARKETING, OTHER",
    );
    console.log("- 支持的通知渠道: IN_APP, EMAIL, SMS, WECHAT, PUSH");
    console.log("- 支持的优先级: LOW, MEDIUM, HIGH, URGENT");
    console.log("- 支持的状态: PENDING, SENDING, SENT, FAILED, CANCELLED");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testNotificationSystem();
}

export { testNotificationSystem };
