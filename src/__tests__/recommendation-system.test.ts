import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  RecommendationEngine,
  type RecommendationContext,
} from "../lib/services/recommendation/recommendation-engine";
import type {
  RecommendationRepository,
  RecipeDetailDTO,
} from "../lib/repositories/interfaces/recommendation-repository";
import type { RecipeSummaryDTO } from "../lib/repositories/types/recommendation";

const createMock = <T extends (...args: any[]) => any>() =>
  jest.fn() as unknown as jest.MockedFunction<T>;

const buildRecipeDetail = (overrides?: Partial<RecipeDetailDTO>): RecipeDetailDTO => ({
  id: "recipe1",
  name: "番茄炒蛋",
  cuisineType: "中式",
  mealType: "LUNCH",
  difficulty: "EASY",
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  caloriesPerServing: 200,
  proteinPerServing: 12,
  carbsPerServing: 10,
  fatPerServing: 8,
  averageRating: 4.5,
  ratingCount: 150,
  viewCount: 2000,
  estimatedCost: 15,
  tags: ["SPRING"],
  ingredients: [{ name: "番茄", amount: 1 }],
  description: null,
  cuisine: "中式",
  category: "MAIN_DISH",
  totalTime: 20,
  calories: 200,
  protein: 12,
  carbs: 10,
  fat: 8,
  mealTypes: ["LUNCH", "DINNER"],
  costLevel: "MEDIUM",
  tagsRaw: null,
  ingredientsDetailed: [
    {
      id: "ingredient-1",
      foodId: "food-1",
      amount: 1,
      unit: "个",
      food: { id: "food-1", name: "番茄", category: "蔬菜" },
    },
    {
      id: "ingredient-2",
      foodId: "food-2",
      amount: 1,
      unit: "个",
      food: { id: "food-2", name: "鸡蛋", category: "蛋类" },
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildRecipeSummary = (overrides?: Partial<RecipeSummaryDTO>): RecipeSummaryDTO => ({
  id: "recipe2",
  name: "鸡蛋汤",
  cuisineType: "中式",
  mealType: "DINNER",
  difficulty: "EASY",
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  caloriesPerServing: 180,
  proteinPerServing: 10,
  carbsPerServing: 8,
  fatPerServing: 6,
  averageRating: 4.2,
  ratingCount: 120,
  viewCount: 1500,
  estimatedCost: 10,
  tags: ["SPRING"],
  ingredients: [{ name: "鸡蛋", amount: 1 }],
  ...overrides,
});

describe("RecommendationEngine", () => {
  let recommendationEngine: RecommendationEngine;
  let mockRepository: jest.Mocked<RecommendationRepository>;

  beforeEach(() => {
    mockRepository = {
      getUserPreference:
        createMock<RecommendationRepository["getUserPreference"]>().mockResolvedValue(null),
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
        createMock<RecommendationRepository["getRecipeById"]>().mockResolvedValue(null),
      listPopularRecipes: createMock<
        RecommendationRepository["listPopularRecipes"]
      >().mockResolvedValue([]),
      getActiveHealthGoal:
        createMock<RecommendationRepository["getActiveHealthGoal"]>().mockResolvedValue(null),
      getInventorySnapshot: createMock<
        RecommendationRepository["getInventorySnapshot"]
      >().mockResolvedValue({
        memberId: "user1",
        capturedAt: new Date(),
        items: [],
      }),
      saveRecommendationLog:
        createMock<RecommendationRepository["saveRecommendationLog"]>().mockResolvedValue(
          undefined
        ),
      upsertRecommendationWeights:
        createMock<RecommendationRepository["upsertRecommendationWeights"]>().mockResolvedValue(
          undefined
        ),
      upsertLearnedUserPreferences:
        createMock<RecommendationRepository["upsertLearnedUserPreferences"]>().mockResolvedValue(
          undefined
        ),
      getRecipesByIds: createMock<RecommendationRepository["getRecipesByIds"]>().mockResolvedValue(
        []
      ),
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

    recommendationEngine = new RecommendationEngine(mockRepository);
  });

  describe("getRecommendations", () => {
    it("should return recipe recommendations based on context", async () => {
      const mockRecipe = buildRecipeDetail();

      mockRepository.listDetailedCandidateRecipes.mockResolvedValue({
        items: [mockRecipe],
        total: 1,
        hasMore: false,
      });
      mockRepository.getRecipesByIds.mockResolvedValue([mockRecipe]);
      mockRepository.listPopularRecipes.mockResolvedValue([mockRecipe]);

      const context: RecommendationContext = {
        memberId: "user1",
        mealType: "LUNCH",
        servings: 2,
        maxCookTime: 60,
        budgetLimit: 50,
        dietaryRestrictions: [],
        excludedIngredients: [],
        preferredCuisines: ["中式"],
        season: "SPRING",
      };

      const recommendations = await recommendationEngine.getRecommendations(context, 5);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toHaveProperty("recipeId");
      expect(recommendations[0]).toHaveProperty("score");
      expect(recommendations[0]).toHaveProperty("reasons");
      expect(recommendations[0]).toHaveProperty("explanation");
      expect(recommendations[0]).toHaveProperty("metadata");
    });

    it("should handle empty recipe list gracefully", async () => {
      mockRepository.listDetailedCandidateRecipes.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      const context: RecommendationContext = {
        memberId: "user1",
        mealType: "LUNCH",
        servings: 2,
        maxCookTime: 60,
        budgetLimit: 50,
        dietaryRestrictions: [],
        excludedIngredients: [],
        preferredCuisines: [],
        season: "SPRING",
      };

      const recommendations = await recommendationEngine.getRecommendations(context, 5);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe("getSimilarRecipes", () => {
    it("should return similar recipes based on recipe features", async () => {
      const mockRecipe = buildRecipeDetail({ id: "recipe1" });
      const mockSimilarRecipe = buildRecipeSummary({ id: "recipe2" });

      mockRepository.getRecipeById.mockResolvedValue(mockRecipe);
      mockRepository.getSimilarRecipes.mockResolvedValue([mockSimilarRecipe]);

      const similarRecipes = await recommendationEngine.getSimilarRecipes("recipe1", 3);

      expect(similarRecipes).toHaveLength(1);
      expect(similarRecipes[0].recipeId).toBe("recipe2");
      expect(similarRecipes[0]).toHaveProperty("score");
      expect(similarRecipes[0]).toHaveProperty("reasons");
    });
  });

  describe("getPopularRecipes", () => {
    it("should return popular recipes based on ratings and views", async () => {
      const mockPopularRecipes = [
        buildRecipeDetail({ id: "recipe1" }),
        buildRecipeDetail({ id: "recipe2", averageRating: 4.2 }),
      ];

      mockRepository.listPopularRecipes.mockResolvedValue(mockPopularRecipes);

      const popularRecipes = await recommendationEngine.getPopularRecipes(5);

      expect(popularRecipes).toHaveLength(2);
      expect(popularRecipes[0].recipeId).toBe("recipe1");
      expect(popularRecipes[0]).toHaveProperty("score");
      expect(popularRecipes[0]).toHaveProperty("reasons");
    });
  });

  describe("updateUserPreferences", () => {
    it("should update user preferences based on behavior", async () => {
      mockRepository.getDetailedRecipeBehavior.mockResolvedValue({
        ratings: [
          {
            recipeId: "recipe1",
            rating: 5,
            ratedAt: new Date(),
            recipe: buildRecipeDetail({ id: "recipe1" }),
          },
        ],
        favorites: [
          {
            recipeId: "recipe2",
            favoritedAt: new Date(),
            recipe: buildRecipeDetail({ id: "recipe2" }),
          },
        ],
        views: [],
      });

      await recommendationEngine.updateUserPreferences("user1");

      expect(mockRepository.upsertLearnedUserPreferences).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockRepository.listDetailedCandidateRecipes.mockRejectedValue(
        new Error("Database connection failed")
      );

      const context: RecommendationContext = {
        memberId: "user1",
        mealType: "LUNCH",
        servings: 2,
        maxCookTime: 60,
        budgetLimit: 50,
        dietaryRestrictions: [],
        excludedIngredients: [],
        preferredCuisines: [],
        season: "SPRING",
      };

      await expect(recommendationEngine.getRecommendations(context, 5)).rejects.toThrow(
        "Database connection failed"
      );
    });
  });
});
