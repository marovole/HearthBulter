'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Calendar,
  Trophy,
  Target,
  Utensils,
  TrendingUp,
} from 'lucide-react';
import { ShareContentType, SharePrivacyLevel } from '@prisma/client';

interface ShareCardProps {
  share: {
    id: string;
    contentType: ShareContentType;
    title: string;
    description: string;
    imageUrl?: string;
    shareUrl: string;
    shareToken: string;
    privacyLevel: SharePrivacyLevel;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    expiresAt?: string;
    createdAt: string;
    member: {
      id: string;
      name: string;
      avatar?: string;
    };
    metadata?: any;
  };
  showActions?: boolean;
  className?: string;
  onView?: (share: any) => void;
  onLike?: (share: any) => void;
  onComment?: (share: any) => void;
  onShare?: (share: any) => void;
}

export function ShareCard({
  share,
  showActions = true,
  className,
  onView,
  onLike,
  onComment,
  onShare,
}: ShareCardProps) {
  // 获取内容类型图标
  const getContentIcon = (type: ShareContentType) => {
    switch (type) {
      case 'HEALTH_REPORT':
        return <TrendingUp className='h-4 w-4' />;
      case 'GOAL_ACHIEVEMENT':
        return <Target className='h-4 w-4' />;
      case 'MEAL_LOG':
        return <Utensils className='h-4 w-4' />;
      case 'ACHIEVEMENT':
        return <Trophy className='h-4 w-4' />;
      case 'CHECK_IN_STREAK':
        return <Calendar className='h-4 w-4' />;
      case 'WEIGHT_MILESTONE':
        return <TrendingUp className='h-4 w-4' />;
      default:
        return <Share2 className='h-4 w-4' />;
    }
  };

  // 获取内容类型标签
  const getContentTypeLabel = (type: ShareContentType) => {
    const labels = {
      HEALTH_REPORT: '健康报告',
      GOAL_ACHIEVEMENT: '目标达成',
      MEAL_LOG: '餐饮打卡',
      ACHIEVEMENT: '成就徽章',
      CHECK_IN_STREAK: '连续打卡',
      WEIGHT_MILESTONE: '体重里程碑',
      RECIPE: '食谱分享',
    };
    return labels[type] || '分享';
  };

  // 获取隐私级别标签
  const getPrivacyLabel = (level: SharePrivacyLevel) => {
    const labels = {
      PUBLIC: '公开',
      FRIENDS: '好友可见',
      PRIVATE: '私密',
    };
    return labels[level] || '公开';
  };

  // 获取隐私级别颜色
  const getPrivacyColor = (level: SharePrivacyLevel) => {
    const colors = {
      PUBLIC: 'default',
      FRIENDS: 'secondary',
      PRIVATE: 'destructive',
    };
    return colors[level] || 'default';
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? '刚刚' : `${minutes}分钟前`;
      }
      return `${hours}小时前`;
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  // 处理查看
  const handleView = () => {
    onView?.(share);
    // 打开分享链接
    window.open(share.shareUrl, '_blank');
  };

  // 处理点赞
  const handleLike = async () => {
    onLike?.(share);
    // 这里可以调用点赞API
  };

  // 处理评论
  const handleComment = () => {
    onComment?.(share);
    // 这里可以打开评论弹窗
  };

  // 处理分享
  const handleShare = async () => {
    onShare?.(share);

    try {
      await navigator.clipboard.writeText(share.shareUrl);
      // 这里可以显示成功提示
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className='pb-3'>
        {/* 用户信息和时间 */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <Avatar className='h-10 w-10'>
              <AvatarImage src={share.member.avatar} />
              <AvatarFallback>{share.member.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-gray-900 truncate'>
                {share.member.name}
              </p>
              <p className='text-xs text-gray-500'>
                {formatDate(share.createdAt)}
              </p>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <Badge variant={getPrivacyColor(share.privacyLevel) as any}>
              {getPrivacyLabel(share.privacyLevel)}
            </Badge>

            <Badge variant='outline' className='flex items-center space-x-1'>
              {getContentIcon(share.contentType)}
              <span>{getContentTypeLabel(share.contentType)}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* 分享图片 */}
        {share.imageUrl && (
          <div
            className='rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity'
            onClick={handleView}
          >
            <img
              src={share.imageUrl}
              alt={share.title}
              className='w-full h-auto max-h-96 object-cover'
            />
          </div>
        )}

        {/* 标题和描述 */}
        <div className='space-y-2'>
          <h3
            className='font-semibold text-lg leading-tight cursor-pointer hover:text-primary transition-colors'
            onClick={handleView}
          >
            {share.title}
          </h3>

          {share.description && (
            <p className='text-sm text-gray-600 leading-relaxed'>
              {share.description}
            </p>
          )}
        </div>

        {/* 元数据 */}
        {share.metadata && (
          <div className='flex flex-wrap gap-2'>
            {Object.entries(share.metadata).map(([key, value]) => {
              if (typeof value === 'number') {
                return (
                  <Badge key={key} variant='secondary' className='text-xs'>
                    {key}: {value}
                  </Badge>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* 统计信息 */}
        <div className='flex items-center justify-between text-xs text-gray-500'>
          <div className='flex items-center space-x-4'>
            <span className='flex items-center space-x-1'>
              <Eye className='h-3 w-3' />
              <span>{share.viewCount}</span>
            </span>

            <span className='flex items-center space-x-1'>
              <Heart className='h-3 w-3' />
              <span>{share.likeCount}</span>
            </span>

            <span className='flex items-center space-x-1'>
              <MessageCircle className='h-3 w-3' />
              <span>{share.commentCount}</span>
            </span>

            <span className='flex items-center space-x-1'>
              <Share2 className='h-3 w-3' />
              <span>{share.shareCount}</span>
            </span>
          </div>

          {share.expiresAt && (
            <span>过期时间: {formatDate(share.expiresAt)}</span>
          )}
        </div>

        {/* 操作按钮 */}
        {showActions && (
          <div className='flex items-center space-x-2 pt-2 border-t'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleLike}
              className='flex-1'
            >
              <Heart className='h-4 w-4 mr-2' />
              点赞
            </Button>

            <Button
              variant='ghost'
              size='sm'
              onClick={handleComment}
              className='flex-1'
            >
              <MessageCircle className='h-4 w-4 mr-2' />
              评论
            </Button>

            <Button
              variant='ghost'
              size='sm'
              onClick={handleShare}
              className='flex-1'
            >
              <Share2 className='h-4 w-4 mr-2' />
              分享
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
