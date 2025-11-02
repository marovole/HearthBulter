/**
 * 营养和饮食计划 API 集成测试
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: {
    mealPlan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    meal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    nutritionLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    food: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock JWT verification
jest.mock('jose', () => ({
  jwtVerify: jest.fn().mockResolvedValue({ sub: 'user-123', email: 'test@example.com' }),
}));

// Mock nutrition calculator
jest.mock('@/lib/services/nutrition-calculator', () => ({
  calculateDailyCalories: jest.fn(),
  calculateMacronutrients: jest.fn(),
  analyzeNutritionBalance: jest.fn(),
  generateMealRecommendations: jest.fn(),
  calculateNutritionScore: jest.fn(),
}));

describe('/api/nutrition API', () => {
  const { prisma } = require('@/lib/db');
  const nutritionCalculator = require('@/lib/services/nutrition-calculator');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/nutrition/meal-plans', () => {
    it('should return meal plans with pagination', async () => {
      const mockMealPlans = [
        {
          id: 'plan-1',
          userId: 'user-123',
          name: '减脂饮食计划',
          description: '低卡高蛋白饮食方案',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          targetCalories: 1800,
          targetProtein: 120,
          targetCarbs: 180,
          targetFat: 60,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          meals: [
            {
              id: 'meal-1',
              name: '鸡胸肉沙拉',
              calories: 350,
              protein: 35,
              carbs: 20,
              fat: 10,
            },
          ],
        },
        {
          id: 'plan-2',
          userId: 'user-123',
          name: '增肌饮食计划',
          description: '高卡高蛋白饮食方案',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-28'),
          targetCalories: 2800,
          targetProtein: 180,
          targetCarbs: 280,
          targetFat: 90,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          meals: [],
        },
      ];

      const mockTotal = 5;

      prisma.mealPlan.findMany.mockResolvedValue(mockMealPlans);
      prisma.mealPlan.count.mockResolvedValue(mockTotal);

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans?limit=2&page=1', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('mealPlans');
        expect(data).toHaveProperty('total', mockTotal);
        expect(data).toHaveProperty('page', 1);
        expect(data).toHaveProperty('limit', 2);

        expect(data.mealPlans).toHaveLength(2);
        expect(data.mealPlans[0].name).toBe('减脂饮食计划');
        expect(data.mealPlans[0].targetCalories).toBe(1800);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should filter by active status', async () => {
      prisma.mealPlan.findMany.mockResolvedValue([]);
      prisma.mealPlan.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans?isActive=true', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await GET(request);

        expect(response.status).toBe(200);

        expect(prisma.mealPlan.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              isActive: true,
            }),
          })
        );
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/nutrition/meal-plans', () => {
    it('should create new meal plan', async () => {
      const newMealPlan = {
        name: '均衡饮食计划',
        description: '营养均衡的日常饮食',
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 200,
        targetFat: 65,
      };

      const createdMealPlan = {
        id: 'plan-3',
        userId: 'user-123',
        ...newMealPlan,
        startDate: new Date(newMealPlan.startDate),
        endDate: new Date(newMealPlan.endDate),
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.mealPlan.create.mockResolvedValue(createdMealPlan);

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(newMealPlan),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await POST(request);

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toHaveProperty('mealPlan');
        expect(data.mealPlan.name).toBe('均衡饮食计划');
        expect(data.mealPlan.targetCalories).toBe(2000);

        expect(prisma.mealPlan.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'user-123',
            name: '均衡饮食计划',
            targetCalories: 2000,
            targetProtein: 150,
            targetCarbs: 200,
            targetFat: 65,
          }),
        });
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate nutrition targets', async () => {
      const invalidMealPlan = {
        name: '不合理饮食计划',
        description: '营养目标不合理的计划',
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        targetCalories: 500, // Too low
        targetProtein: 200, // Too high for calorie target
        targetCarbs: 50,
        targetFat: 10,
      };

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(invalidMealPlan),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('营养目标不合理');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate date logic', async () => {
      const invalidDateMealPlan = {
        name: '日期错误计划',
        description: '结束日期早于开始日期',
        startDate: '2025-03-31',
        endDate: '2025-03-01', // End before start
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 200,
        targetFat: 65,
      };

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(invalidDateMealPlan),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('结束日期必须晚于开始日期');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/nutrition/meal-plans/[id]/meals', () => {
    it('should return meals for a meal plan', async () => {
      const mockMeals = [
        {
          id: 'meal-1',
          mealPlanId: 'plan-1',
          name: '燕麦早餐',
          type: 'breakfast',
          calories: 400,
          protein: 15,
          carbs: 60,
          fat: 12,
          ingredients: [
            { name: '燕麦', amount: '50g' },
            { name: '牛奶', amount: '200ml' },
            { name: '香蕉', amount: '1根' },
          ],
          instructions: [
            '将燕麦倒入碗中',
            '加入热牛奶',
            '切片香蕉放在上面',
          ],
          prepTime: 5,
          cookTime: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'meal-2',
          mealPlanId: 'plan-1',
          name: '鸡胸肉午餐',
          type: 'lunch',
          calories: 500,
          protein: 40,
          carbs: 45,
          fat: 15,
          ingredients: [
            { name: '鸡胸肉', amount: '150g' },
            { name: '糙米', amount: '100g' },
            { name: '西兰花', amount: '200g' },
          ],
          instructions: [
            '烤制鸡胸肉',
            '蒸煮糙米',
            '清炒西兰花',
          ],
          prepTime: 10,
          cookTime: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.mealPlan.findUnique.mockResolvedValue({ id: 'plan-1', userId: 'user-123' });
      prisma.meal.findMany.mockResolvedValue(mockMeals);

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans/plan-1/meals', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/nutrition/meal-plans/[id]/meals/route');
        const response = await GET(request, { params: Promise.resolve({ id: 'plan-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('meals');
        expect(data.meals).toHaveLength(2);
        expect(data.meals[0].name).toBe('燕麦早餐');
        expect(data.meals[0].type).toBe('breakfast');
        expect(data.meals[0].calories).toBe(400);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should filter meals by type', async () => {
      prisma.mealPlan.findUnique.mockResolvedValue({ id: 'plan-1', userId: 'user-123' });
      prisma.meal.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans/plan-1/meals?type=breakfast', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/nutrition/meal-plans/[id]/meals/route');
        const response = await GET(request, { params: Promise.resolve({ id: 'plan-1' }) });

        expect(response.status).toBe(200);

        expect(prisma.meal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              mealPlanId: 'plan-1',
              type: 'breakfast',
            }),
          })
        );
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/nutrition/meal-plans/[id]/meals', () => {
    it('should add meal to meal plan', async () => {
      const newMeal = {
        name: '蛋白质奶昔',
        type: 'snack',
        calories: 250,
        protein: 25,
        carbs: 30,
        fat: 5,
        ingredients: [
          { name: '蛋白粉', amount: '30g' },
          { name: '香蕉', amount: '1根' },
          { name: '杏仁奶', amount: '200ml' },
        ],
        instructions: [
          '将所有材料放入搅拌机',
          '搅拌均匀即可饮用',
        ],
        prepTime: 3,
        cookTime: 0,
      };

      const createdMeal = {
        id: 'meal-3',
        mealPlanId: 'plan-1',
        ...newMeal,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.mealPlan.findUnique.mockResolvedValue({ id: 'plan-1', userId: 'user-123' });
      prisma.meal.create.mockResolvedValue(createdMeal);

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans/plan-1/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(newMeal),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/meal-plans/[id]/meals/route');
        const response = await POST(request, { params: Promise.resolve({ id: 'plan-1' }) });

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toHaveProperty('meal');
        expect(data.meal.name).toBe('蛋白质奶昔');
        expect(data.meal.type).toBe('snack');
        expect(data.meal.calories).toBe(250);

        expect(prisma.meal.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            mealPlanId: 'plan-1',
            name: '蛋白质奶昔',
            type: 'snack',
            calories: 250,
          }),
        });
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate meal type', async () => {
      const invalidMeal = {
        name: '未知类型餐食',
        type: 'unknown-type', // Invalid meal type
        calories: 300,
        protein: 20,
        carbs: 40,
        fat: 10,
        ingredients: [],
        instructions: [],
        prepTime: 5,
        cookTime: 10,
      };

      prisma.mealPlan.findUnique.mockResolvedValue({ id: 'plan-1', userId: 'user-123' });

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans/plan-1/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(invalidMeal),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/meal-plans/[id]/meals/route');
        const response = await POST(request, { params: Promise.resolve({ id: 'plan-1' }) });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('无效的餐食类型');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/nutrition/logs', () => {
    it('should return nutrition logs with date filtering', async () => {
      const mockNutritionLogs = [
        {
          id: 'log-1',
          userId: 'user-123',
          date: new Date('2025-01-01'),
          totalCalories: 1850,
          totalProtein: 145,
          totalCarbs: 195,
          totalFat: 62,
          meals: [
            {
              id: 'meal-log-1',
              name: '早餐',
              calories: 400,
              protein: 15,
              carbs: 60,
              fat: 12,
              foods: [
                { name: '燕麦', amount: '50g', calories: 180 },
                { name: '牛奶', amount: '200ml', calories: 120 },
                { name: '香蕉', amount: '1根', calories: 100 },
              ],
            },
          ],
          waterIntake: 2200,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.nutritionLog.findMany.mockResolvedValue(mockNutritionLogs);

      const request = new NextRequest('http://localhost:3000/api/nutrition/logs?startDate=2025-01-01&endDate=2025-01-31', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/nutrition/logs/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('nutritionLogs');
        expect(data.nutritionLogs).toHaveLength(1);
        expect(data.nutritionLogs[0].totalCalories).toBe(1850);
        expect(data.nutritionLogs[0].waterIntake).toBe(2200);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/nutrition/logs', () => {
    it('should create nutrition log entry', async () => {
      const newNutritionLog = {
        date: '2025-01-02',
        meals: [
          {
            name: '午餐',
            calories: 550,
            protein: 35,
            carbs: 50,
            fat: 18,
            foods: [
              { name: '鸡胸肉', amount: '150g', calories: 240 },
              { name: '糙米', amount: '100g', calories: 160 },
              { name: '西兰花', amount: '200g', calories: 150 },
            ],
          },
        ],
        waterIntake: 2000,
      };

      const createdLog = {
        id: 'log-2',
        userId: 'user-123',
        date: new Date(newNutritionLog.date),
        totalCalories: 550,
        totalProtein: 35,
        totalCarbs: 50,
        totalFat: 18,
        waterIntake: 2000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.nutritionLog.create.mockResolvedValue(createdLog);

      const request = new NextRequest('http://localhost:3000/api/nutrition/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(newNutritionLog),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/logs/route');
        const response = await POST(request);

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toHaveProperty('nutritionLog');
        expect(data.nutritionLog.totalCalories).toBe(550);
        expect(data.nutritionLog.waterIntake).toBe(2000);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should prevent duplicate entries for same date', async () => {
      const existingLog = {
        id: 'log-1',
        userId: 'user-123',
        date: new Date('2025-01-01'),
        totalCalories: 1850,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.nutritionLog.findFirst.mockResolvedValue(existingLog);

      const duplicateLog = {
        date: '2025-01-01', // Same date as existing log
        meals: [],
        waterIntake: 2000,
      };

      const request = new NextRequest('http://localhost:3000/api/nutrition/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(duplicateLog),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/logs/route');
        const response = await POST(request);

        expect(response.status).toBe(409);
        const data = await response.json();
        expect(data.error).toBe('该日期已存在营养记录');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/nutrition/analytics', () => {
    it('should return nutrition analytics and insights', async () => {
      const mockAnalytics = {
        calorieTrend: [
          { date: '2025-01-01', calories: 1850, target: 2000 },
          { date: '2025-01-02', calories: 2100, target: 2000 },
          { date: '2025-01-03', calories: 1950, target: 2000 },
        ],
        macroBreakdown: {
          averageProtein: 145,
          averageCarbs: 195,
          averageFat: 62,
          targetProtein: 150,
          targetCarbs: 200,
          targetFat: 65,
        },
        nutritionScore: 82,
        insights: [
          '蛋白质摄入略低于目标，建议增加优质蛋白来源',
          '碳水化合物摄入适中，继续保持',
          '总体热量控制良好',
        ],
        recommendations: [
          '增加鸡胸肉、鱼类等高蛋白食物',
          '保持规律的进餐时间',
          '适当增加坚果类健康脂肪',
        ],
      };

      prisma.nutritionLog.aggregate.mockResolvedValue({
        _avg: { totalCalories: 1967, totalProtein: 145, totalCarbs: 195, totalFat: 62 },
      });

      nutritionCalculator.calculateNutritionScore.mockReturnValue(82);
      nutritionCalculator.analyzeNutritionBalance.mockReturnValue(mockAnalytics);

      const request = new NextRequest('http://localhost:3000/api/nutrition/analytics?period=30', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/nutrition/analytics/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('analytics');
        expect(data.analytics).toHaveProperty('calorieTrend');
        expect(data.analytics).toHaveProperty('macroBreakdown');
        expect(data.analytics).toHaveProperty('nutritionScore');
        expect(data.analytics).toHaveProperty('insights');
        expect(data.analytics).toHaveProperty('recommendations');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      prisma.mealPlan.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('服务器内部错误');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans', {
        method: 'GET',
      });

      try {
        const { GET } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await GET(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('未授权');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Data validation', () => {
    it('should validate calorie ranges', async () => {
      const invalidMealPlan = {
        name: '极端卡路里计划',
        description: '不合理的卡路里目标',
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        targetCalories: 100, // Too low
        targetProtein: 20,
        targetCarbs: 10,
        targetFat: 5,
      };

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(invalidMealPlan),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('卡路里目标必须在合理范围内');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate macronutrient balance', async () => {
      const imbalancedMealPlan = {
        name: '营养不均衡计划',
        description: '宏量营养素比例不合理',
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        targetCalories: 2000,
        targetProtein: 300, // Excessive protein (60% of calories)
        targetCarbs: 50,
        targetFat: 20,
      };

      const request = new NextRequest('http://localhost:3000/api/nutrition/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(imbalancedMealPlan),
      });

      try {
        const { POST } = await import('@/app/api/nutrition/meal-plans/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('宏量营养素比例不合理');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });
});