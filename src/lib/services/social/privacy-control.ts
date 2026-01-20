import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

const privacySettingsCache = new Map<string, PrivacySettings>();

export interface PrivacySettings {
  memberId: string;
  defaultPrivacyLevel: "PUBLIC";
  allowStrangerView: boolean;
  allowSearchIndex: boolean;
  allowDataCollection: boolean;
  blockedUsers: string[];
  trustedFriends: string[];
  autoExpireDays: number;
  requireApproval: boolean;
}

export interface SharePrivacyRule {
  id: string;
  memberId: string;
  contentType: string;
  privacyLevel: "PUBLIC" | "FRIENDS" | "PRIVATE";
  allowComment: boolean;
  allowLike: boolean;
  allowShare: boolean;
  expiresAfterDays?: number;
  allowedUsers: string[];
  blockedUsers: string[];
}

const createDefaultPrivacySettings = (memberId: string): PrivacySettings => ({
  memberId,
  defaultPrivacyLevel: "PUBLIC",
  allowStrangerView: true,
  allowSearchIndex: false,
  allowDataCollection: true,
  blockedUsers: [],
  trustedFriends: [],
  autoExpireDays: 30,
  requireApproval: false,
});

export async function getUserPrivacySettings(memberId: string): Promise<PrivacySettings | null> {
  const cached = privacySettingsCache.get(memberId);
  return cached ?? createDefaultPrivacySettings(memberId);
}

export async function updateUserPrivacySettings(
  memberId: string,
  settings: Partial<PrivacySettings>
): Promise<boolean> {
  const currentSettings =
    (await getUserPrivacySettings(memberId)) ?? createDefaultPrivacySettings(memberId);

  const updatedSettings: PrivacySettings = {
    ...currentSettings,
    ...settings,
    blockedUsers: settings.blockedUsers ?? currentSettings.blockedUsers,
    trustedFriends: settings.trustedFriends ?? currentSettings.trustedFriends,
  };

  privacySettingsCache.set(memberId, updatedSettings);
  return true;
}

export async function checkShareAccess(
  shareToken: string,
  viewerId?: string
): Promise<{
  hasAccess: boolean;
  reason?: string;
  privacyLevel?: "PUBLIC" | "FRIENDS" | "PRIVATE";
}> {
  try {
    const share = await convexClient.query<Record<string, unknown> | null>(
      api.social.getSharedContentByToken,
      { token: shareToken }
    );

    if (!share) {
      return { hasAccess: false, reason: "分享内容不存在" };
    }

    if ((share as Record<string, unknown>).status !== "ACTIVE") {
      return { hasAccess: false, reason: "分享已失效" };
    }

    const expiresAt = (share as Record<string, unknown>).expiresAt as number | null | undefined;
    if (expiresAt && expiresAt < Date.now()) {
      return { hasAccess: false, reason: "分享已过期" };
    }

    const privacySettings = await getUserPrivacySettings(
      (share as Record<string, unknown>).memberId as string
    );
    if (!privacySettings) {
      return { hasAccess: false, reason: "无法获取隐私设置" };
    }

    if (viewerId && privacySettings.blockedUsers.includes(viewerId)) {
      return { hasAccess: false, reason: "您已被屏蔽" };
    }

    const privacyLevel = (share as Record<string, unknown>).privacyLevel as
      | "PUBLIC"
      | "FRIENDS"
      | "PRIVATE";

    switch (privacyLevel) {
      case "PUBLIC": {
        if (!privacySettings.allowStrangerView && !viewerId) {
          return { hasAccess: false, reason: "不允许陌生人访问" };
        }
        break;
      }
      case "FRIENDS": {
        if (!viewerId) {
          return { hasAccess: false, reason: "需要登录才能查看" };
        }

        const isFriend = await checkFriendship(
          (share as Record<string, unknown>).memberId as string,
          viewerId
        );
        if (!isFriend && !privacySettings.trustedFriends.includes(viewerId)) {
          return { hasAccess: false, reason: "仅好友可见" };
        }
        break;
      }
      case "PRIVATE": {
        if (!viewerId) {
          return { hasAccess: false, reason: "需要授权才能查看" };
        }
        return { hasAccess: false, reason: "无权访问此分享" };
      }
    }

    return {
      hasAccess: true,
      privacyLevel,
    };
  } catch (error) {
    console.error("检查分享访问权限失败:", error);
    return { hasAccess: false, reason: "系统错误" };
  }
}

async function checkFriendship(memberId1: string, memberId2: string): Promise<boolean> {
  return false;
}

async function getSharePrivacyRule(shareId: string): Promise<SharePrivacyRule | null> {
  return null;
}

export async function setSharePrivacyRule(
  shareId: string,
  rule: Omit<SharePrivacyRule, "id" | "memberId" | "contentType">
): Promise<boolean> {
  try {
    const patch: Record<string, unknown> = {
      privacyLevel: rule.privacyLevel,
      allowComment: rule.allowComment,
      allowLike: rule.allowLike,
    };

    await convexClient.mutation(api.social.updateSharedContent, {
      id: shareId as Id<"sharedContents">,
      patch,
    });

    return true;
  } catch (error) {
    console.error("设置分享隐私规则失败:", error);
    return false;
  }
}

