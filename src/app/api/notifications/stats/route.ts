import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const days = parseInt(searchParams.get("days") || "30");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    if (days < 1 || days > 365) {
      return NextResponse.json({ error: "Days must be between 1 and 365" }, { status: 400 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await convexClient.query<{
      summary: {
        total: number;
        sent: number;
        failed: number;
        pending: number;
        read: number;
        unread: number;
      };
      dailyStats: Array<{
        date: string;
        total: number;
        sent: number;
        failed: number;
        pending: number;
      }>;
      channelStats: Record<
        string,
        { total: number; sent: number; failed: number; successRate: number }
      >;
    }>(api.notifications.getStats, {
      memberId: memberId as Id<"familyMembers">,
      days,
      dailyDays: 7,
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: stats.summary,
        unreadCount: stats.summary.unread,
        dailyStats: stats.dailyStats,
        channelStats: stats.channelStats,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    return NextResponse.json({ error: "Failed to fetch notification stats" }, { status: 500 });
  }
}
