/**
 * Supabase Database Type Definitions
 *
 * 这个文件定义了 Supabase 数据库的 TypeScript 类型
 * 由 Prisma Schema 生成
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DualWriteFeatureFlagsValue = {
  enableDualWrite: boolean;
  enableSupabasePrimary: boolean;
  [key: string]: Json | undefined;
};

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          email_verified: string | null;
          name: string | null;
          image: string | null;
          password: string | null;
          role: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          email_verified?: string | null;
          name?: string | null;
          image?: string | null;
          password?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          email_verified?: string | null;
          name?: string | null;
          image?: string | null;
          password?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      families: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          invite_code: string | null;
          creator_id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          invite_code?: string | null;
          creator_id: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          invite_code?: string | null;
          creator_id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      family_members: {
        Row: {
          id: string;
          name: string;
          gender: string;
          birth_date: string;
          height: number | null;
          weight: number | null;
          avatar: string | null;
          bmi: number | null;
          age_group: string | null;
          family_id: string;
          user_id: string | null;
          role: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          gender: string;
          birth_date: string;
          height?: number | null;
          weight?: number | null;
          avatar?: string | null;
          bmi?: number | null;
          age_group?: string | null;
          family_id: string;
          user_id?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          gender?: string;
          birth_date?: string;
          height?: number | null;
          weight?: number | null;
          avatar?: string | null;
          bmi?: number | null;
          age_group?: string | null;
          family_id?: string;
          user_id?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      health_data: {
        Row: {
          id: string;
          member_id: string;
          data_type: string;
          value: number;
          unit: string | null;
          notes: string | null;
          source: string | null;
          recorded_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          data_type: string;
          value: number;
          unit?: string | null;
          notes?: string | null;
          source?: string | null;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          data_type?: string;
          value?: number;
          unit?: string | null;
          notes?: string | null;
          source?: string | null;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      meal_records: {
        Row: {
          id: string;
          member_id: string;
          meal_type: string;
          meal_time: string;
          foods: Json;
          total_calories: number | null;
          total_protein: number | null;
          total_carbs: number | null;
          total_fat: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          meal_type: string;
          meal_time: string;
          foods: Json;
          total_calories?: number | null;
          total_protein?: number | null;
          total_carbs?: number | null;
          total_fat?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          meal_type?: string;
          meal_time?: string;
          foods?: Json;
          total_calories?: number | null;
          total_protein?: number | null;
          total_carbs?: number | null;
          total_fat?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          ingredients: Json;
          instructions: Json;
          prep_time: number | null;
          cook_time: number | null;
          servings: number;
          difficulty: string | null;
          cuisine_type: string | null;
          meal_type: string | null;
          calories_per_serving: number | null;
          protein_per_serving: number | null;
          carbs_per_serving: number | null;
          fat_per_serving: number | null;
          image_url: string | null;
          tags: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          ingredients: Json;
          instructions: Json;
          prep_time?: number | null;
          cook_time?: number | null;
          servings?: number;
          difficulty?: string | null;
          cuisine_type?: string | null;
          meal_type?: string | null;
          calories_per_serving?: number | null;
          protein_per_serving?: number | null;
          carbs_per_serving?: number | null;
          fat_per_serving?: number | null;
          image_url?: string | null;
          tags?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          ingredients?: Json;
          instructions?: Json;
          prep_time?: number | null;
          cook_time?: number | null;
          servings?: number;
          difficulty?: string | null;
          cuisine_type?: string | null;
          meal_type?: string | null;
          calories_per_serving?: number | null;
          protein_per_serving?: number | null;
          carbs_per_serving?: number | null;
          fat_per_serving?: number | null;
          image_url?: string | null;
          tags?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          member_id: string;
          name: string;
          period: string;
          start_date: string;
          end_date: string;
          total_amount: number;
          vegetable_budget: number | null;
          meat_budget: number | null;
          fruit_budget: number | null;
          grain_budget: number | null;
          dairy_budget: number | null;
          seafood_budget: number | null;
          oils_budget: number | null;
          snacks_budget: number | null;
          beverages_budget: number | null;
          other_budget: number | null;
          status: string;
          used_amount: number;
          remaining_amount: number | null;
          usage_percentage: number | null;
          alert_threshold_80: boolean;
          alert_threshold_100: boolean;
          alert_threshold_110: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          name: string;
          period: string;
          start_date: string;
          end_date: string;
          total_amount: number;
          vegetable_budget?: number | null;
          meat_budget?: number | null;
          fruit_budget?: number | null;
          grain_budget?: number | null;
          dairy_budget?: number | null;
          seafood_budget?: number | null;
          oils_budget?: number | null;
          snacks_budget?: number | null;
          beverages_budget?: number | null;
          other_budget?: number | null;
          status?: string;
          used_amount?: number;
          remaining_amount?: number | null;
          usage_percentage?: number | null;
          alert_threshold_80?: boolean;
          alert_threshold_100?: boolean;
          alert_threshold_110?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          member_id?: string;
          name?: string;
          period?: string;
          start_date?: string;
          end_date?: string;
          total_amount?: number;
          vegetable_budget?: number | null;
          meat_budget?: number | null;
          fruit_budget?: number | null;
          grain_budget?: number | null;
          dairy_budget?: number | null;
          seafood_budget?: number | null;
          oils_budget?: number | null;
          snacks_budget?: number | null;
          beverages_budget?: number | null;
          other_budget?: number | null;
          status?: string;
          used_amount?: number;
          remaining_amount?: number | null;
          usage_percentage?: number | null;
          alert_threshold_80?: boolean;
          alert_threshold_100?: boolean;
          alert_threshold_110?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      spendings: {
        Row: {
          id: string;
          budget_id: string;
          amount: number;
          category: string;
          description: string | null;
          transaction_id: string | null;
          platform: string | null;
          items: Json | null;
          purchase_date: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          budget_id: string;
          amount: number;
          category: string;
          description?: string | null;
          transaction_id?: string | null;
          platform?: string | null;
          items?: Json | null;
          purchase_date: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          budget_id?: string;
          amount?: number;
          category?: string;
          description?: string | null;
          transaction_id?: string | null;
          platform?: string | null;
          items?: Json | null;
          purchase_date?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      budget_alerts: {
        Row: {
          id: string;
          budget_id: string;
          type: string;
          threshold: number;
          current_value: number;
          message: string;
          category: string | null;
          status: string;
          acknowledged_at: string | null;
          resolved_at: string | null;
          notified: boolean;
          notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          type: string;
          threshold: number;
          current_value: number;
          message: string;
          category?: string | null;
          status?: string;
          acknowledged_at?: string | null;
          resolved_at?: string | null;
          notified?: boolean;
          notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          budget_id?: string;
          type?: string;
          threshold?: number;
          current_value?: number;
          message?: string;
          category?: string | null;
          status?: string;
          acknowledged_at?: string | null;
          resolved_at?: string | null;
          notified?: boolean;
          notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      dual_write_config: {
        Row: {
          key: string;
          value: DualWriteFeatureFlagsValue;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: DualWriteFeatureFlagsValue;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: DualWriteFeatureFlagsValue;
          updated_at?: string;
        };
      };
      dual_write_diffs: {
        Row: {
          id: string;
          api_endpoint: string;
          operation: string;
          payload: Json | null;
          request_id: string | null;
          prisma_result: Json | null;
          supabase_result: Json | null;
          diff: Json | null;
          severity: "info" | "warning" | "error";
          created_at: string;
        };
        Insert: {
          id?: string;
          api_endpoint: string;
          operation: string;
          payload?: Json | null;
          request_id?: string | null;
          prisma_result?: Json | null;
          supabase_result?: Json | null;
          diff?: Json | null;
          severity: "info" | "warning" | "error";
          created_at?: string;
        };
        Update: {
          id?: string;
          api_endpoint?: string;
          operation?: string;
          payload?: Json | null;
          request_id?: string | null;
          prisma_result?: Json | null;
          supabase_result?: Json | null;
          diff?: Json | null;
          severity?: "info" | "warning" | "error";
          created_at?: string;
        };
      };
      shopping_lists: {
        Row: {
          id: string;
          plan_id: string | null;
          name: string;
          budget: number;
          estimated_cost: number | null;
          actual_cost: number | null;
          status: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          name: string;
          budget?: number;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          plan_id?: string | null;
          name?: string;
          budget?: number;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      shopping_list_items: {
        Row: {
          id: string;
          shopping_list_id: string;
          food_id: string;
          category: string | null;
          quantity: number;
          unit: string;
          purchased: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shopping_list_id: string;
          food_id: string;
          category?: string | null;
          quantity: number;
          unit: string;
          purchased?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shopping_list_id?: string;
          food_id?: string;
          category?: string | null;
          quantity?: number;
          unit?: string;
          purchased?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      foods: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          default_unit: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          default_unit?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string | null;
          default_unit?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      meal_plans: {
        Row: {
          id: string;
          name: string;
          member_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          member_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          member_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          member_id: string;
          food_id: string;
          quantity: number;
          original_quantity: number;
          unit: string;
          purchase_price: number | null;
          purchase_source: string | null;
          expiry_date: string | null;
          production_date: string | null;
          days_to_expiry: number | null;
          storage_location: string;
          storage_notes: string | null;
          min_stock_threshold: number | null;
          is_low_stock: boolean;
          barcode: string | null;
          brand: string | null;
          package_info: string | null;
          status: string;
          last_used_at: string | null;
          usage_count: number;
          waste_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          food_id: string;
          quantity: number;
          original_quantity?: number;
          unit: string;
          purchase_price?: number | null;
          purchase_source?: string | null;
          expiry_date?: string | null;
          production_date?: string | null;
          days_to_expiry?: number | null;
          storage_location?: string;
          storage_notes?: string | null;
          min_stock_threshold?: number | null;
          is_low_stock?: boolean;
          barcode?: string | null;
          brand?: string | null;
          package_info?: string | null;
          status?: string;
          last_used_at?: string | null;
          usage_count?: number;
          waste_count?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          member_id?: string;
          food_id?: string;
          quantity?: number;
          original_quantity?: number;
          unit?: string;
          purchase_price?: number | null;
          purchase_source?: string | null;
          expiry_date?: string | null;
          production_date?: string | null;
          days_to_expiry?: number | null;
          storage_location?: string;
          storage_notes?: string | null;
          min_stock_threshold?: number | null;
          is_low_stock?: boolean;
          barcode?: string | null;
          brand?: string | null;
          package_info?: string | null;
          status?: string;
          last_used_at?: string | null;
          usage_count?: number;
          waste_count?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      inventory_usages: {
        Row: {
          id: string;
          inventory_item_id: string;
          quantity: number;
          reason: string;
          meal_id: string | null;
          recipe_id: string | null;
          notes: string | null;
          usage_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          inventory_item_id: string;
          quantity: number;
          reason: string;
          meal_id?: string | null;
          recipe_id?: string | null;
          notes?: string | null;
          usage_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          inventory_item_id?: string;
          quantity?: number;
          reason?: string;
          meal_id?: string | null;
          recipe_id?: string | null;
          notes?: string | null;
          usage_date?: string;
          created_at?: string;
        };
      };
      waste_records: {
        Row: {
          id: string;
          inventory_item_id: string;
          quantity: number;
          reason: string;
          waste_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          inventory_item_id: string;
          quantity: number;
          reason: string;
          waste_date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          inventory_item_id?: string;
          quantity?: number;
          reason?: string;
          waste_date?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      // 添加其他表的类型定义...
      // 为简洁起见，这里只列出主要表
      // 实际项目中应包含所有 68 个表
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "USER" | "ADMIN";
      gender: "MALE" | "FEMALE" | "OTHER";
      age_group: "CHILD" | "TEENAGER" | "ADULT" | "ELDERLY";
      family_member_role: "ADMIN" | "MEMBER" | "GUEST";
      goal_type:
        | "WEIGHT_LOSS"
        | "WEIGHT_GAIN"
        | "MAINTAIN_WEIGHT"
        | "MUSCLE_GAIN"
        | "IMPROVE_FITNESS"
        | "REDUCE_SODIUM"
        | "INCREASE_FIBER"
        | "CUSTOM";
      data_type:
        | "WEIGHT"
        | "BLOOD_PRESSURE"
        | "BLOOD_SUGAR"
        | "HEART_RATE"
        | "TEMPERATURE"
        | "STEPS"
        | "SLEEP"
        | "CALORIES"
        | "WATER";
      meal_type: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
      activity_level:
        | "SEDENTARY"
        | "LIGHT"
        | "MODERATE"
        | "ACTIVE"
        | "VERY_ACTIVE";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
