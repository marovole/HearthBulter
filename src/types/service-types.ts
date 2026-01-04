/**
 * Service Layer Type Definitions
 *
 * 服务层类型定义，用于替代 any 类型
 * @module service-types
 */

import type { TaskStatus, TaskCategory, TaskPriority } from '@prisma/client';

// ==================== Task Management Types ====================

/**
 * 任务查询条件
 */
export interface TaskWhereCondition {
  familyId: string;
  deletedAt: null;
  status?: TaskStatus;
  category?: TaskCategory;
  assigneeId?: string;
  priority?: TaskPriority;
  dueDate?: {
    gte?: Date;
    lte?: Date;
  };
}

/**
 * 任务更新数据
 */
export interface TaskUpdateData {
  status?: TaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  title?: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  dueDate?: Date;
  updatedAt?: Date;
}

/**
 * 任务活动元数据 - 创建任务
 */
export interface TaskCreatedMetadata {
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  assigneeId?: string;
}

/**
 * 任务活动元数据 - 更新任务
 */
export interface TaskUpdatedMetadata {
  taskId: string;
  taskTitle: string;
  action: 'ASSIGNED' | 'STATUS_CHANGED' | 'DETAILS_CHANGED' | 'DELETED';
  assigneeName?: string;
  newStatus?: TaskStatus;
  note?: string;
  changes?: Partial<{
    title: string;
    description: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueDate: Date;
  }>;
}

/**
 * 任务活动元数据 - 完成任务
 */
export interface TaskCompletedMetadata {
  taskId: string;
  taskTitle: string;
}

/**
 * 任务活动元数据联合类型
 */
export type TaskActivityMetadata =
  | TaskCreatedMetadata
  | TaskUpdatedMetadata
  | TaskCompletedMetadata;

// ==================== Shopping List Types ====================

/**
 * 购物清单活动元数据
 */
export interface ShoppingActivityMetadata {
  action:
    | 'ADD_ITEM'
    | 'ASSIGN_ITEM'
    | 'PURCHASE_ITEM'
    | 'UPDATE_ITEM'
    | 'DELETE_ITEM';
  itemId?: string;
  foodName?: string;
  assigneeName?: string;
  actualPrice?: number;
  quantity?: number;
  changes?: Record<string, unknown>;
}

// ==================== Inventory Types ====================

/**
 * 库存物品（含关联数据）
 */
export interface InventoryItemWithRelations {
  id: string;
  memberId: string;
  foodId: string;
  quantity: number;
  originalQuantity: number;
  unit: string;
  purchasePrice: number | null;
  purchaseSource: string | null;
  expiryDate: Date | null;
  productionDate: Date | null;
  storageLocation: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  food: {
    id: string;
    name: string;
    category: string;
  };
}

/**
 * 使用记录（含关联数据）
 */
export interface UsageRecordWithRelations {
  id: string;
  inventoryItemId: string;
  usedQuantity: number;
  usedAt: Date;
  usageType: string;
  inventoryItem: {
    id: string;
    food: {
      name: string;
      category: string;
    };
  };
}

/**
 * 浪费记录（含关联数据）
 */
export interface WasteRecordWithRelations {
  id: string;
  inventoryItemId: string;
  wastedQuantity: number;
  wasteReason: string;
  wastedAt: Date;
  inventoryItem: {
    id: string;
    food: {
      name: string;
      category: string;
    };
  };
}

/**
 * 库存分析摘要
 */
export interface InventorySummary {
  totalItems: number;
  totalValue: number;
  usedItems: number;
  wastedItems: number;
  wasteRate: number;
  usageRate: number;
}

/**
 * 分类分析结果
 */
export interface CategoryAnalysis {
  category: string;
  itemCount: number;
  totalValue: number;
  usedQuantity: number;
  wastedQuantity: number;
  wasteRate: number;
  efficiency: number;
}

/**
 * 浪费分析结果
 */
export interface WasteAnalysis {
  totalWastedItems: number;
  totalWastedValue: number;
  wasteByReason: Record<string, number>;
  wasteByCategory: Record<string, number>;
}

/**
 * 库存通知数据
 */
export interface InventoryNotificationData {
  itemId?: string;
  itemName?: string;
  expiryDate?: Date;
  daysUntilExpiry?: number;
  quantity?: number;
  threshold?: number;
  wasteReason?: string;
  wastedQuantity?: number;
  [key: string]: unknown;
}

// ==================== Notification Types ====================

/**
 * 通知频率枚举
 */
export type NotificationFrequency =
  | 'IMMEDIATE'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY';

/**
 * 通知配置
 */
export interface NotificationConfig {
  expiryEnabled: boolean;
  expiryFrequency: NotificationFrequency;
  lowStockEnabled: boolean;
  lowStockFrequency: NotificationFrequency;
  wasteEnabled: boolean;
  wasteFrequency: NotificationFrequency;
  usageEnabled: boolean;
  usageFrequency: NotificationFrequency;
  purchaseEnabled: boolean;
  purchaseFrequency: NotificationFrequency;
}

/**
 * 通知查询条件
 */
export interface NotificationWhereClause {
  memberId: string;
  type?: string;
  isRead?: boolean;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}

