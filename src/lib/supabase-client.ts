// @ts-nocheck
// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// 检测是否在构建阶段（无运行时环境变量）
function isBuildTime(): boolean {
  const phase = process.env.NEXT_PHASE;
  if (phase === "phase-production-build") {
    return true;
  }

  const hasAnySupabaseConfig =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return !hasAnySupabaseConfig;
}

class SupabaseClient {
  private static instance: SupabaseClient;
  private client: any;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // 在构建阶段，使用占位符以允许静态分析通过
      if (isBuildTime()) {
        console.warn(
          "⚠️ Supabase client configuration not found during build - using placeholder",
        );
        this.client = createClient<Database>(
          "https://placeholder.supabase.co",
          "placeholder-anon-key-for-build-only",
        );
        return;
      }
      throw new Error("Missing Supabase environment variables");
    }

    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          "x-application-name": "health-butler",
        },
      },
      db: {
        schema: "public",
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

// 惰性初始化 - 使用 Proxy 避免模块加载时执行
let _supabaseInstance: any = null;

function getSupabaseClient() {
  if (!_supabaseInstance) {
    _supabaseInstance = SupabaseClient.getInstance().getClient();
  }
  return _supabaseInstance;
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      return getSupabaseClient()[prop];
    },
  },
) as ReturnType<typeof createClient<Database>>;

// 导出类型
export type SupabaseClientType = ReturnType<typeof createClient>;
export type User = Database["public"]["Tables"]["users"]["Row"];
export type HealthData = Database["public"]["Tables"]["health_data"]["Row"];
export type MealRecord = Database["public"]["Tables"]["meal_records"]["Row"];
export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
