-- Migration: Add notification system models
-- Created: 2025-10-31
-- Description: Add comprehensive notification system with support for multiple channels, templates, preferences, and logging

-- Create notification types enum
CREATE TYPE "NotificationType" AS ENUM (
  'CHECK_IN_REMINDER',
  'TASK_NOTIFICATION',
  'EXPIRY_ALERT',
  'BUDGET_WARNING',
  'HEALTH_ALERT',
  'GOAL_ACHIEVEMENT',
  'FAMILY_ACTIVITY',
  'SYSTEM_ANNOUNCEMENT',
  'MARKETING',
  'OTHER'
);

-- Create notification channels enum
CREATE TYPE "NotificationChannel" AS ENUM (
  'IN_APP',
  'EMAIL',
  'SMS',
  'WECHAT',
  'PUSH'
);

-- Create notification priority enum
CREATE TYPE "NotificationPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Create notification status enum
CREATE TYPE "NotificationStatus" AS ENUM (
  'PENDING',
  'SENDING',
  'SENT',
  'FAILED',
  'CANCELLED'
);

-- Create notification templates table
CREATE TABLE "notification_templates" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "titleTemplate" TEXT NOT NULL,
  "contentTemplate" TEXT NOT NULL,
  "channelTemplates" TEXT NOT NULL DEFAULT '{}',
  "variables" TEXT NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "defaultChannels" TEXT NOT NULL DEFAULT '["IN_APP"]',
  "defaultPriority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
  "translations" TEXT NOT NULL DEFAULT '{}',
  "description" TEXT,
  "category" TEXT,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsed" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- Create unique index on type
CREATE UNIQUE INDEX "notification_templates_type_key" ON "notification_templates"("type");

-- Create indexes for notification_templates
CREATE INDEX "notification_templates_isActive_idx" ON "notification_templates"("isActive");
CREATE INDEX "notification_templates_category_idx" ON "notification_templates"("category");

-- Create notification preferences table
CREATE TABLE "notification_preferences" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
  "globalQuietHoursStart" INTEGER,
  "globalQuietHoursEnd" INTEGER,
  "dailyMaxNotifications" INTEGER NOT NULL DEFAULT 50,
  "dailyMaxSMS" INTEGER NOT NULL DEFAULT 5,
  "dailyMaxEmail" INTEGER NOT NULL DEFAULT 20,
  "channelPreferences" TEXT NOT NULL DEFAULT '{}',
  "typeSettings" TEXT NOT NULL DEFAULT '{}',
  "wechatOpenId" TEXT,
  "wechatSubscribed" BOOLEAN NOT NULL DEFAULT false,
  "pushToken" TEXT,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailUnsubscribedAt" TIMESTAMP(3),
  "phoneEnabled" BOOLEAN NOT NULL DEFAULT true,
  "phoneNumber" TEXT,
  "enableSmartScheduling" BOOLEAN NOT NULL DEFAULT true,
  "enableDeduplication" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- Create unique index on memberId
CREATE UNIQUE INDEX "notification_preferences_memberId_key" ON "notification_preferences"("memberId");

-- Create index for notification_preferences
CREATE INDEX "notification_preferences_memberId_idx" ON "notification_preferences"("memberId");

-- Add foreign key constraint for member
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_memberId_fkey" 
  FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create notifications table
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
  "channels" TEXT NOT NULL DEFAULT '["IN_APP"]',
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "metadata" JSONB,
  "actionUrl" TEXT,
  "actionText" TEXT,
  "deliveryResults" TEXT NOT NULL DEFAULT '{}',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 3,
  "nextRetryAt" TIMESTAMP(3),
  "isDeduped" BOOLEAN NOT NULL DEFAULT false,
  "dedupKey" TEXT,
  "batchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Create indexes for notifications
CREATE INDEX "notifications_memberId_idx" ON "notifications"("memberId");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_status_idx" ON "notifications"("status");
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
CREATE INDEX "notifications_readAt_idx" ON "notifications"("readAt");
CREATE INDEX "notifications_dedupKey_idx" ON "notifications"("dedupKey");
CREATE INDEX "notifications_batchId_idx" ON "notifications"("batchId");

-- Add foreign key constraint for member
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_memberId_fkey" 
  FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create notification logs table
CREATE TABLE "notification_logs" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationStatus" NOT NULL,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "errorDetails" JSONB,
  "externalId" TEXT,
  "trackingData" JSONB,
  "cost" DOUBLE PRECISION,
  "currency" TEXT,
  "processingTime" INTEGER,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for notification_logs
CREATE INDEX "notification_logs_notificationId_idx" ON "notification_logs"("notificationId");
CREATE INDEX "notification_logs_channel_idx" ON "notification_logs"("channel");
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");
CREATE INDEX "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");
CREATE INDEX "notification_logs_externalId_idx" ON "notification_logs"("externalId");

-- Add foreign key constraint for notification
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notificationId_fkey" 
  FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default notification templates
INSERT INTO "notification_templates" ("id", "type", "titleTemplate", "contentTemplate", "description", "category") VALUES
  ('tmpl_check_in_reminder', 'CHECK_IN_REMINDER', '打卡提醒', 'Hi {{userName}}, 该记录{{mealType}}了！保持健康的饮食习惯很重要哦。', '每日餐饮打卡提醒', '健康提醒'),
  ('tmpl_task_notification', 'TASK_NOTIFICATION', '任务通知', '您有一个新任务：{{taskTitle}}，截止时间：{{dueDate}}', '任务分配和提醒通知', '协作'),
  ('tmpl_expiry_alert', 'EXPIRY_ALERT', '过期提醒', '您的食材 {{foodName}} 即将过期，请及时使用！', '食材过期预警', '库存管理'),
  ('tmpl_budget_warning', 'BUDGET_WARNING', '预算预警', '您的{{budgetName}}已使用{{usagePercentage}}%，请注意控制支出。', '预算使用超支提醒', '财务管理'),
  ('tmpl_health_alert', 'HEALTH_ALERT', '健康异常提醒', '检测到您的{{healthMetric}}出现异常，建议关注。', '健康数据异常通知', '健康监控'),
  ('tmpl_goal_achievement', 'GOAL_ACHIEVEMENT', '目标达成', '恭喜！您已达成目标：{{goalTitle}}', '目标完成庆祝', '激励机制'),
  ('tmpl_family_activity', 'FAMILY_ACTIVITY', '家庭活动', '{{memberName}} {{activityDescription}}', '家庭成员活动动态', '家庭协作'),
  ('tmpl_system_announcement', 'SYSTEM_ANNOUNCEMENT', '系统公告', '{{announcementContent}}', '系统重要公告', '系统通知'),
  ('tmpl_marketing', 'MARKETING', '优惠推荐', '{{promotionContent}}', '营销推广信息', '营销'),
  ('tmpl_other', 'OTHER', '通知', '{{notificationContent}}', '其他类型通知', '通用');

-- Create trigger to update updatedAt column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER "notification_templates_updated_at" BEFORE UPDATE ON "notification_templates"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "notification_preferences_updated_at" BEFORE UPDATE ON "notification_preferences"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "notifications_updated_at" BEFORE UPDATE ON "notifications"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "notification_logs_updated_at" BEFORE UPDATE ON "notification_logs"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
