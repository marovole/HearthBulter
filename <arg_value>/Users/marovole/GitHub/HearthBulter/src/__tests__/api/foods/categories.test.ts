/**
 * 食物分类 API 集成测试
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: {
    food: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('/api/foods/categories/[category] API', () => {
  const { prisma } = require('@/lib/db');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/foods/categories/VEGETABLES', () => {
    it('should return vegetables with pagination', async () => {
      // Mock database response
      const mockFoods = [
        {
          id: 'food-1',
          name: '胡萝卜',
          nameEn: 'Carrot',
          aliases: '["红萝卜", "萝卜"]',
          calories: 41,
          protein: 0.9,
          carbs: 10,
          fat: 0.2,
          fiber: 2.8,
          sugar: 5,
          sodium: 69,
          vitaminA: 835,
          vitaminC: 5.9,
          calcium: 33,
          iron: 0.3,
          category: 'VEGETABLES',
          tags: '["根茎类", "橙色蔬菜"]',
          source: 'manual',
          usdaId: 'usda-170875',
          verified: true,
        },
        {
          id: 'food-2',
          name: '西兰花',
          nameEn: 'Broccoli',
          aliases: '[]',
          calories: 34,
          protein: 2.8,
          carbs: 7,
          fat: 0.4,
          fiber: 2.6,
          sugar: 1.7,
          sodium: 33,
          vitaminA: 623,
          vitaminC: 89.2,
          calcium: 47,
          iron: 0.7,
          category: 'VEGETABLES',
          tags: '["十字花科", "绿色蔬菜"]',
          source: 'manual',
          usdaId: 'usda-170907',
          verified: true,
        },
      ];

      const mockTotal = 25;

      prisma.food.findMany.mockResolvedValue(mockFoods);
      prisma.food.count.mockResolvedValue(mockTotal);

      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/foods/categories/VEGETABLES?limit=2&page=1', {
        method: 'GET',
      });

      // Import and call the API handler
      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'VEGETABLES' }) });

      // Verify response
      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('foods');
      expect(data).toHaveProperty('total', mockTotal);
      expect(data).toHaveProperty('page', 1);
      expect(data).toHaveProperty('limit', 2);
      expect(data).toHaveProperty('category', 'VEGETABLES');

      expect(data.foods).toHaveLength(2);
      expect(data.foods[0]).toEqual({
        id: 'food-1',
        name: '胡萝卜',
        nameEn: 'Carrot',
        aliases: ['红萝卜', '萝卜'],
        calories: 41,
        protein: 0.9,
        carbs: 10,
        fat: 0.2,
        fiber: 2.8,
        sugar: 5,
        sodium: 69,
        vitaminA: 835,
        vitaminC: 5.9,
        calcium: 33,
        iron: 0.3,
        category: 'VEGETABLES',
        tags: ['根茎类', '橙色蔬菜'],
        source: 'manual',
        usdaId: 'usda-170875',
        verified: true,
      });

      // Verify database calls
      expect(prisma.food.findMany).toHaveBeenCalledWith({
        where: { category: 'VEGETABLES' },
        take: 2,
        skip: 0,
        orderBy: { name: 'asc' },
      });

      expect(prisma.food.count).toHaveBeenCalledWith({
        where: { category: 'VEGETABLES' },
      });
    });

    it('should handle pagination correctly', async () => {
      prisma.food.findMany.mockResolvedValue([]);
      prisma.food.count.mockResolvedValue(10);

      const request = new NextRequest('http://localhost:3000/api/foods/categories/FRUITS?page=2&limit=5', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'FRUITS' }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.page).toBe(2);
      expect(data.limit).toBe(5);

      expect(prisma.food.findMany).toHaveBeenCalledWith({
        where: { category: 'FRUITS' },
        take: 5,
        skip: 5, // (2-1) * 5
        orderBy: { name: 'asc' },
      });
    });

    it('should use default pagination parameters', async () => {
      prisma.food.findMany.mockResolvedValue([]);
      prisma.food.count.mockResolvedValue(5);

      const request = new NextRequest('http://localhost:3000/api/foods/categories/PROTEIN', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'PROTEIN' }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.page).toBe(1); // default
      expect(data.limit).toBe(50); // default
    });

    it('should return empty results for category with no foods', async () => {
      prisma.food.findMany.mockResolvedValue([]);
      prisma.food.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/foods/categories/OILS', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'OILS' }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.foods).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should return 400 for invalid category', async () => {
      const request = new NextRequest('http://localhost:3000/api/foods/categories/INVALID', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'INVALID' }) });

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.error).toBe('无效的食物分类');
    });

    it('should return 500 for database errors', async () => {
      prisma.food.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/foods/categories/VEGETABLES', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'VEGETABLES' }) });

      expect(response.status).toBe(500);
      const data = await response.json();

      expect(data.error).toBe('服务器内部错误');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      // Mock food with malformed JSON in aliases or tags
      const mockFood = {
        id: 'food-1',
        name: 'Test Food',
        nameEn: 'Test Food EN',
        aliases: 'invalid-json',
        tags: '[]',
        calories: 100,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 10,
        sodium: 100,
        vitaminA: 100,
        vitaminC: 50,
        calcium: 200,
        iron: 5,
        category: 'VEGETABLES',
        source: 'manual',
        usdaId: 'test-id',
        verified: true,
      };

      prisma.food.findMany.mockResolvedValue([mockFood]);
      prisma.food.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/foods/categories/VEGETABLES', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'VEGETABLES' }) });

      // Should handle the error and return 500
      expect(response.status).toBe(500);
    });
  });

  describe('Data transformation', () => {
    it('should correctly parse JSON strings in aliases and tags', async () => {
      const mockFood = {
        id: 'food-1',
        name: 'Test Food',
        nameEn: 'Test Food EN',
        aliases: '["别名1", "别名2"]',
        tags: '["标签1", "标签2"]',
        calories: 100,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 10,
        sodium: 100,
        vitaminA: 100,
        vitaminC: 50,
        calcium: 200,
        iron: 5,
        category: 'VEGETABLES',
        source: 'manual',
        usdaId: 'test-id',
        verified: true,
      };

      prisma.food.findMany.mockResolvedValue([mockFood]);
      prisma.food.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/foods/categories/VEGETABLES', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'VEGETABLES' }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.foods[0].aliases).toEqual(['别名1', '别名2']);
      expect(data.foods[0].tags).toEqual(['标签1', '标签2']);
    });

    it('should handle empty aliases and tags', async () => {
      const mockFood = {
        id: 'food-1',
        name: 'Simple Food',
        nameEn: 'Simple Food EN',
        aliases: '',
        tags: '',
        calories: 50,
        protein: 5,
        carbs: 10,
        fat: 2,
        fiber: 1,
        sugar: 5,
        sodium: 50,
        vitaminA: 50,
        vitaminC: 25,
        calcium: 100,
        iron: 2,
        category: 'VEGETABLES',
        source: 'manual',
        usdaId: null,
        verified: false,
      };

      prisma.food.findMany.mockResolvedValue([mockFood]);
      prisma.food.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/foods/categories/VEGETABLES', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'VEGETABLES' }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.foods[0].aliases).toEqual([]);
      expect(data.foods[0].tags).toEqual([]);
    });
  });

  describe('Performance considerations', () => {
    it('should handle large result sets efficiently', async () => {
      // Mock a large dataset
      const mockFoods = Array.from({ length: 100 }, (_, index) => ({
        id: `food-${index}`,
        name: `Food ${index}`,
        nameEn: `Food EN ${index}`,
        aliases: '[]',
        tags: '[]',
        calories: 100 + index,
        protein: 10 + index,
        carbs: 20 + index,
        fat: 5 + index,
        fiber: 3 + index,
        sugar: 10 + index,
        sodium: 50 + index,
        vitaminA: 100 + index,
        vitaminC: 50 + index,
        calcium: 200 + index,
        iron: 2 + index,
        category: 'VEGETABLES',
        source: 'manual',
        usdaId: `test-${index}`,
        verified: index % 2 === 0,
      }));

      prisma.food.findMany.mockResolvedValue(mockFoods);
      prisma.food.count.mockResolvedValue(100);

      const request = new NextRequest('http://localhost:3000/api/foods/categories/VEGETABLES?limit=100', {
        method: 'GET',
      });

      const { GET } = await import('@/app/api/foods/categories/[category]/route');
      const response = await GET(request, { params: Promise.resolve({ category: 'VEGETABLES' }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.foods).toHaveLength(100);
      expect(data.limit).toBe(100);
    });
  });
});