/**
 * Supabase 自动生成的 TypeScript 类型
 * 生成时间: 2025-11-09T15:55:00.000Z
 * 此文件由 scripts/generate-supabase-types.ts 自动生成，请勿手动修改
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      families: {
        Row: Family;
        Insert: Omit<Family, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Family, 'id' | 'created_at' | 'updated_at'>>;
      };
      family_members: {
        Row: FamilyMember;
        Insert: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>>;
      };
      family_invitations: {
        Row: FamilyInvitation;
        Insert: Omit<FamilyInvitation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FamilyInvitation, 'id' | 'created_at' | 'updated_at'>>;
      };
      budget: {
        Row: Budget;
        Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Budget, 'id' | 'created_at' | 'updated_at'>>;
      };
      spendings: {
        Row: Spending;
        Insert: Omit<Spending, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Spending, 'id' | 'created_at' | 'updated_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at' | 'updated_at'>>;
      };
      shopping_items: {
        Row: ShoppingItem;
        Insert: Omit<ShoppingItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ShoppingItem, 'id' | 'created_at' | 'updated_at'>>;
      };
      inventory_items: {
        Row: InventoryItem;
        Insert: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>>;
      };
      foods: {
        Row: Food;
        Insert: Omit<Food, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Food, 'id' | 'created_at' | 'updated_at'>>;
      };
      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_family_invite: {
        Args: {
          p_invitation_id: string;
          p_user_id: string;
          p_member_name: string;
          p_gender?: string;
          p_birth_date?: string;
        };
        Returns: any;
      };
      record_spending_tx: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_category: string;
          p_description?: string;
          p_spent_at?: string;
        };
        Returns: any;
      };
      create_inventory_notifications_batch: {
        Args: {
          p_family_id: string;
          p_notification_type: string;
          p_items: any;
        };
        Returns: any;
      };
      update_shopping_list_item_atomic: {
        Args: {
          p_item_id: string;
          p_user_id: string;
          p_updates: any;
          p_expected_version?: number;
        };
        Returns: any;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// 基础类型
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// 核心表类型
export type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Family = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  creator_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type FamilyMember = {
  id: string;
  family_id: string;
  user_id: string | null;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birth_date: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type FamilyInvitation = {
  id: string;
  family_id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  amount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  start_date: string;
  end_date: string;
  category_limits: any | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  used_amount: number;
  created_at: string;
  updated_at: string;
};

export type Spending = {
  id: string;
  budget_id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string | null;
  spent_at: string;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  family_id: string;
  member_id: string | null;
  type: string;
  title: string;
  message: string;
  data: any | null;
  status: 'PENDING' | 'SENT' | 'READ' | 'DISMISSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  updated_at: string;
};

export type ShoppingItem = {
  id: string;
  shopping_list_id: string;
  name: string;
  quantity: number;
  price: number | null;
  unit: string | null;
  category: string | null;
  purchased: boolean;
  purchased_at: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type InventoryItem = {
  id: string;
  family_id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  expiry_date: string | null;
  purchase_date: string | null;
  location: string | null;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'EXPIRED' | 'OUT_OF_STOCK';
  created_at: string;
  updated_at: string;
};

export type Food = {
  id: string;
  name: string;
  name_en: string | null;
  aliases: string[];
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number | null;
  sodium: number | null;
  vitamin_c: number | null;
  calcium: number | null;
  iron: number | null;
  verified: boolean;
  source: 'USDA' | 'LOCAL' | 'USER_SUBMITTED';
  created_at: string;
  updated_at: string;
};

export type Recipe = {
  id: string;
  name: string;
  description: string | null;
  instructions: string[];
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  cuisine_type: string | null;
  tags: string[];
  image_url: string | null;
  created_by: string | null;
  rating: number | null;
  rating_count: number;
  view_count: number;
  favorite_count: number;
  created_at: string;
  updated_at: string;
};
