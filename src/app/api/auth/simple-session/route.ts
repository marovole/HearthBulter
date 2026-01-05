import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    // 检查是否有认证token
    const authHeader = request.headers.get("authorization");
    const token = request.cookies.get("next-auth.session-token")?.value;

    // 简单的测试响应
    return NextResponse.json({
      authenticated: !!token || !!authHeader,
      session: token
        ? {
            user: {
              id: "1",
              email: "test@example.com",
              name: "测试用户",
              role: "USER",
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }
        : null,
      timestamp: new Date().toISOString(),
      headers: {
        hasAuthHeader: !!authHeader,
        hasCookie: !!token,
      },
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
      { status: 200 },
    );
  }
}
