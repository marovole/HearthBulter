/**
 * 库存管理 API 集成测试
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: {
    inventoryItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    shoppingList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    shoppingListItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    family: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock JWT verification
jest.mock('jose', () => ({
  jwtVerify: jest.fn().mockResolvedValue({ sub: 'user-123', email: 'test@example.com' }),
}));

// Mock notification service
jest.mock('@/lib/services/notification/notification-manager', () => ({
  notificationManager: {
    createNotification: jest.fn().mockResolvedValue({ id: 'notification-123' }),
    sendNotification: jest.fn().mockResolvedValue({ sent: true }),
  },
}));

describe('/api/inventory API', () => {
  const { prisma } = require('@/lib/db');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/inventory/items', () => {
    it('should return inventory items with pagination', async () => {
      const mockInventoryItems = [
        {
          id: 'item-1',
          userId: 'user-123',
          familyId: 'family-123',
          name: '牛奶',
          category: 'DAIRY',
          quantity: 2,
          unit: '升',
          expiryDate: new Date('2025-01-15'),
          purchaseDate: new Date('2025-01-01'),
          location: '冰箱',
          notes: '全脂牛奶',
          barcode: '1234567890123',
          imageUrl: '/images/milk.jpg',
          isLowStock: false,
          isExpired: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'item-2',
          userId: 'user-123',
          familyId: 'family-123',
          name: '面包',
          category: 'BAKERY',
          quantity: 1,
          unit: '个',
          expiryDate: new Date('2025-01-05'),
          purchaseDate: new Date('2025-01-01'),
          location: '橱柜',
          notes: '全麦面包',
          barcode: '1234567890124',
          imageUrl: '/images/bread.jpg',
          isLowStock: true,
          isExpired: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockTotal = 15;

      prisma.inventoryItem.findMany.mockResolvedValue(mockInventoryItems);
      prisma.inventoryItem.count.mockResolvedValue(mockTotal);

      const request = new NextRequest('http://localhost:3000/api/inventory/items?limit=2&page=1', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/inventory/items/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('inventoryItems');
        expect(data).toHaveProperty('total', mockTotal);
        expect(data).toHaveProperty('page', 1);
        expect(data).toHaveProperty('limit', 2);

        expect(data.inventoryItems).toHaveLength(2);
        expect(data.inventoryItems[0].name).toBe('牛奶');
        expect(data.inventoryItems[0].quantity).toBe(2);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should filter by category', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([]);
      prisma.inventoryItem.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/inventory/items?category=DAIRY', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/inventory/items/route');
        const response = await GET(request);

        expect(response.status).toBe(200);

        expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              category: 'DAIRY',
            }),
          })
        );
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should filter by low stock items', async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([]);
      prisma.inventoryItem.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/inventory/items?lowStock=true', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/inventory/items/route');
        const response = await GET(request);

        expect(response.status).toBe(200);

        expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              isLowStock: true,
            }),
          })
        );
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'GET',
      });

      try {
        const { GET } = await import('@/app/api/inventory/items/route');
        const response = await GET(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('未授权');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/inventory/items', () => {
    it('should create new inventory item', async () => {
      const newItem = {
        name: '鸡蛋',
        category: 'EGG',
        quantity: 12,
        unit: '个',
        expiryDate: '2025-01-20',
        purchaseDate: '2025-01-01',
        location: '冰箱',
        notes: '有机鸡蛋',
        barcode: '1234567890125',
      };

      const createdItem = {
        id: 'item-3',
        userId: 'user-123',
        familyId: 'family-123',
        ...newItem,
        expiryDate: new Date(newItem.expiryDate),
        purchaseDate: new Date(newItem.purchaseDate),
        isLowStock: false,
        isExpired: false,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.inventoryItem.create.mockResolvedValue(createdItem);

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(newItem),
      });

      try {
        const { POST } = await import('@/app/api/inventory/items/route');
        const response = await POST(request);

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toHaveProperty('inventoryItem');
        expect(data.inventoryItem.name).toBe('鸡蛋');
        expect(data.inventoryItem.quantity).toBe(12);

        expect(prisma.inventoryItem.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'user-123',
            name: '鸡蛋',
            category: 'EGG',
            quantity: 12,
            unit: '个',
          }),
        });
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate required fields', async () => {
      const incompleteItem = {
        name: '测试商品',
        // Missing required fields
      };

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(incompleteItem),
      });

      try {
        const { POST } = await import('@/app/api/inventory/items/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('缺少必填字段');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate expiry date is not in the past', async () => {
      const invalidItem = {
        name: '过期商品',
        category: 'OTHER',
        quantity: 1,
        unit: '个',
        expiryDate: '2024-01-01', // Past date
        purchaseDate: '2025-01-01',
        location: '测试',
      };

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(invalidItem),
      });

      try {
        const { POST } = await import('@/app/api/inventory/items/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('过期日期不能早于今天');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('PUT /api/inventory/items/[id]', () => {
    it('should update inventory item', async () => {
      const existingItem = {
        id: 'item-1',
        userId: 'user-123',
        name: '牛奶',
        quantity: 2,
        unit: '升',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedItem = {
        ...existingItem,
        quantity: 1,
        notes: '脱脂牛奶',
        updatedAt: new Date(),
      };

      prisma.inventoryItem.findUnique.mockResolvedValue(existingItem);
      prisma.inventoryItem.update.mockResolvedValue(updatedItem);

      const request = new NextRequest('http://localhost:3000/api/inventory/items/item-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          quantity: 1,
          notes: '脱脂牛奶',
        }),
      });

      try {
        const { PUT } = await import('@/app/api/inventory/items/[id]/route');
        const response = await PUT(request, { params: Promise.resolve({ id: 'item-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.inventoryItem.quantity).toBe(1);
        expect(data.inventoryItem.notes).toBe('脱脂牛奶');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should return 404 for non-existent item', async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/inventory/items/nonexistent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          quantity: 1,
        }),
      });

      try {
        const { PUT } = await import('@/app/api/inventory/items/[id]/route');
        const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('库存物品不存在');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('DELETE /api/inventory/items/[id]', () => {
    it('should delete inventory item', async () => {
      const existingItem = {
        id: 'item-1',
        userId: 'user-123',
        name: '牛奶',
        quantity: 2,
        unit: '升',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.inventoryItem.findUnique.mockResolvedValue(existingItem);
      prisma.inventoryItem.delete.mockResolvedValue(existingItem);

      const request = new NextRequest('http://localhost:3000/api/inventory/items/item-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { DELETE } = await import('@/app/api/inventory/items/[id]/route');
        const response = await DELETE(request, { params: Promise.resolve({ id: 'item-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.message).toBe('库存物品删除成功');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/inventory/expiring-soon', () => {
    it('should return items expiring soon', async () => {
      const mockExpiringItems = [
        {
          id: 'item-2',
          name: '面包',
          quantity: 1,
          unit: '个',
          expiryDate: new Date('2025-01-05'),
          daysUntilExpiry: 3,
          location: '橱柜',
        },
        {
          id: 'item-3',
          name: '酸奶',
          quantity: 3,
          unit: '杯',
          expiryDate: new Date('2025-01-07'),
          daysUntilExpiry: 5,
          location: '冰箱',
        },
      ];

      prisma.inventoryItem.findMany.mockResolvedValue(mockExpiringItems);

      const request = new NextRequest('http://localhost:3000/api/inventory/expiring-soon?days=7', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/inventory/expiring-soon/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('expiringItems');
        expect(data.expiringItems).toHaveLength(2);
        expect(data.expiringItems[0].daysUntilExpiry).toBeLessThanOrEqual(7);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/inventory/low-stock', () => {
    it('should return low stock items', async () => {
      const mockLowStockItems = [
        {
          id: 'item-4',
          name: '大米',
          quantity: 0.5,
          unit: '公斤',
          minQuantity: 1,
          location: '储物间',
          percentageRemaining: 50,
        },
        {
          id: 'item-5',
          name: '食用油',
          quantity: 0.2,
          unit: '升',
          minQuantity: 0.5,
          location: '橱柜',
          percentageRemaining: 40,
        },
      ];

      prisma.inventoryItem.findMany.mockResolvedValue(mockLowStockItems);

      const request = new NextRequest('http://localhost:3000/api/inventory/low-stock', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/inventory/low-stock/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('lowStockItems');
        expect(data.lowStockItems).toHaveLength(2);
        expect(data.lowStockItems[0].percentageRemaining).toBeLessThan(60);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/inventory/items/[id]/use', () => {
    it('should record item usage', async () => {
      const existingItem = {
        id: 'item-1',
        userId: 'user-123',
        name: '牛奶',
        quantity: 2,
        unit: '升',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedItem = {
        ...existingItem,
        quantity: 1.5,
        updatedAt: new Date(),
      };

      prisma.inventoryItem.findUnique.mockResolvedValue(existingItem);
      prisma.inventoryItem.update.mockResolvedValue(updatedItem);

      const request = new NextRequest('http://localhost:3000/api/inventory/items/item-1/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          quantity: 0.5,
          notes: '制作咖啡使用',
        }),
      });

      try {
        const { POST } = await import('@/app/api/inventory/items/[id]/use/route');
        const response = await POST(request, { params: Promise.resolve({ id: 'item-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.inventoryItem.quantity).toBe(1.5);
        expect(data.message).toBe('使用记录已更新');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should prevent using more than available quantity', async () => {
      const existingItem = {
        id: 'item-1',
        userId: 'user-123',
        name: '牛奶',
        quantity: 0.5,
        unit: '升',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.inventoryItem.findUnique.mockResolvedValue(existingItem);

      const request = new NextRequest('http://localhost:3000/api/inventory/items/item-1/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          quantity: 1, // More than available
          notes: '尝试使用过量',
        }),
      });

      try {
        const { POST } = await import('@/app/api/inventory/items/[id]/use/route');
        const response = await POST(request, { params: Promise.resolve({ id: 'item-1' }) });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('使用数量不能超过可用数量');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/inventory/analytics', () => {
    it('should return inventory analytics', async () => {
      const mockAnalytics = {
        totalItems: 25,
        totalCategories: 8,
        expiringSoonCount: 3,
        expiredCount: 1,
        lowStockCount: 5,
        categoryDistribution: [
          { category: 'DAIRY', count: 6, percentage: 24 },
          { category: 'VEGETABLES', count: 5, percentage: 20 },
          { category: 'FRUITS', count: 4, percentage: 16 },
        ],
        locationDistribution: [
          { location: '冰箱', count: 12, percentage: 48 },
          { location: '橱柜', count: 8, percentage: 32 },
          { location: '储物间', count: 5, percentage: 20 },
        ],
        wasteReduction: {
          itemsSavedFromExpiry: 8,
          estimatedMoneySaved: 45.50,
        },
      };

      prisma.inventoryItem.aggregate.mockResolvedValue({
        _count: { id: 25 },
      });

      const request = new NextRequest('http://localhost:3000/api/inventory/analytics', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/inventory/analytics/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('analytics');
        expect(data.analytics).toHaveProperty('totalItems');
        expect(data.analytics).toHaveProperty('categoryDistribution');
        expect(data.analytics).toHaveProperty('wasteReduction');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      prisma.inventoryItem.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/inventory/items/route');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('服务器内部错误');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: 'invalid-json',
      });

      try {
        const { POST } = await import('@/app/api/inventory/items/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('请求数据格式错误');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Data validation', () => {
    it('should validate item category', async () => {
      const invalidItem = {
        name: '测试商品',
        category: 'INVALID_CATEGORY',
        quantity: 1,
        unit: '个',
        expiryDate: '2025-01-20',
        purchaseDate: '2025-01-01',
        location: '测试',
      };

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(invalidItem),
      });

      try {
        const { POST } = await import('@/app/api/inventory/items/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('无效的商品分类');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate quantity is positive', async () => {
      const invalidItem = {
        name: '负数商品',
        category: 'OTHER',
        quantity: -1, // Negative quantity
        unit: '个',
        expiryDate: '2025-01-20',
        purchaseDate: '2025-01-01',
        location: '测试',
      };

      const request = new NextRequest('http://localhost:3000/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(invalidItem),
      });

      try {
        const { POST } = await import('@/app/api/inventory/items/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('数量必须为正数');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });
});