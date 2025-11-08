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
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          email_verified: string | null
          name: string | null
          image: string | null
          password: string | null
          role: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          email: string
          email_verified?: string | null
          name?: string | null
          image?: string | null
          password?: string | null
          role?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          email_verified?: string | null
          name?: string | null
          image?: string | null
          password?: string | null
          role?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      families: {
        Row: {
          id: string
          name: string
          description: string | null
          invite_code: string | null
          creator_id: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          invite_code?: string | null
          creator_id: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          invite_code?: string | null
          creator_id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      family_members: {
        Row: {
          id: string
          name: string
          gender: string
          birth_date: string
          height: number | null
          weight: number | null
          avatar: string | null
          bmi: number | null
          age_group: string | null
          family_id: string
          user_id: string | null
          role: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          gender: string
          birth_date: string
          height?: number | null
          weight?: number | null
          avatar?: string | null
          bmi?: number | null
          age_group?: string | null
          family_id: string
          user_id?: string | null
          role?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          gender?: string
          birth_date?: string
          height?: number | null
          weight?: number | null
          avatar?: string | null
          bmi?: number | null
          age_group?: string | null
          family_id?: string
          user_id?: string | null
          role?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      health_data: {
        Row: {
          id: string
          member_id: string
          data_type: string
          value: number
          unit: string | null
          notes: string | null
          source: string | null
          recorded_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          data_type: string
          value: number
          unit?: string | null
          notes?: string | null
          source?: string | null
          recorded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          data_type?: string
          value?: number
          unit?: string | null
          notes?: string | null
          source?: string | null
          recorded_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      meal_records: {
        Row: {
          id: string
          member_id: string
          meal_type: string
          meal_time: string
          foods: Json
          total_calories: number | null
          total_protein: number | null
          total_carbs: number | null
          total_fat: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          meal_type: string
          meal_time: string
          foods: Json
          total_calories?: number | null
          total_protein?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          meal_type?: string
          meal_time?: string
          foods?: Json
          total_calories?: number | null
          total_protein?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          name: string
          description: string | null
          ingredients: Json
          instructions: Json
          prep_time: number | null
          cook_time: number | null
          servings: number
          difficulty: string | null
          cuisine_type: string | null
          meal_type: string | null
          calories_per_serving: number | null
          protein_per_serving: number | null
          carbs_per_serving: number | null
          fat_per_serving: number | null
          image_url: string | null
          tags: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          ingredients: Json
          instructions: Json
          prep_time?: number | null
          cook_time?: number | null
          servings?: number
          difficulty?: string | null
          cuisine_type?: string | null
          meal_type?: string | null
          calories_per_serving?: number | null
          protein_per_serving?: number | null
          carbs_per_serving?: number | null
          fat_per_serving?: number | null
          image_url?: string | null
          tags?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          ingredients?: Json
          instructions?: Json
          prep_time?: number | null
          cook_time?: number | null
          servings?: number
          difficulty?: string | null
          cuisine_type?: string | null
          meal_type?: string | null
          calories_per_serving?: number | null
          protein_per_serving?: number | null
          carbs_per_serving?: number | null
          fat_per_serving?: number | null
          image_url?: string | null
          tags?: Json
          created_at?: string
          updated_at?: string
        }
      }
      // 添加其他表的类型定义...
      // 为简洁起见，这里只列出主要表
      // 实际项目中应包含所有 68 个表
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'USER' | 'ADMIN'
      gender: 'MALE' | 'FEMALE' | 'OTHER'
      age_group: 'CHILD' | 'TEENAGER' | 'ADULT' | 'ELDERLY'
      family_member_role: 'ADMIN' | 'MEMBER' | 'GUEST'
      goal_type: 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN_WEIGHT' | 'MUSCLE_GAIN' | 'IMPROVE_FITNESS' | 'REDUCE_SODIUM' | 'INCREASE_FIBER' | 'CUSTOM'
      data_type: 'WEIGHT' | 'BLOOD_PRESSURE' | 'BLOOD_SUGAR' | 'HEART_RATE' | 'TEMPERATURE' | 'STEPS' | 'SLEEP' | 'CALORIES' | 'WATER'
      meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
      activity_level: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
