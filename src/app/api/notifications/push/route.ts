import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function parseSubscriptions(raw?: string | null): PushSubscriptionPayload[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is PushSubscriptionPayload =>
          Boolean(item) &&
          typeof item === "object" &&
          "endpoint" in item &&
          "keys" in item,
      );
    }
  } catch {
    return [];
  }

  return [];
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "缺少memberId参数" }, { status: 400 });
    }

    const preferences =
      await convexClient.query<Doc<"notificationPreferences"> | null>(
        api.notifications.getPreferences,
        { memberId: memberId as Id<"familyMembers"> },
      );

    const subscriptions = parseSubscriptions(
      (preferences?.pushToken as string | null) ?? null,
    );

    return NextResponse.json({
      success: true,
      pushEnabled: preferences?.pushEnabled ?? false,
      subscriptions,
    });
  } catch (error) {
    console.error("获取推送订阅失败:", error);
    return NextResponse.json({ error: "获取推送订阅失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const memberId = body?.memberId as string | undefined;
    const subscription = body?.subscription as
      | PushSubscriptionPayload
      | undefined;

    if (!memberId || !subscription?.endpoint) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const preferences =
      await convexClient.query<Doc<"notificationPreferences"> | null>(
        api.notifications.getPreferences,
        { memberId: memberId as Id<"familyMembers"> },
      );

    const currentSubscriptions = parseSubscriptions(
      (preferences?.pushToken as string | null) ?? null,
    );
    const exists = currentSubscriptions.some(
      (item) => item.endpoint === subscription.endpoint,
    );

    const updatedSubscriptions = exists
      ? currentSubscriptions
      : [...currentSubscriptions, subscription];

    await convexClient.mutation(api.notifications.upsertPushSubscriptions, {
      memberId: memberId as Id<"familyMembers">,
      pushToken: JSON.stringify(updatedSubscriptions),
      pushEnabled: true,
      lastUpdatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      pushEnabled: true,
      subscriptions: updatedSubscriptions,
    });
  } catch (error) {
    console.error("保存推送订阅失败:", error);
    return NextResponse.json({ error: "保存推送订阅失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const memberId = body?.memberId as string | undefined;
    const endpoint = body?.endpoint as string | undefined;

    if (!memberId || !endpoint) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const preferences =
      await convexClient.query<Doc<"notificationPreferences"> | null>(
        api.notifications.getPreferences,
        { memberId: memberId as Id<"familyMembers"> },
      );

    const currentSubscriptions = parseSubscriptions(
      (preferences?.pushToken as string | null) ?? null,
    );
    const updatedSubscriptions = currentSubscriptions.filter(
      (item) => item.endpoint !== endpoint,
    );

    await convexClient.mutation(api.notifications.upsertPushSubscriptions, {
      memberId: memberId as Id<"familyMembers">,
      pushToken:
        updatedSubscriptions.length > 0
          ? JSON.stringify(updatedSubscriptions)
          : null,
      pushEnabled: updatedSubscriptions.length > 0,
      lastUpdatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      pushEnabled: updatedSubscriptions.length > 0,
      subscriptions: updatedSubscriptions,
    });
  } catch (error) {
    console.error("取消推送订阅失败:", error);
    return NextResponse.json({ error: "取消推送订阅失败" }, { status: 500 });
  }
}
