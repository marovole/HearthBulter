import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

class SupabaseClient {
  private static instance: SupabaseClient;
  private client: any;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-application-name': 'health-butler',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  public static getInstance(): SupabaseClient {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    return SupabaseClient.instance;
  }

  public getClient() {
    return this.client;
  }
}

export const supabase = SupabaseClient.getInstance().getClient();

// 导出类型
export type SupabaseClientType = ReturnType<typeof createClient>
export type User = Database['public']['Tables']['users']['Row']
export type HealthData = Database['public']['Tables']['health_data']['Row']
export type MealRecord = Database['public']['Tables']['meal_records']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
