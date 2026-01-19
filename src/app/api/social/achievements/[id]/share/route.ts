import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { shareAchievement } from "@/lib/services/social/achievement-system";
import { shareContentGenerator } from "@/lib/services/social/share-generator";
import { generateSecureShareToken } from "@/lib/security/token-generator";
import {
  ShareContentType,
  SharePrivacyLevel,
  SocialPlatform,
} from "@/types/social-sharing";
import {
  validateBody,
  validationErrorResponse,
} from "@/lib/validation/api-validator";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: achievementId } = await params;
    const validation = await validateBody(request, shareAchievementSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const { customMessage, privacyLevel } = validation.data;
    const normalizedPrivacyLevel: SharePrivacyLevel = Object.values(
      SharePrivacyLevel,
    ).includes(privacyLevel as SharePrivacyLevel)
      ? (privacyLevel as SharePrivacyLevel)
      : SharePrivacyLevel.PUBLIC;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const achievement = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.achievements.getById, {
      id: achievementId as Id<"achievements">,
    });

    if (!achievement || !achievement.isUnlocked) {
      return NextResponse.json(
        { error: "成就不存在或未解锁" },
        { status: 404 },
      );
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: achievement.memberId as Id<"familyMembers">,
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
        memberId: achievement.memberId as Id<"familyMembers">,
        contentType: "ACHIEVEMENT",
        privacyLevel: normalizedPrivacyLevel,
        targetId: achievementId,
        sharedPlatforms: [SocialPlatform.COPY_LINK],
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

    const shareContent = await shareContentGenerator.generateShareContent(
      {
        memberId: achievement.memberId as string,
        type: ShareContentType.ACHIEVEMENT_UNLOCKED,
        title: achievement.title as string,
        description: customMessage || (achievement.description as string) || "",
        imageUrl: achievement.imageUrl as string | undefined,
        targetId: achievementId,
        privacyLevel: normalizedPrivacyLevel,
        platforms: [SocialPlatform.COPY_LINK],
        customMessage,
      },
      {
        shareToken,
        shareUrl,
        baseUrl,
      },
    );

    await convexClient.mutation(api.social.updateSharedContent, {
      id: provisionalId as Id<"sharedContents">,
      patch: {
        title: shareContent.content.title,
        description: shareContent.content.description,
        imageUrl: shareContent.imageUrl,
        shareToken,
        shareUrl,
        metadata: shareContent.content.metadata ?? null,
      },
    });

    await shareAchievement(achievementId, achievement.memberId as string, {
      customMessage,
      privacyLevel: normalizedPrivacyLevel,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: provisionalId,
        shareToken,
        shareUrl,
        title: shareContent.content.title,
        description: shareContent.content.description,
        imageUrl: shareContent.imageUrl,
        achievement: {
          id: achievementId,
          title: achievement.title,
          description: achievement.description,
          rarity: achievement.rarity,
          points: achievement.points,
          unlockedAt: achievement.unlockedAt,
        },
      },
      message: "成就分享成功",
    });
  } catch (error) {
    console.error("分享成就失败:", error);
    return NextResponse.json({ error: "分享成就失败" }, { status: 500 });
  }
}

const shareAchievementSchema = z.object({
  customMessage: z.string().optional(),
  privacyLevel: z.string().optional(),
});
