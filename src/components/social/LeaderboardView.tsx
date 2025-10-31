'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  Medal, 
  Award,
  TrendingUp,
  Target,
  Calendar,
  Activity,
  ChevronUp,
  ChevronDown,
  Minus,
  Crown,
  Star,
  Zap
} from 'lucide-react';
import { LeaderboardType, LeaderboardPeriod } from '@prisma/client';
import { toast } from 'sonner';

interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  rankChange?: number;
  score: number;
  member: {
    id: string;
    name: string;
    avatar?: string;
  };
  isAnonymous: boolean;
  metadata?: any;
}

interface LeaderboardData {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  periodStart: string;
  periodEnd: string;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  userRank?: LeaderboardEntry;
  lastUpdated: string;
}

interface LeaderboardViewProps {
  className?: string;
  showUserRank?: boolean;
  limit?: number;
}

export function LeaderboardView({
  className,
  showUserRank = true,
  limit = 50
}: LeaderboardViewProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<LeaderboardType>('HEALTH_SCORE');
  const [activePeriod, setActivePeriod] = useState<LeaderboardPeriod>('WEEKLY');

  // 获取排行榜数据
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/social/leaderboard?type=${activeType}&period=${activePeriod}&limit=${limit}&includeUser=${showUserRank}`
      );
      const result = await response.json();
      
      if (result.success) {
        setLeaderboardData(result.data);
      } else {
        toast.error('获取排行榜失败');
      }
    } catch (error) {
      console.error('获取排行榜失败:', error);
      toast.error('获取排行榜失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeType, activePeriod]);

  // 获取排行榜类型标签
  const getTypeLabel = (type: LeaderboardType) => {
    const labels = {
      'HEALTH_SCORE': '健康评分',
      'CHECK_IN_STREAK': '连续打卡',
      'WEIGHT_LOSS': '减重排行',
      'EXERCISE_MINUTES': '运动时长',
      'NUTRITION_SCORE': '营养评分'
    };
    return labels[type] || '排行榜';
  };

  // 获取周期标签
  const getPeriodLabel = (period: LeaderboardPeriod) => {
    const labels = {
      'DAILY': '今日',
      'WEEKLY': '本周',
      'MONTHLY': '本月',
      'YEARLY': '今年',
      'ALL_TIME': '总榜'
    };
    return labels[period] || '周期';
  };

  // 获取排名图标
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  // 获取排名变化图标
  const getRankChangeIcon = (change?: number) => {
    if (change === undefined || change === 0) {
      return <Minus className="h-4 w-4 text-gray-400" />;
    } else if (change > 0) {
      return <ChevronUp className="h-4 w-4 text-green-600" />;
    } else {
      return <ChevronDown className="h-4 w-4 text-red-600" />;
    }
  };

  // 格式化分数
  const formatScore = (type: LeaderboardType, score: number) => {
    switch (type) {
      case 'HEALTH_SCORE':
      case 'NUTRITION_SCORE':
        return `${score.toFixed(1)}分`;
      case 'CHECK_IN_STREAK':
        return `${score}天`;
      case 'WEIGHT_LOSS':
        return `${score.toFixed(1)}kg`;
      case 'EXERCISE_MINUTES':
        return `${score}分钟`;
      default:
        return score.toString();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!leaderboardData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">暂无排行榜数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Select value={activeType} onValueChange={(value) => setActiveType(value as LeaderboardType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HEALTH_SCORE">健康评分</SelectItem>
              <SelectItem value="CHECK_IN_STREAK">连续打卡</SelectItem>
              <SelectItem value="WEIGHT_LOSS">减重排行</SelectItem>
              <SelectItem value="EXERCISE_MINUTES">运动时长</SelectItem>
              <SelectItem value="NUTRITION_SCORE">营养评分</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={activePeriod} onValueChange={(value) => setActivePeriod(value as LeaderboardPeriod)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">今日</SelectItem>
              <SelectItem value="WEEKLY">本周</SelectItem>
              <SelectItem value="MONTHLY">本月</SelectItem>
              <SelectItem value="YEARLY">今年</SelectItem>
              <SelectItem value="ALL_TIME">总榜</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          总参与人数: {leaderboardData.totalParticipants}
        </div>
      </div>

      {/* 用户排名 */}
      {showUserRank && leaderboardData.userRank && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <Star className="h-4 w-4 text-primary" />
              <span>我的排名</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getRankIcon(leaderboardData.userRank.rank)}
                  <span className="font-medium">{leaderboardData.userRank.member.name}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  {getRankChangeIcon(leaderboardData.userRank.rankChange)}
                  {leaderboardData.userRank.rankChange !== undefined && leaderboardData.userRank.rankChange !== 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.abs(leaderboardData.userRank.rankChange)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-lg font-bold text-primary">
                {formatScore(leaderboardData.type, leaderboardData.userRank.score)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 排行榜列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{getTypeLabel(leaderboardData.type)} - {getPeriodLabel(leaderboardData.period)}</span>
            <Badge variant="secondary">
              {leaderboardData.entries.length} / {leaderboardData.totalParticipants}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboardData.entries.map((entry) => (
              <div
                key={entry.member.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* 排名 */}
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  {/* 用户信息 */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.member.avatar} />
                      <AvatarFallback>
                        {entry.member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <p className="font-medium text-sm">
                        {entry.isAnonymous ? '匿名用户' : entry.member.name}
                      </p>
                      {entry.rankChange !== undefined && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          {getRankChangeIcon(entry.rankChange)}
                          <span>
                            {entry.rankChange > 0 ? `上升${entry.rankChange}` : 
                             entry.rankChange < 0 ? `下降${Math.abs(entry.rankChange)}` : 
                             '无变化'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 分数 */}
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {formatScore(leaderboardData.type, entry.score)}
                  </div>
                  {entry.metadata && (
                    <div className="text-xs text-muted-foreground">
                      {getMetadataDisplay(leaderboardData.type, entry.metadata)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {leaderboardData.entries.length === 0 && (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无排行数据</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 更新时间 */}
      <div className="text-center text-xs text-muted-foreground">
        更新时间: {new Date(leaderboardData.lastUpdated).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}

// 获取元数据显示
function getMetadataDisplay(type: LeaderboardType, metadata: any): string {
  switch (type) {
    case 'EXERCISE_MINUTES':
      return metadata.averageMinutes ? `日均${metadata.averageMinutes}分钟` : '';
    case 'NUTRITION_SCORE':
      return metadata.averageScore ? `平均${metadata.averageScore.toFixed(1)}分` : '';
    case 'WEIGHT_LOSS':
      return metadata.weightLoss ? `减重${metadata.weightLoss.toFixed(1)}kg` : '';
    default:
      return '';
  }
}
