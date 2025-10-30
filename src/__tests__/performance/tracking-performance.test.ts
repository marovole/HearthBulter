import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mealTracker } from '@/lib/services/tracking/meal-tracker';
import { templateManager } from '@/lib/services/tracking/template-manager';
import { deviationAnalyzer } from '@/lib/services/tracking/deviation-analyzer';
import { prisma } from '@/lib/db';

describe('Tracking Performance Tests', () => {
  let testMember: any;
  let testFamily: any;

  beforeEach(async () => {
    // Create test data
    testFamily = await prisma.family.create({
      data: {
        name: 'Performance Test Family',
        creatorId: 'test-user-id',
      },
    });

    testMember = await prisma.familyMember.create({
      data: {
        name: 'Performance Test Member',
        userId: 'test-user-id',
        familyId: testFamily.id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
        height: 170,
        weight: 70,
        activityLevel: 'MODERATE',
      },
    });

    await prisma.nutritionGoal.create({
      data: {
        memberId: testMember.id,
        calories: 2000,
        protein: 120,
        carbs: 250,
        fat: 65,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.mealLog.deleteMany({
      where: { memberId: testMember.id },
    });
    await prisma.quickTemplate.deleteMany({
      where: { memberId: testMember.id },
    });
    await prisma.nutritionGoal.deleteMany({
      where: { memberId: testMember.id },
    });
    await prisma.familyMember.delete({
      where: { id: testMember.id },
    });
    await prisma.family.delete({
      where: { id: testFamily.id },
    });
  });

  describe('Meal Logging Performance', () => {
    it('should handle single meal logging within time limit', async () => {
      const startTime = performance.now();

      await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'BREAKFAST',
        foods: [
          { foodId: 'test-food-1', amount: 100 },
          { foodId: 'test-food-2', amount: 50 },
        ],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle bulk meal logging efficiently', async () => {
      const mealCount = 1000;
      const startTime = performance.now();

      const mealPromises = Array.from({ length: mealCount }, (_, i) =>
        mealTracker.logMeal({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: 100 }],
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Different days
        })
      );

      await Promise.all(mealPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const mealsPerSecond = mealCount / (duration / 1000);

      // Should handle at least 100 meals per second
      expect(mealsPerSecond).toBeGreaterThan(100);

      // Verify all meals were logged
      const meals = await mealTracker.getMemberMeals(testMember.id);
      expect(meals).toHaveLength(mealCount);
    });

    it('should handle concurrent meal logging', async () => {
      const concurrentCount = 100;
      const startTime = performance.now();

      const concurrentPromises = Array.from({ length: concurrentCount }, () =>
        mealTracker.logMeal({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: 100 }],
        })
      );

      const results = await Promise.all(concurrentPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All requests should succeed
      expect(results).toHaveLength(concurrentCount);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
      });

      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify no duplicates
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(concurrentCount);
    });
  });

  describe('Nutrition Calculation Performance', () => {
    it('should calculate daily nutrition efficiently', async () => {
      // Create test meals
      const mealCount = 100;
      for (let i = 0; i < mealCount; i++) {
        await mealTracker.logMeal({
          memberId: testMember.id,
          mealType: i % 4 === 0 ? 'BREAKFAST' : i % 4 === 1 ? 'LUNCH' : i % 4 === 2 ? 'DINNER' : 'SNACK',
          foods: [
            { foodId: 'test-food-1', amount: 100 },
            { foodId: 'test-food-2', amount: 50 },
          ],
          createdAt: new Date(Date.now() - i * 60 * 60 * 1000), // Different hours
        });
      }

      const startTime = performance.now();

      const nutrition = await mealTracker.getDailyNutrition(testMember.id, new Date());

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(nutrition.totalCalories).toBeGreaterThan(0);
      expect(nutrition.mealsCount).toBe(mealCount);

      // Should complete within 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should handle weekly nutrition analysis efficiently', async () => {
      // Create a week of data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        for (let meal = 0; meal < 3; meal++) {
          await mealTracker.logMeal({
            memberId: testMember.id,
            mealType: meal === 0 ? 'BREAKFAST' : meal === 1 ? 'LUNCH' : 'DINNER',
            foods: [
              { foodId: 'test-food-1', amount: 100 + meal * 10 },
              { foodId: 'test-food-2', amount: 50 + meal * 5 },
            ],
            createdAt: currentDate,
          });
        }
      }

      const startTime = performance.now();

      const weeklyData = await mealTracker.getWeeklyNutrition(testMember.id, startDate, new Date());

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(weeklyData.dailyData).toHaveLength(7);
      expect(weeklyData.weeklyAverages.totalCalories).toBeGreaterThan(0);

      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle large dataset nutrition calculation', async () => {
      // Create 1 year of test data
      const mealCount = 365 * 3; // 3 meals per day for 1 year

      console.log('Creating large dataset...');
      const startTime = performance.now();

      for (let i = 0; i < mealCount; i++) {
        await mealTracker.logMeal({
          memberId: testMember.id,
          mealType: ['BREAKFAST', 'LUNCH', 'DINNER'][i % 3],
          foods: [{ foodId: 'test-food-1', amount: 100 }],
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        });
      }

      const dataCreationTime = performance.now();
      console.log(`Data creation took ${dataCreationTime - startTime}ms`);

      // Test performance of large dataset queries
      const queryStartTime = performance.now();

      const stats = await mealTracker.getMemberStats(testMember.id, 365);

      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;

      expect(stats.totalMeals).toBe(mealCount);
      expect(stats.averageDailyCalories).toBeGreaterThan(0);

      // Query should complete within 500ms even for large dataset
      expect(queryDuration).toBeLessThan(500);

      console.log(`Large dataset query took ${queryDuration}ms`);
    });
  });

  describe('Template Management Performance', () => {
    it('should handle template creation efficiently', async () => {
      const templateCount = 100;
      const startTime = performance.now();

      const templatePromises = Array.from({ length: templateCount }, (_, i) =>
        templateManager.createTemplate({
          memberId: testMember.id,
          name: `Template ${i}`,
          mealType: 'BREAKFAST',
          foods: [
            { foodId: 'test-food-1', amount: 100 },
            { foodId: 'test-food-2', amount: 50 },
          ],
        })
      );

      const templates = await Promise.all(templatePromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const templatesPerSecond = templateCount / (duration / 1000);

      expect(templates).toHaveLength(templateCount);
      expect(templatesPerSecond).toBeGreaterThan(50);

      console.log(`Template creation: ${templatesPerSecond.toFixed(2)} templates/second`);
    });

    it('should handle template retrieval efficiently', async () => {
      // Create test templates
      const templateCount = 50;
      for (let i = 0; i < templateCount; i++) {
        await templateManager.createTemplate({
          memberId: testMember.id,
          name: `Template ${i}`,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: 100 }],
        });
      }

      const startTime = performance.now();

      const templates = await templateManager.getMemberTemplates(testMember.id);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(templates).toHaveLength(templateCount);
      expect(duration).toBeLessThan(50);
    });

    it('should handle template usage tracking efficiently', async () => {
      // Create template
      const template = await templateManager.createTemplate({
        memberId: testMember.id,
        name: 'Popular Template',
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-1', amount: 100 }],
      });

      const usageCount = 1000;
      const startTime = performance.now();

      // Simulate template usage
      const usagePromises = Array.from({ length: usageCount }, () =>
        templateManager.incrementUsage(template.id)
      );

      await Promise.all(usagePromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const usagesPerSecond = usageCount / (duration / 1000);

      expect(usagesPerSecond).toBeGreaterThan(200);

      // Verify usage was tracked correctly
      const updatedTemplate = await templateManager.getTemplate(template.id);
      expect(updatedTemplate.usageCount).toBe(usageCount);

      console.log(`Template usage tracking: ${usagesPerSecond.toFixed(2)} updates/second`);
    });
  });

  describe('Deviation Analysis Performance', () => {
    it('should analyze weekly deviations efficiently', async () => {
      // Create test data with deviations
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      for (let i = 0; i < 30; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        // Create nutrition deficiency pattern
        const deficiencyFactor = 0.5 + (i / 30) * 0.3; // Increasing deficiency

        await mealTracker.logMeal({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: 100 * deficiencyFactor }],
          createdAt: currentDate,
        });
      }

      const analysisStartTime = performance.now();

      const deviations = await deviationAnalyzer.analyzeWeeklyDeviations(
        testMember.id,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
      );

      const analysisEndTime = performance.now();
      const analysisDuration = analysisEndTime - analysisStartTime;

      expect(deviations.length).toBeGreaterThan(0);
      expect(analysisDuration).toBeLessThan(200);

      console.log(`Deviation analysis took ${analysisDuration}ms`);
    });

    it('should generate comprehensive reports efficiently', async () => {
      // Create complex dataset
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      for (let i = 0; i < 90; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        // Create varied nutrition patterns
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const meals = isWeekend ? 4 : 3; // More meals on weekends

        for (let meal = 0; meal < meals; meal++) {
          const mealType = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'][meal];
          const amount = isWeekend ? 150 : 100; // Larger portions on weekends

          await mealTracker.logMeal({
            memberId: testMember.id,
            mealType,
            foods: [{ foodId: 'test-food-1', amount: amount }],
            createdAt: currentDate,
          });
        }
      }

      const reportStartTime = performance.now();

      const report = await deviationAnalyzer.generateWeeklyReport(
        testMember.id,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
      );

      const reportEndTime = performance.now();
      const reportDuration = reportEndTime - reportStartTime;

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('deviations');
      expect(report).toHaveProperty('patterns');
      expect(report).toHaveProperty('recommendations');
      expect(reportDuration).toBeLessThan(500);

      console.log(`Comprehensive report generation took ${reportDuration}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await mealTracker.logMeal({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: 100 }],
        });

        await mealTracker.getDailyNutrition(testMember.id, new Date());

        if (i % 10 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle database connection pooling efficiently', async () => {
      const startTime = performance.now();

      // Create many concurrent database operations
      const concurrentOperations = Array.from({ length: 50 }, () =>
        mealTracker.logMeal({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: 100 }],
        })
      );

      await Promise.all(concurrentOperations);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete efficiently with connection pooling
      expect(duration).toBeLessThan(2000);

      console.log(`Concurrent DB operations completed in ${duration}ms`);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle multiple members efficiently', async () => {
      const memberCount = 10;
      const members = [];

      // Create multiple test members
      for (let i = 0; i < memberCount; i++) {
        const member = await prisma.familyMember.create({
          data: {
            name: `Test Member ${i}`,
            userId: 'test-user-id',
            familyId: testFamily.id,
            dateOfBirth: new Date('1990-01-01'),
            gender: 'MALE',
            height: 170,
            weight: 70,
            activityLevel: 'MODERATE',
          },
        });

        await prisma.nutritionGoal.create({
          data: {
            memberId: member.id,
            calories: 2000,
            protein: 120,
            carbs: 250,
            fat: 65,
            validFrom: new Date(),
            validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        members.push(member);
      }

      const startTime = performance.now();

      // Log meals for all members concurrently
      const mealPromises = members.flatMap(member =>
        Array.from({ length: 10 }, () =>
          mealTracker.logMeal({
            memberId: member.id,
            mealType: 'BREAKFAST',
            foods: [{ foodId: 'test-food-1', amount: 100 }],
          })
        )
      );

      await Promise.all(mealPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const totalMeals = memberCount * 10;
      const mealsPerSecond = totalMeals / (duration / 1000);

      expect(mealsPerSecond).toBeGreaterThan(50);

      console.log(`Multi-member performance: ${mealsPerSecond.toFixed(2)} meals/second`);

      // Clean up additional members
      await prisma.mealLog.deleteMany({
        where: {
          memberId: { in: members.map(m => m.id) },
        },
      });

      await prisma.nutritionGoal.deleteMany({
        where: {
          memberId: { in: members.map(m => m.id) },
        },
      });

      await prisma.familyMember.deleteMany({
        where: {
          id: { in: members.map(m => m.id) },
        },
      });
    });
  });
});
