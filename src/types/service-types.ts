/**
 * 服务层类型定义
 * 用于替换服务层中的 any 类型，提供类型安全
 */

import type {
  FoodCategory,
  InventoryStatus,
  WasteReason,
  TaskStatus,
  NotificationType,
  NotificationPriority,
} from '@prisma/client';

// ============ 库存相关类型 ============

export interface InventoryItemBase {
  id: string;
  memberId: string;
  foodId: string;
  quantity: number;
  unit: string;
  originalQuantity: number;
  purchaseDate: Date;
  purchasePrice?: number | null;
  purchaseSource?: string | null;
  expiryDate?: Date | null;
  productionDate?: Date | null;
  daysToExpiry?: number | null;
  storageLocation: string;
  storageNotes?: string | null;
  status: InventoryStatus;
  minStockThreshold?: number | null;
  isLowStock: boolean;
  barcode?: string | null;
  brand?: string | null;
  packageInfo?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface InventoryItemWithFood extends InventoryItemBase {
  food: {
    id: string;
    name: string;
    category: FoodCategory;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface InventoryUsageRecord {
  id: string;
  inventoryItemId: string;
  memberId: string;
  usedQuantity: number;
  usedAt: Date;
  usageType: string;
  relatedId?: string | null;
  relatedType?: string | null;
  notes?: string | null;
  recipeName?: string | null;
}

export interface WasteRecord {
  id: string;
  inventoryItemId: string;
  memberId: string;
  wastedQuantity: number;
  wasteReason: WasteReason;
  wastedAt: Date;
  estimatedCost?: number | null;
  notes?: string | null;
  preventable: boolean;
  preventionTip?: string | null;
}

// ============ 购物相关类型 ============

export interface ShoppingSuggestion {
  foodId: string;
  foodName: string;
  category: FoodCategory;
  suggestedQuantity: number;
  unit: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedPrice?: number;
}

export interface ShoppingItemBase {
  id: string;
  listId: string;
  foodId: string;
  amount: number;
  category: FoodCategory;
  purchased: boolean;
  estimatedPrice?: number | null;
  assigneeId?: string | null;
  addedBy?: string | null;
  purchasedBy?: string | null;
  purchasedAt?: Date | null;
}

// ============ 任务相关类型 ============

export interface TaskBase {
  id: string;
  familyId: string;
  title: string;
  description?: string | null;
  category: string;
  assigneeId?: string | null;
  creatorId: string;
  status: TaskStatus;
  dueDate?: Date | null;
  completedAt?: Date | null;
  startedAt?: Date | null;
  priority: string;
  reminderSent: boolean;
  remindedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithRelations extends TaskBase {
  assignee?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  creator: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

// ============ 活动类型 ============

export type ActivityType =
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'SHOPPING_ITEM_ADDED'
  | 'SHOPPING_ITEM_PURCHASED'
  | 'SHOPPING_ITEM_ASSIGNED'
  | 'SHOPPING_ITEM_DELETED'
  | 'MEAL_LOGGED'
  | 'HEALTH_DATA_ADDED'
  | 'GOAL_CREATED'
  | 'GOAL_COMPLETED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT';

export interface ActivityMetadata {
  taskId?: string;
  taskTitle?: string;
  itemId?: string;
  itemName?: string;
  memberId?: string;
  memberName?: string;
  oldStatus?: string;
  newStatus?: string;
  [key: string]: string | number | boolean | undefined;
}

// ============ 通知相关类型 ============

export interface NotificationData {
  itemId?: string;
  itemName?: string;
  expiryDate?: Date | string;
  quantity?: number;
  threshold?: number;
  category?: FoodCategory;
  daysToExpiry?: number;
  estimatedValue?: number;
  wasteReason?: WasteReason;
  taskId?: string;
  taskTitle?: string;
  memberId?: string;
  memberName?: string;
  achievementId?: string;
  achievementName?: string;
  relatedId?: string;
  shareToken?: string;
  [key: string]: string | number | boolean | Date | undefined;
}

export interface NotificationBase {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  channels: string[];
  isRead: boolean;
  createdAt: Date;
  data?: NotificationData;
  actionUrl?: string | null;
  actionText?: string | null;
  scheduledFor?: Date | null;
  expiresAt?: Date | null;
}

// ============ 分析相关类型 ============

export interface AnalysisSummary {
  totalItems: number;
  totalValue: number;
  averageLifespan: number;
  expiringCount: number;
  lowStockCount: number;
  categoryCounts: Record<string, number>;
}

export interface CategoryAnalysis {
  category: FoodCategory;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  expiringCount: number;
  averageDaysToExpiry: number;
}

export interface WasteAnalysis {
  totalWasteCount: number;
  totalWasteValue: number;
  wasteByReason: Record<WasteReason, number>;
  preventableWastePercent: number;
  topWastedItems: Array<{
    foodId: string;
    foodName: string;
    wasteCount: number;
    totalValue: number;
  }>;
}

export interface RecommendationItem {
  type: 'PURCHASE' | 'CONSUME' | 'REDUCE_WASTE' | 'OPTIMIZE_STORAGE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionItems: string[];
  estimatedSavings?: number;
  relatedFoodIds?: string[];
}

// ============ 食谱相关类型 ============

export interface RecipeIngredientInfo {
  id: string;
  foodId: string;
  amount: number;
  unit: string;
  notes?: string | null;
  optional: boolean;
  isSubstitutable: boolean;
  food: {
    id: string;
    name: string;
    category: FoodCategory;
  };
}

export interface RecipeWithIngredients {
  id: string;
  name: string;
  description?: string | null;
  cuisine?: string | null;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  ingredients: RecipeIngredientInfo[];
}

export interface IngredientAvailability {
  ingredientId: string;
  foodId: string;
  foodName: string;
  requiredAmount: number;
  availableAmount: number;
  unit: string;
  isAvailable: boolean;
  shortfall: number;
}

// ============ 查询条件类型 ============

export interface WhereCondition<T = unknown> {
  equals?: T;
  not?: T | WhereCondition<T>;
  in?: T[];
  notIn?: T[];
  lt?: T;
  lte?: T;
  gt?: T;
  gte?: T;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  mode?: 'default' | 'insensitive';
}

export interface DateRangeCondition {
  gte?: Date;
  lte?: Date;
  gt?: Date;
  lt?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip?: number;
  take?: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// ============ 通用响应类型 ============

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
