import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { NextRequest } from "next/server";

// Create a mock Prisma client
const mockPrismaClient = {
  recipe: {
    findMany: jest.fn(),
  },
  recipeRating: {
    create: jest.fn(),
  },
  recipeFavorite: {
    create: jest.fn(),
  },
  recipeView: {
    create: jest.fn(),
  },
  ingredientSubstitution: {
    create: jest.fn(),
  },
  userPreference: {
    findUnique: jest.fn(),
  },
};

// Mock Prisma BEFORE any imports
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

// Mock the recommendation engine to return simple mock data
jest.mock("@/lib/services/recommendation/recommendation-engine", () => {
  return {
    RecommendationEngine: jest.fn().mockImplementation(() => ({
      getRecommendations: jest.fn().mockResolvedValue([
        {
          recipeId: "recipe-1",
          score: 0.85,
          reasons: ["符合口味"],
          explanation: "根据您的偏好推荐",
          metadata: {
            inventoryMatch: 0.8,
            priceMatch: 0.7,
            nutritionMatch: 0.9,
            preferenceMatch: 0.85,
            seasonalMatch: 0.6,
          },
        },
      ]),
      getSimilarRecipes: jest.fn().mockResolvedValue([]),
      getPopularRecipes: jest.fn().mockResolvedValue([]),
      refreshRecommendations: jest.fn().mockResolvedValue([]),
    })),
  };
});

// Import route handlers AFTER mocks are set up
let GET: any;
let POST: any;

describe("/api/recommendations", () => {
  let mockRequest: any;

  beforeEach(async () => {
    // Clear all mocks and reset modules to ensure fresh imports with mocks applied
    jest.clearAllMocks();
    jest.resetModules();

    // Re-import the route handlers with mocks in place
    const route = await import("@/app/api/recommendations/route");
    GET = route.GET;
    POST = route.POST;

    mockRequest = {
      url: "http://localhost:3000/api/recommendations",
      json: jest.fn(),
    };
  });

  describe("GET /api/recommendations", () => {
    it("should return recommendations successfully", async () => {
      const url = new URL(
        "http://localhost:3000/api/recommendations?memberId=test-user&limit=10",
      );
      const request = { url: url.toString() } as NextRequest;

      // Mock Prisma recipe response
      mockPrismaClient.recipe.findMany.mockResolvedValue([
        {
          id: "recipe-1",
          name: "测试食谱",
          description: "美味营养",
          totalTime: 30,
          estimatedCost: 25,
          calories: 350,
          protein: 25,
          carbs: 40,
          fat: 15,
          difficulty: "EASY",
          cuisine: "中式",
          category: "MAIN_DISH",
          averageRating: 4.5,
          ratingCount: 12,
          viewCount: 150,
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recommendations).toBeDefined();
      expect(data.data.recommendations.length).toBeGreaterThan(0);
    });

    it("should handle missing memberId parameter", async () => {
      const url = new URL("http://localhost:3000/api/recommendations");
      const request = { url: url.toString() } as NextRequest;

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Should use default value
      expect(data.success).toBe(true);
    });

    it("should handle invalid limit parameter", async () => {
      const url = new URL(
        "http://localhost:3000/api/recommendations?memberId=test-user&limit=invalid",
      );
      const request = { url: url.toString() } as NextRequest;

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Should use default value
      expect(data.success).toBe(true);
    });

    it("should handle recommendation engine errors", async () => {
      const url = new URL(
        "http://localhost:3000/api/recommendations?memberId=test-user",
      );
      const request = { url: url.toString() } as NextRequest;

      // Mock the recipe search to fail
      mockPrismaClient.recipe.findMany.mockRejectedValue(
        new Error("Recipe search failed"),
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should parse all query parameters correctly", async () => {
      const url = new URL(
        "http://localhost:3000/api/recommendations?" +
          "memberId=test-user&mealType=DINNER&servings=4&maxCookTime=90&" +
          "budgetLimit=80&dietaryRestrictions=low-sugar,gluten-free&" +
          "excludedIngredients=garlic,onion&preferredCuisines=Italian,Chinese&season=SUMMER&limit=5",
      );
      const request = { url: url.toString() } as NextRequest;

      mockPrismaClient.recipe.findMany.mockResolvedValue([]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("POST /api/recommendations", () => {
    it("should handle rating interaction", async () => {
      mockPrismaClient.recipeRating.create.mockResolvedValue({
        id: "rating-1",
        recipeId: "recipe-1",
        memberId: "test-user",
        rating: 5,
      });

      mockRequest.json.mockResolvedValue({
        type: "rating",
        data: {
          recipeId: "recipe-1",
          memberId: "test-user",
          rating: 5,
          isRecommended: true,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle favorite interaction", async () => {
      mockPrismaClient.recipeFavorite.create.mockResolvedValue({
        id: "favorite-1",
        recipeId: "recipe-1",
        memberId: "test-user",
      });

      mockRequest.json.mockResolvedValue({
        type: "favorite",
        data: {
          recipeId: "recipe-1",
          memberId: "test-user",
          folderName: "收藏夹",
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle view interaction", async () => {
      mockPrismaClient.recipeView.create.mockResolvedValue({
        id: "view-1",
        recipeId: "recipe-1",
        memberId: "test-user",
      });

      mockRequest.json.mockResolvedValue({
        type: "view",
        data: {
          recipeId: "recipe-1",
          memberId: "test-user",
          viewDuration: 30,
          viewSource: "recommendation",
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle substitution interaction", async () => {
      mockPrismaClient.ingredientSubstitution.create.mockResolvedValue({
        id: "substitution-1",
        originalIngredientId: "ingredient-1",
        substitutedIngredientId: "ingredient-2",
      });

      mockRequest.json.mockResolvedValue({
        type: "substitution",
        data: {
          recipeId: "recipe-1",
          memberId: "test-user",
          originalIngredientId: "ingredient-1",
          substitutedIngredientId: "ingredient-2",
          substitutionReason: "allergy",
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle invalid interaction type", async () => {
      mockRequest.json.mockResolvedValue({
        type: "invalid-type",
        data: {},
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid interaction type");
    });

    it("should handle JSON parsing errors", async () => {
      mockRequest.json.mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to record interaction");
    });

    it("should handle database errors during interaction recording", async () => {
      mockPrismaClient.recipeRating.create.mockRejectedValue(
        new Error("Database error"),
      );

      mockRequest.json.mockResolvedValue({
        type: "rating",
        data: {
          recipeId: "recipe-1",
          memberId: "test-user",
          rating: 5,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to record interaction");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty results gracefully", async () => {
      const url = new URL(
        "http://localhost:3000/api/recommendations?memberId=test-user",
      );
      const request = { url: url.toString() } as NextRequest;

      mockPrismaClient.recipe.findMany.mockResolvedValue([]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.recommendations)).toBe(true);
    });

    it("should handle malformed query parameters", async () => {
      const url = new URL(
        "http://localhost:3000/api/recommendations?memberId=test-user&servings=abc&budgetLimit=def",
      );
      const request = { url: url.toString() } as NextRequest;

      mockPrismaClient.recipe.findMany.mockResolvedValue([]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
