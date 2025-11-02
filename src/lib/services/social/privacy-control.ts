/**
 * 隐私控制服务
 * 负责管理分享内容的隐私设置和访问控制
 */

import { PrismaClient, SharePrivacyLevel } from '@prisma/client';

const prisma = new PrismaClient();

export interface PrivacySettings {
  memberId: string;
  defaultPrivacyLevel: SharePrivacyLevel;
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
  privacyLevel: SharePrivacyLevel;
  allowComment: boolean;
  allowLike: boolean;
  allowShare: boolean;
  expiresAfterDays?: number;
  allowedUsers: string[];
  blockedUsers: string[];
}

/**
 * 获取用户隐私设置
 */
export async function getUserPrivacySettings(memberId: string): Promise<PrivacySettings | null> {
  try {
    const settings = await prisma.privacySetting.findUnique({
      where: { memberId },
    });

    if (!settings) {
      // 返回默认设置
      return {
        memberId,
        defaultPrivacyLevel: 'PUBLIC',
        allowStrangerView: true,
        allowSearchIndex: false,
        allowDataCollection: true,
        blockedUsers: [],
        trustedFriends: [],
        autoExpireDays: 30,
        requireApproval: false,
      };
    }

    return {
      memberId: settings.memberId,
      defaultPrivacyLevel: settings.defaultPrivacyLevel as SharePrivacyLevel,
      allowStrangerView: settings.allowStrangerView,
      allowSearchIndex: settings.allowSearchIndex,
      allowDataCollection: settings.allowDataCollection,
      blockedUsers: JSON.parse(settings.blockedUsers || '[]'),
      trustedFriends: JSON.parse(settings.trustedFriends || '[]'),
      autoExpireDays: settings.autoExpireDays,
      requireApproval: settings.requireApproval,
    };
  } catch (error) {
    console.error('获取隐私设置失败:', error);
    return null;
  }
}

/**
 * 更新用户隐私设置
 */
export async function updateUserPrivacySettings(
  memberId: string,
  settings: Partial<PrivacySettings>
): Promise<boolean> {
  try {
    const currentSettings = await getUserPrivacySettings(memberId);
    if (!currentSettings) {
      return false;
    }

    const updatedSettings = { ...currentSettings, ...settings };

    await prisma.privacySetting.upsert({
      where: { memberId },
      update: {
        defaultPrivacyLevel: updatedSettings.defaultPrivacyLevel,
        allowStrangerView: updatedSettings.allowStrangerView,
        allowSearchIndex: updatedSettings.allowSearchIndex,
        allowDataCollection: updatedSettings.allowDataCollection,
        blockedUsers: JSON.stringify(updatedSettings.blockedUsers),
        trustedFriends: JSON.stringify(updatedSettings.trustedFriends),
        autoExpireDays: updatedSettings.autoExpireDays,
        requireApproval: updatedSettings.requireApproval,
      },
      create: {
        memberId,
        defaultPrivacyLevel: updatedSettings.defaultPrivacyLevel,
        allowStrangerView: updatedSettings.allowStrangerView,
        allowSearchIndex: updatedSettings.allowSearchIndex,
        allowDataCollection: updatedSettings.allowDataCollection,
        blockedUsers: JSON.stringify(updatedSettings.blockedUsers),
        trustedFriends: JSON.stringify(updatedSettings.trustedFriends),
        autoExpireDays: updatedSettings.autoExpireDays,
        requireApproval: updatedSettings.requireApproval,
      },
    });

    return true;
  } catch (error) {
    console.error('更新隐私设置失败:', error);
    return false;
  }
}

/**
 * 检查用户是否有权访问分享内容
 */
