import { NextResponse } from "next/server";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/middleware/authorization";

/**
 * GET /api/monitoring - 系统监控端点
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      const user = await getCurrentUser();
      if (!user?.id) {
        return NextResponse.json({ system: "unhealthy", error: "未授权访问" }, { status: 401 });
      }

      const authResult = await requireAdmin(user.id);
      if (!authResult.authorized) {
        return NextResponse.json({ system: "unhealthy", error: "需要管理员权限" }, { status: 403 });
      }
    }

    const supabase = SupabaseClientManager.getInstance();

    // 获取基本统计信息（使用Supabase）
    const { count: totalUsers, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("查询用户统计失败:", countError);
      return NextResponse.json(
        {
          system: "unhealthy",
          timestamp: new Date().toISOString(),
          error: "Failed to fetch user statistics",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      system: "healthy",
      timestamp: new Date().toISOString(),
      stats: {
        total_users: totalUsers || 0,
        server_time: new Date().toISOString(),
      },
      endpoints: {
        health: "/api/health",
        monitoring: "/api/monitoring",
      },
      uptime: process.uptime(),
      version: "1.0.0",
    });
  } catch (error) {
    console.error("监控端点失败:", error);
    return NextResponse.json(
      {
        system: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
