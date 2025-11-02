'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Star, 
  Lock, 
  Unlock,
  Share2,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Medal,
} from 'lucide-react';
import { AchievementType, AchievementRarity } from '@prisma/client';
import { ShareButton } from './ShareButton';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  iconUrl?: string;
  imageUrl?: string;
  rarity: AchievementRarity;
  level: number;
  points: number;
  targetValue: number;
  currentValue: number;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  isShared: boolean;
  sharedAt?: string;
  rewardType?: string;
  rewardValue?: string;
  rewardClaimed: boolean;
  createdAt: string;
}

interface AchievementGalleryProps {
  memberId?: string;
  className?: string;
  showShareButton?: boolean;
  onAchievementUnlock?: (achievement: Achievement) => void;
}

export function AchievementGallery({
  memberId,
  className,
  showShareButton = true,
  onAchievementUnlock,
}: AchievementGalleryProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // 获取成就列表
  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/social/achievements?progress=true');
      const result = await response.json();
      
      if (result.success) {
        setAchievements(result.data.achievements);
      } else {
        toast.error('获取成就列表失败');
      }
    } catch (error) {
      console.error('获取成就列表失败:', error);
      toast.error('获取成就列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  // 获取稀有度颜色
  const getRarityColor = (rarity: AchievementRarity) => {
    const colors = {
      'BRONZE': 'bg-orange-100 text-orange-800 border-orange-200',
      'SILVER': 'bg-gray-100 text-gray-800 border-gray-200',
      'GOLD': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'PLATINUM': 'bg-purple-100 text-purple-800 border-purple-200',
      'DIAMOND': 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[rarity] || colors.BRONZE;
  };

  // 获取稀有度图标
  const getRarityIcon = (rarity: AchievementRarity) => {
    switch (rarity) {
    case 'BRONZE':
      return <Medal className="h-4 w-4" />;
    case 'SILVER':
      return <Award className="h-4 w-4" />;
    case 'GOLD':
      return <Trophy className="h-4 w-4" />;
    case 'PLATINUM':
      return <Star className="h-4 w-4" />;
    case 'DIAMOND':
      return <Star className="h-4 w-4" />;
    default:
      return <Medal className="h-4 w-4" />;
    }
  };

  // 获取稀有度标签
  const getRarityLabel = (rarity: AchievementRarity) => {
    const labels = {
      'BRONZE': '青铜',
      'SILVER': '白银',
      'GOLD': '黄金',
      'PLATINUM': '白金',
      'DIAMOND': '钻石',
    };
    return labels[rarity] || '青铜';
  };

  // 获取类型图标
  const getTypeIcon = (type: AchievementType) => {
    switch (type) {
    case 'CHECK_IN_STREAK':
      return <Calendar className="h-6 w-6" />;
    case 'WEIGHT_LOSS':
      return <TrendingUp className="h-6 w-6" />;
    case 'NUTRITION_GOAL':
      return <Target className="h-6 w-6" />;
    case 'EXERCISE_TARGET':
      return <TrendingUp className="h-6 w-6" />;
    case 'HEALTH_MILESTONE':
      return <Trophy className="h-6 w-6" />;
    case 'COMMUNITY_CONTRIBUTION':
      return <Star className="h-6 w-6" />;
    default:
      return <Award className="h-6 w-6" />;
    }
  };

  // 过滤成就
  const filteredAchievements = achievements.filter(achievement => {
    switch (activeTab) {
    case 'unlocked':
      return achievement.isUnlocked;
    case 'locked':
      return !achievement.isUnlocked;
    case 'shared':
      return achievement.isShared;
    default:
      return true;
    }
  });

  // 分组成就
  const groupedAchievements = filteredAchievements.reduce((groups, achievement) => {
    const type = achievement.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(achievement);
    return groups;
  }, {} as Record<AchievementType, Achievement[]>);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {achievements.filter(a => a.isUnlocked).length}
            </div>
            <div className="text-sm text-muted-foreground">已解锁</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {achievements.filter(a => !a.isUnlocked).length}
            </div>
            <div className="text-sm text-muted-foreground">进行中</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {achievements.reduce((sum, a) => sum + (a.isUnlocked ? a.points : 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">总积分</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {achievements.filter(a => a.isShared).length}
            </div>
            <div className="text-sm text-muted-foreground">已分享</div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="unlocked">已解锁</TabsTrigger>
          <TabsTrigger value="locked">进行中</TabsTrigger>
          <TabsTrigger value="shared">已分享</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {Object.entries(groupedAchievements).map(([type, typeAchievements]) => (
            <div key={type} className="space-y-4">
              <div className="flex items-center space-x-2">
                {getTypeIcon(type as AchievementType)}
                <h3 className="text-lg font-semibold">
                  {getTypeLabel(type as AchievementType)}
                </h3>
                <Badge variant="secondary">
                  {typeAchievements.length}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeAchievements.map(achievement => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    showShareButton={showShareButton}
                    onShare={() => {
                      onAchievementUnlock?.(achievement);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {filteredAchievements.length === 0 && (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {activeTab === 'locked' ? '暂无进行中的成就' : 
                  activeTab === 'unlocked' ? '暂无已解锁的成就' :
                    activeTab === 'shared' ? '暂无已分享的成就' :
                      '暂无成就'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 成就卡片组件
function AchievementCard({ 
  achievement, 
  showShareButton, 
  onShare, 
}: {
  achievement: Achievement;
  showShareButton?: boolean;
  onShare?: () => void;
}) {
  return (
    <Card className={`relative ${achievement.isUnlocked ? '' : 'opacity-75'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {achievement.isUnlocked ? (
              <Unlock className="h-5 w-5 text-green-600" />
            ) : (
              <Lock className="h-5 w-5 text-gray-400" />
            )}
            <Badge className={getRarityColor(achievement.rarity)}>
              <div className="flex items-center space-x-1">
                {getRarityIcon(achievement.rarity)}
                <span>{getRarityLabel(achievement.rarity)}</span>
              </div>
            </Badge>
          </div>
          
          <div className="text-sm font-medium">
            {achievement.points} 积分
          </div>
        </div>
        
        <CardTitle className="text-base leading-tight">
          {achievement.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {achievement.description}
        </p>
        
        {/* 进度条 */}
        {!achievement.isUnlocked && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>进度</span>
              <span>{Math.round(achievement.progress)}%</span>
            </div>
            <Progress value={achievement.progress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {achievement.currentValue} / {achievement.targetValue}
            </div>
          </div>
        )}
        
        {/* 解锁时间 */}
        {achievement.isUnlocked && achievement.unlockedAt && (
          <div className="text-xs text-muted-foreground">
            解锁时间: {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
          </div>
        )}
        
        {/* 分享按钮 */}
        {showShareButton && achievement.isUnlocked && !achievement.isShared && (
          <ShareButton
            contentType="ACHIEVEMENT"
            contentId={achievement.id}
            title={achievement.title}
            description={achievement.description}
            size="sm"
            variant="outline"
            onShare={onShare}
          />
        )}
        
        {/* 已分享标识 */}
        {achievement.isShared && (
          <div className="flex items-center space-x-1 text-xs text-green-600">
            <Share2 className="h-3 w-3" />
            <span>已分享</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 辅助函数
function getRarityColor(rarity: AchievementRarity) {
  const colors = {
    'BRONZE': 'bg-orange-100 text-orange-800 border-orange-200',
    'SILVER': 'bg-gray-100 text-gray-800 border-gray-200',
    'GOLD': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'PLATINUM': 'bg-purple-100 text-purple-800 border-purple-200',
    'DIAMOND': 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return colors[rarity] || colors.BRONZE;
}

function getRarityIcon(rarity: AchievementRarity) {
  switch (rarity) {
  case 'BRONZE':
    return <Medal className="h-3 w-3" />;
  case 'SILVER':
    return <Award className="h-3 w-3" />;
  case 'GOLD':
    return <Trophy className="h-3 w-3" />;
  case 'PLATINUM':
    return <Star className="h-3 w-3" />;
  case 'DIAMOND':
    return <Star className="h-3 w-3" />;
  default:
    return <Medal className="h-3 w-3" />;
  }
}

function getRarityLabel(rarity: AchievementRarity) {
  const labels = {
    'BRONZE': '青铜',
    'SILVER': '白银',
    'GOLD': '黄金',
    'PLATINUM': '白金',
    'DIAMOND': '钻石',
  };
  return labels[rarity] || '青铜';
}

function getTypeLabel(type: AchievementType) {
  const labels = {
    'CHECK_IN_STREAK': '连续打卡',
    'WEIGHT_LOSS': '减重成就',
    'NUTRITION_GOAL': '营养目标',
    'EXERCISE_TARGET': '运动目标',
    'HEALTH_MILESTONE': '健康里程碑',
    'COMMUNITY_CONTRIBUTION': '社区贡献',
  };
  return labels[type] || '成就';
}
