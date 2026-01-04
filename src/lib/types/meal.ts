// 餐饮相关类型定义

export enum MealType {
  BREAKFAST = "BREAKFAST",
  LUNCH = "LUNCH",
  DINNER = "DINNER",
  SNACK = "SNACK",
}

export enum FoodCategory {
  VEGETABLES = "VEGETABLES",
  FRUITS = "FRUITS",
  GRAINS = "GRAINS",
  PROTEIN = "PROTEIN",
  SEAFOOD = "SEAFOOD",
  DAIRY = "DAIRY",
  OILS = "OILS",
  SNACKS = "SNACKS",
  BEVERAGES = "BEVERAGES",
  OTHER = "OTHER",
}

export enum DataSource {
  USDA = "USDA",
  LOCAL = "LOCAL",
  USER_SUBMITTED = "USER_SUBMITTED",
}

// 食物接口
export interface Food {
  id: string;
  name: string;
  nameEn?: string;
  aliases: string; // JSON string
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
  category: FoodCategory;
  tags: string; // JSON string
  source: DataSource;
  usdaId?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  cachedAt?: Date;
}

// 食谱计划接口
export interface MealPlan {
  id: string;
  memberId: string;
  startDate: Date;
  endDate: Date;
  goalType: string; // 引用健康目标类型
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  meals: Meal[];
  shoppingLists: ShoppingList[];
}

// 餐食接口
export interface Meal {
  id: string;
  planId: string;
  plan: MealPlan;
  date: Date;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: MealIngredient[];
  createdAt: Date;
  updatedAt: Date;
}

// 餐食食材接口
export interface MealIngredient {
  id: string;
  mealId: string;
  meal: Meal;
  foodId: string;
  food: Food;
  amount: number; // 重量(g)
}

// 购物清单接口
export interface ShoppingList {
  id: string;
  planId: string;
  plan: MealPlan;
  budget?: number;
  estimatedCost?: number;
  actualCost?: number;
  status: string;
  items: ShoppingItem[];
  createdAt: Date;
  updatedAt: Date;
}

// 购物清单项接口
export interface ShoppingItem {
  id: string;
  listId: string;
  list: ShoppingList;
  foodId: string;
  food: Food;
  amount: number;
  category: FoodCategory;
  purchased: boolean;
  estimatedPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}
