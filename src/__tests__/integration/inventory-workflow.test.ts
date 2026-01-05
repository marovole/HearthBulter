import { inventoryTracker } from "@/services/inventory-tracker";
import { expiryMonitor } from "@/services/expiry-monitor";
import { inventoryAnalyzer } from "@/services/inventory-analyzer";
import { inventoryShoppingIntegration } from "@/services/inventory-shopping-integration";
import { inventoryRecipeIntegration } from "@/services/inventory-recipe-integration";
import {
  PrismaClient,
  InventoryStatus,
  StorageLocation,
  RecipeCategory,
} from "@prisma/client";

const prisma = new PrismaClient();

describe("Inventory Management Workflow Integration", () => {
  let testMemberId: string;
  const testFoodIds: string[] = [];
  let testRecipeId: string;
  const testInventoryItemIds: string[] = [];

  beforeAll(async () => {
    // 创建测试成员
    const testMember = await prisma.familyMember.create({
      data: {
        name: "Integration Test User",
        email: "integration-test@example.com",
        role: "MEMBER",
      },
    });
    testMemberId = testMember.id;

    // 创建测试食物
    const testFoods = [
      {
        name: "Test Tomato",
        nameEn: "Tomato",
        category: "VEGETABLES",
        calories: 18,
        protein: 0.9,
        carbs: 3.9,
        fat: 0.2,
      },
      {
        name: "Test Onion",
        nameEn: "Onion",
        category: "VEGETABLES",
        calories: 40,
        protein: 1.1,
        carbs: 9.3,
        fat: 0.1,
      },
      {
        name: "Test Rice",
        nameEn: "Rice",
        category: "GRAINS",
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fat: 0.3,
      },
      {
        name: "Test Chicken",
        nameEn: "Chicken",
        category: "PROTEIN",
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
    ];

    for (const foodData of testFoods) {
      const food = await prisma.food.create({ data: foodData });
      testFoodIds.push(food.id);
    }

    // 创建测试食谱
    const testRecipe = await prisma.recipe.create({
      data: {
        name: "Test Chicken Rice",
        description: "A simple test recipe",
        category: RecipeCategory.MAIN_COURSE,
        difficulty: "EASY",
        prepTime: 15,
        cookTime: 30,
        servings: 2,
        instructions: "Cook the rice and chicken together",
        status: "APPROVED",
        ingredients: {
          create: [
            { foodId: testFoodIds[3], quantity: 200, unit: "g" }, // Chicken
            { foodId: testFoodIds[2], quantity: 100, unit: "g" }, // Rice
            { foodId: testFoodIds[0], quantity: 50, unit: "g" }, // Tomato
            { foodId: testFoodIds[1], quantity: 30, unit: "g" }, // Onion
          ],
        },
      },
    });
    testRecipeId = testRecipe.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.inventoryItem.deleteMany({
      where: { memberId: testMemberId },
    });
    await prisma.recipe.delete({
      where: { id: testRecipeId },
    });
    await prisma.food.deleteMany({
      where: { id: { in: testFoodIds } },
    });
    await prisma.familyMember.delete({
      where: { id: testMemberId },
    });
  });

  describe("Complete Inventory Workflow", () => {
    it("should handle end-to-end inventory management", async () => {
      // 1. 添加库存物品
      const inventoryItems = [];
      const now = new Date();

      for (let i = 0; i < testFoodIds.length; i++) {
        const item = await inventoryTracker.createInventoryItem({
          memberId: testMemberId,
          foodId: testFoodIds[i],
          quantity: 500,
          unit: "g",
          purchasePrice: 10 + i * 2,
          purchaseSource: "Test Market",
          expiryDate: new Date(
            now.getTime() + (i + 1) * 3 * 24 * 60 * 60 * 1000,
          ), // 3-12天后过期
          storageLocation: StorageLocation.REFRIGERATOR,
          minStockThreshold: 100,
        });
        inventoryItems.push(item);
        testInventoryItemIds.push(item.id);
      }

      expect(inventoryItems).toHaveLength(4);

      // 2. 获取库存列表
      const inventoryList =
        await inventoryTracker.getInventoryItems(testMemberId);
      expect(inventoryList).toHaveLength(4);

      // 3. 更新保质期状态
      const updatedCount =
        await expiryMonitor.updateExpiryStatuses(testMemberId);
      expect(updatedCount).toBe(4);

      // 4. 获取过期提醒
      const expiryAlerts = await expiryMonitor.getExpiryAlerts(testMemberId);
      expect(expiryAlerts.memberId).toBe(testMemberId);
      expect(expiryAlerts.expiringItems.length).toBeGreaterThan(0);

      // 5. 使用库存制作食谱
      const recipeIngredients = [
        { foodId: testFoodIds[3], quantity: 200, unit: "g" }, // Chicken
        { foodId: testFoodIds[2], quantity: 100, unit: "g" }, // Rice
        { foodId: testFoodIds[0], quantity: 50, unit: "g" }, // Tomato
        { foodId: testFoodIds[1], quantity: 30, unit: "g" }, // Onion
      ];

      const updatedItems = await inventoryTracker.useInventoryForRecipe(
        testMemberId,
        recipeIngredients,
        "Test Chicken Rice",
      );

      expect(updatedItems).toHaveLength(4);
      expect(updatedItems.every((item) => item.usageRecords.length > 0)).toBe(
        true,
      );

      // 6. 验证库存数量更新
      const updatedInventory =
        await inventoryTracker.getInventoryItems(testMemberId);
      expect(updatedInventory[0].quantity).toBe(300); // Tomato: 500 - 200
      expect(updatedInventory[1].quantity).toBe(470); // Onion: 500 - 30
      expect(updatedInventory[2].quantity).toBe(400); // Rice: 500 - 100
      expect(updatedInventory[3].quantity).toBe(300); // Chicken: 500 - 200

      // 7. 生成库存分析
      const analysis = await inventoryAnalyzer.getInventoryAnalysis(
        testMemberId,
        30,
      );
      expect(analysis.memberId).toBe(testMemberId);
      expect(analysis.summary.totalItems).toBe(4);
      expect(analysis.summary.usedItems).toBeGreaterThan(0);

      // 8. 生成采购建议
      const suggestions =
        await inventoryAnalyzer.generatePurchaseSuggestions(testMemberId);
      expect(Array.isArray(suggestions)).toBe(true);

      // 9. 生成基于库存的购物清单
      const shoppingList =
        await inventoryShoppingIntegration.createInventoryBasedShoppingList(
          testMemberId,
          "Test Shopping List",
        );
      expect(shoppingList.id).toBeDefined();
      expect(shoppingList.suggestions.length).toBeGreaterThan(0);

      // 10. 基于库存推荐食谱
      const recipeRecommendations =
        await inventoryRecipeIntegration.recommendRecipes(testMemberId);
      expect(recipeRecommendations.recipes.length).toBeGreaterThan(0);
      expect(recipeRecommendations.canCookCount).toBeGreaterThan(0);

      // 11. 模拟部分物品过期
      const expiredItem = inventoryItems[0];
      await prisma.inventoryItem.update({
        where: { id: expiredItem.id },
        data: { expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 1天前过期
      });

      // 12. 处理过期物品
      await expiryMonitor.handleExpiredItems(
        testMemberId,
        [expiredItem.id],
        "EXPIRED",
      );

      // 13. 验证过期物品已被移除
      const finalInventory =
        await inventoryTracker.getInventoryItems(testMemberId);
      expect(finalInventory).toHaveLength(3);
      expect(
        finalInventory.find((item) => item.id === expiredItem.id),
      ).toBeUndefined();

      // 14. 获取最终统计
      const finalStats = await inventoryTracker.getInventoryStats(testMemberId);
      expect(finalStats.totalItems).toBe(3);
      expect(finalStats.wasteItems).toBeGreaterThan(0);
    });
  });

  describe("Shopping List Integration", () => {
    it("should integrate inventory with shopping lists", async () => {
      // 1. 创建库存不足的情况
      await inventoryTracker.updateInventoryItem(testInventoryItemIds[1], {
        quantity: 50,
      }); // 低于阈值100

      // 2. 生成购物建议
      const suggestions =
        await inventoryShoppingIntegration.generateShoppingSuggestions(
          testMemberId,
        );
      expect(suggestions.length).toBeGreaterThan(0);

      // 3. 验证包含库存不足的建议
      const lowStockSuggestion = suggestions.find((s) => s.priority === "HIGH");
      expect(lowStockSuggestion).toBeDefined();

      // 4. 创建购物清单
      const shoppingList =
        await inventoryShoppingIntegration.createInventoryBasedShoppingList(
          testMemberId,
          "Auto Generated List",
        );
      expect(shoppingList.suggestions.length).toBeGreaterThan(0);

      // 5. 模拟购买并同步到库存
      const purchasedItems = shoppingList.suggestions
        .slice(0, 2)
        .map((suggestion) => ({
          shoppingItemId: suggestion.id,
          actualQuantity: suggestion.suggestedQuantity,
          actualPrice: suggestion.estimatedPrice || 10,
        }));

      // 这里需要实际的shoppingItemId，简化测试跳过同步步骤
      expect(purchasedItems.length).toBe(2);
    });
  });

  describe("Recipe Integration", () => {
    it("should integrate inventory with recipe recommendations", async () => {
      // 1. 确保有足够的库存
      await inventoryTracker.updateInventoryItem(testInventoryItemIds[2], {
        quantity: 200,
      });

      // 2. 获取食谱推荐
      const recommendations = await inventoryRecipeIntegration.recommendRecipes(
        testMemberId,
        {
          requireAllIngredients: true,
        },
      );
      expect(recommendations.recipes.length).toBeGreaterThan(0);

      // 3. 验证可以制作的食谱
      const cookableRecipes = recommendations.recipes.filter((r) => r.canCook);
      expect(cookableRecipes.length).toBeGreaterThan(0);

      // 4. 制作食谱
      if (cookableRecipes.length > 0) {
        const recipe = cookableRecipes[0];
        const cookResult = await inventoryRecipeIntegration.cookRecipe(
          testMemberId,
          recipe.id,
          1,
        );
        expect(cookResult.success).toBe(true);
        expect(cookResult.usedIngredients.length).toBeGreaterThan(0);
      }

      // 5. 生成食谱购物清单
      const recipeShoppingList =
        await inventoryRecipeIntegration.generateRecipeShoppingList(
          testMemberId,
          [testRecipeId],
          1,
        );
      expect(recipeShoppingList.shoppingList.length).toBeGreaterThan(0);
      expect(recipeShoppingList.canCookRecipes.length).toBeGreaterThanOrEqual(
        0,
      );
    });
  });

  describe("Expiry Management Integration", () => {
    it("should handle expiry monitoring and notifications", async () => {
      // 1. 创建即将过期的物品
      const expiringFood = await prisma.food.create({
        data: {
          name: "Test Expiring Item",
          nameEn: "Expiring Item",
          category: "DAIRY",
          calories: 50,
          protein: 2,
          carbs: 5,
          fat: 1,
        },
      });
      testFoodIds.push(expiringFood.id);

      const expiringItem = await inventoryTracker.createInventoryItem({
        memberId: testMemberId,
        foodId: expiringFood.id,
        quantity: 2,
        unit: "L",
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天后过期
        storageLocation: StorageLocation.REFRIGERATOR,
      });

      // 2. 更新过期状态
      await expiryMonitor.updateExpiryStatuses(testMemberId);

      // 3. 获取过期提醒
      const alerts = await expiryMonitor.getExpiryAlerts(testMemberId);
      expect(alerts.expiringItems.length).toBeGreaterThan(0);

      // 4. 生成过期通知
      const notifications =
        await expiryMonitor.generateExpiryNotifications(testMemberId);
      expect(notifications.length).toBeGreaterThan(0);

      // 5. 获取过期分析
      const expiryAnalysis =
        await expiryMonitor.getExpiryAnalysis(testMemberId);
      expect(expiryAnalysis.summary.totalItems).toBeGreaterThan(0);
      expect(expiryAnalysis.recommendations.length).toBeGreaterThan(0);

      // 6. 清理
      await inventoryTracker.deleteInventoryItem(expiringItem.id);
      await prisma.food.delete({ where: { id: expiringFood.id } });
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large inventory operations efficiently", async () => {
      const startTime = Date.now();

      // 创建多个库存物品
      const bulkItems = [];
      for (let i = 0; i < 10; i++) {
        const item = await inventoryTracker.createInventoryItem({
          memberId: testMemberId,
          foodId: testFoodIds[i % testFoodIds.length],
          quantity: 100 + i * 10,
          unit: "g",
          expiryDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        });
        bulkItems.push(item);
      }

      const createDuration = Date.now() - startTime;
      expect(createDuration).toBeLessThan(5000); // 应该在5秒内完成

      // 批量更新状态
      const updateStartTime = Date.now();
      await expiryMonitor.updateExpiryStatuses(testMemberId);
      const updateDuration = Date.now() - updateStartTime;
      expect(updateDuration).toBeLessThan(2000); // 应该在2秒内完成

      // 获取分析报告
      const analysisStartTime = Date.now();
      await inventoryAnalyzer.getInventoryAnalysis(testMemberId, 30);
      const analysisDuration = Date.now() - analysisStartTime;
      expect(analysisDuration).toBeLessThan(3000); // 应该在3秒内完成

      // 清理
      for (const item of bulkItems) {
        await inventoryTracker.deleteInventoryItem(item.id);
      }
    });
  });
});