export async function blockUser(memberId: string, blockedUserId: string): Promise<boolean> {
  try {
    const settings = await getUserPrivacySettings(memberId);
    if (!settings) {
      return false;
    }

    if (!settings.blockedUsers.includes(blockedUserId)) {
      settings.blockedUsers.push(blockedUserId);
      return await updateUserPrivacySettings(memberId, {
        blockedUsers: settings.blockedUsers,
      });
    }

    return true;
  } catch (error) {
    console.error("屏蔽用户失败:", error);
    return false;
  }
}

export async function unblockUser(memberId: string, blockedUserId: string): Promise<boolean> {
  try {
    const settings = await getUserPrivacySettings(memberId);
    if (!settings) {
      return false;
    }

    const index = settings.blockedUsers.indexOf(blockedUserId);
    if (index > -1) {
      settings.blockedUsers.splice(index, 1);
      return await updateUserPrivacySettings(memberId, {
        blockedUsers: settings.blockedUsers,
      });
    }

    return true;
  } catch (error) {
    console.error("取消屏蔽用户失败:", error);
    return false;
  }
}

export async function addTrustedFriend(memberId: string, friendId: string): Promise<boolean> {
  try {
    const settings = await getUserPrivacySettings(memberId);
    if (!settings) {
      return false;
    }

    if (!settings.trustedFriends.includes(friendId)) {
      settings.trustedFriends.push(friendId);
      return await updateUserPrivacySettings(memberId, {
        trustedFriends: settings.trustedFriends,
      });
    }

    return true;
  } catch (error) {
    console.error("添加信任好友失败:", error);
    return false;
  }
}

export async function removeTrustedFriend(memberId: string, friendId: string): Promise<boolean> {
  try {
    const settings = await getUserPrivacySettings(memberId);
    if (!settings) {
      return false;
    }

    const index = settings.trustedFriends.indexOf(friendId);
    if (index > -1) {
      settings.trustedFriends.splice(index, 1);
      return await updateUserPrivacySettings(memberId, {
        trustedFriends: settings.trustedFriends,
      });
    }

    return true;
  } catch (error) {
    console.error("移除信任好友失败:", error);
    return false;
  }
}

export async function setShareExpiration(memberId: string, days: number): Promise<boolean> {
  try {
    const updated = await updateUserPrivacySettings(memberId, {
      autoExpireDays: days,
    });

    if (!updated) {
      return false;
    }

    const expireDate = Date.now() + days * 24 * 60 * 60 * 1000;

    const { data: contents } = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.social.listSharedContents, {
      memberId: memberId as Id<"familyMembers">,
      contentType: undefined,
      status: "ACTIVE",
      offset: 0,
      limit: 1000,
    });

    for (const content of contents) {
      if (
        (content as Record<string, unknown>).privacyLevel === "PUBLIC" &&
        !(content as Record<string, unknown>).expiresAt
      ) {
        await convexClient.mutation(api.social.updateSharedContent, {
          id: content._id as Id<"sharedContents">,
          patch: { expiresAt: expireDate },
        });
      }
    }

    return true;
  } catch (error) {
    console.error("设置分享过期时间失败:", error);
    return false;
  }
}

export async function cleanupExpiredShares(): Promise<number> {
  try {
    const { data: contents } = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.social.listSharedContents, {
      memberId: undefined,
      contentType: undefined,
      status: "ACTIVE",
      offset: 0,
      limit: 10000,
    });

    let count = 0;
    const now = Date.now();

    for (const content of contents) {
      const expiresAt = (content as Record<string, unknown>).expiresAt as number | null | undefined;
      if (expiresAt && expiresAt < now) {
        await convexClient.mutation(api.social.updateSharedContent, {
          id: content._id as Id<"sharedContents">,
          patch: { status: "EXPIRED" },
        });
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error("清理过期分享失败:", error);
    return 0;
  }
}

export async function getSharePrivacyStats(memberId: string): Promise<{
  totalShares: number;
  publicShares: number;
  friendsShares: number;
  privateShares: number;
  expiredShares: number;
}> {
  try {
    const { data: contents } = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.social.listSharedContents, {
      memberId: memberId as Id<"familyMembers">,
      contentType: undefined,
      status: undefined,
      offset: 0,
      limit: 10000,
    });

    const result = {
      totalShares: 0,
      publicShares: 0,
      friendsShares: 0,
      privateShares: 0,
      expiredShares: 0,
    };

    for (const content of contents) {
      result.totalShares++;
      const privacyLevel = (content as Record<string, unknown>).privacyLevel as string;
      const status = (content as Record<string, unknown>).status as string;

      if (privacyLevel === "PUBLIC") result.publicShares++;
      if (privacyLevel === "FRIENDS") result.friendsShares++;
      if (privacyLevel === "PRIVATE") result.privateShares++;
      if (status === "EXPIRED") result.expiredShares++;
    }

    return result;
  } catch (error) {
    console.error("获取分享隐私统计失败:", error);
    return {
      totalShares: 0,
      publicShares: 0,
      friendsShares: 0,
      privateShares: 0,
      expiredShares: 0,
    };
  }
}
