'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecipeRating {
  rating: number;
  comment?: string;
  tags: string[];
}

interface RecipeRatingWidgetProps {
  recipeId: string;
  memberId: string;
  currentRating: number;
  ratingCount: number;
}

const QUICK_TAGS = [
  '好吃',
  '简单',
  '耗时',
  '难做',
  '太咸',
  '太淡',
  '太辣',
  '营养丰富',
  '适合减肥',
  '适合增肌',
  '适合老年人',
  '适合小孩',
  '创意十足',
  '传统经典',
];

export function RecipeRatingWidget({
  recipeId,
  memberId,
  currentRating,
  ratingCount,
}: RecipeRatingWidgetProps) {
  const [userRating, setUserRating] = useState<RecipeRating | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUserRating();
  }, [recipeId, memberId]);

  const loadUserRating = async () => {
    try {
      const response = await fetch(
        `/api/recipes/${recipeId}/rate?memberId=${memberId}`,
      );
      const data = await response.json();

      if (data.success && data.rating) {
        setUserRating(data.rating);
        setRating(data.rating.rating);
        setComment(data.rating.comment || '');
        setSelectedTags(data.rating.tags || []);
      }
    } catch (error) {
      console.error('Failed to load user rating:', error);
    }
  };

  const handleRating = async (newRating: number) => {
    if (loading) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/recipes/${recipeId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          rating: newRating,
          comment,
          tags: selectedTags,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to rate recipe');
      }

      setUserRating(data.rating);
      setRating(newRating);
      toast({
        title: '评分成功',
        description: '感谢您的评价！',
      });

      if (!showForm) {
        setShowForm(true);
      }
    } catch (error) {
      toast({
        title: '评分失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast({
        title: '请先选择评分',
        variant: 'destructive',
      });
      return;
    }

    await handleRating(rating);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <div className='space-y-3'>
      {/* 评分统计 */}
      <div className='flex items-center gap-2 text-sm'>
        <div className='flex items-center gap-1'>
          <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
          <span className='font-medium'>{currentRating.toFixed(1)}</span>
        </div>
        <span className='text-muted-foreground'>({ratingCount}人评价)</span>
      </div>

      {/* 用户评分 */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium'>您的评分：</span>
          <div className='flex gap-1'>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                disabled={loading}
                className='focus:outline-none'
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-400'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
        </div>

        {userRating && (
          <div className='text-xs text-muted-foreground'>
            您已评分 {userRating.rating} 星{userRating.comment && ' • 已写评价'}
          </div>
        )}
      </div>

      {/* 评分表单 */}
      {showForm && (
        <div className='space-y-3 p-3 border rounded-lg bg-muted/50'>
          <div>
            <label className='text-sm font-medium block mb-2'>快速标签</label>
            <div className='flex flex-wrap gap-1'>
              {QUICK_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className='cursor-pointer text-xs'
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className='text-sm font-medium block mb-2'>评价内容</label>
            <Textarea
              placeholder='分享您的制作体验和建议...'
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className='flex gap-2'>
            <Button
              onClick={handleSubmitRating}
              disabled={loading || rating === 0}
              size='sm'
            >
              {loading ? '提交中...' : '提交评价'}
            </Button>
            <Button
              onClick={() => setShowForm(false)}
              variant='outline'
              size='sm'
            >
              收起
            </Button>
          </div>
        </div>
      )}

      {/* 展开按钮 */}
      {!showForm && !userRating && (
        <Button
          onClick={() => setShowForm(true)}
          variant='outline'
          size='sm'
          className='w-full'
        >
          <MessageSquare className='h-4 w-4 mr-2' />
          写评价
        </Button>
      )}
    </div>
  );
}
