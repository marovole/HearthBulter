import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "NextAuth 已停用，请使用 Clerk" },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "NextAuth 已停用，请使用 Clerk" },
    { status: 410 },
  );
}
