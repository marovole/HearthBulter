import { RecipeCategory } from "@/types/enums";

export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  requiredQuantity: number;
  unit: string;
  availableQuantity: number;
  stockStatus: "SUFFICIENT" | "INSUFFICIENT" | "OUT_OF_STOCK";
  shortageQuantity: number;
}

export interface InventoryBasedRecipe {
  id: string;
  name: string;
  description?: string;
  category: RecipeCategory;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  matchScore: number;
  ingredients: RecipeIngredient[];
  canCook: boolean;
  missingIngredients: RecipeIngredient[];
  availableIngredients: RecipeIngredient[];
  totalAvailableValue: number;
  estimatedCost: number;
}

export interface RecipeRecommendation {
  recipes: InventoryBasedRecipe[];
  totalRecipes: number;
  canCookCount: number;
  partiallyAvailableCount: number;
  unavailableCount: number;
  categories: Array<{
    category: RecipeCategory;
    count: number;
    canCookCount: number;
  }>;
}

export class InventoryRecipeIntegration {
  async recommendRecipes(): Promise<RecipeRecommendation> {
    return {
      recipes: [],
      totalRecipes: 0,
      canCookCount: 0,
      partiallyAvailableCount: 0,
      unavailableCount: 0,
      categories: [],
    };
  }

  async cookRecipe(): Promise<{
    success: boolean;
    usedIngredients: Array<{
      foodName: string;
      usedQuantity: number;
      unit: string;
    }>;
    errors: string[];
    warnings: string[];
  }> {
    return {
      success: true,
      usedIngredients: [],
      errors: [],
      warnings: [],
    };
  }

  async generateRecipeShoppingList(): Promise<{
    shoppingList: Array<{
      foodName: string;
      requiredQuantity: number;
      unit: string;
      currentStock: number;
      needToBuy: number;
      estimatedPrice: number;
    }>;
    totalEstimatedCost: number;
    canCookRecipes: string[];
    cannotCookRecipes: string[];
  }> {
    return {
      shoppingList: [],
      totalEstimatedCost: 0,
      canCookRecipes: [],
      cannotCookRecipes: [],
    };
  }

  async getInventoryRecipeStats(): Promise<{
    totalRecipes: number;
    canCookCount: number;
    partiallyAvailableCount: number;
    topCategories: Array<{
      category: RecipeCategory;
      count: number;
      canCookCount: number;
    }>;
    recentCooked: Array<{
      recipeName: string;
      cookedAt: Date;
      servings: number;
    }>;
  }> {
    return {
      totalRecipes: 0,
      canCookCount: 0,
      partiallyAvailableCount: 0,
      topCategories: [],
      recentCooked: [],
    };
  }
}

export const inventoryRecipeIntegration = new InventoryRecipeIntegration();
