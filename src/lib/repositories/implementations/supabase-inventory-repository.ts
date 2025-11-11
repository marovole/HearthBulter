/**
 * Supabase 库存 Repository 实现
 *
 * 基于 Supabase PostgreSQL 实现库存管理系统的数据访问层，
 * 提供库存 CRUD、使用记录、浪费管理、统计分析等功能。
 *
 * @module supabase-inventory-repository
 */

import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { InventoryRepository } from '../interfaces/inventory-repository';
import type {
  InventoryItemDTO,
  InventoryItemCreateDTO,
  InventoryItemUpdateDTO,
  InventoryItemFilterDTO,
  InventoryItemWithRelationsDTO,
  InventoryUsageDTO,
  InventoryUsageCreateDTO,
  WasteRecordDTO,
  WasteRecordCreateDTO,
  InventoryStatsDTO,
  UseInventoryInputDTO,
  BatchUseInventoryInputDTO,
  InventoryStatus,
  StorageLocation,
} from '../types/inventory';
import type { PaginatedResult, PaginationInput } from '../types/common';

type InventoryItemRow = Database['public']['Tables']['inventory_items']['Row'];
type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert'];
type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update'];
type InventoryUsageRow = Database['public']['Tables']['inventory_usages']['Row'];
type InventoryUsageInsert = Database['public']['Tables']['inventory_usages']['Insert'];
type WasteRecordRow = Database['public']['Tables']['waste_records']['Row'];
type WasteRecordInsert = Database['public']['Tables']['waste_records']['Insert'];

/**
 * Supabase 库存 Repository 实现
 *
 * 特性：
 * - 库存状态自动计算
 * - 智能过期提醒
 * - 低库存预警
 * - 批量操作支持
 * - 浪费分析
 */
