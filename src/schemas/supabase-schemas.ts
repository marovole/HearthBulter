/**
 * Supabase 表的 Zod 验证模式
 * 生成时间: 2025-11-09T15:55:00.000Z
 * 用于 API 输入验证和类型安全
 */

import { z } from 'zod';

// 基础类型
export const stringSchema = z.string();
export const numberSchema = z.number();
export const booleanSchema = z.boolean();
export const dateSchema = z.string().datetime();
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const urlSchema = z.string().url();
export const nonEmptyStringSchema = z.string().min(1);
export const positiveNumberSchema = z.number().positive();
export const nonNegativeNumberSchema = z.number().nonnegative();

// 用户相关模式
export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: stringSchema.nullable(),
  image: urlSchema.nullable(),
  role: z.enum(['USER', 'ADMIN']),
  created_at: dateSchema,
  updated_at: dateSchema,
  deleted_at: dateSchema.nullable(),
});

export const createUserSchema = z.object({
  email: emailSchema,
  name: nonEmptyStringSchema,
  password: nonEmptyStringSchema,
});

export const updateUserSchema = z.object({
  name: stringSchema.min(1).optional(),
  image: urlSchema.optional(),
});

// 家庭相关模式
export const familySchema = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema,
  description: stringSchema.nullable(),
  invite_code: stringSchema.nullable(),
  creator_id: uuidSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
  deleted_at: dateSchema.nullable(),
});

export const createFamilySchema = z.object({
  name: nonEmptyStringSchema,
  description: stringSchema.optional(),
});

export const familyInvitationSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  email: emailSchema,
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  expires_at: dateSchema,
  accepted_at: dateSchema.nullable(),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const createFamilyInvitationSchema = z.object({
  family_id: uuidSchema,
  email: emailSchema,
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']).default('MEMBER'),
});

export const acceptInvitationSchema = z.object({
  invitation_code: nonEmptyStringSchema,
  member_name: nonEmptyStringSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).default('MALE'),
  birth_date: stringSchema.default('2000-01-01'),
});

// 成员相关模式
export const familyMemberSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema.nullable(),
  name: nonEmptyStringSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birth_date: stringSchema,
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']),
  created_at: dateSchema,
  updated_at: dateSchema,
  deleted_at: dateSchema.nullable(),
});

export const updateFamilyMemberSchema = z.object({
  name: stringSchema.min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  birth_date: stringSchema.optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']).optional(),
});

// 预算相关模式
export const budgetSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  amount: positiveNumberSchema,
  period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  start_date: stringSchema,
  end_date: stringSchema,
  category_limits: z.record(z.number()).nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED']),
  used_amount: numberSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const createBudgetSchema = z.object({
  amount: positiveNumberSchema,
  period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  start_date: stringSchema,
  end_date: stringSchema,
  category_limits: z.record(z.number()).optional(),
});

export const updateBudgetSchema = z.object({
  amount: positiveNumberSchema.optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED']).optional(),
  category_limits: z.record(z.number()).optional(),
});

// 支出相关模式
export const spendingSchema = z.object({
  id: uuidSchema,
  budget_id: uuidSchema,
  user_id: uuidSchema,
  amount: positiveNumberSchema,
  category: nonEmptyStringSchema,
  description: stringSchema.nullable(),
  spent_at: stringSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const createSpendingSchema = z.object({
  budget_id: uuidSchema.optional(),
  amount: positiveNumberSchema,
  category: nonEmptyStringSchema,
  description: stringSchema.optional(),
  spent_at: stringSchema.optional(),
});

export const recordSpendingSchema = z.object({
  p_user_id: uuidSchema,
  p_amount: positiveNumberSchema,
  p_category: nonEmptyStringSchema,
  p_description: stringSchema.optional(),
  p_spent_at: stringSchema.optional(),
});

// 通知相关模式
export const notificationSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  member_id: uuidSchema.nullable(),
  type: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  message: stringSchema,
  data: z.any().nullable(),
  status: z.enum(['PENDING', 'SENT', 'READ', 'DISMISSED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const createNotificationSchema = z.object({
  family_id: uuidSchema,
  member_id: uuidSchema.optional(),
  type: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  message: stringSchema,
  data: z.any().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

export const updateNotificationSchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'READ', 'DISMISSED']).optional(),
});

// 库存相关模式
export const inventoryItemSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  name: nonEmptyStringSchema,
  category: stringSchema.nullable(),
  quantity: numberSchema,
  unit: stringSchema.nullable(),
  expiry_date: stringSchema.nullable(),
  purchase_date: stringSchema.nullable(),
  location: stringSchema.nullable(),
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'EXPIRED', 'OUT_OF_STOCK']),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const createInventoryItemSchema = z.object({
  name: nonEmptyStringSchema,
  category: stringSchema.optional(),
  quantity: numberSchema.default(0),
  unit: stringSchema.optional(),
  expiry_date: stringSchema.optional(),
  purchase_date: stringSchema.optional(),
  location: stringSchema.optional(),
});

export const updateInventoryItemSchema = z.object({
  name: stringSchema.min(1).optional(),
  category: stringSchema.optional(),
  quantity: numberSchema.optional(),
  unit: stringSchema.optional(),
  expiry_date: stringSchema.optional(),
  purchase_date: stringSchema.optional(),
  location: stringSchema.optional(),
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'EXPIRED', 'OUT_OF_STOCK']).optional(),
});

