import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyShareToken } from "@/lib/security/token-generator";
import { rateLimiter } from "@/lib/services/ai/rate-limiter";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const rate = await rateLimiter.checkLimit(
      getClientId(request),
      "social-share-view",
      {
        maxRequests: 30,
        windowMs: 60_000,
        blockDurationMs: 2 * 60_000,
      },
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "请求过于频繁" },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfter || 60) },
        },
      );
    }

    if (!token) {
      return NextResponse.json({ error: "缺少分享token" }, { status: 400 });
    }

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

    const sharedContent = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.social.getSharedContentById, {
      id: verification.payload.resourceId as Id<"sharedContents">,
    });

    if (!sharedContent) {
      return NextResponse.json({ error: "分享内容不存在" }, { status: 404 });
    }

    if (sharedContent.status !== "ACTIVE") {
      return NextResponse.json({ error: "分享已失效" }, { status: 410 });
    }

    if (
      sharedContent.expiresAt &&
      Number(sharedContent.expiresAt) < Date.now()
    ) {
      await convexClient.mutation(api.social.updateSharedContent, {
        id: sharedContent._id as Id<"sharedContents">,
        patch: { status: "EXPIRED" },
      });

      return NextResponse.json({ error: "分享已过期" }, { status: 410 });
    }

    await convexClient.mutation(api.social.recordShareEvent, {
      id: sharedContent._id as Id<"sharedContents">,
      action: "VIEW",
    });

    const member = await convexClient.query<Record<string, unknown> | null>(
      api.members.getById,
      { memberId: sharedContent.memberId as Id<"familyMembers"> },
    );

    return NextResponse.json({
      success: true,
      data: {
        id: sharedContent._id,
        contentType: sharedContent.contentType,
        title: sharedContent.title,
        description: sharedContent.description,
        imageUrl: sharedContent.imageUrl,
        member: member
          ? {
              id: member._id,
              name: member.name,
              avatar: member.avatar,
            }
          : null,
        privacyLevel: sharedContent.privacyLevel,
        allowComment: sharedContent.allowComment,
        allowLike: sharedContent.allowLike,
        viewCount: (sharedContent.viewCount as number) + 1,
        likeCount: sharedContent.likeCount,
        commentCount: sharedContent.commentCount,
        shareCount: sharedContent.shareCount,
        createdAt: sharedContent.createdAt,
        metadata: sharedContent.metadata,
      },
    });
  } catch (error) {
    console.error("获取分享内容失败:", error);
    return NextResponse.json({ error: "获取分享内容失败" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { action = "click" } = body;

    const rate = await rateLimiter.checkLimit(
      getClientId(request),
      "social-share-event",
      {
        maxRequests: 60,
        windowMs: 60_000,
        blockDurationMs: 2 * 60_000,
      },
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "请求过于频繁" },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfter || 60) },
        },
      );
    }

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

    const sharedContent = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.social.getSharedContentById, {
      id: verification.payload.resourceId as Id<"sharedContents">,
    });

    if (!sharedContent) {
      return NextResponse.json({ error: "分享内容不存在" }, { status: 404 });
    }

    let actionType: string;
    switch (action) {
      case "click":
        actionType = "CLICK";
        break;
      case "share":
        actionType = "SHARE";
        break;
      case "conversion":
        actionType = "CONVERSION";
        break;
      default:
        return NextResponse.json(
          { error: "不支持的动作类型" },
          { status: 400 },
        );
    }

    await convexClient.mutation(api.social.recordShareEvent, {
      id: sharedContent._id as Id<"sharedContents">,
      action: actionType,
    });

    return NextResponse.json({
      success: true,
      message: "统计更新成功",
    });
  } catch (error) {
    console.error("更新分享统计失败:", error);
    return NextResponse.json({ error: "更新分享统计失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { token } = await params;

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

    const sharedContent = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.social.getSharedContentById, {
      id: verification.payload.resourceId as Id<"sharedContents">,
    });

    if (!sharedContent) {
      return NextResponse.json({ error: "分享内容不存在" }, { status: 404 });
    }

    if (verification.payload.ownerId !== session.user?.id) {
      return NextResponse.json({ error: "无权操作该分享" }, { status: 403 });
    }

    await convexClient.mutation(api.social.updateSharedContent, {
      id: sharedContent._id as Id<"sharedContents">,
      patch: { status: "REVOKED" },
    });

    return NextResponse.json({
      success: true,
      message: "分享已撤回",
    });
  } catch (error) {
    console.error("撤回分享失败:", error);
    return NextResponse.json({ error: "撤回分享失败" }, { status: 500 });
  }
}

function getClientId(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `public:${ip}`;
}
