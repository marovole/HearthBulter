import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { shareContentGenerator } from "@/lib/services/social/share-generator";
import type { ShareContentInput } from "@/types/social-sharing";
import { SocialPlatform } from "@/types/social-sharing";
import { ShareContentType } from "@prisma/client";
import { generateSecureShareToken } from "@/lib/security/token-generator";
import {
  validateBody,
  validationErrorResponse,
} from "@/lib/validation/api-validator";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const validation = await validateBody(request, shareInputSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    const validatedData = validation.data;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: validatedData.memberId as Id<"familyMembers">,
        clerkId: session.user.id,
      },
    );

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "无权限访问该家庭成员" },
        { status: 403 },
      );
    }

    const provisionalId = await convexClient.mutation<string>(
      api.social.createSharedContent,
      {
        memberId: validatedData.memberId as Id<"familyMembers">,
        contentType: validatedData.type,
        privacyLevel: validatedData.privacyLevel,
        targetId: validatedData.targetId,
        sharedPlatforms: validatedData.platforms,
        shareToken: "pending",
        shareUrl: "pending",
        status: "ACTIVE",
      },
    );

    const shareToken = await generateSecureShareToken(
      provisionalId,
      "social_share",
      session.user.id,
      7,
      ["read"],
    );

    const shareUrl = `${baseUrl}/share/${shareToken}`;

    const shareResult = await shareContentGenerator.generateShareContent(
      validatedData,
      {
        shareToken,
        shareUrl,
        baseUrl,
      },
    );

    await convexClient.mutation(api.social.updateSharedContent, {
      id: provisionalId as Id<"sharedContents">,
      patch: {
        title: shareResult.content.title,
        description: shareResult.content.description,
        imageUrl: shareResult.imageUrl,
        shareToken,
        shareUrl,
        metadata: shareResult.content.metadata ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        shareContent: {
          id: provisionalId,
          shareToken,
          shareUrl,
          title: shareResult.content.title,
          description: shareResult.content.description,
          imageUrl: shareResult.imageUrl,
        },
        shareUrl,
        imageUrl: shareResult.imageUrl,
        platforms: validatedData.platforms,
      },
      message: "分享创建成功",
    });
  } catch (error) {
    console.error("创建分享失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}

const shareInputSchema = z.object({
  memberId: z.string().min(1),
  type: z.nativeEnum(ShareContentType),
  title: z.string().optional().default(""),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  targetId: z.string().optional(),
  privacyLevel: z.string().min(1),
  platforms: z.array(z.nativeEnum(SocialPlatform)).min(1),
  customMessage: z.string().optional(),
}) as z.ZodSchema<ShareContentInput>;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

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

    const { data: contents, total } = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.social.listSharedContents, {
      memberId: memberId as Id<"familyMembers"> | undefined,
      contentType: type || undefined,
      status: "ACTIVE",
      offset: (page - 1) * limit,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        contents: contents || [],
        pagination: {
          page,
          limit,
          total: total || 0,
          totalPages: Math.ceil((total || 0) / limit),
          hasNext: page * limit < (total || 0),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("获取分享列表失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
