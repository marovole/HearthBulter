/**
 * Supabase 客户端工厂
 *
 * [双栈并存说明] 主线数据访问已迁移至 Convex + Clerk，
 * 但 Cloudflare Workers 层（functions/）仍依赖 Supabase 读取部分遗留数据。
 * 待 Workers 层完全迁移至 Convex 后，此文件可删除。
 */
import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(env) {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-application-name": "health-butler-functions",
      },
    },
    db: {
      schema: "public",
    },
  });
}

export function createSupabaseClientWithAuth(token) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        "x-application-name": "health-butler-functions",
        Authorization: `Bearer ${token}`,
      },
    },
    db: {
      schema: "public",
    },
  });
}
