import { expiryMonitor } from '@/services/expiry-monitor';
import { InventoryStatus, PrismaClient } from '@prisma/client';

interface InventoryItemRecord {
  id: string;
  memberId: string;
  quantity: number;
  unit: string;
  expiryDate: Date | null;
  daysToExpiry?: number | null;
  status: InventoryStatus;
  minStockThreshold?: number | null;
  deletedAt: Date | null;
  storageLocation: string;
  purchasePrice?: number | null;
  food: {
    name: string;
    nameEn?: string | null;
    category?: string | null;
  };
  createdAt: Date;
}

interface WasteLogRecord {
  id: string;
  inventoryItemId: string;
  memberId: string;
  wastedQuantity: number;
  wasteReason: string;
  estimatedCost?: number | null;
  createdAt: Date;
  inventoryItem: {
    food: {
      category: string;
    };
  };
}

interface NotificationRecord {
  id: string;
  memberId: string;
  title: string;
  content: string;
}

type InventoryWhere = {
  memberId?: string;
  deletedAt?: null;
  expiryDate?: { not: null } | null;
  OR?: Array<{ status: InventoryStatus }>;
};

type WasteLogWhere = {
  memberId?: string;
  createdAt?: { gte?: Date };
};

const prisma = new PrismaClient() as unknown as {
  inventoryItem: {
    findMany: jest.Mock<
      Promise<InventoryItemRecord[]>,
      [{ where?: InventoryWhere }]
    >;
    findUnique: jest.Mock<
      Promise<InventoryItemRecord | null>,
      [{ where: { id: string } }]
    >;
    update: jest.Mock<
      Promise<InventoryItemRecord>,
      [{ where: { id: string }; data: Partial<InventoryItemRecord> }]
    >;
    count: jest.Mock<
      Promise<number>,
      [{ where?: { memberId?: string; deletedAt?: null } }]
    >;
  };
  wasteLog: {
    findMany: jest.Mock<Promise<WasteLogRecord[]>, [{ where?: WasteLogWhere }]>;
    create: jest.Mock<
      Promise<WasteLogRecord>,
      [{ data: Omit<WasteLogRecord, 'id' | 'createdAt' | 'inventoryItem'> }]
    >;
  };
  notification: {
    create: jest.Mock<
      Promise<NotificationRecord>,
      [{ data: Omit<NotificationRecord, 'id'> }]
    >;
  };
};

