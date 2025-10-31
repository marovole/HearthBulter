/**
 * 排行榜系统服务
 * 负责生成各种类型的排行榜数据
 */

import { PrismaClient, LeaderboardType, LeaderboardPeriod, FamilyMember } from '@prisma/client';

const prisma = new PrismaClient();

export interface LeaderboardEntry {
  id: string;
  member: {
    id: string;
    name: string;
    avatar?: string;
  };
  rank: number;
  previousRank?: number;
  rankChange?: number;
  score: number;
  metadata?: any;
  isAnonymous: boolean;
}

export interface LeaderboardData {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  periodStart: Date;
  periodEnd: Date;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  userRank?: LeaderboardEntry;
  lastUpdated: Date;
}

/**
 * 获取排行榜数据
 */
export async function getLeaderboard(
  type: LeaderboardType,
  period: LeaderboardPeriod,
  memberId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<LeaderboardData> {
  const { periodStart, periodEnd } = getDateRange(period);
  
  // 生成或获取排行榜数据
  const entries = await generateLeaderboardEntries(type, period, periodStart, periodEnd, limit, offset);
  
  // 获取用户排名
  let userRank: LeaderboardEntry | undefined;
  if (memberId) {
    userRank = await getUserRank(type, period, periodStart, periodEnd, memberId);
  }
  
  // 获取总参与人数
  const totalParticipants = await getParticipantCount(type, period, periodStart, periodEnd);
  
  return {
    type,
    period,
    periodStart,
    periodEnd,
    entries,
    totalParticipants,
    userRank,
    lastUpdated: new Date()
  };
}

/**
 * 生成排行榜条目
 */
async function generateLeaderboardEntries(
  type: LeaderboardType,
  period: LeaderboardPeriod,
  periodStart: Date,
  periodEnd: Date,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  switch (type) {
    case 'HEALTH_SCORE':
      return generateHealthScoreLeaderboard(periodStart, periodEnd, limit, offset);
    case 'CHECK_IN_STREAK':
      return generateCheckInStreakLeaderboard(periodStart, periodEnd, limit, offset);
    case 'WEIGHT_LOSS':
      return generateWeightLossLeaderboard(periodStart, periodEnd, limit, offset);
    case 'EXERCISE_MINUTES':
      return generateExerciseMinutesLeaderboard(periodStart, periodEnd, limit, offset);
    case 'NUTRITION_SCORE':
      return generateNutritionScoreLeaderboard(periodStart, periodEnd, limit, offset);
    default:
      throw new Error(`不支持的排行榜类型: ${type}`);
  }
}

/**
 * 生成健康评分排行榜
 */
async function generateHealthScoreLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  const scores = await prisma.healthScore.findMany({
    where: {
      date: {
        gte: periodStart,
        lte: periodEnd
      }
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    },
    orderBy: {
      overallScore: 'desc'
    },
    skip: offset,
    take: limit
  });
  
  return scores.map((score, index) => ({
    id: score.id,
    member: score.member,
    rank: offset + index + 1,
    score: score.overallScore,
    metadata: {
      date: score.date,
      nutritionScore: score.nutritionScore,
      exerciseScore: score.exerciseScore,
      sleepScore: score.sleepScore,
      medicalScore: score.medicalScore,
      dataCompleteness: score.dataCompleteness
    },
    isAnonymous: false
  }));
}

/**
 * 生成连续打卡排行榜
 */
async function generateCheckInStreakLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  const streaks = await prisma.trackingStreak.findMany({
    where: {
      lastCheckIn: {
        gte: periodStart,
        lte: periodEnd
      }
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    },
    orderBy: {
      currentStreak: 'desc'
    },
    skip: offset,
    take: limit
  });
  
  return streaks.map((streak, index) => ({
    id: streak.id,
    member: streak.member,
    rank: offset + index + 1,
    score: streak.currentStreak,
    metadata: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDays: streak.totalDays,
      lastCheckIn: streak.lastCheckIn,
      badges: JSON.parse(streak.badges || '[]')
    },
    isAnonymous: false
  }));
}

/**
 * 生成减重排行榜
 */
