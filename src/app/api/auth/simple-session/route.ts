import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/middleware/authorization";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      const user = await getCurrentUser();
      if (!user?.id) {
        return NextResponse.json(
          { authenticated: false, error: "未授权访问" },
          { status: 401 },
        );
      }

      const authResult = await requireAdmin(user.id);
      if (!authResult.authorized) {
        return NextResponse.json(
          { authenticated: false, error: "需要管理员权限" },
          { status: 403 },
        );
      }
    }

    const user = await getCurrentUser();

    return NextResponse.json({
      authenticated: !!user,
      session: user
        ? {
            user,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Simple session error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        session: null,
        error: "Simple session check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
