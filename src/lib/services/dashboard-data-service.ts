/**
 * Dashboard Data Service
 * 仪表盘数据聚合服务
 * 
 * 提供统一的数据获取接口，聚合多个数据源，实现缓存和错误处理
 */

import { prisma } from '@/lib/db'
import { analyticsService } from './analytics-service'
import { healthScoreCalculator } from './health-score-calculator'
import { reportGenerator } from './report-generator'

export interface DashboardData {
  member: {
    id: string
    name: string
    avatar?: string
    role: string
    healthScore: number
    lastActive: Date
  }
  overview: {
    weightTrend: any
    nutritionSummary: any
    goalProgress: any[]
    healthScore: any
  }
  healthMetrics: {
    recentData: any[]
    trends: any
    anomalies: any[]
  }
  nutrition: {
    weeklyAnalysis: any
    monthlyAnalysis: any
    adherenceHistory: any[]
  }
  reports: {
    weekly: any
    monthly: any
  }
}

export interface DataFetchOptions {
  useCache?: boolean
  cacheTTL?: number // 缓存时间（毫秒）
  retryAttempts?: number
  timeout?: number
}

export class DashboardDataService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  /**
   * 获取仪表盘完整数据
   */
  async getDashboardData(
    memberId: string,
    options: DataFetchOptions = {}
  ): Promise<DashboardData> {
    const {
      useCache = true,
      cacheTTL = 5 * 60 * 1000, // 5分钟缓存
      retryAttempts = 3,
      timeout = 10000, // 10秒超时
    } = options

    const cacheKey = `dashboard_${memberId}`
    
    // 检查缓存
    if (useCache) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      // 并行获取所有数据
      const data = await this.fetchWithTimeout(
        this.aggregateDashboardData(memberId),
        timeout
      )

      // 缓存结果
      if (useCache) {
        this.setCache(cacheKey, data, cacheTTL)
      }

      return data
    } catch (error) {
      // 重试机制
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // 指数退避
          const data = await this.fetchWithTimeout(
            this.aggregateDashboardData(memberId),
            timeout
          )
          
          if (useCache) {
            this.setCache(cacheKey, data, cacheTTL)
          }
          
          return data
        } catch (retryError) {
          if (attempt === retryAttempts) {
            throw new Error(`数据获取失败，已重试${retryAttempts}次: ${error}`)
          }
        }
      }
      
      throw error
    }
  }

  /**
   * 聚合仪表盘数据
   */
  private async aggregateDashboardData(memberId: string): Promise<DashboardData> {
    // 获取成员基本信息
    const member = await this.getMemberInfo(memberId)

    // 并行获取各项数据
    const [
      weightTrend,
      nutritionSummary,
      goalProgress,
      healthScore,
      weeklyReport,
      monthlyReport,
    ] = await Promise.all([
      analyticsService.analyzeWeightTrend(memberId, 30),
      analyticsService.summarizeNutrition(memberId, 'daily'),
      analyticsService.calculateGoalProgress(memberId),
      healthScoreCalculator.calculateHealthScore(memberId),
      reportGenerator.generateWeeklyReport(memberId, member.name),
      reportGenerator.generateMonthlyReport(memberId, member.name),
    ])

    // 获取最近的健康数据
    const recentData = await this.getRecentHealthData(memberId, 7)

    return {
      member: {
        id: member.id,
        name: member.name,
        avatar: member.avatar,
        role: member.role,
        healthScore: healthScore.totalScore,
        lastActive: member.lastActive,
      },
      overview: {
        weightTrend,
        nutritionSummary,
        goalProgress,
        healthScore,
      },
      healthMetrics: {
        recentData,
        trends: this.calculateTrends(recentData),
        anomalies: weightTrend.anomalies,
      },
      nutrition: {
        weeklyAnalysis: nutritionSummary,
        monthlyAnalysis: await analyticsService.summarizeNutrition(memberId, 'monthly'),
        adherenceHistory: await this.getNutritionAdherenceHistory(memberId, 30),
      },
      reports: {
        weekly: weeklyReport,
        monthly: monthlyReport,
      },
    }
  }

  /**
   * 获取成员信息
   */
  private async getMemberInfo(memberId: string) {
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId, deletedAt: null },
      include: {
        family: {
          select: {
            creatorId: true,
            members: {
              where: { deletedAt: null },
              select: { userId: true, role: true },
            },
          },
        },
      },
    })

    if (!member) {
      throw new Error('成员不存在')
    }

    return {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      role: member.family.creatorId === member.userId ? 'admin' : 'member',
      lastActive: member.updatedAt,
    }
  }

  /**
   * 获取最近的健康数据
   */
  private async getRecentHealthData(memberId: string, days: number) {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

    return await prisma.healthData.findMany({
      where: {
        memberId,
        measuredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { measuredAt: 'desc' },
      take: 100,
    })
  }

  /**
   * 计算数据趋势
   */
  private calculateTrends(data: any[]) {
    if (data.length < 2) return null

    const recent = data.slice(0, Math.floor(data.length / 2))
    const older = data.slice(Math.floor(data.length / 2))

    const calculateAverage = (items: any[], field: string) => {
      const validItems = items.filter(item => item[field] !== null)
      return validItems.length > 0
        ? validItems.reduce((sum, item) => sum + item[field], 0) / validItems.length
        : 0
    }

    return {
      weight: {
        current: calculateAverage(recent, 'weight'),
        previous: calculateAverage(older, 'weight'),
        trend: calculateAverage(recent, 'weight') - calculateAverage(older, 'weight'),
      },
      bodyFat: {
        current: calculateAverage(recent, 'bodyFat'),
        previous: calculateAverage(older, 'bodyFat'),
        trend: calculateAverage(recent, 'bodyFat') - calculateAverage(older, 'bodyFat'),
      },
      muscleMass: {
        current: calculateAverage(recent, 'muscleMass'),
        previous: calculateAverage(older, 'muscleMass'),
        trend: calculateAverage(recent, 'muscleMass') - calculateAverage(older, 'muscleMass'),
      },
    }
  }

  /**
   * 获取营养达标历史
   */
  private async getNutritionAdherenceHistory(memberId: string, days: number) {
    // 这里应该从实际的营养记录中获取数据
    // 暂时返回模拟数据
    const history = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      history.push({
        date: date.toISOString().split('T')[0],
        adherenceRate: 70 + Math.random() * 30, // 70-100%的随机达标率
      })
    }

    return history.reverse()
  }

  /**
   * 获取家庭成员列表
   */
  async getFamilyMembers(userId: string) {
    const families = await prisma.family.findMany({
      where: {
        OR: [
          { creatorId: userId },
          {
            members: {
              some: {
                userId,
                deletedAt: null,
              },
            },
          },
        ],
      },
      include: {
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    const members = []
    
    for (const family of families) {
      for (const member of family.members) {
        const healthScore = await healthScoreCalculator.calculateHealthScore(member.id)
        
        members.push({
          id: member.id,
          name: member.name,
          avatar: member.user?.image,
          role: family.creatorId === member.userId ? 'admin' : 'member',
          email: member.user?.email,
          healthScore: healthScore.totalScore,
          lastActive: member.updatedAt,
        })
      }
    }

    return members
  }

  /**
   * 缓存管理
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  /**
   * 超时控制
   */
  private fetchWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('请求超时')), timeout)
      ),
    ])
  }

  /**
   * 数据预加载
   */
  async preloadData(memberIds: string[]) {
    const promises = memberIds.map(memberId =>
      this.getDashboardData(memberId, { useCache: true, cacheTTL: 10 * 60 * 1000 })
        .catch(error => console.error(`预加载失败 ${memberId}:`, error))
    )

    await Promise.allSettled(promises)
  }

  /**
   * 数据导出
   */
  async exportData(memberId: string, format: 'json' | 'csv' = 'json') {
    const data = await this.getDashboardData(memberId, { useCache: false })

    if (format === 'json') {
      return JSON.stringify(data, null, 2)
    }

    if (format === 'csv') {
      // 简化的CSV导出
      const csvRows = [
        '日期,体重,体脂率,肌肉量,健康评分',
        ...data.healthMetrics.recentData.map(item =>
          `${item.measuredAt},${item.weight || ''},${item.bodyFat || ''},${item.muscleMass || ''},${data.overview.healthScore.totalScore}`
        ),
      ]
      
      return csvRows.join('\n')
    }

    throw new Error(`不支持的导出格式: ${format}`)
  }
}

// 导出单例
export const dashboardDataService = new DashboardDataService()