async function generateWeightLossLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  // 获取周期开始和结束的体重数据
  const startWeights = await prisma.healthData.findMany({
    where: {
      measuredAt: {
        gte: periodStart,
        lte: new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000) // 开始后一周内
      },
      weight: {
        not: null
      }
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    },
    orderBy: {
      measuredAt: 'asc'
    }
  });
  
  const endWeights = await prisma.healthData.findMany({
    where: {
      measuredAt: {
        gte: new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000), // 结束前一周内
        lte: periodEnd
      },
      weight: {
        not: null
      }
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    },
    orderBy: {
      measuredAt: 'desc'
    }
  });
  
  // 计算减重量
  const weightLossMap = new Map<string, number>();
  
  startWeights.forEach(start => {
    const end = endWeights.find(w => w.memberId === start.memberId);
    if (end && start.weight && end.weight) {
      const loss = start.weight - end.weight;
      if (loss > 0) {
        weightLossMap.set(start.memberId, loss);
      }
    }
  });
  
  // 排序并返回结果
  const sortedEntries = Array.from(weightLossMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(offset, offset + limit);
  
  return sortedEntries.map(([memberId, weightLoss], index) => {
    const member = startWeights.find(w => w.memberId === memberId)?.member;
    return {
      id: `weight-loss-${memberId}`,
      member: member || { id: memberId, name: '未知用户' },
      rank: offset + index + 1,
      score: Math.round(weightLoss * 100) / 100, // 保留两位小数
      metadata: {
        weightLoss: Math.round(weightLoss * 100) / 100,
        periodStart,
        periodEnd
      },
      isAnonymous: false
    };
  });
}

/**
 * 生成运动时长排行榜
 */
