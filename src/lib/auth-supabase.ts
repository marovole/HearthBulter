/**
 * Supabase Authentication Adapter
 *
 * 从 NextAuth.js 迁移到 Supabase Auth
 * 保持与原有认证 API 的兼容性
 */

import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";

// Supabase 客户端配置
function getSupabaseAuthClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase auth configuration");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
}

// 服务端 Supabase 客户端（使用 service key）
function getSupabaseServiceClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase service configuration");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// 用户会话类型 (兼容 NextAuth)
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

// 认证服务类
export class SupabaseAuthService {
  private supabase: SupabaseClient<Database>;

  constructor(isServer = false) {
    this.supabase = isServer
      ? getSupabaseServiceClient()
      : getSupabaseAuthClient();
  }

  /**
   * 用户注册
   */
  async signUp(credentials: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name || credentials.email.split("@")[0],
          },
        },
      });

      if (error) {
        return { user: null, error: new Error(error.message) };
      }

      // 在 users 表中创建用户记录
      if (data.user) {
        await this.supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email!,
          name: credentials.name || credentials.email.split("@")[0],
          role: "USER",
        });
      }

      return { user: data.user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * 用户登录
   */
  async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<{ session: Session | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { session: null, error: new Error(error.message) };
      }

      return { session: data.session, error: null };
    } catch (error) {
      return {
        session: null,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * 用户登出
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * 获取当前会话
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error || !data.session) {
        return null;
      }

      // 获取用户详细信息
      const { data: userData } = await this.supabase
        .from("users")
        .select("*")
        .eq("id", data.session.user.id)
        .single();

      if (!userData) {
        return null;
      }

      return {
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          image: userData.image,
          role: userData.role,
        },
        expires: new Date(data.session.expires_at! * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Get session error:", error);
      return null;
    }
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await this.getSession();
    return session?.user || null;
  }

  /**
   * 刷新会话
   */
  async refreshSession(): Promise<{
    session: Session | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        return { session: null, error: new Error(error.message) };
      }

      return { session: data.session, error: null };
    } catch (error) {
      return {
        session: null,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * 密码重置请求
   */
  async resetPasswordRequest(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * 更新密码
   */
  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * 邮箱验证
   */
  async verifyEmail(token: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.verifyOtp({
        token_hash: token,
        type: "email",
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * OAuth 登录 (Google, GitHub 等)
   */
  async signInWithOAuth(
    provider: "google" | "github" | "facebook",
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  /**
   * 监听认证状态变化
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        callback(null);
        return;
      }

      // 获取用户详细信息
      const { data: userData } = await this.supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!userData) {
        callback(null);
        return;
      }

      callback({
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          image: userData.image,
          role: userData.role,
        },
        expires: new Date(session.expires_at! * 1000).toISOString(),
      });
    });
  }
}

// 导出客户端实例
export const supabaseAuth = new SupabaseAuthService(false);

// 导出服务端实例
export const supabaseAuthServer = new SupabaseAuthService(true);

/**
 * 兼容 NextAuth 的 auth() 函数
 * 用于服务端组件和 API 路由
 */
export async function auth(): Promise<AuthSession | null> {
  return await supabaseAuthServer.getSession();
}

/**
 * 兼容 NextAuth 的 getCurrentUser() 函数
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  return await supabaseAuthServer.getCurrentUser();
}

/**
 * 认证系统健康检查
 */
export async function testAuthSystem() {
  try {
    const session = await supabaseAuthServer.getSession();
    return {
      healthy: true,
      authenticated: !!session,
      user: session?.user || null,
      error: null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      authenticated: false,
      user: null,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 认证配置检查
 */
export function checkAuthConfiguration() {
  const issues: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL 未设置");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY 未设置");
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    issues.push("SUPABASE_SERVICE_KEY 未设置（仅服务端需要）");
  }

  return {
    configured: issues.length === 0,
    issues,
    timestamp: new Date().toISOString(),
  };
}

// 导出类型
export type { User, Session } from "@supabase/supabase-js";
