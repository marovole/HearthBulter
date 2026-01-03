import { InventoryTracker } from '@/services/inventory-tracker';
import type { InventoryRepository } from '@/lib/repositories/interfaces/inventory-repository';
import type { PaginatedResult } from '@/lib/repositories/types/common';
import type {
  BatchUseInventoryInputDTO,
  InventoryItemCreateDTO,
  InventoryItemDTO,
  InventoryItemFilterDTO,
  InventoryItemUpdateDTO,
  InventoryItemWithRelationsDTO,
  InventoryStatsDTO,
  InventoryUsageDTO,
  UseInventoryInputDTO,
  WasteRecordCreateDTO,
  WasteRecordDTO,
  InventoryStatus,
  FoodInfo,
} from '@/lib/repositories/types/inventory';
import { randomUUID } from 'crypto';

class TestInventoryRepository implements InventoryRepository {
  private items = new Map<string, InventoryItemWithRelationsDTO>();
  private foods = new Map<string, FoodInfo>();

  constructor(foods: FoodInfo[]) {
    foods.forEach((food) => this.foods.set(food.id, food));
  }

  async createInventoryItem(
    payload: InventoryItemCreateDTO,
  ): Promise<InventoryItemDTO> {
    const food = this.foods.get(payload.foodId);
    if (!food) {
      throw new Error(`Food not found: ${payload.foodId}`);
    }
    if (payload.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const now = new Date();
    const status = this.calculateStatus(
      payload.quantity,
      payload.expiryDate,
      payload.minStockThreshold,
    );
    const isLowStock =
      payload.minStockThreshold !== undefined &&
      payload.quantity <= payload.minStockThreshold;
    const daysToExpiry = payload.expiryDate
      ? Math.ceil(
          (payload.expiryDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : undefined;

    const item: InventoryItemWithRelationsDTO = {
      id: randomUUID(),
      memberId: payload.memberId,
      foodId: payload.foodId,
      food,
      quantity: payload.quantity,
      originalQuantity: payload.quantity,
      unit: payload.unit,
      purchasePrice: payload.purchasePrice,
      purchaseSource: payload.purchaseSource,
      expiryDate: payload.expiryDate,
      productionDate: payload.productionDate,
      daysToExpiry,
      storageLocation: payload.storageLocation ?? 'ROOM_TEMP',
      storageNotes: payload.storageNotes,
      minStockThreshold: payload.minStockThreshold,
      isLowStock,
      barcode: payload.barcode,
      brand: payload.brand,
      packageInfo: payload.packageInfo,
      status,
      lastUsedAt: undefined,
      usageCount: 0,
      wasteCount: 0,
      createdAt: now,
      updatedAt: now,
      usageRecords: [],
      wasteRecords: [],
    };

    this.items.set(item.id, item);
    return { ...item };
  }

  async updateInventoryItem(
    id: string,
    payload: InventoryItemUpdateDTO,
  ): Promise<InventoryItemDTO> {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Inventory item not found: ${id}`);
    }

    const updated: InventoryItemWithRelationsDTO = {
      ...existing,
      ...payload,
      quantity: payload.quantity ?? existing.quantity,
      purchasePrice: payload.purchasePrice ?? existing.purchasePrice,
      purchaseSource: payload.purchaseSource ?? existing.purchaseSource,
      expiryDate: payload.expiryDate ?? existing.expiryDate,
      productionDate: payload.productionDate ?? existing.productionDate,
      storageLocation: payload.storageLocation ?? existing.storageLocation,
      storageNotes: payload.storageNotes ?? existing.storageNotes,
      minStockThreshold:
        payload.minStockThreshold ?? existing.minStockThreshold,
      barcode: payload.barcode ?? existing.barcode,
      brand: payload.brand ?? existing.brand,
      packageInfo: payload.packageInfo ?? existing.packageInfo,
    };

    updated.status = this.calculateStatus(
      updated.quantity,
      updated.expiryDate,
      updated.minStockThreshold,
    );
    updated.isLowStock =
      updated.minStockThreshold !== undefined &&
      updated.quantity <= updated.minStockThreshold;
    updated.updatedAt = new Date();
    updated.daysToExpiry = updated.expiryDate
      ? Math.ceil(
          (updated.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        )
      : undefined;

    this.items.set(id, updated);
    return { ...updated };
  }

  async getInventoryItemById(
    id: string,
  ): Promise<InventoryItemWithRelationsDTO | null> {
    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  async listInventoryItems(
    memberId: string,
    filter?: InventoryItemFilterDTO,
  ): Promise<PaginatedResult<InventoryItemDTO>> {
    let items = Array.from(this.items.values()).filter(
      (item) => item.memberId === memberId,
    );

    if (filter?.status) {
      items = items.filter((item) => item.status === filter.status);
    }
    if (filter?.storageLocation) {
      items = items.filter(
        (item) => item.storageLocation === filter.storageLocation,
      );
    }

    return {
      items: items.map((item) => ({ ...item })),
      total: items.length,
    };
  }

  async softDeleteInventoryItem(id: string): Promise<void> {
    if (!this.items.has(id)) {
      throw new Error(`Inventory item not found: ${id}`);
    }
    this.items.delete(id);
  }

  async useInventoryItem(
    payload: UseInventoryInputDTO,
  ): Promise<InventoryItemDTO> {
    const item = this.items.get(payload.inventoryItemId);
    if (!item) {
      throw new Error(`Inventory item not found: ${payload.inventoryItemId}`);
    }
    if (item.quantity < payload.quantity) {
      throw new Error('Insufficient inventory quantity');
    }

    const updatedQuantity = item.quantity - payload.quantity;
    const usageRecord: InventoryUsageDTO = {
      id: randomUUID(),
      inventoryItemId: item.id,
      memberId: item.memberId,
      usedQuantity: payload.quantity,
      usedAt: new Date(),
      usageType: payload.reason,
      relatedId: payload.recipeId ?? payload.mealId,
      relatedType: payload.recipeId
        ? 'RECIPE'
        : payload.mealId
          ? 'MEAL'
          : undefined,
      notes: payload.notes,
      recipeName: payload.recipeId ? 'Recipe' : undefined,
      createdAt: new Date(),
    };

    const updated: InventoryItemWithRelationsDTO = {
      ...item,
      quantity: updatedQuantity,
      status: this.calculateStatus(
        updatedQuantity,
        item.expiryDate,
        item.minStockThreshold,
      ),
      isLowStock:
        item.minStockThreshold !== undefined &&
        updatedQuantity <= item.minStockThreshold,
      lastUsedAt: usageRecord.usedAt,
      usageCount: item.usageCount + 1,
      updatedAt: new Date(),
      usageRecords: [...item.usageRecords, usageRecord],
    };

    this.items.set(item.id, updated);
    return { ...updated };
  }

  async batchUseInventory(
    payload: BatchUseInventoryInputDTO,
  ): Promise<InventoryItemDTO[]> {
    const results: InventoryItemDTO[] = [];
    for (const item of payload.items) {
      results.push(
        await this.useInventoryItem({
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          reason: payload.reason,
          recipeId: payload.recipeId,
          mealId: payload.mealId,
          notes: payload.notes,
        }),
      );
    }
    return results;
  }

  async listInventoryUsages(
    inventoryItemId: string,
  ): Promise<PaginatedResult<InventoryUsageDTO>> {
    const item = this.items.get(inventoryItemId);
    return {
      items: item ? [...item.usageRecords] : [],
      total: item ? item.usageRecords.length : 0,
    };
  }

  async createWasteRecord(
    payload: WasteRecordCreateDTO,
  ): Promise<WasteRecordDTO> {
    void payload;
    throw new Error('Not implemented');
  }

  async listWasteRecords(): Promise<PaginatedResult<WasteRecordDTO>> {
    return { items: [], total: 0 };
  }

  async getInventoryStats(memberId: string): Promise<InventoryStatsDTO> {
    void memberId;
    throw new Error('Not implemented');
  }

  async getExpiringItems(): Promise<InventoryItemDTO[]> {
    return [];
  }

  async getLowStockItems(): Promise<InventoryItemDTO[]> {
    return [];
  }

  async getInventoryValueTrend(): Promise<
    Array<{ date: Date; totalValue: number; itemCount: number }>
  > {
    return [];
  }

  async batchUpdateInventoryStatus(): Promise<number> {
    return 0;
  }

  async batchDeleteExpiredItems(): Promise<number> {
    return 0;
  }

  private calculateStatus(
    quantity: number,
    expiryDate?: Date,
    minStockThreshold?: number,
  ): InventoryStatus {
    if (quantity <= 0) return 'DEPLETED';
    if (minStockThreshold !== undefined && quantity <= minStockThreshold)
      return 'NORMAL';
    if (expiryDate) {
      const daysToExpiry = Math.ceil(
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysToExpiry < 0) return 'EXPIRED';
      if (daysToExpiry <= 3) return 'EXPIRING';
    }
    return 'FRESH';
  }
}

describe('InventoryTracker', () => {
  let testMemberId: string;
  let testFoodId: string;
  let testFoodId2: string;
  let testInventoryItemId: string;
  let inventoryTracker: InventoryTracker;

  beforeEach(() => {
    testMemberId = randomUUID();
    testFoodId = randomUUID();
    testFoodId2 = randomUUID();

    const foods: FoodInfo[] = [
      {
        id: testFoodId,
        name: 'Test Apple',
        nameEn: 'Apple',
        category: 'FRUITS',
        calories: 52,
        protein: 0.3,
        carbs: 14,
        fat: 0.2,
      },
      {
        id: testFoodId2,
        name: 'Test Banana',
        nameEn: 'Banana',
        category: 'FRUITS',
        calories: 89,
        protein: 1.1,
        carbs: 23,
        fat: 0.3,
      },
    ];

    const repository = new TestInventoryRepository(foods);
    inventoryTracker = new InventoryTracker(repository);
    testInventoryItemId = '';
  });

  describe('createInventoryItem', () => {
    it('should create a new inventory item successfully', async () => {
      const itemData = {
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: 10,
        unit: '个',
        purchasePrice: 15.5,
        purchaseSource: 'Test Store',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
        storageLocation: 'FRIDGE',
        minStockThreshold: 2,
      };

      const result = await inventoryTracker.createInventoryItem(itemData);

      expect(result).toBeDefined();
      expect(result.memberId).toBe(testMemberId);
      expect(result.foodId).toBe(testFoodId);
      expect(result.quantity).toBe(10);
      expect(result.unit).toBe('个');
      expect(result.purchasePrice).toBe(15.5);
      expect(result.status).toBe('FRESH');
      expect(result.isLowStock).toBe(false);

      testInventoryItemId = result.id;
    });

    it('should throw error for invalid food ID', async () => {
      const itemData = {
        memberId: testMemberId,
        foodId: 'invalid-food-id',
        quantity: 5,
        unit: '个',
      };

      await expect(
        inventoryTracker.createInventoryItem(itemData),
      ).rejects.toThrow();
    });

    it('should throw error for negative quantity', async () => {
      const itemData = {
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: -1,
        unit: '个',
      };

      await expect(
        inventoryTracker.createInventoryItem(itemData),
      ).rejects.toThrow();
    });
  });

  describe('getInventoryItems', () => {
    beforeEach(async () => {
      const item = await inventoryTracker.createInventoryItem({
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: 10,
        unit: '个',
        purchasePrice: 15.5,
        purchaseSource: 'Test Store',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        storageLocation: 'FRIDGE',
        minStockThreshold: 2,
      });
      testInventoryItemId = item.id;
    });

    it('should return inventory items for member', async () => {
      const items = await inventoryTracker.getInventoryItems(testMemberId);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(testInventoryItemId);
      expect(items[0].food.name).toBe('Test Apple');
    });

    it('should filter items by status', async () => {
      const items = await inventoryTracker.getInventoryItems(testMemberId, {
        status: 'FRESH',
      });

      expect(items).toHaveLength(1);
      expect(items[0].status).toBe('FRESH');
    });

    it('should filter items by storage location', async () => {
      const items = await inventoryTracker.getInventoryItems(testMemberId, {
        storageLocation: 'FRIDGE',
      });

      expect(items).toHaveLength(1);
      expect(items[0].storageLocation).toBe('FRIDGE');
    });
  });

  describe('updateInventoryItem', () => {
    beforeEach(async () => {
      const item = await inventoryTracker.createInventoryItem({
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: 10,
        unit: '个',
        purchasePrice: 15.5,
        purchaseSource: 'Test Store',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        storageLocation: 'FRIDGE',
        minStockThreshold: 2,
      });
      testInventoryItemId = item.id;
    });

    it('should update inventory item successfully', async () => {
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

    it('should throw error for non-existent item', async () => {
      await expect(
        inventoryTracker.updateInventoryItem('invalid-id', { quantity: 5 }),
      ).rejects.toThrow();
    });
  });

  describe('useInventory', () => {
    beforeEach(async () => {
      const item = await inventoryTracker.createInventoryItem({
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: 10,
        unit: '个',
        purchasePrice: 15.5,
        purchaseSource: 'Test Store',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        storageLocation: 'FRIDGE',
        minStockThreshold: 2,
      });
      testInventoryItemId = item.id;
    });

    it('should use inventory successfully', async () => {
      const updatedItem = await inventoryTracker.useInventory(
        testInventoryItemId,
        3,
        'COOKING',
        testMemberId,
        {
          notes: 'Test usage',
          recipeName: 'Test Recipe',
        },
      );

      expect(updatedItem).toBeDefined();
      expect(updatedItem.quantity).toBe(7);
      expect(updatedItem.usageCount).toBe(1);

      // 检查库存是否更新
      const persistedItem =
        await inventoryTracker.getInventoryItemById(testInventoryItemId);
      expect(persistedItem?.quantity).toBe(7);
    });

    it('should throw error for insufficient quantity', async () => {
      await expect(
        inventoryTracker.useInventory(
          testInventoryItemId,
          11,
          'COOKING',
          testMemberId,
        ),
      ).rejects.toThrow();
    });
  });

  describe('deleteInventoryItem', () => {
    beforeEach(async () => {
      const item = await inventoryTracker.createInventoryItem({
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: 10,
        unit: '个',
        purchasePrice: 15.5,
        purchaseSource: 'Test Store',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        storageLocation: 'FRIDGE',
        minStockThreshold: 2,
      });
      testInventoryItemId = item.id;
    });

    it('should delete inventory item successfully', async () => {
      await inventoryTracker.deleteInventoryItem(testInventoryItemId);

      const item =
        await inventoryTracker.getInventoryItemById(testInventoryItemId);
      expect(item).toBeNull();
    });

    it('should throw error for non-existent item', async () => {
      await expect(
        inventoryTracker.deleteInventoryItem('invalid-id'),
      ).rejects.toThrow();
    });
  });

  describe('useInventoryForRecipe', () => {
    beforeEach(async () => {
      const baseItem = await inventoryTracker.createInventoryItem({
        memberId: testMemberId,
        foodId: testFoodId,
        quantity: 5,
        unit: '个',
      });
      testInventoryItemId = baseItem.id;

      const item = await inventoryTracker.createInventoryItem({
        memberId: testMemberId,
        foodId: testFoodId2,
        quantity: 5,
        unit: '根',
      });
      void item;
    });

    it('should use multiple ingredients for recipe', async () => {
      const ingredients = [
        { foodId: testFoodId, quantity: 2, unit: '个' },
        { foodId: testFoodId2, quantity: 1, unit: '根' },
      ];

      const updatedItems = await inventoryTracker.useInventoryForRecipe(
        testMemberId,
        ingredients,
        'Fruit Salad',
      );

      expect(updatedItems).toHaveLength(2);
      expect(updatedItems[0].usageRecords.length).toBeGreaterThan(0);
      expect(updatedItems[1].usageRecords.length).toBeGreaterThan(0);
    });
  });
});
