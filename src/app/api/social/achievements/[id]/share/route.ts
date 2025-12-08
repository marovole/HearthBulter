import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdapter } from "@/lib/db/supabase-adapter";
import { auth } from "@/lib/auth";
import { shareAchievement } from "@/lib/services/social/achievement-system";
import { shareContentGenerator } from "@/lib/services/social/share-generator";
import { generateSecureShareToken } from "@/lib/security/token-generator";
import { ShareContentType, SocialPlatform } from "@/types/social-sharing";
import {
  validateBody,
  validationErrorResponse,
} from "@/lib/validation/api-validator";

/**
 * POST /api/social/achievements/[id]/share
 * 分享成就
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: achievementId } = await params;
    const validation = await validateBody(request, shareAchievementSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const { customMessage, privacyLevel = "PUBLIC" } = validation.data;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const memberId = session.user?.id;
    if (!memberId) {
      return NextResponse.json({ error: "用户ID不存在" }, { status: 400 });
    }

    // 验证成就是否存在且属于该用户
    const achievement = await supabaseAdapter.achievement.findFirst({
      where: {
        id: achievementId,
        memberId,
        isUnlocked: true,
      },
    });

    if (!achievement) {
      return NextResponse.json(
        { error: "成就不存在或未解锁" },
        { status: 404 },
      );
    }

    // 先创建占位记录以获取 ID
    const provisional = await supabaseAdapter.sharedContent.create({
      data: {
        memberId,
        contentType: "ACHIEVEMENT",
        title: "pending",
        description: customMessage || "",
        imageUrl: null,
        shareToken: "pending",
        shareUrl: "pending",
        privacyLevel,
        metadata: null,
        sharedPlatforms: JSON.stringify([SocialPlatform.COPY_LINK]),
      },
    });

    const shareToken = await generateSecureShareToken(
      provisional.id,
      "social_share",
      session.user.id,
      7,
      ["read"],
    );

    const shareUrl = `${baseUrl}/share/${shareToken}`;

    const shareContent = await shareContentGenerator.generateShareContent(
      {
        memberId,
        type: ShareContentType.ACHIEVEMENT_UNLOCKED,
        title: achievement.title,
        description: customMessage || achievement.description || "",
        imageUrl: achievement.imageUrl || undefined,
        targetId: achievementId,
        privacyLevel: privacyLevel as any,
        platforms: [SocialPlatform.COPY_LINK],
        customMessage,
      },
      {
        shareToken,
        shareUrl,
        baseUrl,
      },
    );

    const sharedContent = await supabaseAdapter.sharedContent.update({
      where: { id: provisional.id },
      data: {
        title: shareContent.content.title,
        description: shareContent.content.description,
        imageUrl: shareContent.imageUrl,
        shareToken,
        shareUrl,
        metadata: shareContent.content.metadata,
      },
    });

    // 标记成就已分享
    await shareAchievement(achievementId);

    return NextResponse.json({
      success: true,
      data: {
        id: sharedContent.id,
        shareToken: sharedContent.shareToken,
        shareUrl: sharedContent.shareUrl,
        title: sharedContent.title,
        description: sharedContent.description,
        imageUrl: sharedContent.imageUrl,
        achievement: {
          id: achievement.id,
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