// ==================== Activity Types ====================

/**
 * 活动类型枚举
 */
export type ActivityType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'SHOPPING_UPDATED'
  | 'INVENTORY_UPDATED'
  | 'HEALTH_DATA_ADDED'
  | 'MEAL_LOGGED';

/**
 * 活动元数据联合类型
 */
export type ActivityMetadata =
  | TaskActivityMetadata
  | ShoppingActivityMetadata
  | InventoryNotificationData
  | Record<string, unknown>;

// ==================== Recipe Types ====================

/**
 * 食谱查询条件
 */
export interface RecipeWhereClause {
  memberId?: string;
  category?: string;
  difficulty?: string;
  cookingTime?: {
    lte?: number;
  };
  ingredients?: {
    some?: {
      foodId?: {
        in?: string[];
      };
    };
  };
}

/**
 * 食谱（含关联数据）
 */
export interface RecipeWithIngredients {
  id: string;
  name: string;
  description: string | null;
  category: string;
  difficulty: string;
  cookingTime: number;
  servings: number;
  instructions: string[];
  ingredients: Array<{
    id: string;
    foodId: string;
    quantity: number;
    unit: string;
    food: {
      id: string;
      name: string;
      category: string;
    };
  }>;
}

// ==================== Budget & Price Types ====================

/**
 * 营养信息
 */
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * 每餐营养目标
 */
export interface MealNutritionTargets {
  breakfast: NutritionInfo;
  lunch: NutritionInfo;
  dinner: NutritionInfo;
}

/**
 * 平价食材（含价格和营养信息）
 */
export interface AffordableFood {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  platform: string;
  nutrition: NutritionInfo;
  food?: {
    name: string;
    category: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * 购物车商品
 */
export interface CartItem {
  foodId: string;
  foodName?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  platform?: string;
}

/**
 * 平台配置
 */
export interface PlatformConfig {
  shippingCost: number;
  freeShippingThreshold: number;
  discountInfo?: {
    type: 'PERCENTAGE' | 'FIXED' | 'THRESHOLD';
    value: number;
    description: string;
  };
}

/**
 * 平台价格信息
 */
export interface PlatformPriceInfo {
  platform: string;
  unitPrice: number;
  totalCost?: number;
  price?: number;
  savings?: number;
}

/**
 * 食物平台价格映射
 */
export interface FoodPlatformMapping {
  foodId: string;
  foodName: string;
  platforms: PlatformPriceInfo[];
}

/**
 * 平台分组明细
 */
export interface PlatformBreakdownItem {
  foodId: string;
  foodName: string;
  quantity: number;
  unitPrice: number;
  itemCost: number;
}

/**
 * 平台分组
 */
export interface PlatformBreakdownGroup {
  platform: string;
  items: PlatformBreakdownItem[];
  cost: number;
  shippingCost: number;
  freeShippingThreshold: number;
  totalCost?: number;
}

/**
 * 跨平台组合方案
 */
export interface MixedPlatformOption {
  platforms: string[];
  totalCost: number;
  savings: number;
  breakdown: PlatformBreakdownGroup[];
}

/**
 * 食谱（经济版）
 */
export interface MealRecipe {
  name: string;
  ingredients: Array<{
    foodName: string;
    amount: number;
    cost: number;
  }>;
  totalCost: number;
  nutrition: NutritionInfo;
  savings: number;
}

/**
 * 日期范围
 */
export interface DateRange {
  start: Date;
  end: Date;
  type?: string;
  days?: number;
}

/**
 * 分类支出数据
 */
export interface CategorySpendingData {
  category: string;
  amount: number;
  percentage: number;
  count?: number;
  averagePerTransaction?: number;
  trend?: 'UP' | 'DOWN' | 'STABLE';
}

/**
 * 趋势分析结果
 */
export interface TrendAnalysis {
  direction: 'UP' | 'DOWN' | 'STABLE';
  monthlyChange?: number;
  projectedSavings?: number;
  slope?: number;
  confidence?: number;
}

/**
 * 预算利用率
 */
export interface BudgetUtilization {
  budgetId: string;
  budgetName: string;
  totalAmount: number;
  totalBudget?: number; // 向后兼容
  used: number;
  remaining: number;
  utilizationRate: number;
  status: 'NORMAL' | 'WARNING' | 'OVER_BUDGET' | 'HEALTHY';
}

/**
 * 食材替换建议
 */
export interface FoodSubstitution {
  original: {
    food: { id: string; name: string; category: string };
    cost: number;
    nutrition: NutritionInfo;
  };
  substitute: {
    food: { id: string; name: string; category: string };
    cost: number;
    nutrition: NutritionInfo;
  };
  savings: number;
  reason: string;
}

/**
 * 预算项目
 */
export interface BudgetItem {
  id?: string;
  foodId?: string;
  foodName?: string;
  category?: string;
  amount?: number;
  quantity?: number;
  unitPrice?: number;
}

/**
 * 价格趋势预测
 */
export interface PricePrediction {
  next7Days: number[];
  next30Days?: number[];
  expectedMin?: number;
  expectedMax?: number;
  confidence: number;
}

// ==================== Utility Types ====================

/**
 * Prisma 兼容的 JSON 值类型
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * 通用分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
