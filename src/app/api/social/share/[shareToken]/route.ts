/**
 * 社交分享API - 分享详情和追踪
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { shareTrackingService, ShareTrackingEvent } from '@/lib/services/social/share-tracking'

/**
 * 获取分享详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    const { shareToken } = params

    // 查找分享内容
    const shareContent = await prisma.sharedContent.findUnique({
      where: { shareToken },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    if (!shareContent) {
      return NextResponse.json(
        { error: '分享内容不存在' },
        { status: 404 }
      )
    }

    // 检查是否过期
    if (shareContent.expiresAt && shareContent.expiresAt < new Date()) {
      return NextResponse.json(
        { error: '分享链接已过期' },
        { status: 410 }
      )
    }

    // 获取请求信息用于追踪
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = getClientIP(request)
    const referrer = request.headers.get('referer') || undefined

    // 记录浏览事件
    try {
      await shareTrackingService.trackShareEvent({
        shareToken,
        eventType: 'VIEW',
        userAgent,
        ipAddress,
        referrer,
        metadata: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('记录浏览事件失败:', error)
      // 不影响主要功能
    }

    // 返回分享内容（根据隐私级别过滤）
    const publicContent = filterPublicContent(shareContent)

    return NextResponse.json({
      success: true,
      data: {
        shareContent: publicContent,
        metadata: {
          viewCount: shareContent.viewCount,
          likeCount: shareContent.likeCount,
          commentCount: shareContent.commentCount,
          shareCount: shareContent.shareCount
        }
      }
    })

  } catch (error) {
    console.error('获取分享详情失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * 追踪分享事件
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    const { shareToken } = params
    const body = await request.json()
    
    const { eventType, platform, metadata } = body

    // 验证事件类型
    const validEventTypes = ['CLICK', 'LIKE', 'COMMENT', 'DOWNLOAD', 'SHARE']
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: '无效的事件类型' },
        { status: 400 }
      )
    }

    // 获取请求信息
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress = getClientIP(request)
    const referrer = request.headers.get('referer') || undefined

    // 记录追踪事件
    const tracking = await shareTrackingService.trackShareEvent({
      shareToken,
      eventType: eventType as any,
      platform,
      userAgent,
      ipAddress,
      referrer,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    })

    // 根据事件类型执行特定操作
    if (eventType === 'LIKE') {
      await handleLikeEvent(shareToken)
    } else if (eventType === 'COMMENT') {
      await handleCommentEvent(shareToken, metadata)
    } else if (eventType === 'DOWNLOAD') {
      await handleDownloadEvent(shareToken)
    }

    return NextResponse.json({
      success: true,
      data: {
        tracking,
        message: '事件记录成功'
      }
    })

  } catch (error) {
    console.error('记录分享事件失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * 更新分享内容
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    const { shareToken } = params
    const body = await request.json()
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 验证用户权限
    const shareContent = await prisma.sharedContent.findUnique({
      where: { shareToken },
      include: {
        member: {
          select: {
            user: {
              select: { id: true }
            }
          }
        }
      }
    })

    if (!shareContent) {
      return NextResponse.json(
        { error: '分享内容不存在' },
        { status: 404 }
      )
    }

    if (shareContent.member.user.id !== session.user.id) {
      return NextResponse.json(
        { error: '无权限修改此分享内容' },
        { status: 403 }
      )
    }

    // 允许更新的字段
    const allowedUpdates = [
      'title', 'description', 'privacyLevel', 'allowComment', 'allowLike'
    ]

    const updateData: any = {}
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // 更新分享内容
    const updatedContent = await prisma.sharedContent.update({
      where: { shareToken },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: {
        shareContent: updatedContent
      },
      message: '分享内容更新成功'
    })

  } catch (error) {
    console.error('更新分享内容失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * 删除分享内容
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    const { shareToken } = params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 验证用户权限
    const shareContent = await prisma.sharedContent.findUnique({
      where: { shareToken },
      include: {
        member: {
          select: {
            user: {
              select: { id: true }
            }
          }
        }
      }
    })

    if (!shareContent) {
      return NextResponse.json(
        { error: '分享内容不存在' },
        { status: 404 }
      )
    }

    if (shareContent.member.user.id !== session.user.id) {
      return NextResponse.json(
        { error: '无权限删除此分享内容' },
        { status: 403 }
      )
    }

    // 软删除分享内容
    await prisma.sharedContent.update({
      where: { shareToken },
      data: {
        status: 'DELETED',
        deletedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: '分享内容删除成功'
    })

  } catch (error) {
    console.error('删除分享内容失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * 过滤公开内容
 */
function filterPublicContent(shareContent: any): any {
  const filtered = {
    ...shareContent
  }

  // 根据隐私级别过滤信息
  switch (shareContent.privacyLevel) {
    case 'PUBLIC':
      // 公开分享，显示所有信息
      break
    
    case 'FRIENDS':
      // 好友可见，这里简化处理，实际应该验证好友关系
      delete filtered.member?.contactInfo
      break
    
    case 'PRIVATE':
      // 私密分享，只显示基本信息
      filtered.member = {
        id: filtered.member?.id,
        name: '匿名用户',
        avatar: '/images/default-avatar.png'
      }
      break
    
    default:
      break
  }

  return filtered
}

/**
 * 获取客户端IP
 */
function getClientIP(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real
  }
  
  return undefined
}

/**
 * 处理点赞事件
 */
async function handleLikeEvent(shareToken: string): Promise<void> {
  await prisma.sharedContent.update({
    where: { shareToken },
    data: {
      likeCount: {
        increment: 1
      }
    }
  })
}

/**
 * 处理评论事件
 */
async function handleCommentEvent(shareToken: string, metadata?: any): Promise<void> {
  await prisma.sharedContent.update({
    where: { shareToken },
    data: {
      commentCount: {
        increment: 1
      }
    }
  })

  // 这里可以保存评论内容到评论表
  if (metadata?.comment) {
    console.log(`分享 ${shareToken} 收到评论: ${metadata.comment}`)
  }
}

/**
 * 处理下载事件
 */
async function handleDownloadEvent(shareToken: string): Promise<void> {
  await prisma.sharedContent.update({
    where: { shareToken },
    data: {
      downloadCount: {
        increment: 1
      }
    }
  })
}