describe('ExpiryMonitor', () => {
  const testMemberId = 'member-1';
  const testFoodName = 'Test Milk';
  const now = new Date();

  let inventoryItems: InventoryItemRecord[] = [];
  let wasteLogs: WasteLogRecord[] = [];
  let notifications: NotificationRecord[] = [];

  const createItem = (
    overrides: Partial<InventoryItemRecord>,
  ): InventoryItemRecord => ({
    id: `item-${Math.random().toString(36).slice(2)}`,
    memberId: testMemberId,
    quantity: 1,
    unit: 'L',
    expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    daysToExpiry: 5,
    status: InventoryStatus.FRESH,
    minStockThreshold: null,
    deletedAt: null,
    storageLocation: 'REFRIGERATOR',
    purchasePrice: 5,
    food: {
      name: testFoodName,
      nameEn: 'Milk',
      category: 'DAIRY',
    },
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    ...overrides,
  });

  beforeEach(() => {
    inventoryItems = [
      createItem({
        id: 'fresh-item',
        expiryDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        daysToExpiry: 10,
        status: InventoryStatus.FRESH,
      }),
      createItem({
        id: 'expiring-item',
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        daysToExpiry: 2,
        status: InventoryStatus.EXPIRING,
      }),
      createItem({
        id: 'expired-item',
        expiryDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        daysToExpiry: -1,
        status: InventoryStatus.EXPIRED,
        quantity: 0.5,
      }),
    ];
    wasteLogs = [];
    notifications = [];

    prisma.inventoryItem.findMany.mockImplementation(async ({ where } = {}) => {
      return inventoryItems.filter((item) => {
        if (where?.memberId && item.memberId !== where.memberId) return false;
        if (where?.deletedAt === null && item.deletedAt !== null) return false;
        if (where?.expiryDate?.not === null && item.expiryDate === null)
          return false;
        if (where?.OR && where.OR.length > 0) {
          const statuses = where.OR.map((cond) => cond.status);
          if (!statuses.includes(item.status)) return false;
        }
        return true;
      });
    });

    prisma.inventoryItem.findUnique.mockImplementation(async ({ where }) => {
      return inventoryItems.find((item) => item.id === where.id) ?? null;
    });

    prisma.inventoryItem.update.mockImplementation(async ({ where, data }) => {
      const index = inventoryItems.findIndex((item) => item.id === where.id);
      if (index < 0) {
        throw new Error('Inventory item not found');
      }
      const updated = {
        ...inventoryItems[index],
        ...data,
      } as InventoryItemRecord;
      inventoryItems[index] = updated;
      return updated;
    });

    prisma.inventoryItem.count.mockImplementation(async ({ where } = {}) => {
      return inventoryItems.filter((item) => {
        if (where?.memberId && item.memberId !== where.memberId) return false;
        if (where?.deletedAt === null && item.deletedAt !== null) return false;
        return true;
      }).length;
    });

    prisma.wasteLog.findMany.mockImplementation(async ({ where } = {}) => {
      return wasteLogs.filter((log) => {
        if (where?.memberId && log.memberId !== where.memberId) return false;
        if (where?.createdAt?.gte && log.createdAt < where.createdAt.gte)
          return false;
        return true;
      });
    });

    prisma.wasteLog.create.mockImplementation(async ({ data }) => {
      const sourceItem = inventoryItems.find(
        (item) => item.id === data.inventoryItemId,
      );
      const record: WasteLogRecord = {
        id: `waste-${Math.random().toString(36).slice(2)}`,
        inventoryItemId: data.inventoryItemId,
        memberId: data.memberId,
        wastedQuantity: data.wastedQuantity,
        wasteReason: data.wasteReason,
        estimatedCost: data.estimatedCost,
        createdAt: new Date(),
        inventoryItem: {
          food: {
            category: sourceItem?.food.category || 'UNKNOWN',
          },
        },
      };
      wasteLogs.push(record);
      return record;
    });

    prisma.notification.create.mockImplementation(async ({ data }) => {
      const record: NotificationRecord = {
        id: `notification-${Math.random().toString(36).slice(2)}`,
        memberId: data.memberId,
        title: data.title,
        content: data.content,
      };
      notifications.push(record);
      return record;
    });
  });

  describe('getExpiryAlerts', () => {
    it('should return expiring and expired items', async () => {
      const summary = await expiryMonitor.getExpiryAlerts(testMemberId);

      expect(summary.memberId).toBe(testMemberId);
      expect(summary.expiringItems).toHaveLength(1);
      expect(summary.expiredItems).toHaveLength(1);
      expect(summary.expiringItems[0].itemId).toBe('expiring-item');
      expect(summary.expiredItems[0].itemId).toBe('expired-item');
    });
  });

  describe('updateItemExpiryStatus', () => {
    it('should update item status based on expiry date', async () => {
      const updated =
        await expiryMonitor.updateItemExpiryStatus('expiring-item');

      expect(updated.status).toBe(InventoryStatus.EXPIRING);
      expect(updated.daysToExpiry).toBeDefined();
    });
  });

  describe('generateExpiryNotifications', () => {
    it('should create notifications for expired and expiring items', async () => {
      await expiryMonitor.generateExpiryNotifications(testMemberId);

      expect(notifications.length).toBe(2);
      expect(notifications.some((n) => n.title.includes('已过期'))).toBe(true);
      expect(notifications.some((n) => n.title.includes('即将过期'))).toBe(
        true,
      );
    });
  });

  describe('handleExpiredItems', () => {
    it('should create waste logs and update inventory items', async () => {
      await expiryMonitor.handleExpiredItems(
        testMemberId,
        ['expired-item'],
        'EXPIRED',
      );

      expect(wasteLogs).toHaveLength(1);
      expect(wasteLogs[0].inventoryItemId).toBe('expired-item');

      const updated = inventoryItems.find((item) => item.id === 'expired-item');
      expect(updated?.quantity).toBe(0);
      expect(updated?.status).toBe(InventoryStatus.OUT_OF_STOCK);
    });
  });

  describe('getExpiryTrends', () => {
    it('should return trend data based on waste logs', async () => {
      await expiryMonitor.handleExpiredItems(
        testMemberId,
        ['expired-item'],
        'EXPIRED',
      );

      const trends = await expiryMonitor.getExpiryTrends(testMemberId, 7);

      const expiredCount = trends.dailyExpiredCounts.reduce(
        (sum, day) => sum + day.count,
        0,
      );

      expect(expiredCount).toBeGreaterThan(0);
      expect(Array.isArray(trends.dailyExpiringCounts)).toBe(true);
      expect(Array.isArray(trends.topWasteCategories)).toBe(true);
      expect(typeof trends.wasteRate).toBe('number');
    });
  });
});
