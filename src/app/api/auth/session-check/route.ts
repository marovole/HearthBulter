import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    return NextResponse.json({
      authenticated: !!session,
      session: session
        ? {
          user: session.user,
          expires: null,
        }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Session verification error:", error);

    return NextResponse.json(
      {
        authenticated: false,
        session: null,
        error: "Session verification failed",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
