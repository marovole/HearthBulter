import { NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "pong",
    timestamp: new Date().toISOString(),
    deploy: {
      cfPagesProjectName: process.env.CF_PAGES_PROJECT_NAME ?? null,
      cfPagesBranch: process.env.CF_PAGES_BRANCH ?? null,
      cfPagesCommitSha: process.env.CF_PAGES_COMMIT_SHA ?? null,
      cfPagesUrl: process.env.CF_PAGES_URL ?? null,
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      hasClerk: !!process.env.CLERK_SECRET_KEY,
      hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
    },
  });
}
