import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { getConvexClient, api } from "@/lib/convex-client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET 未设置" },
      { status: 500 },
    );
  }

  const payload = await request.text();
  const headerList = headers();
  const svixId = headerList.get("svix-id");
  const svixTimestamp = headerList.get("svix-timestamp");
  const svixSignature = headerList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "缺少签名头" }, { status: 400 });
  }

  const wh = new Webhook(webhookSecret);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "签名验证失败" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const data = event.data as {
      id: string;
      email_addresses?: Array<{ email_address: string }>;
      first_name?: string | null;
      last_name?: string | null;
      image_url?: string | null;
    };

    const email = data.email_addresses?.[0]?.email_address ?? null;
    if (!email) {
      return NextResponse.json({ ok: true });
    }

    const name = [data.first_name, data.last_name].filter(Boolean).join(" ");

    const convex = getConvexClient();
    await convex.mutation(api.users.upsertFromClerk, {
      clerkId: data.id,
      email,
      name: name || undefined,
      image: data.image_url ?? undefined,
    });
  }

  return NextResponse.json({ ok: true });
}
