import { PrismaClient } from '@prisma/client';
import { RecommendationEngine } from '../lib/services/recommendation/recommendation-engine';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    userPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    recipeRating: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    recipeFavorite: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    recipeView: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    ingredientSubstitution: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    healthGoal: {
      findFirst: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

describe('RecommendationEngine', () => {
  let recommendationEngine: RecommendationEngine;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    recommendationEngine = new RecommendationEngine(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should return recipe recommendations based on context', async () => {
      // Mock data
      const mockRecipes = [
        {
          id: 'recipe1',
          name: '番茄炒蛋',
          totalTime: 20,
          estimatedCost: 15,
          calories: 200,
          protein: 12,
          carbs: 10,
          fat: 8,
          cuisine: '中式',
          category: 'MAIN_DISH',
          difficulty: 'EASY',
          seasons: ['春', '夏', '秋', '冬'],
          mealTypes: ['午餐', '晚餐'],
          ingredients: [
            { food: { name: '番茄', category: '蔬菜' } },
            { food: { name: '鸡蛋', category: '蛋类' } }
          ]
        },
        {
          id: 'recipe2',
          name: '宫保鸡丁',
          totalTime: 40,
          estimatedCost: 35,
          calories: 450,
          protein: 28,
          carbs: 25,
          fat: 20,
          cuisine: '川菜',
          category: 'MAIN_DISH',
          difficulty: 'MEDIUM',
          seasons: ['春', '夏', '秋', '冬'],
          mealTypes: ['午餐', '晚餐'],
          ingredients: [
            { food: { name: '鸡肉', category: '肉类' } },
            { food: { name: '花生', category: '坚果' } }
          ]
        }
      ];

      const mockUserPreference = {
        id: 'pref1',
        memberId: 'user1',
        dietType: 'NONE',
        preferredCuisines: JSON.stringify(['中式', '川菜']),
        preferredIngredients: JSON.stringify(['鸡肉', '鸡蛋']),
        avoidedIngredients: JSON.stringify([]),
        spiceLevel: 'MEDIUM',
        costLevel: 'MEDIUM'
      };

      const mockHealthGoal = {
        id: 'goal1',
        memberId: 'user1',
        goalType: 'MAINTAIN',
        status: 'ACTIVE'
      };

      // Setup mocks
      mockPrisma.recipe.findMany.mockResolvedValue(mockRecipes);
      mockPrisma.userPreference.findUnique.mockResolvedValue(mockUserPreference);
      mockPrisma.healthGoal.findFirst.mockResolvedValue(mockHealthGoal);
      mockPrisma.recipeRating.findMany.mockResolvedValue([]);
      mockPrisma.recipeFavorite.findMany.mockResolvedValue([]);
      mockPrisma.recipeView.findMany.mockResolvedValue([]);
      mockPrisma.ingredientSubstitution.findMany.mockResolvedValue([]);

      // Test context
      const context = {
        memberId: 'user1',
        mealType: '午餐',
        servings: 2,
        maxCookTime: 60,
        budgetLimit: 50,
        dietaryRestrictions: [],
        excludedIngredients: [],
        preferredCuisines: ['中式'],
        season: '春'
      };

      // Execute
      const recommendations = await recommendationEngine.getRecommendations(context, 5);

      // Assertions
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0]).toHaveProperty('recipeId');
      expect(recommendations[0]).toHaveProperty('score');
      expect(recommendations[0]).toHaveProperty('reasons');
      expect(recommendations[0]).toHaveProperty('explanation');
      expect(recommendations[0]).toHaveProperty('metadata');
      
      // Verify scores are in descending order
      expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score);
    });

    it('should handle empty recipe list gracefully', async () => {
      // Setup mocks for empty results
      mockPrisma.recipe.findMany.mockResolvedValue([]);
      mockPrisma.userPreference.findUnique.mockResolvedValue(null);
      mockPrisma.healthGoal.findFirst.mockResolvedValue(null);
      mockPrisma.recipeRating.findMany.mockResolvedValue([]);
      mockPrisma.recipeFavorite.findMany.mockResolvedValue([]);
      mockPrisma.recipeView.findMany.mockResolvedValue([]);
      mockPrisma.ingredientSubstitution.findMany.mockResolvedValue([]);

      const context = {
        memberId: 'user1',
        mealType: '午餐',
        servings: 2,
        maxCookTime: 60,
        budgetLimit: 50,
        dietaryRestrictions: [],
        excludedIngredients: [],
        preferredCuisines: [],
        season: '春'
      };

      const recommendations = await recommendationEngine.getRecommendations(context, 5);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('getSimilarRecipes', () => {
    it('should return similar recipes based on recipe features', async () => {
      const mockRecipe = {
        id: 'recipe1',
        name: '番茄炒蛋',
        totalTime: 20,
        estimatedCost: 15,
        calories: 200,
        protein: 12,
        carbs: 10,
        fat: 8,
        cuisine: '中式',
        category: 'MAIN_DISH',
        difficulty: 'EASY',
        seasons: ['春', '夏', '秋', '冬'],
        mealTypes: ['午餐', '晚餐'],
        ingredients: [
          { food: { name: '番茄', category: '蔬菜' } },
          { food: { name: '鸡蛋', category: '蛋类' } }
        ]
      };

      const mockSimilarRecipes = [
        {
          id: 'recipe2',
          name: '鸡蛋汤',
          totalTime: 15,
          estimatedCost: 10,
          cuisine: '中式',
          category: 'SOUP',
          difficulty: 'EASY',
          ingredients: [
            { food: { name: '鸡蛋', category: '蛋类' } },
            { food: { name: '青菜', category: '蔬菜' } }
          ]
        }
      ];

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrisma.recipe.findMany.mockResolvedValue(mockSimilarRecipes);

      const similarRecipes = await recommendationEngine.getSimilarRecipes('recipe1', 'user1', 3);

      expect(similarRecipes).toHaveLength(1);
      expect(similarRecipes[0].recipeId).toBe('recipe2');
      expect(similarRecipes[0]).toHaveProperty('score');
      expect(similarRecipes[0]).toHaveProperty('reasons');
    });
  });

  describe('getPopularRecipes', () => {
    it('should return popular recipes based on ratings and views', async () => {
      const mockPopularRecipes = [
        {
          id: 'recipe1',
          name: '番茄炒蛋',
          averageRating: 4.5,
          ratingCount: 150,
          viewCount: 2000,
          totalTime: 20,
          estimatedCost: 15,
          category: 'MAIN_DISH',
          cuisine: '中式',
          difficulty: 'EASY'
        },
        {
          id: 'recipe2',
          name: '宫保鸡丁',
          averageRating: 4.2,
          ratingCount: 120,
          viewCount: 1500,
          totalTime: 40,
          estimatedCost: 35,
          category: 'MAIN_DISH',
          cuisine: '川菜',
          difficulty: 'MEDIUM'
        }
      ];

      mockPrisma.recipe.findMany.mockResolvedValue(mockPopularRecipes);

      const popularRecipes = await recommendationEngine.getPopularRecipes(5);

      expect(popularRecipes).toHaveLength(2);
      expect(popularRecipes[0].recipeId).toBe('recipe1');
      expect(popularRecipes[0]).toHaveProperty('score');
      expect(popularRecipes[0]).toHaveProperty('reasons');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences based on behavior', async () => {
      const mockUserPreference = {
        id: 'pref1',
        memberId: 'user1',
        dietType: 'NONE',
        preferredCuisines: JSON.stringify(['中式']),
        preferredIngredients: JSON.stringify([]),
        avoidedIngredients: JSON.stringify([]),
        spiceLevel: 'MEDIUM',
        costLevel: 'MEDIUM',
        learnedPreferences: JSON.stringify({}),
        preferenceScore: 0
      };

      mockPrisma.userPreference.findUnique.mockResolvedValue(mockUserPreference);
      mockPrisma.userPreference.update.mockResolvedValue({
        ...mockUserPreference,
        learnedPreferences: JSON.stringify({
          preferredIngredients: ['鸡肉', '鸡蛋'],
          avoidedIngredients: ['香菜'],
          spiceLevel: 'MEDIUM_HIGH'
        }),
        preferenceScore: 0.8
      });

      await recommendationEngine.updateUserPreferences('user1');

      expect(mockPrisma.userPreference.update).toHaveBeenCalledWith({
        where: { memberId: 'user1' },
        data: expect.objectContaining({
          learnedPreferences: expect.any(String),
          preferenceScore: expect.any(Number)
        })
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.recipe.findMany.mockRejectedValue(new Error('Database connection failed'));

      const context = {
        memberId: 'user1',
        mealType: '午餐',
        servings: 2,
        maxCookTime: 60,
        budgetLimit: 50,
        dietaryRestrictions: [],
        excludedIngredients: [],
        preferredCuisines: [],
        season: '春'
      };

      await expect(recommendationEngine.getRecommendations(context, 5))
        .rejects.toThrow('Database connection failed');
    });
  });
});