export async function checkShareAccess(
  shareToken: string,
  viewerId?: string
): Promise<{
  hasAccess: boolean;
  reason?: string;
  privacyLevel?: SharePrivacyLevel;
}> {
  try {
    // 获取分享内容
    const share = await prisma.sharedContent.findUnique({
      where: { shareToken },
      include: {
        member: true,
      },
    });

    if (!share) {
      return { hasAccess: false, reason: '分享内容不存在' };
    }

    // 检查分享状态
    if (share.status !== 'ACTIVE') {
      return { hasAccess: false, reason: '分享已失效' };
    }

    // 检查是否过期
    if (share.expiresAt && share.expiresAt < new Date()) {
      return { hasAccess: false, reason: '分享已过期' };
    }

    // 获取发布者隐私设置
    const privacySettings = await getUserPrivacySettings(share.memberId);
    if (!privacySettings) {
      return { hasAccess: false, reason: '无法获取隐私设置' };
    }

    // 检查是否被屏蔽
    if (viewerId && privacySettings.blockedUsers.includes(viewerId)) {
      return { hasAccess: false, reason: '您已被屏蔽' };
    }

    // 根据隐私级别检查访问权限
    switch (share.privacyLevel) {
    case 'PUBLIC':
      // 公开分享，所有人可访问
      if (!privacySettings.allowStrangerView && !viewerId) {
        return { hasAccess: false, reason: '不允许陌生人访问' };
      }
      break;

    case 'FRIENDS':
      // 好友可见
      if (!viewerId) {
        return { hasAccess: false, reason: '需要登录才能查看' };
      }
        
      // 检查是否为好友（这里需要根据实际的好友关系来判断）
      const isFriend = await checkFriendship(share.memberId, viewerId);
      if (!isFriend && !privacySettings.trustedFriends.includes(viewerId)) {
        return { hasAccess: false, reason: '仅好友可见' };
      }
      break;

    case 'PRIVATE':
      // 私密分享，只有特定用户可访问
      if (!viewerId) {
        return { hasAccess: false, reason: '需要授权才能查看' };
      }
        
      // 检查是否在允许列表中
      const privacyRule = await getSharePrivacyRule(share.id);
      if (privacyRule && !privacyRule.allowedUsers.includes(viewerId)) {
        return { hasAccess: false, reason: '无权访问此分享' };
      }
      break;
    }

    return { 
      hasAccess: true, 
      privacyLevel: share.privacyLevel, 
    };
  } catch (error) {
    console.error('检查分享访问权限失败:', error);
    return { hasAccess: false, reason: '系统错误' };
  }
}

/**
 * 检查两个用户是否为好友
 */
async function checkFriendship(memberId1: string, memberId2: string): Promise<boolean> {
  try {
    // 这里需要根据实际的好友关系表来实现
    // 暂时返回false，表示不是好友
    return false;
  } catch (error) {
    console.error('检查好友关系失败:', error);
    return false;
  }
}

/**
 * 获取分享隐私规则
 */
async function getSharePrivacyRule(shareId: string): Promise<SharePrivacyRule | null> {
  try {
    const rule = await prisma.sharePrivacyRule.findUnique({
      where: { shareId },
    });

    if (!rule) {
      return null;
    }

    return {
      id: rule.id,
      memberId: rule.memberId,
      contentType: rule.contentType,
      privacyLevel: rule.privacyLevel as SharePrivacyLevel,
      allowComment: rule.allowComment,
      allowLike: rule.allowLike,
      allowShare: rule.allowShare,
      expiresAfterDays: rule.expiresAfterDays || undefined,
      allowedUsers: JSON.parse(rule.allowedUsers || '[]'),
      blockedUsers: JSON.parse(rule.blockedUsers || '[]'),
    };
  } catch (error) {
    console.error('获取分享隐私规则失败:', error);
    return null;
  }
}

/**
 * 设置分享隐私规则
 */
