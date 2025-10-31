import { PrismaClient, InventoryItem, InventoryUsage, WasteLog, FoodCategory, WasteReason } from '@prisma/client'

const prisma = new PrismaClient()

export interface InventoryAnalysis {
  memberId: string
  period: {
    startDate: Date
    endDate: Date
  }
  summary: {
    totalItems: number
    totalValue: number
    usedItems: number
    wastedItems: number
    wasteRate: number
    usageRate: number
  }
  categoryAnalysis: Array<{
    category: FoodCategory
    itemCount: number
    totalValue: number
    usedQuantity: number
    wastedQuantity: number
    wasteRate: number
    efficiency: number
  }>
  usagePatterns: Array<{
    foodName: string
    usageFrequency: number
    averageUsage: number
    totalUsage: number
    wasteFrequency: number
    efficiency: number
  }>
  wasteAnalysis: {
    totalWasteValue: number
    wasteByReason: Array<{
      reason: WasteReason
      count: number
      value: number
      percentage: number
    }>
    wasteByCategory: Array<{
      category: FoodCategory
      count: number
      value: number
      percentage: number
    }>
    topWastedItems: Array<{
      foodName: string
      wasteCount: number
      totalWasteValue: number
      wasteRate: number
    }>
  }
  recommendations: Array<{
    type: 'PURCHASE' | 'STORAGE' | 'USAGE' | 'WASTE_REDUCTION'
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    title: string
    description: string
    potentialSavings?: number
  }>
}

export interface PurchaseSuggestion {
  foodId: string
  foodName: string
  category: FoodCategory
  suggestedQuantity: number
  unit: string
  reason: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedCost?: number
}

export class InventoryAnalyzer {
  /**
   * 生成库存分析报告
   */
  async generateInventoryAnalysis(
    memberId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<InventoryAnalysis> {
    const period = {
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate || new Date()
    }

    // 获取期间内的所有相关数据
    const [inventoryItems, usageRecords, wasteRecords] = await Promise.all([
      this.getInventoryItems(memberId, period),
      this.getUsageRecords(memberId, period),
      this.getWasteRecords(memberId, period)
    ])

    // 生成汇总数据
    const summary = this.generateSummary(inventoryItems, usageRecords, wasteRecords)

    // 分类分析
    const categoryAnalysis = await this.analyzeByCategory(memberId, period)

    // 使用模式分析
    const usagePatterns = await this.analyzeUsagePatterns(memberId, period)

    // 浪费分析
    const wasteAnalysis = await this.analyzeWaste(memberId, period)

    // 生成建议
    const recommendations = this.generateRecommendations(summary, categoryAnalysis, wasteAnalysis)

    return {
      memberId,
      period,
      summary,
      categoryAnalysis,
      usagePatterns,
      wasteAnalysis,
      recommendations
    }
  }

  /**
   * 生成采购建议
   */
  async generatePurchaseSuggestions(memberId: string): Promise<PurchaseSuggestion[]> {
    const suggestions: PurchaseSuggestion[] = []

    // 1. 基于库存不足的建议
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        isLowStock: true,
        deletedAt: null
      },
      include: {
        food: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    })

    for (const item of lowStockItems) {
      const suggestedQuantity = (item.minStockThreshold || 0) * 2 - item.quantity
      suggestions.push({
        foodId: item.foodId,
        foodName: item.food.name,
        category: item.food.category as FoodCategory,
        suggestedQuantity: Math.max(0, suggestedQuantity),
        unit: item.unit,
        reason: '库存不足，建议补货',
        priority: 'HIGH',
        estimatedCost: this.estimateCost(item.foodId, suggestedQuantity, item.unit)
      })
    }

