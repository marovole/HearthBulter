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

    let isReachable = false;
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
        isReachable = res.ok;
      } catch (e) {
        console.error("Convex 连接测试失败:", e);
        isReachable = false;
      }
    }

    return NextResponse.json({
      status: isReachable ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      provider: "convex",
      convexHttp: isReachable ? "reachable" : "unreachable",
      uptime: typeof performance !== "undefined" ? Math.round(performance.now() / 1000) : null,
      version: "1.1.0-convex",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        convexHttp: "unreachable",
      },
      { status: 500 }
    );
  }
}
