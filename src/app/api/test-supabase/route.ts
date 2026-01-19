import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/middleware/authorization";

// 最小化依赖版本 - 只测试环境变量和基础功能

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      const user = await getCurrentUser();
      if (!user?.id) {
        return NextResponse.json(
          { status: "error", error: "未授权访问" },
          { status: 401 },
        );
      }

      const authResult = await requireAdmin(user.id);
      if (!authResult.authorized) {
        return NextResponse.json(
          { status: "error", error: "需要管理员权限" },
          { status: 403 },
        );
      }
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return NextResponse.json({
      status: "success",
      message: "Supabase test endpoint is working! ✅",
      timestamp: new Date().toISOString(),
      config: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "not set",
        runtime: "nodejs",
      },
      note: "This is a simplified test endpoint without external dependencies",
    });
  } catch (error) {
    console.error("Supabase 测试端点失败:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
