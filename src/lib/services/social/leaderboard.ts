/**
 * 排行榜服务
 * 管理各种类型的排行榜数据计算和展示
 */

import { 
  subDays, 
  startOfDay, 
  endOfDay, 
  isAfter, 
  format,
  differenceInDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type {
  LeaderboardEntry,
  LeaderboardType,
  FamilyMember,
  LeaderboardEntryData,
  HealthData,
  Recipe,
  SharedContent,
} from '@prisma/client';
import { LEADERBOARD_TYPE_CONFIGS } from '@/types/social-sharing';
import { prisma } from '@/lib/db';

/**
 * 排行榜数据项
 */
export interface LeaderboardItem {
  rank: number
  memberId: string
  memberName: string
  avatar?: string
  value: number
  displayValue: string
  change: 'up' | 'down' | 'same' | 'new'
  changeValue?: number
  metadata?: Record<string, any>
}

/**
 * 排行榜计算结果
 */
export interface LeaderboardResult {
  type: LeaderboardType
  title: string
  description: string
  unit: string
  timeframe: string
  totalUsers: number
  data: LeaderboardItem[]
  lastUpdated: Date
  userRank?: LeaderboardItem
}

/**
 * 排行榜系统类
 */
export class LeaderboardService {
  private static instance: LeaderboardService;
  private cache = new Map<string, { data: LeaderboardResult; expiry: Date }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30分钟缓存

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  /**
   * 获取排行榜数据
   */
  async getLeaderboard(
    type: LeaderboardType,
    memberId?: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly',
    limit: number = 50
  ): Promise<LeaderboardResult> {
    const cacheKey = `${type}_${timeframe}_${limit}_${memberId || 'all'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }

    let result: LeaderboardResult;

    switch (type) {
    case LeaderboardType.HEALTH_SCORE:
      result = await this.calculateHealthScoreLeaderboard(memberId, timeframe, limit);
      break;
    case LeaderboardType.CHECKIN_STREAK:
      result = await this.calculateCheckinStreakLeaderboard(memberId, limit);
      break;
    case LeaderboardType.WEIGHT_LOSS:
      result = await this.calculateWeightLossLeaderboard(memberId, timeframe, limit);
      break;
    case LeaderboardType.EXERCISE_MINUTES:
      result = await this.calculateExerciseMinutesLeaderboard(memberId, timeframe, limit);
      break;
    case LeaderboardType.CALORIES_MANAGEMENT:
      result = await this.calculateCaloriesManagementLeaderboard(memberId, timeframe, limit);
      break;
    default:
      throw new Error(`不支持的排行榜类型: ${type}`);
    }

    // 缓存结果
    this.cache.set(cacheKey, {
      data: result,
      expiry: new Date(Date.now() + this.CACHE_TTL),
    });

    return result;
  }

  /**
   * 计算健康评分排行榜
   */
  private async calculateHealthScoreLeaderboard(
    memberId?: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly',
    limit: number = 50
  ): Promise<LeaderboardResult> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.HEALTH_SCORE];

    // 获取所有用户的健康评分
    const healthScores = await prisma.healthData.groupBy({
      by: ['memberId'],
      where: {
        measuredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _avg: {
        weight: true,
        heartRate: true,
        bloodPressureSystolic: true,
        bloodPressureDiastolic: true,
      },
      _count: {
        id: true,
      },
    });

    // 计算健康评分并排序
    const scoredMembers = await Promise.all(
      healthScores.map(async (score) => {
        const member = await prisma.familyMember.findUnique({
          where: { id: score.memberId },
          select: { name: true, avatar: true },
        });

        if (!member) return null;

        const healthScore = this.calculateHealthScore({
          avgWeight: score._avg.weight || 0,
          avgHeartRate: score._avg.heartRate || 0,
          avgBloodPressureSystolic: score._avg.bloodPressureSystolic || 0,
          avgBloodPressureDiastolic: score._avg.bloodPressureDiastolic || 0,
          dataCount: score._count.id,
        });

        return {
          memberId: score.memberId,
          memberName: member.name,
          avatar: member.avatar,
          value: healthScore,
          metadata: {
            dataCount: score._count.id,
            avgWeight: score._avg.weight,
          },
        };
      })
    );

    const validMembers = scoredMembers.filter(m => m !== null) as any[];
    validMembers.sort((a, b) => b.value - a.value);

    // 转换为排行榜格式
    const leaderboardItems = await this.convertToLeaderboardItems(
      validMembers,
      LeaderboardType.HEALTH_SCORE,
      memberId
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.HEALTH_SCORE,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: this.getTimeframeDisplay(timeframe),
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find(item => item.memberId === memberId),
    };

    return result;
  }

  /**
   * 计算连续打卡排行榜
   */
  private async calculateCheckinStreakLeaderboard(
    memberId?: string,
    limit: number = 50
  ): Promise<LeaderboardResult> {
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.CHECKIN_STREAK];

    // 获取所有用户的连续打卡天数
    const members = await prisma.familyMember.findMany({
      where: {
        healthData: {
          some: {
            measuredAt: {
              gte: subDays(new Date(), 365), // 最近一年的数据
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        healthData: {
          where: {
            measuredAt: {
              gte: subDays(new Date(), 365),
            },
          },
          orderBy: { measuredAt: 'desc' },
        },
      },
    });

    const membersWithStreaks = members.map(member => {
      const streakDays = this.calculateStreakDays(member.healthData);
      return {
        memberId: member.id,
        memberName: member.name,
        avatar: member.avatar,
        value: streakDays,
        metadata: {
          totalDataPoints: member.healthData.length,
        },
      };
    });

    membersWithStreaks.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      membersWithStreaks,
      LeaderboardType.CHECKIN_STREAK,
      memberId
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.CHECKIN_STREAK,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: '全部时间',
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find(item => item.memberId === memberId),
    };

    return result;
  }

  /**
   * 计算减重排行榜
   */
  private async calculateWeightLossLeaderboard(
    memberId?: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'monthly',
    limit: number = 50
  ): Promise<LeaderboardResult> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.WEIGHT_LOSS];

    // 获取所有用户的体重变化
    const members = await prisma.familyMember.findMany({
      where: {
        healthData: {
          some: {
            weight: { not: null },
            measuredAt: {
              gte: subDays(startDate, 30), // 延长30天以获得初始体重
              lte: endDate,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        healthData: {
          where: {
            weight: { not: null },
            measuredAt: {
              gte: subDays(startDate, 30),
              lte: endDate,
            },
          },
          orderBy: { measuredAt: 'asc' },
        },
      },
    });

    const membersWithWeightLoss = members.map(member => {
      const weightData = member.healthData.map(d => d.weight!).filter(w => w > 0);
      
      if (weightData.length < 2) {
        return {
          memberId: member.id,
          memberName: member.name,
          avatar: member.avatar,
          value: 0,
          metadata: {
            dataPoints: weightData.length,
          },
        };
      }

      const initialWeight = weightData[0];
      const currentWeight = weightData[weightData.length - 1];
      const weightLoss = initialWeight - currentWeight;

      return {
        memberId: member.id,
        memberName: member.name,
        avatar: member.avatar,
        value: Math.round(weightLoss * 10) / 10, // 保留一位小数
        metadata: {
          initialWeight,
          currentWeight,
          dataPoints: weightData.length,
        },
      };
    });

    membersWithWeightLoss.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      membersWithWeightLoss,
      LeaderboardType.WEIGHT_LOSS,
      memberId
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.WEIGHT_LOSS,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: this.getTimeframeDisplay(timeframe),
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find(item => item.memberId === memberId),
    };

    return result;
  }

  /**
   * 计算运动时长排行榜
   */
  private async calculateExerciseMinutesLeaderboard(
    memberId?: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly',
    limit: number = 50
  ): Promise<LeaderboardResult> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.EXERCISE_MINUTES];

    // 获取所有用户的运动总时长（这里使用健康数据的记录数量作为运动时长的代理）
    const exerciseData = await prisma.healthData.groupBy({
      by: ['memberId'],
      where: {
        measuredAt: {
          gte: startDate,
          lte: endDate,
        },
        notes: {
          contains: '运动',
        },
      },
      _count: {
        id: true,
      },
    });

    const membersWithExercise = await Promise.all(
      exerciseData.map(async (data) => {
        const member = await prisma.familyMember.findUnique({
          where: { id: data.memberId },
          select: { name: true, avatar: true },
        });

        if (!member) return null;

        // 假设每次运动记录代表30分钟
        const exerciseMinutes = data._count.id * 30;

        return {
          memberId: data.memberId,
          memberName: member.name,
          avatar: member.avatar,
          value: exerciseMinutes,
          metadata: {
            exerciseCount: data._count.id,
          },
        };
      })
    );

    const validMembers = membersWithExercise.filter(m => m !== null) as any[];
    validMembers.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      validMembers,
      LeaderboardType.EXERCISE_MINUTES,
      memberId
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.EXERCISE_MINUTES,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: this.getTimeframeDisplay(timeframe),
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find(item => item.memberId === memberId),
    };

    return result;
  }

  /**
   * 计算卡路里管理排行榜
   */
  private async calculateCaloriesManagementLeaderboard(
    memberId?: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'monthly',
    limit: number = 50
  ): Promise<LeaderboardResult> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.CALORIES_MANAGEMENT];

    // 获取所有用户的卡路里管理准确率
    const members = await prisma.familyMember.findMany({
      where: {
        healthGoals: {
          some: {
            goalType: 'CALORIES',
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        healthGoals: {
          where: {
            goalType: 'CALORIES',
            status: 'ACTIVE',
          },
          take: 1,
        },
        healthData: {
          where: {
            measuredAt: {
              gte: startDate,
              lte: endDate,
            },
            source: 'MANUAL',
          },
        },
      },
    });

    const membersWithCalorieAccuracy = members.map(member => {
      const calorieGoal = member.healthGoals[0]?.targetValue || 2000;
      const manualData = member.healthData.filter(d => 
        d.notes && d.notes.includes('卡路里')
      );

      if (manualData.length === 0) {
        return {
          memberId: member.id,
          memberName: member.name,
          avatar: member.avatar,
          value: 0,
          metadata: {
            calorieGoal,
            dataDays: 0,
          },
        };
      }

      // 计算准确率（在目标范围内的天数比例）
      const accurateDays = manualData.filter(d => {
        const calories = this.extractCaloriesFromNotes(d.notes);
        return calories && Math.abs(calories - calorieGoal) <= calorieGoal * 0.2; // 20%误差范围
      }).length;

      const accuracy = (accurateDays / manualData.length) * 100;

      return {
        memberId: member.id,
        memberName: member.name,
        avatar: member.avatar,
        value: Math.round(accuracy * 10) / 10, // 保留一位小数
        metadata: {
          calorieGoal,
          dataDays: manualData.length,
          accurateDays,
        },
      };
    });

    membersWithCalorieAccuracy.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      membersWithCalorieAccuracy,
      LeaderboardType.CALORIES_MANAGEMENT,
      memberId
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.CALORIES_MANAGEMENT,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: this.getTimeframeDisplay(timeframe),
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find(item => item.memberId === memberId),
    };

    return result;
  }

  /**
   * 转换为排行榜项格式
   */
  private async convertToLeaderboardItems(
    members: any[],
    type: LeaderboardType,
    currentMemberId?: string
  ): Promise<LeaderboardItem[]> {
    const items: LeaderboardItem[] = [];

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const rank = i + 1;
      const change = await this.calculateRankChange(member.memberId, type, rank);

      items.push({
        rank,
        memberId: member.memberId,
        memberName: member.memberName,
        avatar: member.avatar,
        value: member.value,
        displayValue: this.formatDisplayValue(type, member.value, member.metadata),
        change,
        changeValue: change.changeValue,
        metadata: member.metadata,
      });
    }

    return items;
  }

  /**
   * 计算排名变化
   */
  private async calculateRankChange(
    memberId: string,
    type: LeaderboardType,
    currentRank: number
  ): Promise<'up' | 'down' | 'same' | 'new' & { changeValue?: number }> {
    // 获取上一次的排名记录
    const lastRanking = await prisma.leaderboardEntry.findFirst({
      where: {
        memberId,
        type,
        createdAt: {
          gte: subDays(new Date(), 7), // 一周内的记录
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastRanking) {
      return { change: 'new' };
    }

    const rankDiff = lastRanking.rank - currentRank;
    
    if (rankDiff > 0) {
      return { change: 'up', changeValue: rankDiff };
    } else if (rankDiff < 0) {
      return { change: 'down', changeValue: Math.abs(rankDiff) };
    } else {
      return { change: 'same' };
    }
  }

  /**
   * 格式化显示值
   */
  private formatDisplayValue(type: LeaderboardType, value: number, metadata?: any): string {
    switch (type) {
    case LeaderboardType.HEALTH_SCORE:
      return `${value}分`;
      
    case LeaderboardType.CHECKIN_STREAK:
      return `${value}天`;
      
    case LeaderboardType.WEIGHT_LOSS:
      return `${value}kg`;
      
    case LeaderboardType.EXERCISE_MINUTES:
      return `${value}分钟`;
      
    case LeaderboardType.CALORIES_MANAGEMENT:
      return `${value}%`;
      
    default:
      return value.toString();
    }
  }

  /**
   * 获取时间范围的开始和结束日期
   */
  private getTimeframeDates(timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time'): { startDate: Date; endDate: Date } {
    const endDate = endOfDay(new Date());
    let startDate: Date;

    switch (timeframe) {
    case 'daily':
      startDate = startOfDay(new Date());
      break;
      
    case 'weekly':
      startDate = subDays(startDate, 7);
      break;
      
    case 'monthly':
      startDate = subDays(startDate, 30);
      break;
      
    case 'all-time':
      startDate = new Date(2020, 0, 1); // 从2020年开始
      break;
      
    default:
      startDate = subDays(startDate, 7);
    }

    return { startDate, endDate };
  }

  /**
   * 获取时间范围显示文本
   */
  private getTimeframeDisplay(timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time'): string {
    switch (timeframe) {
    case 'daily':
      return '今日';
    case 'weekly':
      return '本周';
    case 'monthly':
      return '本月';
    case 'all-time':
      return '全部时间';
    default:
      return '本周';
    }
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(data: {
    avgWeight: number
    avgHeartRate: number
    avgBloodPressureSystolic: number
    avgBloodPressureDiastolic: number
    dataCount: number
  }): number {
    let score = 50;

    // 体重评分 (30分)
    if (data.avgWeight > 40 && data.avgWeight < 100) {
      score += 15;
    }

    // 心率评分 (25分)
    if (data.avgHeartRate > 60 && data.avgHeartRate < 100) {
      score += 12.5;
    }

    // 血压评分 (25分)
    if (data.avgBloodPressureSystolic >= 90 && data.avgBloodPressureSystolic <= 120 &&
        data.avgBloodPressureDiastolic >= 60 && data.avgBloodPressureDiastolic <= 80) {
      score += 12.5;
    }

    // 数据连续性评分 (20分)
    if (data.dataCount >= 7) {
      score += 10;
    }
    if (data.dataCount >= 15) {
      score += 10;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * 计算连续打卡天数
   */
  private calculateStreakDays(healthData: HealthData[]): number {
    if (healthData.length === 0) return 0;

    const sortedData = healthData.sort((a, b) => 
      new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
    );

    let streak = 0;
    const today = startOfDay(new Date());

    for (let i = 0; i < sortedData.length; i++) {
      const dataDate = startOfDay(new Date(sortedData[i].measuredAt));
      const daysDiff = differenceInDays(today, dataDate);
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 从备注中提取卡路里信息
   */
  private extractCaloriesFromNotes(notes: string): number | null {
    const match = notes.match(/(\d+)\s*[卡卡路里]/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * 保存排行榜数据
   */
  async saveLeaderboardEntry(
    memberId: string,
    type: LeaderboardType,
    rank: number,
    value: number,
    metadata?: any
  ): Promise<LeaderboardEntry> {
    return await prisma.leaderboardEntry.create({
      data: {
        memberId,
        type,
        rank,
        value,
        metadata: metadata || {},
        createdAt: new Date(),
      },
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取用户的排名历史
   */
  async getRankingHistory(
    memberId: string,
    type: LeaderboardType,
    days: number = 30
  ): Promise<LeaderboardEntry[]> {
    const startDate = subDays(new Date(), days);

    return await prisma.leaderboardEntry.findMany({
      where: {
        memberId,
        type,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: days,
    });
  }

  /**
   * 获取排行榜配置
   */
  getLeaderboardConfig(type: LeaderboardType): any {
    return LEADERBOARD_TYPE_CONFIGS[type];
  }

  /**
   * 获取所有可用排行榜类型
   */
  getAvailableLeaderboards(): LeaderboardType[] {
    return Object.values(LeaderboardType);
  }
}

// 导出单例实例
export const leaderboardService = LeaderboardService.getInstance();

// 导出工具函数
export async function getLeaderboard(
  type: LeaderboardType,
  memberId?: string,
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time',
  limit?: number
): Promise<LeaderboardResult> {
  const service = LeaderboardService.getInstance();
  return service.getLeaderboard(type, memberId, timeframe, limit);
}

export async function getUserRankingHistory(
  memberId: string,
  type: LeaderboardType,
  days?: number
): Promise<LeaderboardEntry[]> {
  const service = LeaderboardService.getInstance();
  return service.getRankingHistory(memberId, type, days);
}

export async function saveUserRanking(
  memberId: string,
  type: LeaderboardType,
  rank: number,
  value: number,
  metadata?: any
): Promise<LeaderboardEntry> {
  const service = LeaderboardService.getInstance();
  return service.saveLeaderboardEntry(memberId, type, rank, value, metadata);
}
