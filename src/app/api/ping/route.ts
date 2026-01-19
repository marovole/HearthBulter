import { NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "pong",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      hasClerk: !!process.env.CLERK_SECRET_KEY,
    },
  });
}
