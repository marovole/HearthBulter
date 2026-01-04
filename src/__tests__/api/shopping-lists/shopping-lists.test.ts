/**
 * 购物清单 API 集成测试
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: {
    shoppingList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    shoppingListItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    family: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock JWT verification
jest.mock('jose', () => ({
  jwtVerify: jest
    .fn()
    .mockResolvedValue({ sub: 'user-123', email: 'test@example.com' }),
}));

// Mock notification service
jest.mock('@/lib/services/notification/notification-manager', () => ({
  notificationManager: {
    createNotification: jest.fn().mockResolvedValue({ id: 'notification-123' }),
    sendNotification: jest.fn().mockResolvedValue({ sent: true }),
  },
}));

describe('/api/shopping-lists API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/shopping-lists', () => {
    it('should return shopping lists with pagination', async () => {
      const mockShoppingLists = [
        {
          id: 'list-1',
          name: '本周购物清单',
          description: '购买本周所需物品',
          familyId: 'family-123',
          createdBy: 'user-123',
          status: 'ACTIVE',
          priority: 'NORMAL',
          targetDate: new Date('2025-01-15'),
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-05'),
          items: [
            {
              id: 'item-1',
              name: '牛奶',
              quantity: 2,
              unit: '升',
              category: 'DAIRY',
              status: 'PENDING',
              priority: 'NORMAL',
              estimatedPrice: 12.0,
              notes: '全脂牛奶',
              addedBy: 'user-123',
              addedAt: new Date('2025-01-01'),
            },
            {
              id: 'item-2',
              name: '面包',
              quantity: 1,
              unit: '个',
              category: 'BAKERY',
              status: 'COMPLETED',
              priority: 'HIGH',
              estimatedPrice: 8.5,
              notes: '全麦面包',
              addedBy: 'user-456',
              addedAt: new Date('2025-01-02'),
            },
          ],
          totalItems: 2,
          completedItems: 1,
          estimatedTotalPrice: 20.5,
        },
        {
          id: 'list-2',
          name: '日用品补货',
          description: '购买家庭日用品',
          familyId: 'family-123',
          createdBy: 'user-456',
          status: 'DRAFT',
          priority: 'LOW',
          targetDate: new Date('2025-01-20'),
          createdAt: new Date('2025-01-03'),
          updatedAt: new Date('2025-01-03'),
          items: [],
          totalItems: 0,
          completedItems: 0,
          estimatedTotalPrice: 0,
        },
      ];

      const mockTotal = 8;

      prisma.shoppingList.findMany.mockResolvedValue(mockShoppingLists);
      prisma.shoppingList.count.mockResolvedValue(mockTotal);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists?limit=2&page=1',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { GET } = await import('@/app/api/shopping-lists/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('shoppingLists');
        expect(data).toHaveProperty('total', mockTotal);
        expect(data).toHaveProperty('page', 1);
        expect(data).toHaveProperty('limit', 2);

        expect(data.shoppingLists).toHaveLength(2);
        expect(data.shoppingLists[0].name).toBe('本周购物清单');
        expect(data.shoppingLists[0].totalItems).toBe(2);
        expect(data.shoppingLists[0].completedItems).toBe(1);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should filter by status', async () => {
      prisma.shoppingList.findMany.mockResolvedValue([]);
      prisma.shoppingList.count.mockResolvedValue(0);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists?status=ACTIVE',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { GET } = await import('@/app/api/shopping-lists/route');
        const response = await GET(request);

        expect(response.status).toBe(200);

        expect(prisma.shoppingList.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'ACTIVE',
            }),
          }),
        );
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should filter by priority', async () => {
      prisma.shoppingList.findMany.mockResolvedValue([]);
      prisma.shoppingList.count.mockResolvedValue(0);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists?priority=HIGH',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { GET } = await import('@/app/api/shopping-lists/route');
        const response = await GET(request);

        expect(response.status).toBe(200);

        expect(prisma.shoppingList.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              priority: 'HIGH',
            }),
          }),
        );
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists',
        {
          method: 'GET',
        },
      );

      try {
        const { GET } = await import('@/app/api/shopping-lists/route');
        const response = await GET(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('未授权');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/shopping-lists', () => {
    it('should create new shopping list', async () => {
      const newList = {
        name: '周末购物清单',
        description: '周末采购计划',
        familyId: 'family-123',
        priority: 'NORMAL',
        targetDate: '2025-01-18',
      };

      const createdList = {
        id: 'list-3',
        name: '周末购物清单',
        description: '周末采购计划',
        familyId: 'family-123',
        createdBy: 'user-123',
        status: 'DRAFT',
        priority: 'NORMAL',
        targetDate: new Date(newList.targetDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.shoppingList.create.mockResolvedValue(createdList);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify(newList),
        },
      );

      try {
        const { POST } = await import('@/app/api/shopping-lists/route');
        const response = await POST(request);

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toHaveProperty('shoppingList');
        expect(data.shoppingList.name).toBe('周末购物清单');
        expect(data.shoppingList.status).toBe('DRAFT');

        expect(prisma.shoppingList.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: '周末购物清单',
            description: '周末采购计划',
            familyId: 'family-123',
            createdBy: 'user-123',
            priority: 'NORMAL',
          }),
        });
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate required fields', async () => {
      const incompleteList = {
        description: '缺少名称的清单',
        // Missing required name field
      };

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify(incompleteList),
        },
      );

      try {
        const { POST } = await import('@/app/api/shopping-lists/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('清单名称为必填项');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate target date is not in the past', async () => {
      const invalidList = {
        name: '过期清单',
        description: '目标日期在过去',
        targetDate: '2024-01-01', // Past date
        priority: 'NORMAL',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify(invalidList),
        },
      );

      try {
        const { POST } = await import('@/app/api/shopping-lists/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('目标日期不能早于今天');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/shopping-lists/[id]', () => {
    it('should return shopping list details', async () => {
      const mockShoppingList = {
        id: 'list-1',
        name: '本周购物清单',
        description: '购买本周所需物品',
        familyId: 'family-123',
        createdBy: 'user-123',
        status: 'ACTIVE',
        priority: 'NORMAL',
        targetDate: new Date('2025-01-15'),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-05'),
        items: [
          {
            id: 'item-1',
            name: '牛奶',
            quantity: 2,
            unit: '升',
            category: 'DAIRY',
            status: 'PENDING',
            priority: 'NORMAL',
            estimatedPrice: 12.0,
            notes: '全脂牛奶',
            addedBy: 'user-123',
            addedAt: new Date('2025-01-01'),
            purchasedAt: null,
            actualPrice: null,
          },
          {
            id: 'item-2',
            name: '面包',
            quantity: 1,
            unit: '个',
            category: 'BAKERY',
            status: 'COMPLETED',
            priority: 'HIGH',
            estimatedPrice: 8.5,
            notes: '全麦面包',
            addedBy: 'user-456',
            addedAt: new Date('2025-01-02'),
            purchasedAt: new Date('2025-01-05'),
            actualPrice: 9.2,
          },
        ],
        totalItems: 2,
        completedItems: 1,
        estimatedTotalPrice: 20.5,
        actualTotalPrice: 9.2,
        completionPercentage: 50,
      };

      prisma.shoppingList.findUnique.mockResolvedValue(mockShoppingList);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { GET } = await import('@/app/api/shopping-lists/[id]/route');
        const response = await GET(request, {
          params: Promise.resolve({ id: 'list-1' }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('shoppingList');
        expect(data.shoppingList.name).toBe('本周购物清单');
        expect(data.shoppingList.items).toHaveLength(2);
        expect(data.shoppingList.completionPercentage).toBe(50);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should return 404 for non-existent list', async () => {
      prisma.shoppingList.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/nonexistent',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { GET } = await import('@/app/api/shopping-lists/[id]/route');
        const response = await GET(request, {
          params: Promise.resolve({ id: 'nonexistent' }),
        });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('购物清单不存在');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('PUT /api/shopping-lists/[id]', () => {
    it('should update shopping list', async () => {
      const existingList = {
        id: 'list-1',
        name: '本周购物清单',
        description: '购买本周所需物品',
        status: 'DRAFT',
        priority: 'NORMAL',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedList = {
        ...existingList,
        name: '更新后的购物清单',
        description: '更新后的描述',
        status: 'ACTIVE',
        priority: 'HIGH',
        updatedAt: new Date(),
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);
      prisma.shoppingList.update.mockResolvedValue(updatedList);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            name: '更新后的购物清单',
            description: '更新后的描述',
            status: 'ACTIVE',
            priority: 'HIGH',
          }),
        },
      );

      try {
        const { PUT } = await import('@/app/api/shopping-lists/[id]/route');
        const response = await PUT(request, {
          params: Promise.resolve({ id: 'list-1' }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.shoppingList.name).toBe('更新后的购物清单');
        expect(data.shoppingList.status).toBe('ACTIVE');
        expect(data.shoppingList.priority).toBe('HIGH');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/shopping-lists/[id]/items', () => {
    it('should add item to shopping list', async () => {
      const existingList = {
        id: 'list-1',
        name: '本周购物清单',
        status: 'ACTIVE',
      };

      const newItem = {
        name: '鸡蛋',
        quantity: 12,
        unit: '个',
        category: 'EGG',
        priority: 'NORMAL',
        estimatedPrice: 15.0,
        notes: '有机鸡蛋',
      };

      const createdItem = {
        id: 'item-3',
        shoppingListId: 'list-1',
        name: '鸡蛋',
        quantity: 12,
        unit: '个',
        category: 'EGG',
        status: 'PENDING',
        priority: 'NORMAL',
        estimatedPrice: 15.0,
        notes: '有机鸡蛋',
        addedBy: 'user-123',
        addedAt: new Date(),
        purchasedAt: null,
        actualPrice: null,
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);
      prisma.shoppingListItem.create.mockResolvedValue(createdItem);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1/items',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify(newItem),
        },
      );

      try {
        const { POST } = await import(
          '@/app/api/shopping-lists/[id]/items/route'
        );
        const response = await POST(request, {
          params: Promise.resolve({ id: 'list-1' }),
        });

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toHaveProperty('item');
        expect(data.item.name).toBe('鸡蛋');
        expect(data.item.quantity).toBe(12);
        expect(data.item.status).toBe('PENDING');

        expect(prisma.shoppingListItem.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            shoppingListId: 'list-1',
            name: '鸡蛋',
            quantity: 12,
            category: 'EGG',
            addedBy: 'user-123',
          }),
        });
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate item quantity is positive', async () => {
      const existingList = {
        id: 'list-1',
        name: '本周购物清单',
        status: 'ACTIVE',
      };

      const invalidItem = {
        name: '负数商品',
        quantity: -1, // Negative quantity
        unit: '个',
        category: 'OTHER',
        priority: 'NORMAL',
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1/items',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify(invalidItem),
        },
      );

      try {
        const { POST } = await import(
          '@/app/api/shopping-lists/[id]/items/route'
        );
        const response = await POST(request, {
          params: Promise.resolve({ id: 'list-1' }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('数量必须为正数');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('PUT /api/shopping-lists/[id]/items/[itemId]', () => {
    it('should update shopping list item', async () => {
      const existingList = {
        id: 'list-1',
        name: '本周购物清单',
      };

      const existingItem = {
        id: 'item-1',
        shoppingListId: 'list-1',
        name: '牛奶',
        quantity: 2,
        unit: '升',
        status: 'PENDING',
        priority: 'NORMAL',
        addedBy: 'user-123',
      };

      const updatedItem = {
        ...existingItem,
        quantity: 3,
        status: 'COMPLETED',
        purchasedAt: new Date(),
        actualPrice: 18.5,
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);
      prisma.shoppingListItem.findUnique.mockResolvedValue(existingItem);
      prisma.shoppingListItem.update.mockResolvedValue(updatedItem);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1/items/item-1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            quantity: 3,
            status: 'COMPLETED',
            actualPrice: 18.5,
          }),
        },
      );

      try {
        const { PUT } = await import(
          '@/app/api/shopping-lists/[id]/items/[itemId]/route'
        );
        const response = await PUT(request, {
          params: Promise.resolve({ id: 'list-1', itemId: 'item-1' }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.item.quantity).toBe(3);
        expect(data.item.status).toBe('COMPLETED');
        expect(data.item.actualPrice).toBe(18.5);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should mark item as completed with purchase date', async () => {
      const existingList = {
        id: 'list-1',
        name: '本周购物清单',
      };

      const existingItem = {
        id: 'item-1',
        shoppingListId: 'list-1',
        name: '面包',
        quantity: 1,
        unit: '个',
        status: 'PENDING',
        priority: 'NORMAL',
        addedBy: 'user-123',
      };

      const completedItem = {
        ...existingItem,
        status: 'COMPLETED',
        purchasedAt: new Date(),
        actualPrice: 9.2,
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);
      prisma.shoppingListItem.findUnique.mockResolvedValue(existingItem);
      prisma.shoppingListItem.update.mockResolvedValue(completedItem);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1/items/item-1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            status: 'COMPLETED',
            actualPrice: 9.2,
          }),
        },
      );

      try {
        const { PUT } = await import(
          '@/app/api/shopping-lists/[id]/items/[itemId]/route'
        );
        const response = await PUT(request, {
          params: Promise.resolve({ id: 'list-1', itemId: 'item-1' }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.item.status).toBe('COMPLETED');
        expect(data.item.purchasedAt).toBeDefined();
        expect(data.item.actualPrice).toBe(9.2);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('DELETE /api/shopping-lists/[id]/items/[itemId]', () => {
    it('should remove item from shopping list', async () => {
      const existingList = {
        id: 'list-1',
        name: '本周购物清单',
      };

      const existingItem = {
        id: 'item-1',
        shoppingListId: 'list-1',
        name: '牛奶',
        quantity: 2,
        unit: '升',
        addedBy: 'user-123',
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);
      prisma.shoppingListItem.findUnique.mockResolvedValue(existingItem);
      prisma.shoppingListItem.delete.mockResolvedValue(existingItem);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1/items/item-1',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { DELETE } = await import(
          '@/app/api/shopping-lists/[id]/items/[itemId]/route'
        );
        const response = await DELETE(request, {
          params: Promise.resolve({ id: 'list-1', itemId: 'item-1' }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.message).toBe('购物清单项目已删除');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/shopping-lists/[id]/suggestions', () => {
    it('should return smart suggestions based on inventory', async () => {
      const mockSuggestions = [
        {
          name: '牛奶',
          reason: '库存即将用完',
          currentStock: 0.5,
          unit: '升',
          recommendedQuantity: 2,
          category: 'DAIRY',
          priority: 'HIGH',
          estimatedPrice: 12.0,
        },
        {
          name: '鸡蛋',
          reason: '经常购买的商品',
          purchaseFrequency: 'weekly',
          recommendedQuantity: 12,
          unit: '个',
          category: 'EGG',
          priority: 'NORMAL',
          estimatedPrice: 15.0,
        },
        {
          name: '面包',
          reason: '上次购买已过期',
          daysSinceLastPurchase: 7,
          recommendedQuantity: 1,
          unit: '个',
          category: 'BAKERY',
          priority: 'NORMAL',
          estimatedPrice: 8.5,
        },
      ];

      prisma.inventoryItem.findMany.mockResolvedValue([
        { name: '牛奶', quantity: 0.5, unit: '升', category: 'DAIRY' },
        { name: '面包', quantity: 0, unit: '个', category: 'BAKERY' },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1/suggestions',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { GET } = await import(
          '@/app/api/shopping-lists/[id]/suggestions/route'
        );
        const response = await GET(request, {
          params: Promise.resolve({ id: 'list-1' }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('suggestions');
        expect(data.suggestions).toHaveLength(3);
        expect(data.suggestions[0].reason).toBe('库存即将用完');
        expect(data.suggestions[0].priority).toBe('HIGH');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/shopping-lists/[id]/complete', () => {
    it('should mark shopping list as completed', async () => {
      const existingList = {
        id: 'list-1',
        name: '本周购物清单',
        status: 'ACTIVE',
        items: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }],
      };

      const completedList = {
        ...existingList,
        status: 'COMPLETED',
        completedAt: new Date(),
        actualTotalPrice: 25.7,
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);
      prisma.shoppingList.update.mockResolvedValue(completedList);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1/complete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            actualTotalPrice: 25.7,
          }),
        },
      );

      try {
        const { POST } = await import(
          '@/app/api/shopping-lists/[id]/complete/route'
        );
        const response = await POST(request, {
          params: Promise.resolve({ id: 'list-1' }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.shoppingList.status).toBe('COMPLETED');
        expect(data.shoppingList.completedAt).toBeDefined();
        expect(data.shoppingList.actualTotalPrice).toBe(25.7);
        expect(data.message).toBe('购物清单已完成');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should prevent completing list with pending items', async () => {
      const existingList = {
        id: 'list-1',
        name: '本周购物清单',
        status: 'ACTIVE',
        items: [
          { status: 'COMPLETED' },
          { status: 'PENDING' }, // Still has pending items
        ],
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1/complete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            actualTotalPrice: 25.7,
          }),
        },
      );

      try {
        const { POST } = await import(
          '@/app/api/shopping-lists/[id]/complete/route'
        );
        const response = await POST(request, {
          params: Promise.resolve({ id: 'list-1' }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('还有未完成的购物项目');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/shopping-lists/analytics', () => {
    it('should return shopping list analytics', async () => {
      const mockAnalytics = {
        totalLists: 12,
        activeLists: 3,
        completedLists: 8,
        draftLists: 1,
        totalItems: 45,
        completedItems: 32,
        totalEstimatedCost: 580.5,
        totalActualCost: 545.2,
        savings: 35.3,
        averageItemsPerList: 3.8,
        completionRate: 71.1,
        categoryBreakdown: [
          { category: 'DAIRY', count: 8, percentage: 17.8 },
          { category: 'VEGETABLES', count: 12, percentage: 26.7 },
          { category: 'FRUITS', count: 6, percentage: 13.3 },
          { category: 'BAKERY', count: 5, percentage: 11.1 },
          { category: 'MEAT', count: 7, percentage: 15.6 },
          { category: 'OTHER', count: 7, percentage: 15.6 },
        ],
        monthlyTrend: [
          { month: '2024-10', lists: 3, items: 15, cost: 125.5 },
          { month: '2024-11', lists: 4, items: 18, cost: 145.2 },
          { month: '2024-12', lists: 5, items: 25, cost: 198.7 },
        ],
      };

      prisma.shoppingList.aggregate.mockResolvedValue({
        _count: { id: 12 },
        _sum: { estimatedTotalPrice: 580.5, actualTotalPrice: 545.2 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/analytics',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { GET } = await import(
          '@/app/api/shopping-lists/analytics/route'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('analytics');
        expect(data.analytics).toHaveProperty('totalLists');
        expect(data.analytics).toHaveProperty('completionRate');
        expect(data.analytics).toHaveProperty('savings');
        expect(data.analytics).toHaveProperty('categoryBreakdown');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      prisma.shoppingList.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        },
      );

      try {
        const { GET } = await import('@/app/api/shopping-lists/route');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('服务器内部错误');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: 'invalid-json',
        },
      );

      try {
        const { POST } = await import('@/app/api/shopping-lists/route');
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
    it('should validate priority values', async () => {
      const invalidList = {
        name: '无效优先级清单',
        description: '使用无效的优先级',
        priority: 'INVALID_PRIORITY',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify(invalidList),
        },
      );

      try {
        const { POST } = await import('@/app/api/shopping-lists/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('无效的优先级');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate status values', async () => {
      const invalidUpdate = {
        status: 'INVALID_STATUS',
      };

      const existingList = {
        id: 'list-1',
        name: '测试清单',
        status: 'DRAFT',
      };

      prisma.shoppingList.findUnique.mockResolvedValue(existingList);

      const request = new NextRequest(
        'http://localhost:3000/api/shopping-lists/list-1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: JSON.stringify(invalidUpdate),
        },
      );

      try {
        const { PUT } = await import('@/app/api/shopping-lists/[id]/route');
        const response = await PUT(request, {
          params: Promise.resolve({ id: 'list-1' }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('无效的状态');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });
});
