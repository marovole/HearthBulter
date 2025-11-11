/**
 * 社交分享API - 创建分享
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { shareContentGenerator } from '@/lib/services/social/share-generator';
import { shareImageGenerator } from '@/lib/services/social/image-generator';
import { shareTrackingService } from '@/lib/services/social/share-tracking';
import { achievementSystem } from '@/lib/services/social/achievement-system';
import type { ShareContentInput } from '@/types/social-sharing';
import { SocialPlatform } from '@/types/social-sharing';
import { ShareContentType } from '@prisma/client';

/**
 * POST /api/social/share - 创建分享
 *
 * Migrated from Prisma to Supabase (partial - services still use Prisma)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = validateShareInput(body);

    // 检查用户权限（使用Supabase）
    const supabase = SupabaseClientManager.getInstance();

    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select('id, familyId')
      .eq('id', validatedData.memberId)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      );
    }

    // 验证用户是否属于该家庭
    const { data: userMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('familyId', (member as any).familyId)
      .eq('userId', session.user.id)
      .maybeSingle();

    if (!userMember) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      );
    }

    // 生成分享内容
    const shareResult = await shareContentGenerator.generateShareContent(validatedData);

    // 保存到数据库（使用Supabase）
    const { data: savedContent, error: createError } = await supabase
      .from('shared_contents')
      .insert({
        memberId: validatedData.memberId,
        contentType: validatedData.type,
        title: shareResult.content.title,
        description: shareResult.content.description,
        imageUrl: shareResult.imageUrl,
        targetId: validatedData.targetId,
        privacyLevel: validatedData.privacyLevel,
        shareToken: shareResult.shareUrl.split('/').pop()!,
        shareUrl: shareResult.shareUrl,
        sharedPlatforms: JSON.stringify(validatedData.platforms),
        metadata: shareResult.content.metadata ? JSON.stringify(shareResult.content.metadata) : null,
      })
      .select()
      .single();

    if (createError || !savedContent) {
      throw new Error('创建分享失败');
    }

    // 检查是否有成就解锁
    await checkForShareAchievements(validatedData.memberId, validatedData.platforms.length);

    // 记录分享事件
    for (const platform of validatedData.platforms) {
      await shareTrackingService.trackShareEvent({
        shareToken: savedContent.shareToken,
        eventType: 'SHARE',
        platform,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        shareContent: savedContent,
        shareUrl: shareResult.shareUrl,
        imageUrl: shareResult.imageUrl,
        platforms: validatedData.platforms,
      },
      message: '分享创建成功',
    });

  } catch (error) {
    console.error('创建分享失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 验证分享输入数据
 */
function validateShareInput(data: any): ShareContentInput {
  const { memberId, type, title, description, imageUrl, targetId, privacyLevel, platforms, customMessage } = data;

  if (!memberId || !type || !privacyLevel || !platforms || !Array.isArray(platforms)) {
    throw new Error('缺少必要参数');
  }

  const validTypes = Object.values(ShareContentType);
  if (!validTypes.includes(type)) {
    throw new Error('无效的分享类型');
  }

  const validPlatforms = Object.values(SocialPlatform);
  const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
  if (invalidPlatforms.length > 0) {
    throw new Error(`不支持的平台: ${invalidPlatforms.join(', ')}`);
  }

  return {
    memberId,
    type,
    title: title || '',
    description,
    imageUrl,
    targetId,
    privacyLevel,
    platforms,
    customMessage,
  };
}

/**
 * 检查分享相关成就
 * Migrated from Prisma to Supabase
 */
async function checkForShareAchievements(memberId: string, shareCount: number): Promise<void> {
  try {
    const supabase = SupabaseClientManager.getInstance();

    // 检查社交达人成就
    const { count: totalShares } = await supabase
      .from('shared_contents')
      .select('*', { count: 'exact', head: true })
      .eq('memberId', memberId);

    if (totalShares && totalShares >= 20) {
      await achievementSystem.checkAchievements(memberId, 'SHARE_CREATED', {
        shareCount: totalShares,
      });
    }
  } catch (error) {
    console.error('检查分享成就失败:', error);
  }
}

/**
 * GET /api/social/share - 获取分享列表
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const supabase = SupabaseClientManager.getInstance();

    if (memberId) {
      // 验证用户权限
      const { data: member } = await supabase
        .from('family_members')
        .select('id, familyId')
        .eq('id', memberId)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }

      // 验证用户是否属于该家庭
      const { data: userMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('familyId', (member as any).familyId)
        .eq('userId', session.user.id)
        .maybeSingle();

      if (!userMember) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }
    }

    // 构建查询
    let query = supabase
      .from('shared_contents')
      .select(`
        *,
        member:family_members!inner(
          id,
          name,
          avatar
        )
      `, { count: 'exact' })
      .eq('status', 'ACTIVE')
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (memberId) {
      query = query.eq('memberId', memberId);
    }

    if (type) {
      query = query.eq('contentType', type);
    }

    const { data: contents, error, count: total } = await query;

    if (error) {
      console.error('查询分享列表失败:', error);
      return NextResponse.json(
        { error: '获取分享列表失败' },
        { status: 500 }
      );
    }

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
    console.error('获取分享列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