export async function setSharePrivacyRule(
  shareId: string,
  rule: Omit<SharePrivacyRule, 'id' | 'memberId' | 'contentType'>
): Promise<boolean> {
  try {
    // 获取分享信息
    const share = await prisma.sharedContent.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      return false;
    }

    await prisma.sharePrivacyRule.upsert({
      where: { shareId },
      update: {
        privacyLevel: rule.privacyLevel,
        allowComment: rule.allowComment,
        allowLike: rule.allowLike,
        allowShare: rule.allowShare,
        expiresAfterDays: rule.expiresAfterDays,
        allowedUsers: JSON.stringify(rule.allowedUsers),
        blockedUsers: JSON.stringify(rule.blockedUsers),
      },
      create: {
        shareId,
        memberId: share.memberId,
        contentType: share.contentType,
        privacyLevel: rule.privacyLevel,
        allowComment: rule.allowComment,
        allowLike: rule.allowLike,
        allowShare: rule.allowShare,
        expiresAfterDays: rule.expiresAfterDays,
        allowedUsers: JSON.stringify(rule.allowedUsers),
        blockedUsers: JSON.stringify(rule.blockedUsers),
      },
    });

    // 更新分享内容的隐私级别
    await prisma.sharedContent.update({
      where: { id: shareId },
      data: {
        privacyLevel: rule.privacyLevel,
        allowComment: rule.allowComment,
        allowLike: rule.allowLike,
      },
    });

    return true;
  } catch (error) {
    console.error('设置分享隐私规则失败:', error);
    return false;
  }
}

/**
 * 屏蔽用户
 */
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
    console.error('屏蔽用户失败:', error);
    return false;
  }
}

/**
 * 取消屏蔽用户
 */
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
    console.error('取消屏蔽用户失败:', error);
    return false;
  }
}

/**
 * 添加信任好友
 */
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
    console.error('添加信任好友失败:', error);
    return false;
  }
}

/**
 * 移除信任好友
 */
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
    console.error('移除信任好友失败:', error);
    return false;
  }
}

/**
 * 批量设置分享过期时间
 */
export async function setShareExpiration(
  memberId: string,
  days: number
): Promise<boolean> {
  try {
    // 更新用户设置
    const updated = await updateUserPrivacySettings(memberId, {
      autoExpireDays: days,
    });

    if (!updated) {
      return false;
    }

    // 更新现有的公开分享
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + days);

    await prisma.sharedContent.updateMany({
      where: {
        memberId,
        privacyLevel: 'PUBLIC',
        expiresAt: null,
      },
      data: {
        expiresAt: expireDate,
      },
    });

    return true;
  } catch (error) {
    console.error('设置分享过期时间失败:', error);
    return false;
  }
}

/**
 * 清理过期分享
 */
export async function cleanupExpiredShares(): Promise<number> {
  try {
    const result = await prisma.sharedContent.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: 'ACTIVE',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  } catch (error) {
    console.error('清理过期分享失败:', error);
    return 0;
  }
}

/**
 * 获取用户分享统计
 */
export async function getSharePrivacyStats(memberId: string): Promise<{
  totalShares: number;
  publicShares: number;
  friendsShares: number;
  privateShares: number;
  expiredShares: number;
}> {
  try {
    const stats = await prisma.sharedContent.groupBy({
      by: ['privacyLevel', 'status'],
      where: { memberId },
      _count: true,
    });

    const result = {
      totalShares: 0,
      publicShares: 0,
      friendsShares: 0,
      privateShares: 0,
      expiredShares: 0,
    };

    stats.forEach(stat => {
      const count = stat._count;
      result.totalShares += count;

      if (stat.privacyLevel === 'PUBLIC') result.publicShares += count;
      if (stat.privacyLevel === 'FRIENDS') result.friendsShares += count;
      if (stat.privacyLevel === 'PRIVATE') result.privateShares += count;
      if (stat.status === 'EXPIRED') result.expiredShares += count;
    });

    return result;
  } catch (error) {
    console.error('获取分享隐私统计失败:', error);
    return {
      totalShares: 0,
      publicShares: 0,
      friendsShares: 0,
      privateShares: 0,
      expiredShares: 0,
    };
  }
}
