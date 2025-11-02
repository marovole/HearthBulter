import { PrismaClient, Recipe, RecipeCategory, InventoryStatus } from '@prisma/client';
import { inventoryTracker } from './inventory-tracker';

const prisma = new PrismaClient();

export interface RecipeIngredient {
  foodId: string
  foodName: string
  requiredQuantity: number
  unit: string
  availableQuantity: number
  stockStatus: 'SUFFICIENT' | 'INSUFFICIENT' | 'OUT_OF_STOCK'
  shortageQuantity: number
}

export interface InventoryBasedRecipe {
  id: string
  name: string
  description?: string
  category: RecipeCategory
  difficulty: string
  prepTime: number
  cookTime: number
  servings: number
  matchScore: number
  ingredients: RecipeIngredient[]
  canCook: boolean
  missingIngredients: RecipeIngredient[]
  availableIngredients: RecipeIngredient[]
  totalAvailableValue: number
  estimatedCost: number
}

export interface RecipeRecommendation {
  recipes: InventoryBasedRecipe[]
  totalRecipes: number
  canCookCount: number
  partiallyAvailableCount: number
  unavailableCount: number
  categories: Array<{
    category: RecipeCategory
    count: number
    canCookCount: number
  }>
}

export class InventoryRecipeIntegration {
  /**
   * 基于库存推荐食谱
   */
  async recommendRecipes(
    memberId: string,
    filters?: {
      category?: RecipeCategory
      difficulty?: string
      maxPrepTime?: number
      minServings?: number
      maxServings?: number
      requireAllIngredients?: boolean
    },
    limit: number = 20
  ): Promise<RecipeRecommendation> {
    // 获取用户当前库存
    const currentInventory = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        quantity: { gt: 0 },
        status: { not: InventoryStatus.EXPIRED },
        deletedAt: null,
      },
      include: {
        food: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    const inventoryMap = new Map(
      currentInventory.map(item => [
        item.foodId,
        {
          quantity: item.quantity,
          unit: item.unit,
          food: item.food,
        },
      ])
    );

    // 构建查询条件
    const whereClause: any = {
      status: 'APPROVED',
    };

    if (filters?.category) {
      whereClause.category = filters.category;
    }

    if (filters?.difficulty) {
      whereClause.difficulty = filters.difficulty;
    }

    if (filters?.maxPrepTime) {
      whereClause.prepTime = { lte: filters.maxPrepTime };
    }

    if (filters?.minServings || filters?.maxServings) {
      whereClause.servings = {};
      if (filters?.minServings) {
        whereClause.servings.gte = filters.minServings;
      }
      if (filters?.maxServings) {
        whereClause.servings.lte = filters.maxServings;
      }
    }

    // 获取食谱
    const recipes = await prisma.recipe.findMany({
      where: whereClause,
      include: {
        ingredients: {
          include: {
            food: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
      take: limit * 2, // 获取更多食谱用于筛选
    });

    // 分析每个食谱的可用性
    const analyzedRecipes: InventoryBasedRecipe[] = [];

    for (const recipe of recipes) {
      const analysis = await this.analyzeRecipeAvailability(recipe, inventoryMap);
      
      // 根据过滤条件筛选
      if (filters?.requireAllIngredients && !analysis.canCook) {
        continue;
      }

      analyzedRecipes.push(analysis);
    }

    // 按匹配度排序
    analyzedRecipes.sort((a, b) => b.matchScore - a.matchScore);

    // 统计分类信息
    const categoryStats = new Map<RecipeCategory, { count: number; canCookCount: number }>();
    
    for (const recipe of analyzedRecipes) {
      const stats = categoryStats.get(recipe.category) || { count: 0, canCookCount: 0 };
      stats.count++;
      if (recipe.canCook) stats.canCookCount++;
      categoryStats.set(recipe.category, stats);
    }

    const canCookCount = analyzedRecipes.filter(r => r.canCook).length;
    const partiallyAvailableCount = analyzedRecipes.filter(r => 
      r.availableIngredients.length > 0 && !r.canCook
    ).length;
    const unavailableCount = analyzedRecipes.filter(r => 
      r.availableIngredients.length === 0
    ).length;

    return {
      recipes: analyzedRecipes.slice(0, limit),
      totalRecipes: analyzedRecipes.length,
      canCookCount,
      partiallyAvailableCount,
      unavailableCount,
      categories: Array.from(categoryStats.entries()).map(([category, stats]) => ({
        category,
        count: stats.count,
        canCookCount: stats.canCookCount,
      })),
    };
  }

  /**
   * 分析食谱的可用性
   */
  private async analyzeRecipeAvailability(
    recipe: any,
    inventoryMap: Map<string, any>
  ): Promise<InventoryBasedRecipe> {
    const ingredients: RecipeIngredient[] = [];
    let availableCount = 0;
    let totalAvailableValue = 0;

    for (const recipeIngredient of recipe.ingredients) {
      const inventory = inventoryMap.get(recipeIngredient.foodId);
      const stockStatus = this.getStockStatus(
        inventory?.quantity || 0,
        recipeIngredient.quantity
      );

      const ingredient: RecipeIngredient = {
        foodId: recipeIngredient.foodId,
        foodName: recipeIngredient.food.name,
        requiredQuantity: recipeIngredient.quantity,
        unit: recipeIngredient.unit,
        availableQuantity: inventory?.quantity || 0,
        stockStatus,
        shortageQuantity: Math.max(0, recipeIngredient.quantity - (inventory?.quantity || 0)),
      };

      ingredients.push(ingredient);

      if (stockStatus === 'SUFFICIENT') {
        availableCount++;
        // 简化计算：假设每单位食材价值10元
        totalAvailableValue += recipeIngredient.quantity * 10;
      }
    }

    const availableIngredients = ingredients.filter(i => i.stockStatus === 'SUFFICIENT');
    const missingIngredients = ingredients.filter(i => i.stockStatus !== 'SUFFICIENT');

    const matchScore = this.calculateMatchScore(availableCount, ingredients.length);
    const canCook = missingIngredients.length === 0;

    // 估算制作成本（简化计算）
    const estimatedCost = ingredients.reduce((sum, ing) => {
      return sum + (ing.shortageQuantity > 0 ? ing.shortageQuantity * 12 : 0); // 缺少的食材按12元/单位估算
    }, 0);

    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      matchScore,
      ingredients,
      canCook,
      missingIngredients,
      availableIngredients,
      totalAvailableValue,
      estimatedCost,
    };
  }

  /**
   * 使用库存制作食谱
   */
  async cookRecipe(
    memberId: string,
    recipeId: string,
    servings: number = 1
  ): Promise<{
    success: boolean
    usedIngredients: Array<{
      foodName: string
      usedQuantity: number
      unit: string
    }>
    errors: string[]
    warnings: string[]
  }> {
    const result = {
      success: true,
      usedIngredients: [] as Array<{ foodName: string; usedQuantity: number; unit: string }>,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      // 获取食谱信息
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: {
            include: {
              food: true,
            },
          },
        },
      });

      if (!recipe) {
        throw new Error('食谱不存在');
      }

      // 检查库存是否充足
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          memberId,
          foodId: { in: recipe.ingredients.map(ing => ing.foodId) },
          deletedAt: null,
        },
        include: {
          food: true,
        },
      });

      const inventoryMap = new Map(
        inventoryItems.map(item => [item.foodId, item])
      );

      // 验证库存
      for (const ingredient of recipe.ingredients) {
        const requiredQuantity = ingredient.quantity * servings;
        const inventory = inventoryMap.get(ingredient.foodId);

        if (!inventory || inventory.quantity < requiredQuantity) {
          result.errors.push(`${ingredient.food.name} 库存不足`);
          result.success = false;
        }

        if (inventory && inventory.status === InventoryStatus.EXPIRED) {
          result.warnings.push(`${ingredient.food.name} 已过期，请确认安全性`);
        }
      }

      if (!result.success) {
        return result;
      }

      // 使用库存
      for (const ingredient of recipe.ingredients) {
        try {
          const requiredQuantity = ingredient.quantity * servings;
          const inventory = inventoryMap.get(ingredient.foodId);

          if (inventory) {
            await inventoryTracker.useInventory(
              inventory.id,
              requiredQuantity,
              'COOKING',
              memberId,
              {
                relatedId: recipeId,
                relatedType: 'RECIPE',
                notes: `制作食谱: ${recipe.name}`,
                recipeName: recipe.name,
              }
            );

            result.usedIngredients.push({
              foodName: ingredient.food.name,
              usedQuantity: requiredQuantity,
              unit: ingredient.unit,
            });
          }
        } catch (error) {
          result.errors.push(`使用 ${ingredient.food.name} 时出错: ${error}`);
          result.success = false;
        }
      }

      // 记录制作历史
      if (result.success) {
        await prisma.recipeHistory.create({
          data: {
            memberId,
            recipeId,
            servings,
            cookedAt: new Date(),
          },
        });
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`制作失败: ${error}`);
    }

    return result;
  }

  /**
   * 生成基于库存的食谱购物清单
   */
  async generateRecipeShoppingList(
    memberId: string,
    recipeIds: string[],
    servings: number = 1
  ): Promise<{
    shoppingList: Array<{
      foodName: string
      requiredQuantity: number
      unit: string
      currentStock: number
      needToBuy: number
      estimatedPrice: number
    }>
    totalEstimatedCost: number
    canCookRecipes: string[]
    cannotCookRecipes: string[]
  }> {
    // 获取食谱信息
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      include: {
        ingredients: {
          include: {
            food: true,
          },
        },
      },
    });

    // 获取当前库存
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        foodId: { in: recipes.flatMap(r => r.ingredients.map(i => i.foodId)) },
        deletedAt: null,
      },
      include: {
        food: true,
      },
    });

    const inventoryMap = new Map(
      inventoryItems.map(item => [item.foodId, item])
    );

    const shoppingList = new Map<string, any>();
    const canCookRecipes: string[] = [];
    const cannotCookRecipes: string[] = [];

    for (const recipe of recipes) {
      let canCook = true;

      for (const ingredient of recipe.ingredients) {
        const requiredQuantity = ingredient.quantity * servings;
        const inventory = inventoryMap.get(ingredient.foodId);
        const currentStock = inventory?.quantity || 0;
        const needToBuy = Math.max(0, requiredQuantity - currentStock);

        if (needToBuy > 0) {
          canCook = false;
        }

        const key = ingredient.foodId;
        if (shoppingList.has(key)) {
          const existing = shoppingList.get(key);
          existing.requiredQuantity += requiredQuantity;
          existing.needToBuy += needToBuy;
        } else {
          shoppingList.set(key, {
            foodName: ingredient.food.name,
            requiredQuantity,
            unit: ingredient.unit,
            currentStock,
            needToBuy,
            estimatedPrice: needToBuy * 12, // 简化价格估算
          });
        }
      }

      if (canCook) {
        canCookRecipes.push(recipe.name);
      } else {
        cannotCookRecipes.push(recipe.name);
      }
    }

    const totalEstimatedCost = Array.from(shoppingList.values())
      .reduce((sum, item) => sum + item.estimatedPrice, 0);

    return {
      shoppingList: Array.from(shoppingList.values()),
      totalEstimatedCost,
      canCookRecipes,
      cannotCookRecipes,
    };
  }

  /**
   * 获取基于库存的食谱统计
   */
  async getInventoryRecipeStats(memberId: string): Promise<{
    totalRecipes: number
    canCookCount: number
    partiallyAvailableCount: number
    topCategories: Array<{
      category: RecipeCategory
      count: number
      canCookCount: number
    }>
    recentCooked: Array<{
      recipeName: string
      cookedAt: Date
      servings: number
    }>
  }> {
    // 获取库存状态
    const currentInventory = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        quantity: { gt: 0 },
        status: { not: InventoryStatus.EXPIRED },
        deletedAt: null,
      },
    });

    const inventoryMap = new Map(
      currentInventory.map(item => [item.foodId, item.quantity])
    );

    // 获取所有食谱
    const allRecipes = await prisma.recipe.findMany({
      where: { status: 'APPROVED' },
      include: {
        ingredients: true,
      },
    });

    // 分析食谱可用性
    let canCookCount = 0;
    let partiallyAvailableCount = 0;
    const categoryStats = new Map<RecipeCategory, { count: number; canCookCount: number }>();

    for (const recipe of allRecipes) {
      let availableIngredients = 0;
      const category = recipe.category;

      for (const ingredient of recipe.ingredients) {
        const availableQuantity = inventoryMap.get(ingredient.foodId) || 0;
        if (availableQuantity >= ingredient.quantity) {
          availableIngredients++;
        }
      }

      const stats = categoryStats.get(category) || { count: 0, canCookCount: 0 };
      stats.count++;
      if (availableIngredients === recipe.ingredients.length) {
        canCookCount++;
        stats.canCookCount++;
      } else if (availableIngredients > 0) {
        partiallyAvailableCount++;
      }
      categoryStats.set(category, stats);
    }

    // 获取最近制作记录
    const recentCooked = await prisma.recipeHistory.findMany({
      where: { memberId },
      include: {
        recipe: {
          select: { name: true },
        },
      },
      orderBy: { cookedAt: 'desc' },
      take: 10,
    });

    return {
      totalRecipes: allRecipes.length,
      canCookCount,
      partiallyAvailableCount,
      topCategories: Array.from(categoryStats.entries())
        .map(([category, stats]) => ({ category, count: stats.count, canCookCount: stats.canCookCount }))
        .sort((a, b) => b.canCookCount - a.canCookCount)
        .slice(0, 5),
      recentCooked: recentCooked.map(record => ({
        recipeName: record.recipe.name,
        cookedAt: record.cookedAt,
        servings: record.servings,
      })),
    };
  }

  // 私有方法

  private getStockStatus(available: number, required: number): 'SUFFICIENT' | 'INSUFFICIENT' | 'OUT_OF_STOCK' {
    if (available >= required) return 'SUFFICIENT';
    if (available > 0) return 'INSUFFICIENT';
    return 'OUT_OF_STOCK';
  }

  private calculateMatchScore(availableCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return Math.round((availableCount / totalCount) * 100);
  }
}

export const inventoryRecipeIntegration = new InventoryRecipeIntegration();
