import { PrismaClient } from '@prisma/client'
import { 
  Budget, 
  BudgetPeriod, 
  BudgetStatus, 
  Spending,
  FoodCategory 
} from '@prisma/client'

const prisma = new PrismaClient()

export interface BudgetCreateInput {
  memberId: string
  name: string
  period: BudgetPeriod
  startDate: Date
  endDate: Date
  totalAmount: number
  vegetableBudget?: number
  meatBudget?: number
  fruitBudget?: number
  grainBudget?: number
  dairyBudget?: number
  otherBudget?: number
  alertThreshold80?: boolean
  alertThreshold100?: boolean
  alertThreshold110?: boolean
}

export interface BudgetUpdateInput {
  name?: string
  totalAmount?: number
  vegetableBudget?: number
  meatBudget?: number
  fruitBudget?: number
  grainBudget?: number
  dairyBudget?: number
  otherBudget?: number
  alertThreshold80?: boolean
  alertThreshold100?: boolean
  alertThreshold110?: boolean
}

export interface SpendingCreateInput {
  budgetId: string
  amount: number
  category: FoodCategory
  description: string
  transactionId?: string
  platform?: string
  items?: any[]
  purchaseDate?: Date
}

export interface BudgetStatus {
  budget: Budget
  usedAmount: number
  remainingAmount: number
  usagePercentage: number
  categoryUsage: {
    [key in FoodCategory]?: {
      budget: number
      used: number
      remaining: number
      percentage: number
    }
  }
  dailyAverage: number
  daysRemaining: number
  projectedSpend: number
  alerts: string[]
}

export class BudgetTracker {
  /**
   * 创建新预算
   */
  async createBudget(data: BudgetCreateInput): Promise<Budget> {
    // 验证日期范围
    if (data.endDate <= data.startDate) {
      throw new Error('结束日期必须晚于开始日期')
    }

    // 验证分类预算总和不超过总预算
    const categoryTotal = 
      (data.vegetableBudget || 0) +
      (data.meatBudget || 0) +
      (data.fruitBudget || 0) +
      (data.grainBudget || 0) +
      (data.dairyBudget || 0) +
      (data.otherBudget || 0)

    if (categoryTotal > data.totalAmount) {
      throw new Error('分类预算总和不能超过总预算')
    }

    const budget = await prisma.budget.create({
      data: {
        ...data,
        remainingAmount: data.totalAmount,
        usagePercentage: 0
      }
    })

    return budget
  }

  /**
   * 更新预算
   */
  async updateBudget(id: string, data: BudgetUpdateInput): Promise<Budget> {
    // 获取当前预算
    const currentBudget = await prisma.budget.findUnique({
      where: { id },
      include: { spendings: true }
    })

    if (!currentBudget) {
      throw new Error('预算不存在')
    }

    // 如果更新了总预算或分类预算，需要验证
    if (data.totalAmount || 
        data.vegetableBudget !== undefined ||
        data.meatBudget !== undefined ||
        data.fruitBudget !== undefined ||
        data.grainBudget !== undefined ||
        data.dairyBudget !== undefined ||
        data.otherBudget !== undefined) {
      
      const newTotalAmount = data.totalAmount || currentBudget.totalAmount
      const categoryTotal = 
        (data.vegetableBudget ?? currentBudget.vegetableBudget ?? 0) +
        (data.meatBudget ?? currentBudget.meatBudget ?? 0) +
        (data.fruitBudget ?? currentBudget.fruitBudget ?? 0) +
        (data.grainBudget ?? currentBudget.grainBudget ?? 0) +
        (data.dairyBudget ?? currentBudget.dairyBudget ?? 0) +
        (data.otherBudget ?? currentBudget.otherBudget ?? 0)

      if (categoryTotal > newTotalAmount) {
        throw new Error('分类预算总和不能超过总预算')
      }

      // 重新计算剩余金额和使用百分比
      const usedAmount = currentBudget.usedAmount
      const remainingAmount = Math.max(0, newTotalAmount - usedAmount)
      const usagePercentage = (usedAmount / newTotalAmount) * 100

      data = {
        ...data,
        remainingAmount,
        usagePercentage
      } as BudgetUpdateInput
    }

    const budget = await prisma.budget.update({
      where: { id },
      data
    })

    return budget
  }

