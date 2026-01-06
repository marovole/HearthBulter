import { inventoryTracker } from "@/services/inventory-tracker";
import { PrismaClient, InventoryStatus, StorageLocation } from "@prisma/client";

const prisma = new PrismaClient();

describe("InventoryTracker", () => {
  let testMemberId: string;
  let testFoodId: string;
  let testInventoryItemId: string;

  beforeAll(async () => {
    // 创建测试数据
    const testMember = await prisma.familyMember.create({
      data: {
        name: "Test User",
        email: "test@example.com",
        role: "MEMBER",
      },
    });
    testMemberId = testMember.id;

    const testFood = await prisma.food.create({
      data: {
        name: "Test Apple",
        nameEn: "Apple",
        category: "FRUITS",
        calories: 52,
        protein: 0.3,
        carbs: 14,
        fat: 0.2,
      },
    });
    testFoodId = testFood.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.inventoryItem.deleteMany({
      where: { memberId: testMemberId },
    });
    await prisma.familyMember.delete({
      where: { id: testMemberId },
    });
    await prisma.food.delete({
      where: { id: testFoodId },
    });
  });

  describe("createInventoryItem", () => {
    it("should create a new inventory item successfully", async () => {
      const itemData = {
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: 10,
        unit: "个",
        purchasePrice: 15.5,
        purchaseSource: "Test Store",
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
        storageLocation: StorageLocation.REFRIGERATOR,
        minStockThreshold: 2,
      };

      const result = await inventoryTracker.createInventoryItem(itemData);

      expect(result).toBeDefined();
      expect(result.memberId).toBe(testMemberId);
      expect(result.foodId).toBe(testFoodId);
      expect(result.quantity).toBe(10);
      expect(result.unit).toBe("个");
      expect(result.purchasePrice).toBe(15.5);
      expect(result.status).toBe(InventoryStatus.FRESH);
      expect(result.isLowStock).toBe(false);

      testInventoryItemId = result.id;
    });

    it("should throw error for invalid food ID", async () => {
      const itemData = {
        memberId: testMemberId,
        foodId: "invalid-food-id",
        quantity: 5,
        unit: "个",
      };

      await expect(
        inventoryTracker.createInventoryItem(itemData),
      ).rejects.toThrow();
    });

    it("should throw error for negative quantity", async () => {
      const itemData = {
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: -1,
        unit: "个",
      };

      await expect(
        inventoryTracker.createInventoryItem(itemData),
      ).rejects.toThrow();
    });
  });

  describe("getInventoryItems", () => {
    it("should return inventory items for member", async () => {
      const items = await inventoryTracker.getInventoryItems(testMemberId);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(testInventoryItemId);
      expect(items[0].food.name).toBe("Test Apple");
    });

    it("should filter items by status", async () => {
      const items = await inventoryTracker.getInventoryItems(testMemberId, {
        status: InventoryStatus.FRESH,
      });

      expect(items).toHaveLength(1);
      expect(items[0].status).toBe(InventoryStatus.FRESH);
    });

    it("should filter items by storage location", async () => {
      const items = await inventoryTracker.getInventoryItems(testMemberId, {
        storageLocation: StorageLocation.REFRIGERATOR,
      });

      expect(items).toHaveLength(1);
      expect(items[0].storageLocation).toBe(StorageLocation.REFRIGERATOR);
    });
  });

  describe("updateInventoryItem", () => {
    it("should update inventory item successfully", async () => {
      const updateData = {
        quantity: 8,
        purchasePrice: 12.0,
      };

      const result = await inventoryTracker.updateInventoryItem(
        testInventoryItemId,
        updateData,
      );

      expect(result.quantity).toBe(8);
      expect(result.purchasePrice).toBe(12.0);
      expect(result.updatedAt).toBeDefined();
    });

    it("should throw error for non-existent item", async () => {
      await expect(
        inventoryTracker.updateInventoryItem("invalid-id", { quantity: 5 }),
      ).rejects.toThrow();
    });
  });

  describe("useInventory", () => {
    it("should use inventory successfully", async () => {
      const usageRecord = await inventoryTracker.useInventory(
        testInventoryItemId,
        3,
        "COOKING",
        testMemberId,
        {
          notes: "Test usage",
          recipeName: "Test Recipe",
        },
      );

      expect(usageRecord).toBeDefined();
      expect(usageRecord.usedQuantity).toBe(3);
      expect(usageRecord.usageType).toBe("COOKING");

      // 检查库存是否更新
      const updatedItem =
        await inventoryTracker.getInventoryItemById(testInventoryItemId);
      expect(updatedItem?.quantity).toBe(5);
    });

    it("should throw error for insufficient quantity", async () => {
      await expect(
        inventoryTracker.useInventory(
          testInventoryItemId,
          10,
          "COOKING",
          testMemberId,
        ),
      ).rejects.toThrow();
    });
  });

  describe("calculateStatus", () => {
    it("should calculate FRESH status for new item", () => {
      const expiryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10天后
      const status = inventoryTracker.calculateStatus(expiryDate, new Date());
      expect(status).toBe(InventoryStatus.FRESH);
    });

    it("should calculate EXPIRING status for item expiring soon", () => {
      const expiryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2天后
      const status = inventoryTracker.calculateStatus(expiryDate, new Date());
      expect(status).toBe(InventoryStatus.EXPIRING);
    });

    it("should calculate EXPIRED status for expired item", () => {
      const expiryDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1天前
      const status = inventoryTracker.calculateStatus(expiryDate, new Date());
      expect(status).toBe(InventoryStatus.EXPIRED);
    });
  });

  describe("deleteInventoryItem", () => {
    it("should delete inventory item successfully", async () => {
      await inventoryTracker.deleteInventoryItem(testInventoryItemId);

      const item =
        await inventoryTracker.getInventoryItemById(testInventoryItemId);
      expect(item).toBeNull();
    });

    it("should throw error for non-existent item", async () => {
      await expect(
        inventoryTracker.deleteInventoryItem("invalid-id"),
      ).rejects.toThrow();
    });
  });

  describe("useInventoryForRecipe", () => {
    let testInventoryItemId2: string;

    beforeAll(async () => {
      // 创建另一个测试库存项目
      const testFood2 = await prisma.food.create({
        data: {
          name: "Test Banana",
          nameEn: "Banana",
          category: "FRUITS",
          calories: 89,
          protein: 1.1,
          carbs: 23,
          fat: 0.3,
        },
      });

      const item = await inventoryTracker.createInventoryItem({
        memberId: testMemberId,
        foodId: testFood2.id,
        quantity: 5,
        unit: "根",
      });
      testInventoryItemId2 = item.id;
    });

    it("should use multiple ingredients for recipe", async () => {
      const ingredients = [
        { foodId: testFoodId, quantity: 2, unit: "个" },
        { foodId: testFoodId2, quantity: 1, unit: "根" },
      ];

      const updatedItems = await inventoryTracker.useInventoryForRecipe(
        testMemberId,
        ingredients,
        "Fruit Salad",
      );

      expect(updatedItems).toHaveLength(2);
      expect(updatedItems[0].usageRecords).toHaveLength(1);
      expect(updatedItems[1].usageRecords).toHaveLength(1);
    });

    afterAll(async () => {
      if (testInventoryItemId2) {
        await inventoryTracker.deleteInventoryItem(testInventoryItemId2);
      }
    });
  });
});