export class SupabaseInventoryRepository implements InventoryRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = '[SupabaseInventoryRepository]';

  constructor(client: SupabaseClient<Database> = SupabaseClientManager.getInstance()) {
    this.client = client;
  }

  // ==================== CRUD 操作 ====================

  /**
   * 创建库存物品
   */
  async createInventoryItem(payload: InventoryItemCreateDTO): Promise<InventoryItemDTO> {
    const insertPayload = this.mapInventoryItemDtoToInsert(payload);

    const { data, error } = await this.client
      .from('inventory_items')
      .insert(insertPayload as any)
      .select(
        `
        *,
        food:foods (
          id,
          name,
          name_en,
          category,
          calories,
          protein,
          carbs,
          fat
        )
      `
      )
      .single();

    if (error) this.handleError('createInventoryItem', error);
    return this.mapInventoryItemRow(data!);
  }

  /**
   * 更新库存物品
   */
  async updateInventoryItem(id: string, payload: InventoryItemUpdateDTO): Promise<InventoryItemDTO> {
    const updatePayload = this.mapInventoryItemDtoToUpdate(payload);

    const { data, error } = await this.client
      .from('inventory_items')
      .update(updatePayload as any)
      .eq('id', id)
      .select(
        `
        *,
        food:foods (
          id,
          name,
          name_en,
          category,
          calories,
          protein,
          carbs,
          fat
        )
      `
      )
      .single();

    if (error) this.handleError('updateInventoryItem', error);
    return this.mapInventoryItemRow(data!);
  }

  /**
   * 获取库存物品详情（含关联数据）
   */
  async getInventoryItemById(id: string): Promise<InventoryItemWithRelationsDTO | null> {
    const { data, error } = await this.client
      .from('inventory_items')
      .select(
        `
        *,
        food:foods (
          id,
          name,
          name_en,
          category,
          calories,
          protein,
          carbs,
          fat
        ),
        usage_records:inventory_usages (
          id,
          inventory_item_id,
          quantity,
          reason,
          meal_id,
          recipe_id,
          notes,
          usage_date,
          created_at
        ),
        waste_records:waste_records (
          id,
          inventory_item_id,
          quantity,
          reason,
          waste_date,
          notes,
          created_at
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') this.handleError('getInventoryItemById', error);
    return data ? this.mapInventoryItemWithRelationsRow(data as any) : null;
  }

  /**
   * 查询成员的库存物品列表
   */
  async listInventoryItems(
    memberId: string,
    filter?: InventoryItemFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<InventoryItemDTO>> {
    let query = this.client
      .from('inventory_items')
      .select(
        `
        *,
        food:foods (
          id,
          name,
          name_en,
          category,
          calories,
          protein,
          carbs,
          fat
        )
      `,
        { count: 'exact' }
      )
      .eq('member_id', memberId)
      .is('deleted_at', null);

    // 应用过滤条件
    if (filter) {
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.storageLocation) query = query.eq('storage_location', filter.storageLocation);
      if (filter.isLowStock) query = query.eq('is_low_stock', true);

      // 食品名称模糊查询
      if (filter.foodName) {
        if (filter.foodName.contains) {
          query = query.ilike('food.name', `%${filter.foodName.contains}%`);
        }
      }

      // 保质期范围查询
      if (filter.expiryDateRange) {
        if (filter.expiryDateRange.start) {
          query = query.gte('expiry_date', filter.expiryDateRange.start.toISOString());
        }
        if (filter.expiryDateRange.end) {
          query = query.lte('expiry_date', filter.expiryDateRange.end.toISOString());
        }
      }

      // 临期和过期筛选
      if (filter.isExpiring) {
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        query = query.gte('expiry_date', now.toISOString()).lte('expiry_date', sevenDaysLater.toISOString());
      }
      if (filter.isExpired) {
        const now = new Date();
        query = query.lt('expiry_date', now.toISOString());
      }

      // 分类过滤（通过 JOIN）
      if (filter.category) {
        query = query.eq('food.category', filter.category);
      }
    }

    // 排序：状态 > 保质期 > 创建时间
    query = query.order('status', { ascending: true });
    query = query.order('expiry_date', { ascending: true, nullsFirst: false });
    query = query.order('created_at', { ascending: false });

    // 分页
    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) this.handleError('listInventoryItems', error);

    const items = (data || []).map((row) => this.mapInventoryItemRow(row as any));
    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit ? (pagination.offset ?? 0) + items.length < (count ?? 0) : false,
    };
  }

  /**
   * 软删除库存物品
   */
  async softDeleteInventoryItem(id: string): Promise<void> {
    const { error } = await this.client
      .from('inventory_items')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) this.handleError('softDeleteInventoryItem', error);
  }

  // ==================== 库存使用操作 ====================

  /**
   * 使用库存（单个物品）
   */
  async useInventoryItem(payload: UseInventoryInputDTO): Promise<InventoryItemDTO> {
    // 1. 获取当前库存
    const { data: item, error: fetchError } = await this.client
      .from('inventory_items')
      .select('quantity')
      .eq('id', payload.inventoryItemId)
      .single();

    if (fetchError) this.handleError('useInventoryItem:fetch', fetchError);
    if (!item) throw new Error(`Inventory item ${payload.inventoryItemId} not found`);
    if (item.quantity < payload.quantity) throw new Error('Insufficient inventory');

    // 2. 创建使用记录
    const usageInsert: InventoryUsageInsert = {
      inventory_item_id: payload.inventoryItemId,
      quantity: payload.quantity,
      reason: payload.reason,
      meal_id: payload.mealId ?? null,
      recipe_id: payload.recipeId ?? null,
      notes: payload.notes ?? null,
      usage_date: new Date().toISOString(),
    };

    const { error: usageError } = await this.client.from('inventory_usages').insert(usageInsert as any);
    if (usageError) this.handleError('useInventoryItem:usage', usageError);

    // 3. 扣减库存数量
    const newQuantity = item.quantity - payload.quantity;
    return await this.updateInventoryItem(payload.inventoryItemId, { quantity: newQuantity });
  }

  /**
   * 批量使用库存
   */
  async batchUseInventory(payload: BatchUseInventoryInputDTO): Promise<InventoryItemDTO[]> {
    const results: InventoryItemDTO[] = [];

    // TODO: 应该使用事务处理，这里简化为串行处理
    for (const item of payload.items) {
      const updatedItem = await this.useInventoryItem({
        ...item,
        mealId: payload.mealId,
        recipeId: payload.recipeId,
      });
      results.push(updatedItem);
    }

    return results;
  }

  /**
   * 查询库存使用记录
   */
  async listInventoryUsages(
    inventoryItemId: string,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<InventoryUsageDTO>> {
    let query = this.client
      .from('inventory_usages')
      .select('*', { count: 'exact' })
      .eq('inventory_item_id', inventoryItemId)
      .order('usage_date', { ascending: false });

    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) this.handleError('listInventoryUsages', error);

    const items = (data || []).map((row) => this.mapInventoryUsageRow(row));
    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit ? (pagination.offset ?? 0) + items.length < (count ?? 0) : false,
    };
  }

  // ==================== 浪费记录管理 ====================

  /**
   * 创建浪费记录
   */
  async createWasteRecord(payload: WasteRecordCreateDTO): Promise<WasteRecordDTO> {
    // 1. 获取当前库存
    const { data: item, error: fetchError } = await this.client
      .from('inventory_items')
      .select('quantity')
      .eq('id', payload.inventoryItemId)
      .single();

    if (fetchError) this.handleError('createWasteRecord:fetch', fetchError);
    if (!item) throw new Error(`Inventory item ${payload.inventoryItemId} not found`);
    if (item.quantity < payload.quantity) throw new Error('Waste quantity exceeds inventory');

    // 2. 创建浪费记录
    const wasteInsert: WasteRecordInsert = {
      inventory_item_id: payload.inventoryItemId,
      quantity: payload.quantity,
      reason: payload.reason,
      waste_date: payload.wasteDate.toISOString(),
      notes: payload.notes ?? null,
    };

    const { data, error } = await this.client.from('waste_records').insert(wasteInsert as any).select('*').single();
    if (error) this.handleError('createWasteRecord:insert', error);

    // 3. 扣减库存数量
    const newQuantity = item.quantity - payload.quantity;
    await this.updateInventoryItem(payload.inventoryItemId, { quantity: newQuantity });

    return this.mapWasteRecordRow(data!);
  }

  /**
   * 查询浪费记录
   */
  async listWasteRecords(
    inventoryItemId?: string,
    filter?: {
      startDate?: Date;
      endDate?: Date;
      reason?: WasteRecordDTO['reason'];
    },
    pagination?: PaginationInput
  ): Promise<PaginatedResult<WasteRecordDTO>> {
    let query = this.client
      .from('waste_records')
      .select('*', { count: 'exact' })
      .order('waste_date', { ascending: false });

    if (inventoryItemId) query = query.eq('inventory_item_id', inventoryItemId);
    if (filter?.startDate) query = query.gte('waste_date', filter.startDate.toISOString());
    if (filter?.endDate) query = query.lte('waste_date', filter.endDate.toISOString());
    if (filter?.reason) query = query.eq('reason', filter.reason);

    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) this.handleError('listWasteRecords', error);

    const items = (data || []).map((row) => this.mapWasteRecordRow(row));
    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit ? (pagination.offset ?? 0) + items.length < (count ?? 0) : false,
    };
  }

  // ==================== 统计和聚合 ====================

  /**
   * 获取库存统计信息
   */
  async getInventoryStats(memberId: string): Promise<InventoryStatsDTO> {
    // 获取所有库存物品
    const { data: items, error } = await this.client
      .from('inventory_items')
      .select('*')
      .eq('member_id', memberId)
      .is('deleted_at', null);

    if (error) this.handleError('getInventoryStats:items', error);

    // 获取浪费记录
    const { data: wasteRecords, error: wasteError } = await this.client
      .from('waste_records')
      .select('quantity, reason, inventory_items!inner(purchase_price, member_id)')
      .eq('inventory_items.member_id', memberId);

    if (wasteError) this.handleError('getInventoryStats:waste', wasteError);

    // 计算统计数据
    const itemsList = items || [];
    const totalItems = itemsList.length;
    const totalValue = itemsList.reduce((sum, item) => sum + (item.purchase_price ?? 0), 0);

    // 按状态统计
    const itemsByStatus = itemsList.reduce((acc, item) => {
      const status = item.status as InventoryStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<InventoryStatus, number>);

    // 按位置统计
    const itemsByLocation = itemsList.reduce((acc, item) => {
      const location = item.storage_location as StorageLocation;
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<StorageLocation, number>);

    // 过期和临期统计
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringCount = itemsList.filter((item) => {
      if (!item.expiry_date) return false;
      const expiry = new Date(item.expiry_date);
      return expiry >= now && expiry <= sevenDaysLater;
    }).length;

    const expiredCount = itemsList.filter((item) => {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) < now;
    }).length;

    const lowStockCount = itemsList.filter((item) => item.is_low_stock).length;

    // 浪费统计
    const wasteList = (wasteRecords || []) as any[];
    const wasteStats = {
      totalQuantity: wasteList.reduce((sum, w) => sum + (w.quantity ?? 0), 0),
      totalValue: wasteList.reduce((sum, w) => sum + ((w.inventory_items?.purchase_price ?? 0) * (w.quantity ?? 0)), 0),
      byReason: wasteList.reduce((acc, w) => {
        const reason = w.reason;
        acc[reason] = (acc[reason] || 0) + (w.quantity ?? 0);
        return acc;
      }, {} as Record<string, number>),
    };

    return {
      totalItems,
      totalValue,
      itemsByStatus,
      itemsByLocation,
      expiringCount,
      expiredCount,
      lowStockCount,
      wasteStats,
    };
  }

  /**
   * 获取即将过期的库存物品
   */
  async getExpiringItems(memberId: string, daysThreshold: number = 7): Promise<InventoryItemDTO[]> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const { data, error } = await this.client
      .from('inventory_items')
      .select(
        `
        *,
        food:foods (
          id,
          name,
          name_en,
          category,
          calories,
          protein,
          carbs,
          fat
        )
      `
      )
      .eq('member_id', memberId)
      .is('deleted_at', null)
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', thresholdDate.toISOString())
      .order('expiry_date', { ascending: true });

    if (error) this.handleError('getExpiringItems', error);
    return (data || []).map((row) => this.mapInventoryItemRow(row as any));
  }

  /**
   * 获取低库存物品
   */
  async getLowStockItems(memberId: string): Promise<InventoryItemDTO[]> {
    const { data, error } = await this.client
      .from('inventory_items')
      .select(
        `
        *,
        food:foods (
          id,
          name,
          name_en,
          category,
          calories,
          protein,
          carbs,
          fat
        )
      `
      )
      .eq('member_id', memberId)
      .eq('is_low_stock', true)
      .is('deleted_at', null)
      .order('quantity', { ascending: true });

    if (error) this.handleError('getLowStockItems', error);
    return (data || []).map((row) => this.mapInventoryItemRow(row as any));
  }

  /**
   * 获取库存价值趋势
   */
  async getInventoryValueTrend(
    memberId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; totalValue: number; itemCount: number }>> {
    // TODO: 这个方法需要历史快照数据，当前简化实现仅返回当前值
    const stats = await this.getInventoryStats(memberId);
    return [
      {
        date: new Date(),
        totalValue: stats.totalValue,
        itemCount: stats.totalItems,
      },
    ];
  }

  // ==================== 批量操作 ====================

  /**
   * 批量更新库存状态
   */
  async batchUpdateInventoryStatus(memberId?: string): Promise<number> {
    let query = this.client.from('inventory_items').select('id, quantity, expiry_date, min_stock_threshold');

    if (memberId) query = query.eq('member_id', memberId);
    query = query.is('deleted_at', null);

    const { data, error } = await query;
    if (error) this.handleError('batchUpdateInventoryStatus:fetch', error);

    let updatedCount = 0;
    for (const item of data || []) {
      const status = this.calculateInventoryStatus(
        item.quantity,
        item.expiry_date ? new Date(item.expiry_date) : undefined,
        item.min_stock_threshold ?? undefined
      );

      const daysToExpiry = item.expiry_date ? this.calculateDaysToExpiry(new Date(item.expiry_date)) : null;

      const isLowStock = item.min_stock_threshold ? item.quantity <= item.min_stock_threshold : false;

      await this.client
        .from('inventory_items')
        .update({
          status,
          days_to_expiry: daysToExpiry,
          is_low_stock: isLowStock,
        } as any)
        .eq('id', item.id);

      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * 批量删除过期物品
   */
  async batchDeleteExpiredItems(memberId: string, expiredDaysThreshold: number = 30): Promise<number> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - expiredDaysThreshold);

    const { data, error } = await this.client
      .from('inventory_items')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('member_id', memberId)
      .lt('expiry_date', thresholdDate.toISOString())
      .is('deleted_at', null)
      .select('id');

    if (error) this.handleError('batchDeleteExpiredItems', error);
    return (data || []).length;
  }

  // ==================== 辅助方法 ====================

  /**
   * 计算剩余保质期天数
   */
  private calculateDaysToExpiry(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * 计算库存状态
   */
  private calculateInventoryStatus(
    quantity: number,
    expiryDate?: Date,
    minStockThreshold?: number
  ): InventoryStatus {
    if (quantity <= 0) return 'DEPLETED';
    if (minStockThreshold && quantity <= minStockThreshold) return 'NORMAL'; // 低库存不改变状态

    if (expiryDate) {
      const daysToExpiry = this.calculateDaysToExpiry(expiryDate);
      if (daysToExpiry < 0) return 'EXPIRED';
      if (daysToExpiry <= 3) return 'EXPIRING';
      if (daysToExpiry <= 7) return 'NORMAL';
    }

    return 'FRESH';
  }

  /**
   * 数据映射：InventoryItemCreateDTO → InventoryItemInsert
   */
  private mapInventoryItemDtoToInsert(dto: InventoryItemCreateDTO): InventoryItemInsert {
    const daysToExpiry = dto.expiryDate ? this.calculateDaysToExpiry(dto.expiryDate) : null;
    const status = this.calculateInventoryStatus(dto.quantity, dto.expiryDate, dto.minStockThreshold);
    const isLowStock = dto.minStockThreshold ? dto.quantity <= dto.minStockThreshold : false;

    return {
      member_id: dto.memberId,
      food_id: dto.foodId,
      quantity: dto.quantity,
      original_quantity: dto.quantity,
      unit: dto.unit,
      purchase_price: dto.purchasePrice ?? null,
      purchase_source: dto.purchaseSource ?? null,
      expiry_date: dto.expiryDate?.toISOString() ?? null,
      production_date: dto.productionDate?.toISOString() ?? null,
      days_to_expiry: daysToExpiry,
      storage_location: dto.storageLocation ?? 'ROOM_TEMP',
      storage_notes: dto.storageNotes ?? null,
      min_stock_threshold: dto.minStockThreshold ?? null,
      is_low_stock: isLowStock,
      barcode: dto.barcode ?? null,
      brand: dto.brand ?? null,
      package_info: dto.packageInfo ?? null,
      status,
    };
  }

  /**
   * 数据映射：InventoryItemUpdateDTO → InventoryItemUpdate
   */
  private mapInventoryItemDtoToUpdate(dto: InventoryItemUpdateDTO): InventoryItemUpdate {
    const update: InventoryItemUpdate = {};

    if (dto.quantity !== undefined) update.quantity = dto.quantity;
    if (dto.unit) update.unit = dto.unit;
    if (dto.purchasePrice !== undefined) update.purchase_price = dto.purchasePrice;
    if (dto.purchaseSource !== undefined) update.purchase_source = dto.purchaseSource;
    if (dto.expiryDate !== undefined) {
      update.expiry_date = dto.expiryDate?.toISOString() ?? null;
      if (dto.expiryDate) {
        update.days_to_expiry = this.calculateDaysToExpiry(dto.expiryDate);
      }
    }
    if (dto.productionDate !== undefined) update.production_date = dto.productionDate?.toISOString() ?? null;
    if (dto.storageLocation) update.storage_location = dto.storageLocation;
    if (dto.storageNotes !== undefined) update.storage_notes = dto.storageNotes;
    if (dto.minStockThreshold !== undefined) update.min_stock_threshold = dto.minStockThreshold;
    if (dto.barcode !== undefined) update.barcode = dto.barcode;
    if (dto.brand !== undefined) update.brand = dto.brand;
    if (dto.packageInfo !== undefined) update.package_info = dto.packageInfo;

    // 重新计算状态（如果影响状态的字段被更新）
    if (dto.quantity !== undefined || dto.expiryDate !== undefined || dto.minStockThreshold !== undefined) {
      // 注意：这里需要现有数据来计算，实际应用中应该先 fetch 再 update
      // 为简化，这里假设 Supabase 触发器会处理状态更新
    }

    return update;
  }

  /**
   * 数据映射：InventoryItemRow → InventoryItemDTO
   */
  private mapInventoryItemRow(row: any): InventoryItemDTO {
    const food = row.food || row.foods;
    return {
      id: row.id,
      memberId: row.member_id,
      foodId: row.food_id,
      food: {
        id: food.id,
        name: food.name,
        nameEn: food.name_en ?? undefined,
        category: food.category,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      },
      quantity: row.quantity,
      originalQuantity: row.original_quantity,
      unit: row.unit,
      purchasePrice: row.purchase_price ?? undefined,
      purchaseSource: row.purchase_source ?? undefined,
      expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
      productionDate: row.production_date ? new Date(row.production_date) : undefined,
      daysToExpiry: row.days_to_expiry ?? undefined,
      storageLocation: row.storage_location as StorageLocation,
      storageNotes: row.storage_notes ?? undefined,
      minStockThreshold: row.min_stock_threshold ?? undefined,
      isLowStock: row.is_low_stock ?? false,
      barcode: row.barcode ?? undefined,
      brand: row.brand ?? undefined,
      packageInfo: row.package_info ?? undefined,
      status: row.status as InventoryStatus,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      usageCount: row.usage_count ?? 0,
      wasteCount: row.waste_count ?? 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * 数据映射：InventoryItemRow (with relations) → InventoryItemWithRelationsDTO
   */
  private mapInventoryItemWithRelationsRow(row: any): InventoryItemWithRelationsDTO {
    const base = this.mapInventoryItemRow(row);
    return {
      ...base,
      usageRecords: (row.usage_records || []).map((r: any) => this.mapInventoryUsageRow(r)),
      wasteRecords: (row.waste_records || []).map((r: any) => this.mapWasteRecordRow(r)),
    };
  }

  /**
   * 数据映射：InventoryUsageRow → InventoryUsageDTO
   */
  private mapInventoryUsageRow(row: InventoryUsageRow): InventoryUsageDTO {
    return {
      id: row.id,
      inventoryItemId: row.inventory_item_id,
      quantity: row.quantity,
      reason: row.reason as InventoryUsageDTO['reason'],
      mealId: row.meal_id ?? undefined,
      recipeId: row.recipe_id ?? undefined,
      notes: row.notes ?? undefined,
      usageDate: new Date(row.usage_date),
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 数据映射：WasteRecordRow → WasteRecordDTO
   */
  private mapWasteRecordRow(row: WasteRecordRow): WasteRecordDTO {
    return {
      id: row.id,
      inventoryItemId: row.inventory_item_id,
      quantity: row.quantity,
      reason: row.reason as WasteRecordDTO['reason'],
      wasteDate: new Date(row.waste_date),
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? 'Unknown Supabase error';
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`InventoryRepository.${operation} failed: ${message}`);
  }
}
