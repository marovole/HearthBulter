/* [已迁移至 Clerk] — 此路由仅保留 410 响应，防止旧客户端报 404 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "NextAuth 已停用，请使用 Clerk" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "NextAuth 已停用，请使用 Clerk" }, { status: 410 });
}
