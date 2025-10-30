import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/db';
import { mealTracker } from '@/lib/services/tracking/meal-tracker';
import { streakManager } from '@/lib/services/tracking/streak-manager';
import { deviationAnalyzer } from '@/lib/services/tracking/deviation-analyzer';
import { templateManager } from '@/lib/services/tracking/template-manager';

describe('Tracking Workflow Integration', () => {
  let testMember: any;
  let testFamily: any;

  beforeEach(async () => {
    // Create test family
    testFamily = await prisma.family.create({
      data: {
        name: 'Test Family',
        creatorId: 'test-user-id',
      },
    });

    // Create test member
    testMember = await prisma.familyMember.create({
      data: {
        name: 'Test Member',
        userId: 'test-user-id',
        familyId: testFamily.id,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
        height: 170,
        weight: 70,
        activityLevel: 'MODERATE',
      },
    });

    // Create nutrition goals
    await prisma.nutritionGoal.create({
      data: {
        memberId: testMember.id,
        calories: 2000,
        protein: 120,
        carbs: 250,
        fat: 65,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.mealLog.deleteMany({
      where: { memberId: testMember.id },
    });
    await prisma.trackingStreak.deleteMany({
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

  describe('Complete Daily Tracking Workflow', () => {
    it('should track full day meals and update streak', async () => {
      // Log breakfast
      const breakfast = await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'BREAKFAST',
        foods: [
          { foodId: 'test-food-1', amount: 100 },
          { foodId: 'test-food-2', amount: 50 },
        ],
        notes: 'Healthy breakfast',
      });

      expect(breakfast).toBeDefined();
      expect(breakfast.mealType).toBe('BREAKFAST');

      // Log lunch
      const lunch = await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'LUNCH',
        foods: [
          { foodId: 'test-food-3', amount: 150 },
          { foodId: 'test-food-4', amount: 100 },
        ],
      });

      expect(lunch).toBeDefined();
      expect(lunch.mealType).toBe('LUNCH');

      // Log dinner
      const dinner = await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'DINNER',
        foods: [
          { foodId: 'test-food-5', amount: 200 },
        ],
      });

      expect(dinner).toBeDefined();

      // Get daily nutrition
      const dailyNutrition = await mealTracker.getDailyNutrition(
        testMember.id,
        new Date()
      );

      expect(dailyNutrition.mealsCount).toBe(3);
      expect(dailyNutrition.totalCalories).toBeGreaterThan(0);

      // Update streak
      await streakManager.updateStreak(testMember.id);

      const streakData = await streakManager.getStreakData(testMember.id);
      expect(streakData.currentStreak).toBe(1);
      expect(streakData.longestStreak).toBe(1);
    });

    it('should handle consecutive days tracking', async () => {
      // Day 1
      await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-1', amount: 100 }],
      });

      await streakManager.updateStreak(testMember.id);

      // Day 2 (simulate next day)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-1', amount: 100 }],
        createdAt: tomorrow,
      });

      await streakManager.updateStreak(testMember.id, tomorrow);

      const streakData = await streakManager.getStreakData(testMember.id);
      expect(streakData.currentStreak).toBe(2);
    });

    it('should reset streak when day is missed', async () => {
      // Day 1
      await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-1', amount: 100 }],
      });

      await streakManager.updateStreak(testMember.id);

      // Day 2 (no meals logged)
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      await streakManager.updateStreak(testMember.id, dayAfter);

      const streakData = await streakManager.getStreakData(testMember.id);
      expect(streakData.currentStreak).toBe(0);
    });
  });

  describe('Template Management Integration', () => {
    it('should create and use quick templates', async () => {
      // Create a template
      const template = await templateManager.createTemplate({
        memberId: testMember.id,
        name: 'Standard Breakfast',
        mealType: 'BREAKFAST',
        foods: [
          { foodId: 'test-food-1', amount: 100 },
          { foodId: 'test-food-2', amount: 50 },
        ],
      });

      expect(template).toBeDefined();
      expect(template.name).toBe('Standard Breakfast');

      // Get templates for the member
      const templates = await templateManager.getMemberTemplates(
        testMember.id,
        'BREAKFAST'
      );

      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe(template.id);

      // Use template to log a meal
      const meal = await mealTracker.logMealFromTemplate(
        testMember.id,
        template.id
      );

      expect(meal).toBeDefined();
      expect(meal.mealType).toBe('BREAKFAST');
      expect(meal.foods).toHaveLength(2);

      // Update template usage count
      await templateManager.incrementUsage(template.id);

      const updatedTemplate = await templateManager.getTemplate(template.id);
      expect(updatedTemplate.usageCount).toBe(1);
    });

    it('should recommend templates based on usage', async () => {
      // Create multiple templates
      await templateManager.createTemplate({
        memberId: testMember.id,
        name: 'Popular Breakfast',
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-1', amount: 100 }],
      });

      const popularTemplate = await templateManager.createTemplate({
        memberId: testMember.id,
        name: 'Very Popular Lunch',
        mealType: 'LUNCH',
        foods: [{ foodId: 'test-food-2', amount: 150 }],
      });

      // Increment usage for popular template
      await templateManager.incrementUsage(popularTemplate.id);
      await templateManager.incrementUsage(popularTemplate.id);

      // Get recommended templates
      const recommendations = await templateManager.getRecommendedTemplates(
        testMember.id,
        'LUNCH'
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].usageCount).toBe(2);
    });
  });

  describe('Deviation Analysis Integration', () => {
    it('should analyze weekly deviations', async () => {
      // Create a week of undernutrition data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        await mealTracker.logMeal({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: 50 }], // Low nutrition
          createdAt: currentDate,
        });
      }

      // Analyze deviations
      const endDate = new Date();
      const deviations = await deviationAnalyzer.analyzeWeeklyDeviations(
        testMember.id,
        startDate,
        endDate
      );

      expect(deviations.length).toBeGreaterThan(0);
      expect(deviations[0].type).toBe('DEFICIENCY');
      expect(deviations[0].severity).toBe('HIGH');
    });

    it('should generate deviation reports', async () => {
      // Create some deviation data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);

      for (let i = 0; i < 5; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        await mealTracker.logMeal({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'test-food-1', amount: 80 }],
          createdAt: currentDate,
        });
      }

      // Generate report
      const report = await deviationAnalyzer.generateWeeklyReport(
        testMember.id,
        startDate,
        new Date()
      );

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('deviations');
      expect(report).toHaveProperty('recommendations');
      expect(report.summary.totalDeviations).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid food IDs gracefully', async () => {
      await expect(
        mealTracker.logMeal({
          memberId: testMember.id,
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'invalid-food', amount: 100 }],
        })
      ).rejects.toThrow('Food not found');
    });

    it('should handle duplicate meal logging', async () => {
      const meal1 = await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-1', amount: 100 }],
      });

      const meal2 = await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-2', amount: 100 }],
      });

      expect(meal1.id).not.toBe(meal2.id);
    });

    it('should handle template deletion with associated meals', async () => {
      // Create template
      const template = await templateManager.createTemplate({
        memberId: testMember.id,
        name: 'Test Template',
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-1', amount: 100 }],
      });

      // Use template to create meal
      await mealTracker.logMealFromTemplate(testMember.id, template.id);

      // Delete template
      await templateManager.deleteTemplate(template.id);

      // Verify template is deleted but meal remains
      const deletedTemplate = await templateManager.getTemplate(template.id);
      expect(deletedTemplate).toBeNull();

      const meals = await mealTracker.getMemberMeals(testMember.id);
      expect(meals).toHaveLength(1);
    });

    it('should handle nutrition goal updates', async () => {
      // Log meals with initial goals
      await mealTracker.logMeal({
        memberId: testMember.id,
        mealType: 'BREAKFAST',
        foods: [{ foodId: 'test-food-1', amount: 100 }],
      });

      // Update nutrition goals
      await prisma.nutritionGoal.updateMany({
        where: { memberId: testMember.id },
        data: {
          calories: 2500,
          protein: 150,
          carbs: 300,
          fat: 80,
        },
      });

      // Get updated nutrition progress
      const progress = await mealTracker.getNutritionProgress(
        testMember.id,
        new Date()
      );

      expect(progress.calories.target).toBe(2500);
      expect(progress.protein.target).toBe(150);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk meal logging efficiently', async () => {
      const startTime = Date.now();

      // Log 100 meals
      const mealPromises = [];
      for (let i = 0; i < 100; i++) {
        mealPromises.push(
          mealTracker.logMeal({
            memberId: testMember.id,
            mealType: 'BREAKFAST',
            foods: [{ foodId: 'test-food-1', amount: 100 }],
          })
        );
      }

      await Promise.all(mealPromises);
      const endTime = Date.now();

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify all meals were logged
      const meals = await mealTracker.getMemberMeals(testMember.id);
      expect(meals).toHaveLength(100);
    });

    it('should handle large template lists efficiently', async () => {
      // Create 50 templates
      const templatePromises = [];
      for (let i = 0; i < 50; i++) {
        templatePromises.push(
          templateManager.createTemplate({
            memberId: testMember.id,
            name: `Template ${i}`,
            mealType: 'BREAKFAST',
            foods: [{ foodId: 'test-food-1', amount: 100 }],
          })
        );
      }

      await Promise.all(templatePromises);

      const startTime = Date.now();
      const templates = await templateManager.getMemberTemplates(testMember.id);
      const endTime = Date.now();

      expect(templates).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
