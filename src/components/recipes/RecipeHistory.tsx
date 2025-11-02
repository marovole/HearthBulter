'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Eye, Calendar, Filter } from 'lucide-react';
import { RecipeCard } from './RecipeCard';

interface Recipe {
  id: string;
  name: string;
  description?: string;
  totalTime: number;
  estimatedCost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  difficulty: string;
  cuisine: string;
  category: string;
  averageRating: number;
  ratingCount: number;
  viewCount: number;
  tags: string[];
  imageUrl?: string;
}

interface ViewRecord {
  id: string;
  viewedAt: Date;
  viewDuration?: number;
  source?: string;
  recipe: Recipe;
}

interface RecipeHistoryProps {
  memberId: string;
  limit?: number;
  showFilters?: boolean;
}

export function RecipeHistory({
  memberId,
  limit = 50,
  showFilters = true,
}: RecipeHistoryProps) {
  const [views, setViews] = useState<ViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState('viewedAt');

  const loadHistory = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setViews([]);
      }

      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        memberId,
        page: currentPage.toString(),
        limit: limit.toString(),
        days: days.toString(),
      });

      const response = await fetch(`/api/recipes/history?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load recipe history');
      }

      const newViews = data.views || [];
      setViews(prev => reset ? newViews : [...prev, ...newViews]);
      setHasMore(newViews.length === limit);

      if (!reset) {
        setPage(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(true);
  }, [memberId, days, sortBy]);

  const handleDaysChange = (newDays: string) => {
    setDays(parseInt(newDays));
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    return `${Math.floor(diffDays / 30)}个月前`;
  };

  const groupByDate = (views: ViewRecord[]) => {
    const groups: { [key: string]: ViewRecord[] } = {};

    views.forEach(view => {
      const dateKey = new Date(view.viewedAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(view);
    });

    return groups;
  };

  const groupedViews = groupByDate(views);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">浏览历史</h2>
          <p className="text-muted-foreground">您最近查看过的食谱</p>
        </div>

        {showFilters && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={days.toString()} onValueChange={handleDaysChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">最近7天</SelectItem>
                  <SelectItem value="30">最近30天</SelectItem>
                  <SelectItem value="90">最近90天</SelectItem>
                  <SelectItem value="365">最近一年</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {loading && views.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">正在加载浏览历史...</p>
          </div>
        </div>
      )}

      {error && (
        <Card className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => loadHistory(true)} variant="outline">
              重新加载
            </Button>
          </div>
        </Card>
      )}

      {!loading && !error && views.length === 0 && (
        <Card className="p-6">
          <div className="text-center">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              您还没有浏览过任何食谱，开始探索吧！
            </p>
            <Button>浏览食谱</Button>
          </div>
        </Card>
      )}

      {Object.entries(groupedViews).map(([dateKey, dateViews]) => (
        <div key={dateKey} className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">
              {formatDate(new Date(dateKey))}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {dateViews.length} 个食谱
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dateViews.map((view) => (
              <Card key={view.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-1">
                        {view.recipe.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-1">
                        {formatDate(view.viewedAt)} {new Date(view.viewedAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{view.recipe.totalTime}分钟</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{view.viewDuration ? `${view.viewDuration}秒` : '未记录'}</span>
                    </div>
                  </div>

                  {view.source && (
                    <Badge variant="outline" className="text-xs mb-3">
                      来自 {view.source}
                    </Badge>
                  )}

                  <Button size="sm" className="w-full">
                    再次查看
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {hasMore && !loading && (
        <div className="text-center">
          <Button
            onClick={() => loadHistory()}
            variant="outline"
          >
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}
