import { NextResponse } from "next/server";
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

    let isConnected = false;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl) {
      try {
        const res = await fetch(`${convexUrl}/api/query_ts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Convex-Client": "healthbutler",
          },
        });
        isConnected = res.ok;
      } catch (e) {
        console.error("Convex 连接测试失败:", e);
        isConnected = false;
      }
    }

    return NextResponse.json({
      status: isConnected ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: isConnected ? "connected" : "disconnected",
      provider: "convex",
      uptime: typeof performance !== "undefined" ? Math.round(performance.now() / 1000) : null,
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
      { status: 500 }
    );
  }
}