  /**
   * 记录支出
   */
  async recordSpending(data: SpendingCreateInput): Promise<Spending> {
    // 获取预算信息
    const budget = await prisma.budget.findUnique({
      where: { id: data.budgetId }
    })

    if (!budget) {
      throw new Error('预算不存在')
    }

    if (budget.status !== BudgetStatus.ACTIVE) {
      throw new Error('预算未激活，无法记录支出')
    }

    // 检查日期是否在预算期间内
    const purchaseDate = data.purchaseDate || new Date()
    if (purchaseDate < budget.startDate || purchaseDate > budget.endDate) {
      throw new Error('支出日期不在预算期间内')
    }

    // 创建支出记录
    const spending = await prisma.spending.create({
      data: {
        ...data,
        purchaseDate
      }
    })

    // 更新预算使用情况
    await this.updateBudgetUsage(data.budgetId)

    // 检查是否需要触发预警
    await this.checkBudgetAlerts(data.budgetId)

    return spending
  }

  /**
   * 更新预算使用情况
   */
  private async updateBudgetUsage(budgetId: string): Promise<void> {
    // 计算总支出
    const totalSpent = await prisma.spending.aggregate({
      where: { 
        budgetId,
        deletedAt: null 
      },
      _sum: { amount: true }
    })

    const usedAmount = totalSpent._sum.amount || 0

    // 获取预算信息
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    })

    if (!budget) return

    const remainingAmount = Math.max(0, budget.totalAmount - usedAmount)
    const usagePercentage = budget.totalAmount > 0 ? (usedAmount / budget.totalAmount) * 100 : 0

    // 更新预算
    await prisma.budget.update({
      where: { id: budgetId },
      data: {
        usedAmount,
        remainingAmount,
        usagePercentage
      }
    })
  }

  /**
   * 检查预算预警
   */
  private async checkBudgetAlerts(budgetId: string): Promise<void> {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    })

    if (!budget) return

    const alerts = []

    // 检查80%预警
    if (budget.alertThreshold80 && budget.usagePercentage! >= 80 && budget.usagePercentage! < 100) {
      alerts.push({
        type: 'WARNING_80',
        threshold: 80,
        currentValue: budget.usagePercentage,
        message: `预算使用已达到${budget.usagePercentage!.toFixed(1)}%，请注意控制支出`
      })
    }

    // 检查100%预警
    if (budget.alertThreshold100 && budget.usagePercentage! >= 100 && budget.usagePercentage! < 110) {
      alerts.push({
        type: 'WARNING_100',
        threshold: 100,
        currentValue: budget.usagePercentage,
        message: `预算已用完！当前使用${budget.usagePercentage!.toFixed(1)}%`
      })
    }

    // 检查110%超支预警
    if (budget.alertThreshold110 && budget.usagePercentage! >= 110) {
      alerts.push({
        type: 'OVER_BUDGET_110',
        threshold: 110,
        currentValue: budget.usagePercentage,
        message: `预算严重超支！当前使用${budget.usagePercentage!.toFixed(1)}%`
      })
    }

    // 检查分类预算预警
    await this.checkCategoryAlerts(budgetId)

    // 检查日均超标预警
    await this.checkDailyAverageAlert(budgetId)

    // 创建预警记录
    for (const alert of alerts) {
      await prisma.budgetAlert.create({
        data: {
          budgetId,
          type: alert.type,
          threshold: alert.threshold,
          currentValue: alert.currentValue,
          message: alert.message
        }
      })
    }
  }

  /**
   * 检查分类预算预警
   */
  private async checkCategoryAlerts(budgetId: string): Promise<void> {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    })

    if (!budget) return

    const categories = [
      { field: 'vegetableBudget', category: FoodCategory.VEGETABLES },
      { field: 'meatBudget', category: FoodCategory.PROTEIN },
      { field: 'fruitBudget', category: FoodCategory.FRUITS },
      { field: 'grainBudget', category: FoodCategory.GRAINS },
      { field: 'dairyBudget', category: FoodCategory.DAIRY },
      { field: 'otherBudget', category: FoodCategory.OTHER }
    ]

    for (const { field, category } of categories) {
      const categoryBudget = (budget as any)[field]
      if (!categoryBudget) continue

      // 计算分类支出
      const categorySpent = await prisma.spending.aggregate({
        where: { 
          budgetId,
          category,
          deletedAt: null 
        },
        _sum: { amount: true }
      })

      const usedAmount = categorySpent._sum.amount || 0
      const usagePercentage = (usedAmount / categoryBudget) * 100

      if (usagePercentage >= 100) {
        await prisma.budgetAlert.create({
          data: {
            budgetId,
            type: 'CATEGORY_OVER',
            threshold: 100,
            currentValue: usagePercentage,
            message: `${category}分类预算已超支！当前使用${usagePercentage.toFixed(1)}%`
          }
        })
      }
    }
  }

  /**
   * 检查日均超标预警
   */
  private async checkDailyAverageAlert(budgetId: string): Promise<void> {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    })

    if (!budget) return

    const now = new Date()
    const daysElapsed = Math.ceil((now.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.ceil((budget.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysElapsed <= 0) return

    const dailyBudget = budget.totalAmount / Math.ceil((budget.endDate.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const currentDailyAverage = budget.usedAmount / daysElapsed

    if (currentDailyAverage > dailyBudget * 1.2) { // 超过日均预算20%
      await prisma.budgetAlert.create({
        data: {
          budgetId,
          type: 'DAILY_EXCESS',
          threshold: dailyBudget * 1.2,
          currentValue: currentDailyAverage,
          message: `当前日均支出${currentDailyAverage.toFixed(2)}元超过预算${dailyBudget.toFixed(2)}元`
        }
      })
    }
  }

  /**
   * 获取预算状态
   */
  async getBudgetStatus(budgetId: string): Promise<BudgetStatus> {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      include: {
        spendings: {
          where: { deletedAt: null }
        },
        alerts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!budget) {
      throw new Error('预算不存在')
    }

    const now = new Date()
    const daysElapsed = Math.ceil((now.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.ceil((budget.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const totalDays = Math.ceil((budget.endDate.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24))

    const dailyAverage = daysElapsed > 0 ? budget.usedAmount / daysElapsed : 0
    const projectedSpend = dailyAverage * totalDays

    // 计算分类使用情况
    const categoryUsage: { [key in FoodCategory]?: any } = {}
    const categories = [
      { field: 'vegetableBudget', category: FoodCategory.VEGETABLES },
      { field: 'meatBudget', category: FoodCategory.PROTEIN },
      { field: 'fruitBudget', category: FoodCategory.FRUITS },
      { field: 'grainBudget', category: FoodCategory.GRAINS },
      { field: 'dairyBudget', category: FoodCategory.DAIRY },
      { field: 'otherBudget', category: FoodCategory.OTHER }
    ]

    for (const { field, category } of categories) {
      const categoryBudget = (budget as any)[field]
      if (!categoryBudget) continue

      const categorySpent = budget.spendings
        .filter(s => s.category === category)
        .reduce((sum, s) => sum + s.amount, 0)

      categoryUsage[category] = {
        budget: categoryBudget,
        used: categorySpent,
        remaining: Math.max(0, categoryBudget - categorySpent),
        percentage: (categorySpent / categoryBudget) * 100
      }
    }

    // 获取预警消息
    const alerts = budget.alerts.map(alert => alert.message)

    return {
      budget,
      usedAmount: budget.usedAmount,
      remainingAmount: budget.remainingAmount || 0,
      usagePercentage: budget.usagePercentage || 0,
      categoryUsage,
      dailyAverage,
      daysRemaining: Math.max(0, daysRemaining),
      projectedSpend,
      alerts
    }
  }

  /**
   * 获取用户的所有预算
   */
  async getUserBudgets(memberId: string, status?: BudgetStatus): Promise<Budget[]> {
    return prisma.budget.findMany({
      where: {
        memberId,
        status: status || undefined,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * 删除预算
   */
  async deleteBudget(id: string): Promise<void> {
    await prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  /**
   * 获取支出历史
   */
  async getSpendingHistory(budgetId: string, category?: FoodCategory): Promise<Spending[]> {
    return prisma.spending.findMany({
      where: {
        budgetId,
        category: category || undefined,
        deletedAt: null
      },
      orderBy: { purchaseDate: 'desc' }
    })
  }
}

export const budgetTracker = new BudgetTracker()