    // 2. 基于历史使用模式的建议
    const frequentUsageItems = await this.getFrequentUsageItems(memberId)
    for (const item of frequentUsageItems) {
      // 检查当前库存是否足够
      const currentStock = await prisma.inventoryItem.findFirst({
        where: {
          memberId,
          foodId: item.foodId,
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!currentStock || currentStock.quantity < item.averageUsage * 7) {
        suggestions.push({
          foodId: item.foodId,
          foodName: item.foodName,
          category: item.category as FoodCategory,
          suggestedQuantity: item.averageUsage * 14, // 建议采购2周用量
          unit: item.unit,
          reason: '基于历史使用频率，建议定期采购',
          priority: 'MEDIUM',
          estimatedCost: this.estimateCost(item.foodId, item.averageUsage * 14, item.unit)
        })
      }
    }

    // 3. 基于季节性的建议
    const seasonalSuggestions = await this.getSeasonalSuggestions(memberId)
    suggestions.push(...seasonalSuggestions)

    // 去重并按优先级排序
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.foodId === suggestion.foodId)
    ).sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    return uniqueSuggestions.slice(0, 20) // 最多返回20条建议
  }

  /**
   * 计算库存效率评分
   */
  async calculateInventoryEfficiency(memberId: string): Promise<{
    overallScore: number
    usageEfficiency: number
    wasteReduction: number
    storageOptimization: number
    purchasePlanning: number
    breakdown: {
      strengths: string[]
      weaknesses: string[]
      improvements: string[]
    }
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const [usageRecords, wasteRecords, inventoryItems] = await Promise.all([
      prisma.inventoryUsage.findMany({
        where: { memberId, createdAt: { gte: thirtyDaysAgo } }
      }),
      prisma.wasteLog.findMany({
        where: { memberId, createdAt: { gte: thirtyDaysAgo } }
      }),
      prisma.inventoryItem.findMany({
        where: { memberId, deletedAt: null }
      })
    ])

    // 使用效率 (0-100)
    const totalUsage = usageRecords.reduce((sum, record) => sum + record.usedQuantity, 0)
    const totalInitialQuantity = inventoryItems.reduce((sum, item) => sum + item.originalQuantity, 0)
    const usageEfficiency = totalInitialQuantity > 0 ? (totalUsage / totalInitialQuantity) * 100 : 0

    // 浪费减少 (0-100, 浪费越少分数越高)
    const totalWaste = wasteRecords.reduce((sum, record) => sum + record.wastedQuantity, 0)
    const wasteRate = totalInitialQuantity > 0 ? (totalWaste / totalInitialQuantity) * 100 : 0
    const wasteReduction = Math.max(0, 100 - wasteRate * 2) // 浪费率每增加1%，分数减少2分

    // 存储优化 (0-100)
    const expiredItems = inventoryItems.filter(item => item.status === 'EXPIRED').length
    const expiringItems = inventoryItems.filter(item => item.status === 'EXPIRING').length
    const storageOptimization = Math.max(0, 100 - (expiredItems * 10 + expiringItems * 5))

    // 采购规划 (0-100)
    const lowStockItems = inventoryItems.filter(item => item.isLowStock).length
    const outOfStockItems = inventoryItems.filter(item => item.status === 'OUT_OF_STOCK').length
    const purchasePlanning = Math.max(0, 100 - (lowStockItems * 8 + outOfStockItems * 15))

    // 总体评分
    const overallScore = (usageEfficiency * 0.3 + wasteReduction * 0.3 + storageOptimization * 0.2 + purchasePlanning * 0.2)

    // 生成分析
    const breakdown = this.generateEfficiencyBreakdown(
      usageEfficiency,
      wasteReduction,
      storageOptimization,
      purchasePlanning,
      { usageRecords, wasteRecords, inventoryItems }
    )

    return {
      overallScore: Math.round(overallScore),
      usageEfficiency: Math.round(usageEfficiency),
      wasteReduction: Math.round(wasteReduction),
      storageOptimization: Math.round(storageOptimization),
      purchasePlanning: Math.round(purchasePlanning),
      breakdown
    }
  }

  /**
   * 获取库存趋势数据
   */
  async getInventoryTrends(memberId: string, days: number = 30): Promise<{
    dailyInventory: Array<{
      date: string
      totalItems: number
      totalValue: number
      freshItems: number
      expiringItems: number
      expiredItems: number
    }>
    usageTrend: Array<{
      date: string
      usageCount: number
      totalUsage: number
    }>
    wasteTrend: Array<{
      date: string
      wasteCount: number
      totalWaste: number
      wasteValue: number
    }>
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 获取每日库存数据（模拟数据，实际应该基于历史记录）
    const dailyInventory = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const items = await prisma.inventoryItem.findMany({
        where: {
          memberId,
          createdAt: { lte: date },
          OR: [
            { deletedAt: null },
            { deletedAt: { gt: date } }
          ]
        }
      })

      const freshItems = items.filter(item => item.status === 'FRESH').length
      const expiringItems = items.filter(item => item.status === 'EXPIRING').length
      const expiredItems = items.filter(item => item.status === 'EXPIRED').length

      dailyInventory.push({
        date: dateStr,
        totalItems: items.length,
        totalValue: items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0),
        freshItems,
        expiringItems,
        expiredItems
      })
    }

    // 获取使用趋势
    const usageRecords = await prisma.inventoryUsage.groupBy({
      by: ['createdAt'],
      where: {
        memberId,
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { usedQuantity: true }
    })

    const usageTrend = usageRecords.map(record => ({
      date: record.createdAt.toISOString().split('T')[0],
      usageCount: record._count.id,
      totalUsage: record._sum.usedQuantity || 0
    }))

    // 获取浪费趋势
    const wasteRecords = await prisma.wasteLog.groupBy({
      by: ['createdAt'],
      where: {
        memberId,
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { wastedQuantity: true, estimatedCost: true }
    })

    const wasteTrend = wasteRecords.map(record => ({
      date: record.createdAt.toISOString().split('T')[0],
      wasteCount: record._count.id,
      totalWaste: record._sum.wastedQuantity || 0,
      wasteValue: record._sum.estimatedCost || 0
    }))

    return {
      dailyInventory: dailyInventory.reverse(),
      usageTrend,
      wasteTrend
    }
  }

  // 私有方法

  private async getInventoryItems(memberId: string, period: { startDate: Date; endDate: Date }) {
    return prisma.inventoryItem.findMany({
      where: {
        memberId,
        createdAt: { gte: period.startDate, lte: period.endDate }
      },
      include: {
        food: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    })
  }

  private async getUsageRecords(memberId: string, period: { startDate: Date; endDate: Date }) {
    return prisma.inventoryUsage.findMany({
      where: {
        memberId,
        createdAt: { gte: period.startDate, lte: period.endDate }
      },
      include: {
        inventoryItem: {
          include: {
            food: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        }
      }
    })
  }

  private async getWasteRecords(memberId: string, period: { startDate: Date; endDate: Date }) {
    return prisma.wasteLog.findMany({
      where: {
        memberId,
        createdAt: { gte: period.startDate, lte: period.endDate }
      },
      include: {
        inventoryItem: {
          include: {
            food: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        }
      }
    })
  }

  private generateSummary(items: any[], usageRecords: any[], wasteRecords: any[]) {
    const totalItems = items.length
    const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0)
    const usedItems = usageRecords.length
    const wastedItems = wasteRecords.length
    const totalQuantity = items.reduce((sum, item) => sum + item.originalQuantity, 0)
    const usedQuantity = usageRecords.reduce((sum, record) => sum + record.usedQuantity, 0)
    const wastedQuantity = wasteRecords.reduce((sum, record) => sum + record.wastedQuantity, 0)

    return {
      totalItems,
      totalValue,
      usedItems,
      wastedItems,
      wasteRate: totalQuantity > 0 ? (wastedQuantity / totalQuantity) * 100 : 0,
      usageRate: totalQuantity > 0 ? (usedQuantity / totalQuantity) * 100 : 0
    }
  }

  private async analyzeByCategory(memberId: string, period: { startDate: Date; endDate: Date }) {
    const items = await this.getInventoryItems(memberId, period)
    const usageRecords = await this.getUsageRecords(memberId, period)
    const wasteRecords = await this.getWasteRecords(memberId, period)

    const categoryMap = new Map()

    items.forEach(item => {
      const category = item.food.category
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          itemCount: 0,
          totalValue: 0,
          usedQuantity: 0,
          wastedQuantity: 0
        })
      }
      const stats = categoryMap.get(category)
      stats.itemCount++
      stats.totalValue += item.purchasePrice || 0
    })

    usageRecords.forEach(record => {
      const category = record.inventoryItem.food.category
      if (categoryMap.has(category)) {
        categoryMap.get(category).usedQuantity += record.usedQuantity
      }
    })

    wasteRecords.forEach(record => {
      const category = record.inventoryItem.food.category
      if (categoryMap.has(category)) {
        categoryMap.get(category).wastedQuantity += record.wastedQuantity
      }
    })

    return Array.from(categoryMap.values()).map(stats => ({
      ...stats,
      wasteRate: stats.usedQuantity > 0 ? (stats.wastedQuantity / (stats.usedQuantity + stats.wastedQuantity)) * 100 : 0,
      efficiency: stats.usedQuantity > 0 ? (stats.usedQuantity / (stats.usedQuantity + stats.wastedQuantity)) * 100 : 0
    }))
  }

  private async analyzeUsagePatterns(memberId: string, period: { startDate: Date; endDate: Date }) {
    const usageRecords = await this.getUsageRecords(memberId, period)
    const wasteRecords = await this.getWasteRecords(memberId, period)

    const usageMap = new Map()

    usageRecords.forEach(record => {
      const foodName = record.inventoryItem.food.name
      if (!usageMap.has(foodName)) {
        usageMap.set(foodName, {
          foodName,
          usageFrequency: 0,
          totalUsage: 0,
          wasteFrequency: 0,
          totalWaste: 0
        })
      }
      const stats = usageMap.get(foodName)
      stats.usageFrequency++
      stats.totalUsage += record.usedQuantity
    })

    wasteRecords.forEach(record => {
      const foodName = record.inventoryItem.food.name
      if (usageMap.has(foodName)) {
        usageMap.get(foodName).wasteFrequency++
        usageMap.get(foodName).totalWaste += record.wastedQuantity
      }
    })

    return Array.from(usageMap.values()).map(stats => ({
      ...stats,
      averageUsage: stats.usageFrequency > 0 ? stats.totalUsage / stats.usageFrequency : 0,
      efficiency: stats.totalUsage > 0 ? (stats.totalUsage / (stats.totalUsage + stats.totalWaste)) * 100 : 0
    })).sort((a, b) => b.usageFrequency - a.usageFrequency)
  }

  private async analyzeWaste(memberId: string, period: { startDate: Date; endDate: Date }) {
    const wasteRecords = await this.getWasteRecords(memberId, period)

    const totalWasteValue = wasteRecords.reduce((sum, record) => sum + (record.estimatedCost || 0), 0)

    // 按原因分组
    const wasteByReason = new Map()
    wasteRecords.forEach(record => {
      const reason = record.wasteReason
      if (!wasteByReason.has(reason)) {
        wasteByReason.set(reason, { reason, count: 0, value: 0 })
      }
      const stats = wasteByReason.get(reason)
      stats.count++
      stats.value += record.estimatedCost || 0
    })

    // 按分类分组
    const wasteByCategory = new Map()
    wasteRecords.forEach(record => {
      const category = record.inventoryItem.food.category
      if (!wasteByCategory.has(category)) {
        wasteByCategory.set(category, { category, count: 0, value: 0 })
      }
      const stats = wasteByCategory.get(category)
      stats.count++
      stats.value += record.estimatedCost || 0
    })

    // 浪费最多的物品
    const topWastedItems = new Map()
    wasteRecords.forEach(record => {
      const foodName = record.inventoryItem.food.name
      if (!topWastedItems.has(foodName)) {
        topWastedItems.set(foodName, { foodName, wasteCount: 0, totalWasteValue: 0 })
      }
      const stats = topWastedItems.get(foodName)
      stats.wasteCount++
      stats.totalWasteValue += record.estimatedCost || 0
    })

    return {
      totalWasteValue,
      wasteByReason: Array.from(wasteByReason.values()).map(stats => ({
        ...stats,
        percentage: totalWasteValue > 0 ? (stats.value / totalWasteValue) * 100 : 0
      })),
      wasteByCategory: Array.from(wasteByCategory.values()).map(stats => ({
        ...stats,
        percentage: totalWasteValue > 0 ? (stats.value / totalWasteValue) * 100 : 0
      })),
      topWastedItems: Array.from(topWastedItems.values())
        .map(stats => ({ ...stats, wasteRate: stats.wasteCount }))
        .sort((a, b) => b.totalWasteValue - a.totalWasteValue)
        .slice(0, 10)
    }
  }

  private generateRecommendations(summary: any, categoryAnalysis: any[], wasteAnalysis: any) {
    const recommendations = []

    // 基于浪费率的建议
    if (summary.wasteRate > 20) {
      recommendations.push({
        type: 'WASTE_REDUCTION' as const,
        priority: 'HIGH' as const,
        title: '减少食物浪费',
        description: `您的食物浪费率为${summary.wasteRate.toFixed(1)}%，建议优化采购量和存储方式`,
        potentialSavings: wasteAnalysis.totalWasteValue * 0.5
      })
    }

    // 基于分类分析的建议
    const worstCategory = categoryAnalysis.reduce((worst, current) => 
      current.wasteRate > worst.wasteRate ? current : worst
    )
    
    if (worstCategory.wasteRate > 30) {
      recommendations.push({
        type: 'PURCHASE' as const,
        priority: 'MEDIUM' as const,
        title: `优化${worstCategory.category}采购`,
        description: `${worstCategory.category}类食材浪费率较高，建议减少采购量或改善存储条件`
      })
    }

    return recommendations
  }

  private async getFrequentUsageItems(memberId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    return prisma.inventoryUsage.groupBy({
      by: ['inventoryItemId'],
      where: {
        memberId,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true },
      _sum: { usedQuantity: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }).then(async (results) => {
      const items = await Promise.all(
        results.map(async (result) => {
          const item = await prisma.inventoryItem.findUnique({
            where: { id: result.inventoryItemId },
            include: {
              food: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              }
            }
          })
          return {
            foodId: item!.foodId,
            foodName: item!.food.name,
            category: item!.food.category,
            unit: item!.unit,
            usageFrequency: result._count.id,
            totalUsage: result._sum.usedQuantity || 0,
            averageUsage: (result._sum.usedQuantity || 0) / result._count.id
          }
        })
      )
      return items
    })
  }

  private async getSeasonalSuggestions(memberId: string): Promise<PurchaseSuggestion[]> {
    // 基于当前季节生成建议
    const currentMonth = new Date().getMonth()
    const seasonalItems = this.getSeasonalItems(currentMonth)

    const suggestions: PurchaseSuggestion[] = []
    
    for (const seasonalItem of seasonalItems) {
      const existingStock = await prisma.inventoryItem.findFirst({
        where: {
          memberId,
          food: { name: seasonalItem.name },
          deletedAt: null
        }
      })

      if (!existingStock || existingStock.quantity < seasonalItem.suggestedQuantity) {
        suggestions.push({
          foodId: seasonalItem.foodId,
          foodName: seasonalItem.name,
          category: seasonalItem.category as FoodCategory,
          suggestedQuantity: seasonalItem.suggestedQuantity,
          unit: seasonalItem.unit,
          reason: seasonalItem.reason,
          priority: 'MEDIUM'
        })
      }
    }

    return suggestions
  }

  private getSeasonalItems(month: number) {
    // 简化的季节性建议逻辑
    const seasonalMap = {
      0: [ // 一月
        { name: '白菜', category: 'VEGETABLES', suggestedQuantity: 2, unit: '颗', reason: '冬季蔬菜，适合储存' },
        { name: '萝卜', category: 'VEGETABLES', suggestedQuantity: 3, unit: '根', reason: '冬季根茎类蔬菜' }
      ],
      1: [ // 二月
        { name: '土豆', category: 'VEGETABLES', suggestedQuantity: 5, unit: '斤', reason: '耐储存的根茎类' }
      ],
      // ... 其他月份的季节性建议
    }

    return seasonalMap[month as keyof typeof seasonalMap] || []
  }

  private estimateCost(foodId: string, quantity: number, unit: string): number {
    // 简化的成本估算，实际应该基于历史价格数据
    return 0
  }

  private generateEfficiencyBreakdown(
    usageEfficiency: number,
    wasteReduction: number,
    storageOptimization: number,
    purchasePlanning: number,
    data: any
  ) {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const improvements: string[] = []

    if (usageEfficiency > 80) strengths.push('食材使用效率高')
    if (wasteReduction > 80) strengths.push('食物浪费控制良好')
    if (storageOptimization > 80) strengths.push('存储管理优秀')
    if (purchasePlanning > 80) strengths.push('采购规划合理')

    if (usageEfficiency < 50) weaknesses.push('食材使用效率偏低')
    if (wasteReduction < 50) weaknesses.push('食物浪费严重')
    if (storageOptimization < 50) weaknesses.push('存储条件需要改善')
    if (purchasePlanning < 50) weaknesses.push('采购计划需要优化')

    if (usageEfficiency < 70) improvements.push('优化食材使用计划')
    if (wasteReduction < 70) improvements.push('减少食物浪费')
    if (storageOptimization < 70) improvements.push('改善存储条件')
    if (purchasePlanning < 70) improvements.push('制定更合理的采购计划')

    return { strengths, weaknesses, improvements }
  }
}

export const inventoryAnalyzer = new InventoryAnalyzer()
