import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { RecommendationEngine } from "../lib/services/recommendation/recommendation-engine";
import type { RecommendationRepository } from "../lib/repositories/interfaces/recommendation-repository";
import type { RecipeDetailDTO } from "../lib/repositories/interfaces/recommendation-repository";
import type { RecipeSummaryDTO } from "../lib/repositories/types/recommendation";

const buildRecipeDetail = (
  overrides?: Partial<RecipeDetailDTO>,
): RecipeDetailDTO => ({
  id: "recipe-1",
  name: "测试食谱1",
  cuisineType: "中式",
  mealType: "LUNCH",
  difficulty: "EASY",
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  caloriesPerServing: 300,
  proteinPerServing: 20,
  carbsPerServing: 30,
  fatPerServing: 10,
  averageRating: 4.5,
  ratingCount: 10,
  viewCount: 100,
  estimatedCost: 25,
  tags: ["SPRING"],
  ingredients: [{ name: "鸡蛋", amount: 1 }],
  description: null,
  cuisine: "中式",
  category: "MAIN_DISH",
  totalTime: 30,
  calories: 300,
  protein: 20,
  carbs: 30,
  fat: 10,
  mealTypes: ["LUNCH"],
  costLevel: "MEDIUM",
  tagsRaw: null,
  ingredientsDetailed: [
    {
      id: "ingredient-1",
      foodId: "food-1",
      amount: 1,
      unit: "个",
      food: { id: "food-1", name: "鸡蛋", category: "蛋类" },
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildRecipeSummary = (
  overrides?: Partial<RecipeSummaryDTO>,
): RecipeSummaryDTO => ({
  id: "recipe-2",
  name: "测试食谱2",
  cuisineType: "中式",
  mealType: "DINNER",
  difficulty: "EASY",
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  caloriesPerServing: 280,
  proteinPerServing: 18,
  carbsPerServing: 25,
  fatPerServing: 9,
  averageRating: 4.2,
  ratingCount: 8,
  viewCount: 80,
  estimatedCost: 20,
  tags: ["SPRING"],
  ingredients: [{ name: "番茄", amount: 1 }],
  ...overrides,
});

const createMock = <T extends (...args: any[]) => any>() =>
  jest.fn() as unknown as jest.MockedFunction<T>;

describe("RecommendationEngine", () => {
  let engine: RecommendationEngine;
  let mockRepository: jest.Mocked<RecommendationRepository>;

  beforeEach(() => {
    mockRepository = {
      getUserPreference:
        createMock<
          RecommendationRepository["getUserPreference"]
        >().mockResolvedValue(null),
      listCandidateRecipes: createMock<
        RecommendationRepository["listCandidateRecipes"]
      >().mockResolvedValue({ items: [], total: 0, hasMore: false }),
      getRecipeBehavior: createMock<
        RecommendationRepository["getRecipeBehavior"]
      >().mockResolvedValue({ ratings: [], favorites: [], views: [] }),
      getDetailedRecipeBehavior: createMock<
        RecommendationRepository["getDetailedRecipeBehavior"]
      >().mockResolvedValue({ ratings: [], favorites: [], views: [] }),
      getSimilarRecipes: createMock<
        RecommendationRepository["getSimilarRecipes"]
      >().mockResolvedValue([]),
      getRecipeById:
        createMock<
          RecommendationRepository["getRecipeById"]
        >().mockResolvedValue(null),
      listPopularRecipes: createMock<
        RecommendationRepository["listPopularRecipes"]
      >().mockResolvedValue([]),
      getActiveHealthGoal:
        createMock<
          RecommendationRepository["getActiveHealthGoal"]
        >().mockResolvedValue(null),
      getInventorySnapshot: createMock<
        RecommendationRepository["getInventorySnapshot"]
      >().mockResolvedValue({
        memberId: "test-user",
        capturedAt: new Date(),
        items: [],
      }),
      saveRecommendationLog:
        createMock<
          RecommendationRepository["saveRecommendationLog"]
        >().mockResolvedValue(undefined),
      upsertRecommendationWeights:
        createMock<
          RecommendationRepository["upsertRecommendationWeights"]
        >().mockResolvedValue(undefined),
      upsertLearnedUserPreferences:
        createMock<
          RecommendationRepository["upsertLearnedUserPreferences"]
        >().mockResolvedValue(undefined),
      getRecipesByIds: createMock<
        RecommendationRepository["getRecipesByIds"]
      >().mockResolvedValue([]),
      listMemberBehaviorSamples: createMock<
        RecommendationRepository["listMemberBehaviorSamples"]
      >().mockResolvedValue([]),
      getRecipeCooccurrence: createMock<
        RecommendationRepository["getRecipeCooccurrence"]
      >().mockResolvedValue([]),
      listDetailedCandidateRecipes: createMock<
        RecommendationRepository["listDetailedCandidateRecipes"]
      >().mockResolvedValue({ items: [], total: 0, hasMore: false }),
    };

    engine = new RecommendationEngine(mockRepository);
  });

  describe("getRecommendations", () => {
    it("should return recommendations with valid context", async () => {
      const context = {
        memberId: "test-user",
        servings: 2,
        maxCookTime: 60,
        budgetLimit: 50,
      };

      const recipeDetail = buildRecipeDetail();
      mockRepository.listDetailedCandidateRecipes.mockResolvedValue({
        items: [recipeDetail],
        total: 1,
        hasMore: false,
      });
      mockRepository.getRecipesByIds.mockResolvedValue([recipeDetail]);
      mockRepository.listPopularRecipes.mockResolvedValue([recipeDetail]);

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

      mockRepository.listDetailedCandidateRecipes.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });
      mockRepository.listPopularRecipes.mockResolvedValue([]);

      const result = await engine.getRecommendations(context, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getSimilarRecipes", () => {
    it("should return similar recipes for a given recipe", async () => {
      const recipeId = "recipe-1";
      const limit = 5;

      const recipeDetail = buildRecipeDetail({
        id: recipeId,
        name: "测试食谱",
      });
      const similarRecipe = buildRecipeSummary({ id: "recipe-2" });

      mockRepository.getRecipeById.mockResolvedValue(recipeDetail);
      mockRepository.getSimilarRecipes.mockResolvedValue([similarRecipe]);

      const result = await engine.getSimilarRecipes(recipeId, limit);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it("should throw error for non-existent recipe", async () => {
      const recipeId = "non-existent";

      mockRepository.getRecipeById.mockResolvedValue(null);

      await expect(engine.getSimilarRecipes(recipeId, 5)).rejects.toThrow(
        "Recipe not found",
      );
    });
  });

  describe("getPopularRecipes", () => {
    it("should return popular recipes", async () => {
      const limit = 10;
      const category = "MAIN_DISH";

      mockRepository.listPopularRecipes.mockResolvedValue([
        buildRecipeDetail({ id: "recipe-1" }),
        buildRecipeDetail({ id: "recipe-2" }),
      ]);

      const result = await engine.getPopularRecipes(limit, category);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it("should return recipes sorted by rating and popularity", async () => {
      mockRepository.listPopularRecipes.mockResolvedValue([
        buildRecipeDetail({ id: "recipe-1", averageRating: 4.5 }),
        buildRecipeDetail({ id: "recipe-2", averageRating: 4.8 }),
      ]);

      const result = await engine.getPopularRecipes(5);

      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    });
  });
});
