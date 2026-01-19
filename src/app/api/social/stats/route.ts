import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { shareTrackingService } from "@/lib/services/social/share-tracking";
import type { ShareAnalytics } from "@/lib/services/social/share-tracking";
import { verifyShareToken } from "@/lib/security/token-generator";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const period = searchParams.get("period") as "7d" | "30d" | "90d" | "1y";
    const type = searchParams.get("type");
    const token = searchParams.get("token");

    if (memberId) {
      const access = await convexClient.query<{ hasAccess: boolean }>(
        api.members.verifyAccess,
        {
          memberId: memberId as Id<"familyMembers">,
          clerkId: session.user.id,
        },
      );

      if (!access.hasAccess) {
        return NextResponse.json(
          { error: "无权限访问该家庭成员" },
          { status: 403 },
        );
      }
    }

    if (token) {
      const verification = await verifyShareToken(token);
      if (!verification.valid || !verification.payload) {
        return NextResponse.json(
          { error: verification.error || "分享链接已失效" },
          { status: 410 },
        );
      }

      if (verification.payload.resourceType !== "social_share") {
        return NextResponse.json({ error: "无效的分享类型" }, { status: 410 });
      }

      const shareStats = await shareTrackingService.getShareStatistics(token);

      const shareContent = await convexClient.query<Record<
        string,
        unknown
      > | null>(api.social.getSharedContentById, {
        id: verification.payload.resourceId as Id<"sharedContents">,
      });

      if (!shareContent) {
        return NextResponse.json({ error: "分享内容不存在" }, { status: 404 });
      }

      const member = await convexClient.query<Record<string, unknown> | null>(
        api.members.getById,
        { memberId: shareContent.memberId as Id<"familyMembers"> },
      );

      if (
        member?.userId !== session.user.id &&
        shareContent.privacyLevel === "PRIVATE"
      ) {
        return NextResponse.json(
          { error: "无权限查看该分享统计" },
          { status: 403 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          type: "share",
          token,
          stats: shareStats,
        },
      });
    }

    const analysisType = type || "user";
    let analytics: ShareAnalytics;
    let additionalStats: Record<string, unknown> = {};

    if (analysisType === "user" && memberId) {
      analytics = await shareTrackingService.getUserShareAnalytics(
        memberId,
        period,
      );
    } else if (analysisType === "global") {
      analytics = await shareTrackingService.getGlobalShareAnalytics(period);
    } else {
      return NextResponse.json(
        { error: "memberId is required for user analytics" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        type: analysisType,
        period: period || "30d",
        analytics,
        additionalStats,
      },
    });
  } catch (error) {
    console.error("获取分享统计失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
