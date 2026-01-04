/**
 * Supabase RPC 函数类型定义
 * 生成时间: 2025-11-09T15:55:00.000Z
 */

import { z } from "zod";

// RPC 函数返回类型
export interface RPCResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// accept_family_invite
export const AcceptFamilyInviteParams = z.object({
  p_invitation_id: z.string().uuid(),
  p_user_id: z.string().uuid(),
  p_member_name: z.string().min(1),
  p_gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("MALE"),
  p_birth_date: z.string().default("2000-01-01"),
});

export type AcceptFamilyInviteParams = z.infer<typeof AcceptFamilyInviteParams>;

export type AcceptFamilyInviteResult = RPCResponse<{
  family: {
    id: string;
    name: string;
    description: string | null;
  };
  member: {
    id: string;
    name: string;
    role: string;
    gender: string | null;
    birth_date: string | null;
  };
  invitation: {
    id: string;
    email: string;
  };
}>;

// record_spending_tx
export const RecordSpendingParams = z.object({
  p_budget_id: z.string().uuid(),
  p_amount: z.number().positive(),
  p_category: z.string(),
  p_description: z.string().optional().nullable(),
  p_purchase_date: z.string().datetime(),
  p_transaction_id: z.string().optional().nullable(),
  p_platform: z.string().optional().nullable(),
  p_items: z.any().optional().nullable(),
});

export type RecordSpendingParams = z.infer<typeof RecordSpendingParams>;

export type RecordSpendingResult = RPCResponse<{
  spending: {
    id: string;
    amount: number;
    category: string;
    description: string | null;
    purchase_date: string;
    transaction_id: string | null;
    platform: string | null;
    items: unknown | null;
    created_at: string;
    updated_at: string;
  };
  budget: {
    id: string;
    total_amount: number;
    used_amount: number;
    remaining: number;
    usage_percent: number;
  };
}>;

// create_inventory_notifications_batch
export const CreateInventoryNotificationsParams = z.object({
  p_family_id: z.string().uuid(),
  p_notification_type: z.string(),
  p_items: z.array(
    z.object({
      item_id: z.string().uuid(),
      item_name: z.string(),
      current_quantity: z.number(),
      threshold_quantity: z.number(),
      expiry_date: z.string().optional(),
      title: z.string().optional(),
      message: z.string().optional(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
    }),
  ),
});

export type CreateInventoryNotificationsParams = z.infer<
  typeof CreateInventoryNotificationsParams
>;

export interface CreateInventoryNotificationsResult {
  success: boolean;
  message: string;
  data: {
    total_items: number;
    created_count: number;
    skipped_count: number;
    processed_count: number;
  };
}

// update_shopping_list_item_atomic
export const UpdateShoppingListItemParams = z.object({
  p_item_id: z.string().uuid(),
  p_user_id: z.string().uuid(),
  p_updates: z.object({
    quantity: z.number().optional(),
    price: z.number().optional(),
    purchased: z.boolean().optional(),
    purchased_at: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
  p_expected_version: z.number().optional(),
});

export type UpdateShoppingListItemParams = z.infer<
  typeof UpdateShoppingListItemParams
>;

export interface UpdateShoppingListItemResult {
  success: boolean;
  message: string;
  data: {
    item: {
      id: string;
      name: string;
      quantity: number;
      price: number;
      purchased: boolean;
      purchased_at: string;
      notes: string;
      version: number;
      updated_at: string;
    };
  };
}

// 导出的 RPC 函数映射
export const RPCFunctions = {
  accept_family_invite: {
    params: AcceptFamilyInviteParams,
    result: {} as AcceptFamilyInviteResult,
  },
  record_spending_tx: {
    params: RecordSpendingParams,
    result: {} as RecordSpendingResult,
  },
  create_inventory_notifications_batch: {
    params: CreateInventoryNotificationsParams,
    result: {} as CreateInventoryNotificationsResult,
  },
  update_shopping_list_item_atomic: {
    params: UpdateShoppingListItemParams,
    result: {} as UpdateShoppingListItemResult,
  },
} as const;
