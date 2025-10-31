import { PrismaClient } from '@prisma/client';
import { NotificationManager } from '@/lib/services/notification';
import { NotificationType, NotificationPriority, NotificationChannel } from '@prisma/client';

describe('Notification System Integration', () => {
  let prisma: PrismaClient;
  let notificationManager: NotificationManager;
  let testMemberId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    notificationManager = new NotificationManager(prisma);

    // Create test family member
    const testFamily = await prisma.family.create({
      data: {
        name: 'Test Family',
        creatorId: 'test-user-id',
      },
    });

    const testMember = await prisma.familyMember.create({
      data: {
        name: 'Test User',
        gender: 'MALE',
        birthDate: new Date('1990-01-01'),
        familyId: testFamily.id,
        userId: 'test-user-id',
      },
    });

    testMemberId = testMember.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({
      where: { memberId: testMemberId },
    });
    await prisma.familyMember.delete({
      where: { id: testMemberId },
    });
    await prisma.family.deleteMany({
      where: { name: 'Test Family' },
    });
    await prisma.$disconnect();
  });

  describe('Basic Notification Creation', () => {
    it('should create a basic in-app notification', async () => {
      const result = await notificationManager.createNotification({
        memberId: testMemberId,
        type: NotificationType.CHECK_IN_REMINDER,
        title: 'Test Notification',
        content: 'This is a test notification',
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP],
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('should create notification with template data', async () => {
      const result = await notificationManager.createNotification({
        memberId: testMemberId,
        type: NotificationType.CHECK_IN_REMINDER,
        templateData: {
          userName: 'Test User',
          mealType: '午餐',
        },
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP],
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('should create bulk notifications', async () => {
      const requests = [
        {
          memberId: testMemberId,
          type: NotificationType.TASK_NOTIFICATION,
          title: 'Task 1',
          content: 'First task',
          priority: NotificationPriority.LOW,
          channels: [NotificationChannel.IN_APP],
        },
        {
          memberId: testMemberId,
          type: NotificationType.TASK_NOTIFICATION,
          title: 'Task 2',
          content: 'Second task',
          priority: NotificationPriority.LOW,
          channels: [NotificationChannel.IN_APP],
        },
      ];

      const results = await notificationManager.createBulkNotifications(requests);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.status).toBe('PENDING');
      });
    });
  });

  describe('Notification Retrieval', () => {
    it('should get user notifications', async () => {
      const notifications = await notificationManager.getUserNotifications(
        testMemberId,
        { limit: 10, includeRead: false }
      );

      expect(notifications).toBeDefined();
      expect(notifications.notifications).toBeDefined();
      expect(Array.isArray(notifications.notifications)).toBe(true);
    });

    it('should get unread count', async () => {
      const count = await notificationManager.getUnreadCount(testMemberId);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Notification Management', () => {
    let notificationId: string;

    beforeEach(async () => {
      const result = await notificationManager.createNotification({
        memberId: testMemberId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: 'Test Management',
        content: 'Test for management operations',
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP],
      });
      notificationId = result.id;
    });

    it('should mark notification as read', async () => {
      await notificationManager.markAsRead(notificationId, testMemberId);
      
      const notifications = await notificationManager.getUserNotifications(
        testMemberId,
        { includeRead: true }
      );
      
      const readNotification = notifications.notifications.find(n => n.id === notificationId);
      expect(readNotification?.readAt).toBeDefined();
    });

    it('should mark all notifications as read', async () => {
      await notificationManager.markAllAsRead(testMemberId);
      
      const count = await notificationManager.getUnreadCount(testMemberId);
      expect(count).toBe(0);
    });

    it('should delete notification', async () => {
      await notificationManager.deleteNotification(notificationId, testMemberId);
      
      const notifications = await notificationManager.getUserNotifications(
        testMemberId,
        { includeRead: true }
      );
      
      const deletedNotification = notifications.notifications.find(n => n.id === notificationId);
      expect(deletedNotification).toBeUndefined();
    });
  });

  describe('Notification Preferences', () => {
    it('should create default preferences for new user', async () => {
      const preferences = await (notificationManager as any).getUserPreferences(testMemberId);
      
      expect(preferences).toBeDefined();
      expect(preferences.enableNotifications).toBe(true);
      expect(preferences.dailyMaxNotifications).toBe(50);
      expect(preferences.dailyMaxSMS).toBe(5);
      expect(preferences.dailyMaxEmail).toBe(20);
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate notifications with same dedup key', async () => {
      const dedupKey = 'test_dedup_key';

      const result1 = await notificationManager.createNotification({
        memberId: testMemberId,
        type: NotificationType.CHECK_IN_REMINDER,
        title: 'Dedup Test 1',
        content: 'First dedup test',
        dedupKey,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP],
      });

      const result2 = await notificationManager.createNotification({
        memberId: testMemberId,
        type: NotificationType.CHECK_IN_REMINDER,
        title: 'Dedup Test 2',
        content: 'Second dedup test',
        dedupKey,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP],
      });

      // Should return the same notification ID
      expect(result1.id).toBe(result2.id);
    });
  });
});
