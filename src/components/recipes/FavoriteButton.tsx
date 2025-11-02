'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FavoriteButtonProps {
  recipeId: string;
  memberId: string;
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
}

export function FavoriteButton({
  recipeId,
  memberId,
  size = 'default',
  showText = false,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkFavoriteStatus();
  }, [recipeId, memberId]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favorite?memberId=${memberId}`);
      const data = await response.json();

      if (data.success) {
        setIsFavorited(data.isFavorited);
      }
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const method = isFavorited ? 'DELETE' : 'POST';

      const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle favorite');
      }

      setIsFavorited(!isFavorited);
      toast({
        title: isFavorited ? '已取消收藏' : '已收藏',
        description: isFavorited ? '食谱已从收藏中移除' : '食谱已添加到收藏列表',
      });

    } catch (error) {
      toast({
        title: '操作失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggleFavorite}
      disabled={loading}
      variant="ghost"
      size={size}
      className={`${
        isFavorited
          ? 'text-red-600 hover:text-red-700'
          : 'text-muted-foreground hover:text-red-600'
      } transition-colors`}
    >
      <Heart
        className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''} ${
          loading ? 'animate-pulse' : ''
        }`}
      />
      {showText && (
        <span className="ml-2">
          {loading ? '处理中...' : isFavorited ? '已收藏' : '收藏'}
        </span>
      )}
    </Button>
  );
}
