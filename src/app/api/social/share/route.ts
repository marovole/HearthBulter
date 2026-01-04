/**
 * 社交分享API - 创建分享
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { shareContentGenerator } from '@/lib/services/social/share-generator';
import { shareTrackingService } from '@/lib/services/social/share-tracking';
import { achievementSystem } from '@/lib/services/social/achievement-system';
import type { ShareContentInput } from '@/types/social-sharing';
import { SocialPlatform } from '@/types/social-sharing';
import { ShareContentType } from '@prisma/client';
import { generateSecureShareToken } from '@/lib/security/token-generator';
import {
  validateBody,
  validationErrorResponse,
} from '@/lib/validation/api-validator';

/**
 * POST /api/social/share - 创建分享
 *
 * Migrated from Prisma to Supabase (partial - services still use Prisma)
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const validation = await validateBody(request, shareInputSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    const validatedData = validation.data;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';

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
        { status: 403 },
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
        { status: 403 },
      );
    }

    // 生成分享内容（使用签名 Token）
    const provisionalRecord = await supabase
      .from('shared_contents')
      .insert({
        memberId: validatedData.memberId,
        contentType: validatedData.type,
        privacyLevel: validatedData.privacyLevel,
        targetId: validatedData.targetId,
        sharedPlatforms: JSON.stringify(validatedData.platforms),
        shareToken: 'pending',
        shareUrl: 'pending',
      })
      .select()
      .single();

    if (provisionalRecord.error || !provisionalRecord.data) {
      throw new Error('创建分享记录失败');
    }

    const shareToken = await generateSecureShareToken(
      provisionalRecord.data.id,
      'social_share',
      session.user.id,
      7,
      ['read'],
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

    // 保存到数据库（使用Supabase）
    const { data: savedContent, error: createError } = await supabase
      .from('shared_contents')
      .update({
        title: shareResult.content.title,
        description: shareResult.content.description,
        imageUrl: shareResult.imageUrl,
        shareToken,
        shareUrl,
        metadata: shareResult.content.metadata
          ? JSON.stringify(shareResult.content.metadata)
          : null,
      })
      .eq('id', provisionalRecord.data.id)
      .select()
      .single();

    if (createError || !savedContent) {
      throw new Error('创建分享失败');
    }

    // 检查是否有成就解锁
    await checkForShareAchievements(
      validatedData.memberId,
      validatedData.platforms.length,
    );

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
        shareUrl,
        imageUrl: shareResult.imageUrl,
        platforms: validatedData.platforms,
      },
      message: '分享创建成功',
    });
  } catch (error) {
    console.error('创建分享失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 },
    );
  }
}

/**
 * 验证分享输入数据
 */
const shareInputSchema = z.object({
  memberId: z.string().min(1),
  type: z.nativeEnum(ShareContentType),
  title: z.string().optional().default(''),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  targetId: z.string().optional(),
  privacyLevel: z.string().min(1),
  platforms: z.array(z.nativeEnum(SocialPlatform)).min(1),
  customMessage: z.string().optional(),
}) as z.ZodSchema<ShareContentInput>;

/**
 * 检查分享相关成就
 * Migrated from Prisma to Supabase
 */
async function checkForShareAchievements(
  memberId: string,
  shareCount: number,
): Promise<void> {
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
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
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
          { status: 403 },
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
          { status: 403 },
        );
      }
    }

    // 构建查询
    let query = supabase
      .from('shared_contents')
      .select(
        `
        *,
        member:family_members!inner(
          id,
          name,
          avatar
        )
      `,
        { count: 'exact' },
      )
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
      return NextResponse.json({ error: '获取分享列表失败' }, { status: 500 });
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
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
