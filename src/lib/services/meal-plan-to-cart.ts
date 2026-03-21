// ============================================================================
// 周计划→购物车流程服务
// 从周计划提取食材，匹配商品，创建 Instacart 购物车
// ============================================================================

import { prisma } from "@/lib/db";
import { InstacartAdapter, InstacartCart } from "./ecommerce/instacart-adapter";
import {
  IngredientMatcher,
  IngredientMatchRequest,
  BatchMatchResult,
} from "./ecommerce/ingredient-matcher";
import { EcommercePlatform } from "./ecommerce/types";

// ============================================================================
// 类型定义
// ============================================================================

export interface MealPlanToCartRequest {
  mealPlanId: string;
  userId: string;
  zipCode?: string;
  retailerId?: string;
}

export interface MealPlanToCartResult {
  success: boolean;
  cart?: InstacartCart;
  matchResult?: BatchMatchResult;
  error?: string;
  checkoutUrl?: string;
  deepLink?: string;
}

export interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  mealId: string;
  mealName: string;
}

// ============================================================================
// 服务实现
// ============================================================================

export class MealPlanToCartService {
  private instacartAdapter: InstacartAdapter;
  private ingredientMatcher: IngredientMatcher;

  constructor() {
    this.instacartAdapter = new InstacartAdapter();
    this.ingredientMatcher = new IngredientMatcher(this.instacartAdapter);
  }

  // --------------------------------------------------------------------------
  // 主流程：周计划 → 购物车
  // --------------------------------------------------------------------------

  async createCartFromMealPlan(request: MealPlanToCartRequest): Promise<MealPlanToCartResult> {
    try {
      const token = await this.getUserToken(request.userId);
      if (!token) {
        return { success: false, error: "Instacart not connected" };
      }

      const mealPlan = await this.getMealPlan(request.mealPlanId);
      if (!mealPlan) {
        return { success: false, error: "Meal plan not found" };
      }

      const ingredients = this.extractIngredients(mealPlan);
      if (ingredients.length === 0) {
        return { success: false, error: "No ingredients found in meal plan" };
      }

      const matchRequests: IngredientMatchRequest[] = ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
      }));

      const matchResult = await this.ingredientMatcher.matchIngredients(matchRequests, token);

      if (matchResult.cartItems.length === 0) {
        return {
          success: false,
          error: "Could not match any ingredients to products",
          matchResult,
        };
      }

      const retailerId = await this.selectRetailer(
        request.zipCode || "10001",
        request.retailerId,
        token
      );
      if (!retailerId) {
        return { success: false, error: "No available retailers in your area" };
      }

      const cart = await this.instacartAdapter.createCart(matchResult.cartItems, retailerId, token);

      await this.saveCartRecord(request.userId, request.mealPlanId, cart, matchResult);

      return {
        success: true,
        cart,
        matchResult,
        checkoutUrl: cart.checkoutUrl,
        deepLink: cart.deepLink,
      };
    } catch (error) {
      console.error("[MealPlanToCart] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // --------------------------------------------------------------------------
  // 提取食材
  // --------------------------------------------------------------------------

  private extractIngredients(mealPlan: any): ExtractedIngredient[] {
    const ingredientMap = new Map<string, ExtractedIngredient>();

    for (const meal of mealPlan.meals) {
      for (const ingredient of meal.ingredients || []) {
        const key = ingredient.name.toLowerCase();
        const existing = ingredientMap.get(key);

        if (existing) {
          existing.quantity += ingredient.quantity || 1;
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            quantity: ingredient.quantity || 1,
            unit: ingredient.unit,
            category: ingredient.category,
            mealId: meal.id,
            mealName: meal.recipeName || "Custom Meal",
          });
        }
      }
    }

    return Array.from(ingredientMap.values());
  }

  // --------------------------------------------------------------------------
  // 辅助方法
  // --------------------------------------------------------------------------

  private async getUserToken(userId: string): Promise<string | null> {
    const account = await prisma.platformAccount.findFirst<{
      id: string;
      accessToken?: string;
      expiresAt?: Date;
      refreshToken?: string;
    }>({
      where: {
        userId,
        platform: EcommercePlatform.INSTACART,
        status: "ACTIVE",
      },
    });

    if (!account?.accessToken) return null;

    if (account.expiresAt && account.expiresAt < new Date()) {
      if (account.refreshToken) {
        try {
          const newToken = await this.instacartAdapter.refreshToken(account.refreshToken);
          await prisma.platformAccount.update({
            where: { id: account.id },
            data: {
              accessToken: newToken.accessToken,
              refreshToken: newToken.refreshToken || account.refreshToken,
              expiresAt: newToken.expiresAt,
            },
          });
          return newToken.accessToken;
        } catch {
          return null;
        }
      }
      return null;
    }

    return account.accessToken;
  }

  private async getMealPlan(mealPlanId: string) {
    return prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        meals: {
          include: { ingredients: true },
        },
      },
    });
  }

  private async selectRetailer(
    zipCode: string,
    preferredRetailerId: string | undefined,
    token: string
  ): Promise<string | null> {
    const retailers = await this.instacartAdapter.getAvailableRetailers(zipCode, token);

    if (preferredRetailerId) {
      const preferred = retailers.find((r) => r.id === preferredRetailerId && r.isAvailable);
      if (preferred) return preferred.id;
    }

    const available = retailers.find((r) => r.isAvailable);
    return available?.id || null;
  }

  private async saveCartRecord(
    userId: string,
    mealPlanId: string,
    cart: InstacartCart,
    _matchResult: BatchMatchResult
  ): Promise<void> {
    await prisma.instacartCart.create({
      data: {
        userId,
        cartId: cart.cartId,
        retailerId: cart.retailerId,
        checkoutUrl: cart.checkoutUrl,
        deepLink: cart.deepLink,
        itemsJson: JSON.stringify(cart.items),
        mealPlanId,
        expiresAt: cart.expiresAt,
      },
    });
  }
}

export const mealPlanToCartService = new MealPlanToCartService();
