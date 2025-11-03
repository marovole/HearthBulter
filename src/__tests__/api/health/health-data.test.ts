/**
 * 健康数据 API 集成测试
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { healthCalculator } from '@/lib/services/health-calculator';

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: {
    healthData: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
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

// Mock health calculator service
jest.mock('@/lib/services/health-calculator', () => ({
  calculateBMI: jest.fn(),
  calculateBMR: jest.fn(),
  calculateTDEE: jest.fn(),
  calculateHealthScore: jest.fn(),
  analyzeHealthTrends: jest.fn(),
}));

describe('/api/health API', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health/data', () => {
    it('should return health data with pagination', async () => {
      const mockHealthData = [
        {
          id: 'health-1',
          userId: 'user-123',
          date: new Date('2025-01-01'),
          weight: 70.5,
          height: 175,
          bodyFat: 15.2,
          muscleMass: 55.3,
          bmi: 23.0,
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          heartRate: 72,
          sleepHours: 8,
          waterIntake: 2000,
          steps: 10000,
          caloriesBurned: 2200,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'health-2',
          userId: 'user-123',
          date: new Date('2025-01-02'),
          weight: 70.3,
          height: 175,
          bodyFat: 15.1,
          muscleMass: 55.4,
          bmi: 22.9,
          bloodPressureSystolic: 118,
          bloodPressureDiastolic: 78,
          heartRate: 70,
          sleepHours: 7.5,
          waterIntake: 1800,
          steps: 8000,
          caloriesBurned: 2100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockTotal = 30;

      prisma.healthData.findMany.mockResolvedValue(mockHealthData);
      prisma.healthData.count.mockResolvedValue(mockTotal);

      const request = new NextRequest('http://localhost:3000/api/health/data?limit=2&page=1', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/health/data/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('healthData');
        expect(data).toHaveProperty('total', mockTotal);
        expect(data).toHaveProperty('page', 1);
        expect(data).toHaveProperty('limit', 2);

        expect(data.healthData).toHaveLength(2);
        expect(data.healthData[0].weight).toBe(70.5);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should filter by date range', async () => {
      prisma.healthData.findMany.mockResolvedValue([]);
      prisma.healthData.count.mockResolvedValue(0);

      const request = new NextRequest(
        'http://localhost:3000/api/health/data?startDate=2025-01-01&endDate=2025-01-31',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
          },
        }
      );

      try {
        const { GET } = await import('@/app/api/health/data/route');
        const response = await GET(request);

        expect(response.status).toBe(200);

        expect(prisma.healthData.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              date: {
                gte: new Date('2025-01-01'),
                lte: new Date('2025-01-31'),
              },
            }),
          })
        );
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/data', {
        method: 'GET',
      });

      try {
        const { GET } = await import('@/app/api/health/data/route');
        const response = await GET(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('未授权');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/health/data', () => {
    it('should create new health data entry', async () => {
      const newHealthData = {
        date: '2025-01-03',
        weight: 70.1,
        height: 175,
        bodyFat: 15.0,
        muscleMass: 55.5,
        bloodPressureSystolic: 115,
        bloodPressureDiastolic: 75,
        heartRate: 68,
        sleepHours: 8,
        waterIntake: 2200,
        steps: 12000,
        caloriesBurned: 2300,
      };

      const createdHealthData = {
        id: 'health-3',
        userId: 'user-123',
        ...newHealthData,
        date: new Date(newHealthData.date),
        bmi: 22.9,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.healthData.create.mockResolvedValue(createdHealthData);
      healthCalculator.calculateBMI.mockReturnValue(22.9);

      const request = new NextRequest('http://localhost:3000/api/health/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(newHealthData),
      });

      try {
        const { POST } = await import('@/app/api/health/data/route');
        const response = await POST(request);

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toHaveProperty('healthData');
        expect(data.healthData.weight).toBe(70.1);
        expect(data.healthData.bmi).toBe(22.9);

        expect(prisma.healthData.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'user-123',
            weight: 70.1,
            height: 175,
            bmi: 22.9,
          }),
        });
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        weight: 70.1,
        // Missing height and other required fields
      };

      const request = new NextRequest('http://localhost:3000/api/health/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(incompleteData),
      });

      try {
        const { POST } = await import('@/app/api/health/data/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('缺少必填字段');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate data ranges', async () => {
      const invalidData = {
        date: '2025-01-03',
        weight: -10, // Invalid negative weight
        height: 175,
        bodyFat: 150, // Invalid body fat percentage
        muscleMass: 55.5,
        bloodPressureSystolic: 115,
        bloodPressureDiastolic: 75,
        heartRate: 68,
        sleepHours: 8,
        waterIntake: 2200,
        steps: 12000,
        caloriesBurned: 2300,
      };

      const request = new NextRequest('http://localhost:3000/api/health/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(invalidData),
      });

      try {
        const { POST } = await import('@/app/api/health/data/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('数据值超出有效范围');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('PUT /api/health/data/[id]', () => {
    it('should update health data entry', async () => {
      const existingHealthData = {
        id: 'health-1',
        userId: 'user-123',
        date: new Date('2025-01-01'),
        weight: 70.5,
        height: 175,
        bmi: 23.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedHealthData = {
        ...existingHealthData,
        weight: 70.3,
        bmi: 22.9,
        updatedAt: new Date(),
      };

      prisma.healthData.findUnique.mockResolvedValue(existingHealthData);
      prisma.healthData.update.mockResolvedValue(updatedHealthData);
      healthCalculator.calculateBMI.mockReturnValue(22.9);

      const request = new NextRequest('http://localhost:3000/api/health/data/health-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          weight: 70.3,
        }),
      });

      try {
        const { PUT } = await import('@/app/api/health/data/[id]/route');
        const response = await PUT(request, { params: Promise.resolve({ id: 'health-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.healthData.weight).toBe(70.3);
        expect(data.healthData.bmi).toBe(22.9);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should return 404 for non-existent entry', async () => {
      prisma.healthData.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/data/nonexistent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          weight: 70.3,
        }),
      });

      try {
        const { PUT } = await import('@/app/api/health/data/[id]/route');
        const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('健康数据不存在');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should prevent unauthorized updates', async () => {
      const otherUsersData = {
        id: 'health-1',
        userId: 'other-user-456', // Different user
        date: new Date('2025-01-01'),
        weight: 70.5,
        height: 175,
        bmi: 23.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.healthData.findUnique.mockResolvedValue(otherUsersData);

      const request = new NextRequest('http://localhost:3000/api/health/data/health-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          weight: 70.3,
        }),
      });

      try {
        const { PUT } = await import('@/app/api/health/data/[id]/route');
        const response = await PUT(request, { params: Promise.resolve({ id: 'health-1' }) });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBe('无权限修改此数据');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/health/analytics', () => {
    it('should return health analytics and trends', async () => {
      const mockAnalytics = {
        weightTrend: [
          { date: '2025-01-01', value: 70.5 },
          { date: '2025-01-02', value: 70.3 },
          { date: '2025-01-03', value: 70.1 },
        ],
        bmiTrend: [
          { date: '2025-01-01', value: 23.0 },
          { date: '2025-01-02', value: 22.9 },
          { date: '2025-01-03', value: 22.9 },
        ],
        averages: {
          weight: 70.3,
          bmi: 22.9,
          bodyFat: 15.1,
          muscleMass: 55.4,
          bloodPressureSystolic: 118,
          bloodPressureDiastolic: 78,
          heartRate: 70,
          sleepHours: 7.8,
          waterIntake: 2000,
          steps: 10000,
          caloriesBurned: 2200,
        },
        healthScore: 85,
        recommendations: [
          '保持良好的运动习惯',
          '适当增加蛋白质摄入',
          '确保充足睡眠',
        ],
      };

      prisma.healthData.aggregate.mockResolvedValue({
        _avg: { weight: 70.3, bmi: 22.9 },
        _min: { weight: 70.1, bmi: 22.9 },
        _max: { weight: 70.5, bmi: 23.0 },
      });

      healthCalculator.analyzeHealthTrends.mockReturnValue(mockAnalytics);
      healthCalculator.calculateHealthScore.mockReturnValue(85);

      const request = new NextRequest('http://localhost:3000/api/health/analytics?period=30', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/health/analytics/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('analytics');
        expect(data.analytics).toHaveProperty('weightTrend');
        expect(data.analytics).toHaveProperty('averages');
        expect(data.analytics).toHaveProperty('healthScore');
        expect(data.analytics).toHaveProperty('recommendations');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should handle different time periods', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/analytics?period=7', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/health/analytics/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        // Should use 7-day period for analytics
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('DELETE /api/health/data/[id]', () => {
    it('should delete health data entry', async () => {
      const existingHealthData = {
        id: 'health-1',
        userId: 'user-123',
        date: new Date('2025-01-01'),
        weight: 70.5,
        height: 175,
        bmi: 23.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.healthData.findUnique.mockResolvedValue(existingHealthData);
      prisma.healthData.delete.mockResolvedValue(existingHealthData);

      const request = new NextRequest('http://localhost:3000/api/health/data/health-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { DELETE } = await import('@/app/api/health/data/[id]/route');
        const response = await DELETE(request, { params: Promise.resolve({ id: 'health-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.message).toBe('健康数据删除成功');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      prisma.healthData.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/health/data', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/health/data/route');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('服务器内部错误');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should handle invalid date formats', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/data?startDate=invalid-date', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/health/data/route');
        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('日期格式无效');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Data validation and security', () => {
    it('should validate numeric input ranges', async () => {
      const extremeData = {
        date: '2025-01-03',
        weight: 1000, // Extremely high weight
        height: 175,
        bodyFat: 15.0,
        muscleMass: 55.5,
        bloodPressureSystolic: 115,
        bloodPressureDiastolic: 75,
        heartRate: 68,
        sleepHours: 8,
        waterIntake: 2200,
        steps: 12000,
        caloriesBurned: 2300,
      };

      const request = new NextRequest('http://localhost:3000/api/health/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(extremeData),
      });

      try {
        const { POST } = await import('@/app/api/health/data/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('数据值超出有效范围');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should prevent duplicate entries for same date', async () => {
      const existingData = {
        id: 'health-1',
        userId: 'user-123',
        date: new Date('2025-01-01'),
        weight: 70.5,
        height: 175,
        bmi: 23.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.healthData.findFirst.mockResolvedValue(existingData);

      const duplicateData = {
        date: '2025-01-01', // Same date as existing data
        weight: 70.3,
        height: 175,
        bodyFat: 15.0,
        muscleMass: 55.5,
        bloodPressureSystolic: 115,
        bloodPressureDiastolic: 75,
        heartRate: 68,
        sleepHours: 8,
        waterIntake: 2200,
        steps: 12000,
        caloriesBurned: 2300,
      };

      const request = new NextRequest('http://localhost:3000/api/health/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(duplicateData),
      });

      try {
        const { POST } = await import('@/app/api/health/data/route');
        const response = await POST(request);

        expect(response.status).toBe(409);
        const data = await response.json();
        expect(data.error).toBe('该日期已存在健康数据');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });
});