// 购物清单相关模式
export const shoppingItemSchema = z.object({
  id: uuidSchema,
  shopping_list_id: uuidSchema,
  name: nonEmptyStringSchema,
  quantity: numberSchema,
  price: positiveNumberSchema.nullable(),
  unit: stringSchema.nullable(),
  category: stringSchema.nullable(),
  purchased: booleanSchema,
  purchased_at: stringSchema.nullable(),
  notes: stringSchema.nullable(),
  version: numberSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const createShoppingItemSchema = z.object({
  shopping_list_id: uuidSchema,
  name: nonEmptyStringSchema,
  quantity: numberSchema.default(1),
  price: positiveNumberSchema.optional(),
  unit: stringSchema.optional(),
  category: stringSchema.optional(),
  notes: stringSchema.optional(),
});

export const updateShoppingItemSchema = z.object({
  quantity: numberSchema.optional(),
  price: positiveNumberSchema.optional(),
  purchased: booleanSchema.optional(),
  purchased_at: stringSchema.optional(),
  notes: stringSchema.optional(),
});

export const updateShoppingListItemSchema = z.object({
  p_item_id: uuidSchema,
  p_user_id: uuidSchema,
  p_updates: z.object({
    quantity: numberSchema.optional(),
    price: positiveNumberSchema.optional(),
    purchased: booleanSchema.optional(),
    purchased_at: stringSchema.optional(),
    notes: stringSchema.optional(),
  }),
  p_expected_version: numberSchema.optional(),
});

// 食品相关模式
export const foodSchema = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema,
  name_en: stringSchema.nullable(),
  aliases: z.array(stringSchema),
  category: nonEmptyStringSchema,
  calories: numberSchema,
  protein: numberSchema,
  carbs: numberSchema,
  fat: numberSchema,
  fiber: numberSchema,
  sugar: numberSchema.nullable(),
  sodium: numberSchema.nullable(),
  vitamin_c: numberSchema.nullable(),
  calcium: numberSchema.nullable(),
  iron: numberSchema.nullable(),
  verified: booleanSchema,
  source: z.enum(['USDA', 'LOCAL', 'USER_SUBMITTED']),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const createFoodSchema = z.object({
  name: nonEmptyStringSchema,
  name_en: stringSchema.optional(),
  aliases: z.array(stringSchema).default([]),
  category: nonEmptyStringSchema,
  calories: numberSchema,
  protein: numberSchema,
  carbs: numberSchema,
  fat: numberSchema,
  fiber: numberSchema,
  sugar: numberSchema.optional(),
  sodium: numberSchema.optional(),
  vitamin_c: numberSchema.optional(),
  calcium: numberSchema.optional(),
  iron: numberSchema.optional(),
  verified: booleanSchema.default(false),
  source: z.enum(['USDA', 'LOCAL', 'USER_SUBMITTED']).default('USER_SUBMITTED'),
});

// 食谱相关模式
export const recipeSchema = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema,
  description: stringSchema.nullable(),
  instructions: z.array(nonEmptyStringSchema),
  prep_time: numberSchema.nullable(),
  cook_time: numberSchema.nullable(),
  servings: numberSchema.nullable(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  cuisine_type: stringSchema.nullable(),
  tags: z.array(stringSchema),
  image_url: urlSchema.nullable(),
  created_by: uuidSchema.nullable(),
  rating: numberSchema.nullable(),
  rating_count: numberSchema,
  view_count: numberSchema,
  favorite_count: numberSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const createRecipeSchema = z.object({
  name: nonEmptyStringSchema,
  description: stringSchema.optional(),
  instructions: z.array(nonEmptyStringSchema).min(1),
  prep_time: numberSchema.optional(),
  cook_time: numberSchema.optional(),
  servings: numberSchema.optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  cuisine_type: stringSchema.optional(),
  tags: z.array(stringSchema).default([]),
  image_url: urlSchema.optional(),
});

export const updateRecipeSchema = z.object({
  name: stringSchema.min(1).optional(),
  description: stringSchema.optional(),
  instructions: z.array(nonEmptyStringSchema).optional(),
  prep_time: numberSchema.optional(),
  cook_time: numberSchema.optional(),
  servings: numberSchema.optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  cuisine_type: stringSchema.optional(),
  tags: z.array(stringSchema).optional(),
  image_url: urlSchema.optional(),
});

// 批量操作模式
export const createInventoryNotificationsSchema = z.object({
  p_family_id: uuidSchema,
  p_notification_type: nonEmptyStringSchema,
  p_items: z.array(z.object({
    item_id: uuidSchema,
    item_name: nonEmptyStringSchema,
    current_quantity: numberSchema,
    threshold_quantity: numberSchema,
    expiry_date: stringSchema.optional(),
    title: stringSchema.optional(),
    message: stringSchema.optional(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  })),
});

// 接受邀请模式
export const acceptFamilyInviteSchema = z.object({
  p_invitation_id: uuidSchema,
  p_user_id: uuidSchema,
  p_member_name: nonEmptyStringSchema,
  p_gender: z.enum(['MALE', 'FEMALE', 'OTHER']).default('MALE'),
  p_birth_date: stringSchema.default('2000-01-01'),
});

// 类型导出
export type User = z.infer<typeof userSchema>;
export type Family = z.infer<typeof familySchema>;
export type FamilyMember = z.infer<typeof familyMemberSchema>;
export type FamilyInvitation = z.infer<typeof familyInvitationSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type Spending = z.infer<typeof spendingSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type ShoppingItem = z.infer<typeof shoppingItemSchema>;
export type Food = z.infer<typeof foodSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
