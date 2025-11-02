'use client';

import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Download, 
  MessageCircle, 
  Heart,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShareContentType } from '@prisma/client';

interface ShareButtonProps {
  contentType: ShareContentType;
  contentId: string;
  title?: string;
  description?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onShare?: (shareData: any) => void;
}

export function ShareButton({
  contentType,
  contentId,
  title,
  description,
  className,
  variant = 'outline',
  size = 'default',
  onShare,
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 创建分享
  const handleCreateShare = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    try {
      const response = await fetch('/api/social/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType,
          contentId,
          title,
          description,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setShareData(result.data);
        setIsDialogOpen(true);
        onShare?.(result.data);
        toast.success('分享创建成功');
      } else {
        toast.error(result.error || '创建分享失败');
      }
    } catch (error) {
      console.error('创建分享失败:', error);
      toast.error('创建分享失败');
    } finally {
      setIsSharing(false);
    }
  };

  // 复制链接
  const handleCopyLink = async () => {
    if (!shareData?.shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      toast.success('链接已复制到剪贴板');
      
      // 记录分享统计
      fetch(`/api/social/share/${shareData.shareToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share' }),
      });
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 下载图片
  const handleDownloadImage = async () => {
    if (!shareData?.imageUrl) return;
    
    try {
      // 如果是base64图片
      if (shareData.imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = shareData.imageUrl;
        link.download = `share-${contentType}-${Date.now()}.png`;
        link.click();
      } else {
        // 如果是URL，需要先下载
        const response = await fetch(shareData.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `share-${contentType}-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
      toast.success('图片下载成功');
    } catch (error) {
      toast.error('下载失败');
    }
  };

  // 分享到微信
  const handleShareToWechat = () => {
    if (!shareData?.shareUrl) return;
    
    // 微信分享通常需要生成二维码
    toast.info('请使用微信扫描二维码分享');
    
    // 这里可以显示二维码弹窗
  };

  // 分享到微博
  const handleShareToWeibo = () => {
    if (!shareData?.shareUrl || !shareData?.title) return;
    
    const text = `${shareData.title} ${shareData.description || ''}`;
    const url = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareData.shareUrl)}&title=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    
    // 记录分享统计
    fetch(`/api/social/share/${shareData.shareToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'share' }),
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleCreateShare}
            disabled={isSharing}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {isSharing ? '生成中...' : '分享'}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            复制链接
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleDownloadImage}>
            <Download className="h-4 w-4 mr-2" />
            下载图片
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleShareToWechat}>
            <MessageCircle className="h-4 w-4 mr-2" />
            分享到微信
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleShareToWeibo}>
            <Heart className="h-4 w-4 mr-2" />
            分享到微博
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享内容</DialogTitle>
        </DialogHeader>
        
        {shareData && (
          <div className="space-y-4">
            {/* 分享图片预览 */}
            {shareData.imageUrl && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={shareData.imageUrl}
                  alt="分享图片"
                  className="w-full h-auto"
                />
              </div>
            )}
            
            {/* 分享信息 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{shareData.title}</h3>
              <p className="text-sm text-muted-foreground">
                {shareData.description}
              </p>
            </div>
            
            {/* 分享链接 */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">分享链接</p>
              <p className="text-sm font-mono break-all">
                {shareData.shareUrl}
              </p>
            </div>
            
            {/* 操作按钮 */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                复制链接
              </Button>
              
              <Button
                variant="outline"
                onClick={handleDownloadImage}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                下载图片
              </Button>
            </div>
            
            {/* 社交媒体分享 */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">分享到</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleShareToWechat}
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  微信
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleShareToWeibo}
                  className="w-full"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  微博
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
