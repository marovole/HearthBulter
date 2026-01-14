import { NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import { headers } from "next/headers";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = process.env.INTERNAL_HEALTH_TOKEN;
    if (token && process.env.NODE_ENV === "production") {
      const requestToken = headers().get("x-health-token");
      if (!requestToken || requestToken !== token) {
        return NextResponse.json({ status: "forbidden" }, { status: 403 });
      }
    }

    // 测试 Convex 连接
    let isConnected = false;
    try {
      // 尝试发起一个简单的查询
      await convexClient.query(api.users.getMe, {
        email: "health-check@example.com",
      });
      isConnected = true;
    } catch (e) {
      console.error("Convex 连接测试失败:", e);
    }

    return NextResponse.json({
      status: isConnected ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: isConnected ? "connected" : "disconnected",
      provider: "convex",
      uptime: process.uptime(),
      version: "1.1.0-convex",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        database: "disconnected",
      },
      { status: 500 },
    );
  }
}
