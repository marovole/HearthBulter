import { expiryMonitor } from '@/services/expiry-monitor';
import { inventoryTracker } from '@/services/inventory-tracker';
import { PrismaClient, InventoryStatus, StorageLocation } from '@prisma/client';

const prisma = new PrismaClient();

describe('ExpiryMonitor', () => {
  let testMemberId: string;
  let testFoodId: string;
  let freshItemId: string;
  let expiringItemId: string;
  let expiredItemId: string;

  beforeAll(async () => {
    // 创建测试数据
    const testMember = await prisma.familyMember.create({
      data: {
        name: 'Test User',
        email: 'test-expiry@example.com',
        role: 'MEMBER',
      },
    });
    testMemberId = testMember.id;

    const testFood = await prisma.food.create({
      data: {
        name: 'Test Milk',
        nameEn: 'Milk',
        category: 'DAIRY',
        calories: 42,
        protein: 3.4,
        carbs: 5,
        fat: 1,
      },
    });
    testFoodId = testFood.id;

    // 创建不同状态的库存项目
    const now = new Date();
    
    // 新鲜物品 (10天后过期)
    const freshItem = await inventoryTracker.createInventoryItem({
      memberId: testMemberId,
      foodId: testFoodId,
      quantity: 2,
      unit: 'L',
      expiryDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      storageLocation: StorageLocation.REFRIGERATOR,
    });
    freshItemId = freshItem.id;

    // 临期物品 (2天后过期)
    const expiringItem = await inventoryTracker.createInventoryItem({
      memberId: testMemberId,
      foodId: testFoodId,
      quantity: 1,
      unit: 'L',
      expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      storageLocation: StorageLocation.REFRIGERATOR,
    });
    expiringItemId = expiringItem.id;

    // 过期物品 (1天前过期)
    const expiredItem = await inventoryTracker.createInventoryItem({
      memberId: testMemberId,
      foodId: testFoodId,
      quantity: 0.5,
      unit: 'L',
      expiryDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      storageLocation: StorageLocation.REFRIGERATOR,
    });
    expiredItemId = expiredItem.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.inventoryItem.deleteMany({
      where: { memberId: testMemberId },
    });
    await prisma.familyMember.delete({
      where: { id: testMemberId },
    });
    await prisma.food.delete({
      where: { id: testFoodId },
    });
  });

  describe('getExpiryAlerts', () => {
    it('should return correct expiry summary', async () => {
      const summary = await expiryMonitor.getExpiryAlerts(testMemberId);

      expect(summary.memberId).toBe(testMemberId);
      expect(summary.expiringItems).toHaveLength(1);
      expect(summary.expiredItems).toHaveLength(1);
      expect(summary.expiringItems[0].itemId).toBe(expiringItemId);
      expect(summary.expiredItems[0].itemId).toBe(expiredItemId);
    });

    it('should calculate days to expiry correctly', async () => {
      const summary = await expiryMonitor.getExpiryAlerts(testMemberId);

      const expiringItem = summary.expiringItems[0];
      expect(expiringItem.daysToExpiry).toBeLessThanOrEqual(3);
      expect(expiringItem.daysToExpiry).toBeGreaterThan(0);

      const expiredItem = summary.expiredItems[0];
      expect(expiredItem.daysToExpiry).toBeLessThan(0);
    });
  });

  describe('updateExpiryStatuses', () => {
    it('should update expiry statuses for all items', async () => {
      const updatedCount = await expiryMonitor.updateExpiryStatuses(testMemberId);

      expect(updatedCount).toBeGreaterThan(0);

      // 验证状态更新
      const freshItem = await inventoryTracker.getInventoryItemById(freshItemId);
      const expiringItem = await inventoryTracker.getInventoryItemById(expiringItemId);
      const expiredItem = await inventoryTracker.getInventoryItemById(expiredItemId);

      expect(freshItem?.status).toBe(InventoryStatus.FRESH);
      expect(expiringItem?.status).toBe(InventoryStatus.EXPIRING);
      expect(expiredItem?.status).toBe(InventoryStatus.EXPIRED);
    });
  });

  describe('generateExpiryNotifications', () => {
    it('should generate notifications for expiring and expired items', async () => {
      const notifications = await expiryMonitor.generateExpiryNotifications(testMemberId);

      expect(notifications.length).toBeGreaterThan(0);
      
      const hasExpiringNotification = notifications.some(n => 
        n.title.includes('即将过期')
      );
      const hasExpiredNotification = notifications.some(n => 
        n.title.includes('已过期')
      );

      expect(hasExpiringNotification).toBe(true);
      expect(hasExpiredNotification).toBe(true);
    });

    it('should include correct priority levels', async () => {
      const notifications = await expiryMonitor.generateExpiryNotifications(testMemberId);

      const expiredNotifications = notifications.filter(n => 
        n.title.includes('已过期')
      );
      const expiringNotifications = notifications.filter(n => 
        n.title.includes('即将过期')
      );

      // 过期物品应该是高优先级
      expect(expiredNotifications.every(n => n.priority === 'HIGH')).toBe(true);
      // 临期物品应该是高或中优先级
      expect(expiringNotifications.every(n => 
        n.priority === 'HIGH' || n.priority === 'MEDIUM'
      )).toBe(true);
    });
  });

  describe('handleExpiredItems', () => {
    it('should create waste records for expired items', async () => {
      await expiryMonitor.handleExpiredItems(testMemberId, [expiredItemId], 'EXPIRED');

      // 检查是否创建了浪费记录
      const wasteRecords = await prisma.wasteLog.findMany({
        where: {
          inventoryItemId: expiredItemId,
          memberId: testMemberId,
        },
      });

      expect(wasteRecords).toHaveLength(1);
      expect(wasteRecords[0].wasteReason).toBe('EXPIRED');
      expect(wasteRecords[0].wastedQuantity).toBe(0.5);
    });

    it('should remove expired items from inventory', async () => {
      const itemBefore = await inventoryTracker.getInventoryItemById(expiredItemId);
      expect(itemBefore).toBeDefined();

      await expiryMonitor.handleExpiredItems(testMemberId, [expiredItemId], 'EXPIRED');

      const itemAfter = await inventoryTracker.getInventoryItemById(expiredItemId);
      expect(itemAfter).toBeNull();
    });
  });

  describe('getExpiryTrends', () => {
    it('should return expiry trend data', async () => {
      const trends = await expiryMonitor.getExpiryTrends(testMemberId, 7);

      expect(trends).toHaveProperty('dailyExpiry');
      expect(trends).toHaveProperty('expiryRate');
      expect(trends).toHaveProperty('wasteRate');
      
      expect(Array.isArray(trends.dailyExpiry)).toBe(true);
      expect(typeof trends.expiryRate).toBe('number');
      expect(typeof trends.wasteRate).toBe('number');
    });

    it('should calculate correct trend values', async () => {
      const trends = await expiryMonitor.getExpiryTrends(testMemberId, 7);

      // 验证趋势数据包含我们的测试物品
      const totalItems = trends.dailyExpiry.reduce((sum, day) => sum + day.totalItems, 0);
      expect(totalItems).toBeGreaterThan(0);

      // 验证过期率计算
      const totalExpired = trends.dailyExpiry.reduce((sum, day) => sum + day.expiredItems, 0);
      expect(totalExpired).toBeGreaterThan(0);
    });
  });

  describe('getExpiryAnalysis', () => {
    it('should return comprehensive expiry analysis', async () => {
      const analysis = await expiryMonitor.getExpiryAnalysis(testMemberId);

      expect(analysis).toHaveProperty('summary');
      expect(analysis).toHaveProperty('byStorageLocation');
      expect(analysis).toHaveProperty('byCategory');
      expect(analysis).toHaveProperty('riskAssessment');
      expect(analysis).toHaveProperty('recommendations');

      expect(analysis.summary.totalItems).toBe(3);
      expect(analysis.summary.expiredItems).toBe(1);
      expect(analysis.summary.expiringItems).toBe(1);
      expect(analysis.summary.freshItems).toBe(1);
    });

    it('should provide meaningful recommendations', async () => {
      const analysis = await expiryMonitor.getExpiryAnalysis(testMemberId);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      
      const hasExpiryRecommendation = analysis.recommendations.some(r => 
        r.type === 'EXPIRY_MANAGEMENT'
      );
      expect(hasExpiryRecommendation).toBe(true);
    });

    it('should assess risk correctly', async () => {
      const analysis = await expiryMonitor.getExpiryAnalysis(testMemberId);

      expect(analysis.riskAssessment).toHaveProperty('overallRisk');
      expect(analysis.riskAssessment).toHaveProperty('riskFactors');
      expect(analysis.riskAssessment).toHaveProperty('riskScore');

      // 由于有过期物品，风险应该不是'LOW'
      expect(analysis.riskAssessment.overallRisk).not.toBe('LOW');
    });
  });

  describe('optimizeStorage', () => {
    it('should provide storage optimization suggestions', async () => {
      const suggestions = await expiryMonitor.optimizeStorage(testMemberId);

      expect(Array.isArray(suggestions)).toBe(true);
      
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        expect(suggestion).toHaveProperty('itemId');
        expect(suggestion).toHaveProperty('currentLocation');
        expect(suggestion).toHaveProperty('suggestedLocation');
        expect(suggestion).toHaveProperty('reason');
        expect(suggestion).toHaveProperty('priority');
      }
    });
  });
});
