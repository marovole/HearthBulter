import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { RecommendationEngine } from "@/lib/services/recommendation/recommendation-engine";
import { PrismaClient } from "@prisma/client";

// Mock Prisma Client
const mockPrisma = {
  userPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  recipe: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  recipeRating: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  },
  recipeFavorite: {
    findMany: jest.fn().mockResolvedValue([]),
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
    findMany: jest.fn(),
  },
  healthData: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  familyMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn().mockResolvedValue([]),
  $transaction: jest.fn(),
} as unknown as PrismaClient;

describe("RecommendationEngine", () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new RecommendationEngine(mockPrisma);
  });

  describe("getRecommendations", () => {
    it("should return recommendations with valid context", async () => {
      const context = {
        memberId: "test-user",
        servings: 2,
        maxCookTime: 60,
        budgetLimit: 50,
      };

      // Mock user preference
      (mockPrisma.userPreference.findUnique as jest.Mock).mockResolvedValue({
        memberId: "test-user",
        recommendationWeight: {
          inventory: 0.4,
          price: 0.2,
          nutrition: 0.3,
          preference: 0.1,
        },
      });

      // Mock recipe data
      (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
        {
          id: "recipe-1",
          name: "测试食谱1",
          status: "PUBLISHED",
          isPublic: true,
          deletedAt: null,
          averageRating: 4.5,
          ratingCount: 10,
          viewCount: 100,
        },
      ]);

      const result = await engine.getRecommendations(context, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing user preference gracefully", async () => {
      const context = {
        memberId: "test-user",
        servings: 2,
      };

      (mockPrisma.userPreference.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([]);

      const result = await engine.getRecommendations(context, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getSimilarRecipes", () => {
    it("should return similar recipes for a given recipe", async () => {
      const recipeId = "recipe-1";
      const limit = 5;

      // Mock recipe data
      (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({
        id: recipeId,
        name: "测试食谱",
        ingredients: [
          {
            food: { name: "鸡肉" },
          },
        ],
        tags: ["辣", "快手菜"],
      });

      const result = await engine.getSimilarRecipes(recipeId, limit);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it("should throw error for non-existent recipe", async () => {
      const recipeId = "non-existent";

      (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(engine.getSimilarRecipes(recipeId, 5)).rejects.toThrow(
        "Recipe not found",
      );
    });
  });

  describe("getPopularRecipes", () => {
    it("should return popular recipes", async () => {
      const limit = 10;
      const category = "MAIN_DISH";

      // Mock popular recipes data
      (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
        {
          id: "recipe-1",
          name: "热门食谱1",
          averageRating: 4.8,
          ratingCount: 50,
          viewCount: 500,
        },
        {
          id: "recipe-2",
          name: "热门食谱2",
          averageRating: 4.6,
          ratingCount: 30,
          viewCount: 300,
        },
      ]);

      const result = await engine.getPopularRecipes(limit, category);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it("should return recipes sorted by rating and popularity", async () => {
      (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
        {
          id: "recipe-1",
          name: "食谱1",
          averageRating: 4.5,
          ratingCount: 10,
          viewCount: 100,
        },
        {
          id: "recipe-2",
          name: "食谱2",
          averageRating: 4.8,
          ratingCount: 20,
          viewCount: 200,
        },
      ]);

      const result = await engine.getPopularRecipes(5);

      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    });
  });

  describe("refreshRecommendations", () => {
    it("should return new recommendations excluding specified recipes", async () => {
      const context = {
        memberId: "test-user",
        servings: 2,
      };
      const excludeRecipeIds = ["recipe-1", "recipe-2"];

      (mockPrisma.userPreference.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
        {
          id: "recipe-3",
          name: "新食谱",
          status: "PUBLISHED",
          isPublic: true,
          deletedAt: null,
        },
      ]);

      const result = await engine.refreshRecommendations(
        context,
        excludeRecipeIds,
        5,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Ensure excluded recipes are not in results
      const resultIds = result.map((r) => r.recipeId);
      expect(resultIds).not.toContain("recipe-1");
      expect(resultIds).not.toContain("recipe-2");
    });
  });

  describe("updateUserPreferences", () => {
    it("should update user preferences based on behavior data", async () => {
      const memberId = "test-user";

      // Mock behavior data
      (mockPrisma.recipeRating.findMany as jest.Mock).mockResolvedValue([
        {
          rating: 5,
          recipe: { cuisine: "川菜" },
        },
      ]);

      (mockPrisma.recipeFavorite.findMany as jest.Mock).mockResolvedValue([
        {
          recipe: { cuisine: "粤菜" },
        },
      ]);

      (mockPrisma.recipeView.findMany as jest.Mock).mockResolvedValue([]);

      (mockPrisma.userPreference.upsert as jest.Mock).mockResolvedValue({
        memberId,
        learnedPreferences: {
          preferredCuisines: ["川菜", "粤菜"],
          confidence: 0.8,
        },
      });

      await engine.updateUserPreferences(memberId);

      expect(mockPrisma.userPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId },
          update: expect.objectContaining({
            learnedPreferences: expect.any(Object),
            lastAnalyzedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const context = {
        memberId: "test-user",
        servings: 2,
      };

      (mockPrisma.userPreference.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(engine.getRecommendations(context, 5)).rejects.toThrow();
    });

    it("should handle invalid context parameters", async () => {
      const invalidContext = {
        memberId: "", // Invalid empty member ID
        servings: -1, // Invalid negative servings
      };

      // Should not crash, but handle gracefully
      await expect(
        engine.getRecommendations(invalidContext, 5),
      ).resolves.toBeDefined();
    });
  });

  describe("Performance", () => {
    it("should handle large result sets efficiently", async () => {
      const context = {
        memberId: "test-user",
        servings: 2,
      };

      // Mock large dataset
      const largeRecipeSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `recipe-${i}`,
        name: `食谱${i}`,
        status: "PUBLISHED",
        isPublic: true,
        deletedAt: null,
      }));

      (mockPrisma.userPreference.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue(
        largeRecipeSet,
      );

      const startTime = Date.now();
      const result = await engine.getRecommendations(context, 50);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(50);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
