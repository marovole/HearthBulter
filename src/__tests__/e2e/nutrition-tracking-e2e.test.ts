import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/db';

describe('Nutrition Tracking E2E Tests', () => {
  let testUser: any;
  let testFamily: any;
  let testMember: any;
  let authCookie: string;

  beforeAll(async () => {
    // Create test user and family setup
    testUser = await prisma.user.create({
      data: {
        email: 'test-nutrition@example.com',
        name: 'Test User',
      },
    });

    testFamily = await prisma.family.create({
      data: {
        name: 'Test Nutrition Family',
        creatorId: testUser.id,
      },
    });

    testMember = await prisma.familyMember.create({
      data: {
        name: 'Test Nutrition Member',
        userId: testUser.id,
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

    // Simulate authentication
    authCookie = 'test-auth-cookie';
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.mealLog.deleteMany({
      where: { memberId: testMember.id },
    });
    await prisma.quickTemplate.deleteMany({
      where: { memberId: testMember.id },
    });
    await prisma.trackingStreak.deleteMany({
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
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  describe('Complete User Journey', () => {
    it('should complete full nutrition tracking workflow', async () => {
      // 1. User views dashboard
      const dashboardResponse = await fetch(
        `http://localhost:3000/api/dashboard?memberId=${testMember.id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(dashboardResponse.ok).toBe(true);
      const dashboardData = await dashboardResponse.json();
      expect(dashboardData).toHaveProperty('todayNutrition');
      expect(dashboardData).toHaveProperty('weeklyProgress');

      // 2. User starts meal check-in
      const checkInResponse = await fetch(
        'http://localhost:3000/api/tracking/meals',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            mealType: 'BREAKFAST',
            foods: [
              { foodId: 'test-food-1', amount: 100 },
              { foodId: 'test-food-2', amount: 50 },
            ],
            notes: 'Healthy breakfast',
          }),
        }
      );

      expect(checkInResponse.ok).toBe(true);
      const checkInData = await checkInResponse.json();
      expect(checkInData.mealLog).toBeDefined();
      expect(checkInData.nutritionSummary).toBeDefined();

      // 3. User views nutrition progress
      const progressResponse = await fetch(
        `http://localhost:3000/api/tracking/meals/today?memberId=${testMember.id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(progressResponse.ok).toBe(true);
      const progressData = await progressResponse.json();
      expect(progressData.totalCalories).toBeGreaterThan(0);
      expect(progressData.mealsCount).toBe(1);

      // 4. User creates quick template
      const templateResponse = await fetch(
        'http://localhost:3000/api/tracking/templates',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            name: 'My Breakfast Template',
            mealType: 'BREAKFAST',
            foods: [
              { foodId: 'test-food-1', amount: 100 },
              { foodId: 'test-food-2', amount: 50 },
            ],
          }),
        }
      );

      expect(templateResponse.ok).toBe(true);
      const templateData = await templateResponse.json();
      expect(templateData.template).toBeDefined();
      const templateId = templateData.template.id;

      // 5. User uses template for lunch
      const lunchFromTemplateResponse = await fetch(
        'http://localhost:3000/api/tracking/meals/from-template',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            templateId,
          }),
        }
      );

      expect(lunchFromTemplateResponse.ok).toBe(true);
      const lunchData = await lunchFromTemplateResponse.json();
      expect(lunchData.mealLog.mealType).toBe('LUNCH');

      // 6. User views tracking history
      const historyResponse = await fetch(
        `http://localhost:3000/api/tracking/meals/history?memberId=${testMember.id}&days=7`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(historyResponse.ok).toBe(true);
      const historyData = await historyResponse.json();
      expect(historyData.meals).toHaveLength(2);
      expect(historyData.weeklyStats).toBeDefined();

      // 7. User views streak data
      const streakResponse = await fetch(
        `http://localhost:3000/api/tracking/streak?memberId=${testMember.id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(streakResponse.ok).toBe(true);
      const streakData = await streakResponse.json();
      expect(streakData.currentStreak).toBe(1);

      // 8. User views deviation analysis
      const deviationResponse = await fetch(
        `http://localhost:3000/api/tracking/deviation?memberId=${testMember.id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(deviationResponse.ok).toBe(true);
      const deviationData = await deviationResponse.json();
      expect(Array.isArray(deviationData.deviations)).toBe(true);

      // 9. User sets up reminders
      const reminderResponse = await fetch(
        'http://localhost:3000/api/tracking/reminders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            type: 'MEAL_TIME',
            enabled: true,
            hour: 8,
            minute: 0,
            daysOfWeek: [1, 2, 3, 4, 5],
          }),
        }
      );

      expect(reminderResponse.ok).toBe(true);
      const reminderData = await reminderResponse.json();
      expect(reminderData.reminder).toBeDefined();

      // 10. Verify all data is consistent
      const finalProgressResponse = await fetch(
        `http://localhost:3000/api/tracking/meals/today?memberId=${testMember.id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      const finalProgress = await finalProgressResponse.json();
      expect(finalProgress.mealsCount).toBe(2);
      expect(finalProgress.totalCalories).toBeGreaterThan(0);
    });
  });

  describe('Multi-Day Tracking Scenario', () => {
    it('should handle consistent tracking over multiple days', async () => {
      // Track meals for 3 days
      for (let day = 0; day < 3; day++) {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (2 - day));

        // Breakfast
        await fetch('http://localhost:3000/api/tracking/meals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            mealType: 'BREAKFAST',
            foods: [{ foodId: 'test-food-1', amount: 100 }],
            createdAt: currentDate.toISOString(),
          }),
        });

        // Lunch
        await fetch('http://localhost:3000/api/tracking/meals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            mealType: 'LUNCH',
            foods: [{ foodId: 'test-food-2', amount: 150 }],
            createdAt: currentDate.toISOString(),
          }),
        });

        // Dinner
        await fetch('http://localhost:3000/api/tracking/meals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            mealType: 'DINNER',
            foods: [{ foodId: 'test-food-3', amount: 200 }],
            createdAt: currentDate.toISOString(),
          }),
        });
      }

      // Check weekly statistics
      const weeklyStatsResponse = await fetch(
        `http://localhost:3000/api/tracking/meals/stats?memberId=${testMember.id}&period=week`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(weeklyStatsResponse.ok).toBe(true);
      const weeklyStats = await weeklyStatsResponse.json();
      expect(weeklyStats.totalMeals).toBe(9); // 3 days × 3 meals
      expect(weeklyStats.averageDailyCalories).toBeGreaterThan(0);

      // Check streak
      const streakResponse = await fetch(
        `http://localhost:3000/api/tracking/streak?memberId=${testMember.id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      const streakData = await streakResponse.json();
      expect(streakData.currentStreak).toBe(3);

      // Check calendar view
      const calendarResponse = await fetch(
        `http://localhost:3000/api/tracking/meals/calendar?memberId=${testMember.id}&month=2024-01`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(calendarResponse.ok).toBe(true);
      const calendarData = await calendarResponse.json();
      expect(calendarData.calendar).toBeDefined();
      expect(Object.keys(calendarData.calendar).length).toBeGreaterThan(0);
    });
  });

  describe('Template Usage Workflow', () => {
    it('should support full template lifecycle', async () => {
      // Create multiple templates
      const templates = [];
      for (let i = 0; i < 3; i++) {
        const response = await fetch('http://localhost:3000/api/tracking/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            name: `Template ${i + 1}`,
            mealType: 'BREAKFAST',
            foods: [
              { foodId: 'test-food-1', amount: 100 + i * 10 },
              { foodId: 'test-food-2', amount: 50 + i * 5 },
            ],
          }),
        });

        const data = await response.json();
        templates.push(data.template);
      }

      // Get all templates
      const allTemplatesResponse = await fetch(
        `http://localhost:3000/api/tracking/templates?memberId=${testMember.id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(allTemplatesResponse.ok).toBe(true);
      const allTemplates = await allTemplatesResponse.json();
      expect(allTemplates.templates).toHaveLength(3);

      // Use templates multiple times
      for (let i = 0; i < 5; i++) {
        await fetch('http://localhost:3000/api/tracking/meals/from-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            templateId: templates[0].id,
          }),
        });
      }

      // Check usage statistics
      const templateStatsResponse = await fetch(
        `http://localhost:3000/api/tracking/templates/${templates[0].id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(templateStatsResponse.ok).toBe(true);
      const templateStats = await templateStatsResponse.json();
      expect(templateStats.template.usageCount).toBe(5);

      // Get recommended templates
      const recommendedResponse = await fetch(
        `http://localhost:3000/api/tracking/templates/recommended?memberId=${testMember.id}&mealType=BREAKFAST`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      expect(recommendedResponse.ok).toBe(true);
      const recommended = await recommendedResponse.json();
      expect(recommended.templates.length).toBeGreaterThan(0);
      expect(recommended.templates[0].usageCount).toBe(5);

      // Update template
      await fetch(`http://localhost:3000/api/tracking/templates/${templates[1].id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Updated Template',
          foods: [{ foodId: 'test-food-3', amount: 200 }],
        }),
      });

      // Delete a template
      await fetch(`http://localhost:3000/api/tracking/templates/${templates[2].id}`, {
        method: 'DELETE',
        headers: {
          Cookie: authCookie,
        },
      });

      // Verify deletion
      const finalTemplatesResponse = await fetch(
        `http://localhost:3000/api/tracking/templates?memberId=${testMember.id}`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      const finalTemplates = await finalTemplatesResponse.json();
      expect(finalTemplates.templates).toHaveLength(2);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle invalid requests gracefully', async () => {
      // Test invalid meal type
      const invalidMealResponse = await fetch('http://localhost:3000/api/tracking/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          memberId: testMember.id,
          mealType: 'INVALID_MEAL',
          foods: [{ foodId: 'test-food-1', amount: 100 }],
        }),
      });

      expect(invalidMealResponse.ok).toBe(false);
      expect(invalidMealResponse.status).toBe(400);

      // Test unauthorized access
      const unauthorizedResponse = await fetch(
        `http://localhost:3000/api/tracking/meals?memberId=${testMember.id}`
      );

      expect(unauthorizedResponse.ok).toBe(false);
      expect(unauthorizedResponse.status).toBe(401);

      // Test invalid food amount
      const invalidAmountResponse = await fetch('http://localhost:3000/api/tracking/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: -10 }],
        }),
      });

      expect(invalidAmountResponse.ok).toBe(false);
      expect(invalidAmountResponse.status).toBe(400);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent meal logging', async () => {
      const startTime = Date.now();

      // Create 50 concurrent meal logging requests
      const concurrentRequests = Array.from({ length: 50 }, () =>
        fetch('http://localhost:3000/api/tracking/meals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            memberId: testMember.id,
            mealType: 'BREAKFAST',
            foods: [{ foodId: 'test-food-1', amount: 100 }],
          }),
        })
      );

      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });

      // Should complete within reasonable time (10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);

      // Verify all meals were created
      const mealsResponse = await fetch(
        `http://localhost:3000/api/tracking/meals/history?memberId=${testMember.id}&days=1`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      const mealsData = await mealsResponse.json();
      expect(mealsData.meals.length).toBeGreaterThanOrEqual(50);
    });
  });
});