async function generateExerciseMinutesLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  const exerciseData = await prisma.auxiliaryTracking.findMany({
    where: {
      date: {
        gte: periodStart,
        lte: periodEnd
      },
      exerciseMinutes: {
        not: null
      }
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });
  
  // 按成员聚合运动时长
  const exerciseMap = new Map<string, number>();
  
  exerciseData.forEach(data => {
    const current = exerciseMap.get(data.memberId) || 0;
    exerciseMap.set(data.memberId, current + (data.exerciseMinutes || 0));
  });
  
  // 排序并返回结果
  const sortedEntries = Array.from(exerciseMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(offset, offset + limit);
  
  return sortedEntries.map(([memberId, totalMinutes], index) => {
    const member = exerciseData.find(d => d.memberId === memberId)?.member;
    return {
      id: `exercise-${memberId}`,
      member: member || { id: memberId, name: '未知用户' },
      rank: offset + index + 1,
      score: totalMinutes,
      metadata: {
        totalMinutes,
        averageMinutes: Math.round(totalMinutes / getDaysBetween(periodStart, periodEnd)),
        periodStart,
        periodEnd
      },
      isAnonymous: false
    };
  });
}

/**
 * 生成营养评分排行榜
 */
async function generateNutritionScoreLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  const nutritionTargets = await prisma.dailyNutritionTarget.findMany({
    where: {
      date: {
        gte: periodStart,
        lte: periodEnd
      }
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });
  
  // 按成员聚合营养完成度
  const nutritionMap = new Map<string, { totalScore: number; days: number }>();
  
  nutritionTargets.forEach(target => {
    const current = nutritionMap.get(target.memberId) || { totalScore: 0, days: 0 };
    
    // 计算每日营养评分（基于偏差）
    let dayScore = 100;
    dayScore -= Math.abs(target.caloriesDeviation) * 0.5;
    dayScore -= Math.abs(target.proteinDeviation) * 0.3;
    dayScore -= Math.abs(target.carbsDeviation) * 0.1;
    dayScore -= Math.abs(target.fatDeviation) * 0.1;
    
    nutritionMap.set(target.memberId, {
      totalScore: current.totalScore + Math.max(0, dayScore),
      days: current.days + 1
    });
  });
  
  // 计算平均分并排序
  const sortedEntries = Array.from(nutritionMap.entries())
    .map(([memberId, data]) => [memberId, data.totalScore / data.days] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(offset, offset + limit);
  
  return sortedEntries.map(([memberId, averageScore], index) => {
    const member = nutritionTargets.find(t => t.memberId === memberId)?.member;
    return {
      id: `nutrition-${memberId}`,
      member: member || { id: memberId, name: '未知用户' },
      rank: offset + index + 1,
      score: Math.round(averageScore * 100) / 100,
      metadata: {
        averageScore: Math.round(averageScore * 100) / 100,
        periodStart,
        periodEnd
      },
      isAnonymous: false
    };
  });
}

/**
 * 获取用户排名
 */
async function getUserRank(
  type: LeaderboardType,
  period: LeaderboardPeriod,
  periodStart: Date,
  periodEnd: Date,
  memberId: string
): Promise<LeaderboardEntry | undefined> {
  const allEntries = await generateLeaderboardEntries(type, period, periodStart, periodEnd, 1000, 0);
  return allEntries.find(entry => entry.member.id === memberId);
}

/**
 * 获取参与人数
 */
async function getParticipantCount(
  type: LeaderboardType,
  period: LeaderboardPeriod,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  switch (type) {
    case 'HEALTH_SCORE':
      return await prisma.healthScore.count({
        where: {
          date: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      });
    case 'CHECK_IN_STREAK':
      return await prisma.trackingStreak.count({
        where: {
          lastCheckIn: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      });
    case 'EXERCISE_MINUTES':
      return await prisma.auxiliaryTracking.groupBy({
        by: ['memberId'],
        where: {
          date: {
            gte: periodStart,
            lte: periodEnd
          },
          exerciseMinutes: {
            not: null
          }
        }
      }).then(result => result.length);
    case 'NUTRITION_SCORE':
      return await prisma.dailyNutritionTarget.groupBy({
        by: ['memberId'],
        where: {
          date: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      }).then(result => result.length);
    default:
      return 0;
  }
}

/**
 * 更新排行榜数据
 */
export async function updateLeaderboardData(
  type: LeaderboardType,
  period: LeaderboardPeriod
): Promise<void> {
  const { periodStart, periodEnd } = getDateRange(period);
  
  // 获取所有排行榜条目
  const entries = await generateLeaderboardEntries(type, period, periodStart, periodEnd, 1000, 0);
  
  // 批量更新数据库
  for (const entry of entries) {
    await prisma.leaderboardEntry.upsert({
      where: {
        memberId_leaderboardType_period_periodStart_periodEnd: {
          memberId: entry.member.id,
          leaderboardType: type,
          period,
          periodStart,
          periodEnd
        }
      },
      update: {
        score: entry.score,
        rank: entry.rank,
        totalParticipants: entries.length,
        calculatedAt: new Date(),
        metadata: entry.metadata || {}
      },
      create: {
        memberId: entry.member.id,
        leaderboardType: type,
        period,
        periodStart,
        periodEnd,
        score: entry.score,
        rank: entry.rank,
        totalParticipants: entries.length,
        calculatedAt: new Date(),
        metadata: entry.metadata || {}
      }
    });
  }
}

/**
 * 获取日期范围
 */
function getDateRange(period: LeaderboardPeriod): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'DAILY':
      return {
        periodStart: today,
        periodEnd: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      };
    case 'WEEKLY':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        periodStart: weekStart,
        periodEnd: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      };
    case 'MONTHLY':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        periodStart: monthStart,
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      };
    case 'YEARLY':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return {
        periodStart: yearStart,
        periodEnd: new Date(now.getFullYear() + 1, 0, 1)
      };
    case 'ALL_TIME':
      return {
        periodStart: new Date(2020, 0, 1), // 假设系统从2020年开始
        periodEnd: now
      };
    default:
      return {
        periodStart: today,
        periodEnd: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      };
  }
}

/**
 * 计算日期间隔天数
 */
function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * 获取用户历史排名变化
 */
export async function getRankHistory(
  memberId: string,
  type: LeaderboardType,
  period: LeaderboardPeriod,
  days: number = 30
): Promise<Array<{ date: Date; rank: number; score: number }>> {
  const history: Array<{ date: Date; rank: number; score: number }> = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const { periodStart, periodEnd } = getDateRange(period);
    const entry = await getUserRank(type, period, periodStart, periodEnd, memberId);
    
    if (entry) {
      history.push({
        date,
        rank: entry.rank,
        score: entry.score
      });
    }
  }
  
  return history.reverse();
}
