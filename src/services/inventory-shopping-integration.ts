import { PrismaClient, ShoppingItem, ListStatus, InventoryStatus } from '@prisma/client'
import { inventoryTracker } from './inventory-tracker'

const prisma = new PrismaClient()

export interface ShoppingSuggestion {
  foodId: string
  foodName: string
  category: string
  suggestedQuantity: number
  unit: string
  reason: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedPrice?: number
  currentStock?: number
  minStockThreshold?: number
}

export interface InventoryBasedShoppingList {
  id: string
  name: string
  suggestions: ShoppingSuggestion[]
  totalEstimatedCost: number
  highPriorityCount: number
  mediumPriorityCount: number
  lowPriorityCount: number
}

export class InventoryShoppingIntegration {
  /**
   * 基于库存状态生成购物建议
   */
  async generateShoppingSuggestions(memberId: string): Promise<ShoppingSuggestion[]> {
    const suggestions: ShoppingSuggestion[] = []

    // 1. 基于库存不足的物品
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
      const suggestedQuantity = this.calculateSuggestedQuantity(item)
      suggestions.push({
        foodId: item.foodId,
        foodName: item.food.name,
        category: item.food.category,
        suggestedQuantity,
        unit: item.unit,
        reason: '库存不足，建议补货',
        priority: 'HIGH',
        currentStock: item.quantity,
        minStockThreshold: item.minStockThreshold || undefined
      })
    }

    // 2. 基于历史使用模式预测需求
    const frequentUsageItems = await this.getFrequentUsageItems(memberId)
    for (const item of frequentUsageItems) {
      // 检查是否需要补充
      const currentStock = await prisma.inventoryItem.findFirst({
        where: {
          memberId,
          foodId: item.foodId,
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' }
      })

      const weeklyUsage = item.averageUsage * 7
      const shouldRestock = !currentStock || currentStock.quantity < weeklyUsage

      if (shouldRestock) {
        const suggestedQuantity = weeklyUsage * 2 // 建议采购2周用量
        suggestions.push({
          foodId: item.foodId,
          foodName: item.foodName,
          category: item.category,
          suggestedQuantity,
          unit: item.unit,
          reason: '基于历史使用频率，建议定期采购',
          priority: 'MEDIUM',
          currentStock: currentStock?.quantity || 0
        })
      }
    }

    // 3. 基于季节性推荐
    const seasonalSuggestions = await this.getSeasonalSuggestions(memberId)
    suggestions.push(...seasonalSuggestions)

    // 4. 去重并按优先级排序
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions)
    return uniqueSuggestions.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * 创建基于库存的购物清单
   */
  async createInventoryBasedShoppingList(
    memberId: string,
    listName: string = '智能购物清单'
  ): Promise<InventoryBasedShoppingList> {
    const suggestions = await this.generateShoppingSuggestions(memberId)

    // 计算总预估成本
    const totalEstimatedCost = await this.calculateEstimatedCost(suggestions)

    // 统计优先级分布
    const highPriorityCount = suggestions.filter(s => s.priority === 'HIGH').length
    const mediumPriorityCount = suggestions.filter(s => s.priority === 'MEDIUM').length
    const lowPriorityCount = suggestions.filter(s => s.priority === 'LOW').length

    // 创建购物清单
    const shoppingList = await prisma.shoppingList.create({
      data: {
        name: listName,
        memberId,
        budget: totalEstimatedCost * 1.2, // 预算增加20%缓冲
        estimatedCost: totalEstimatedCost,
        status: ListStatus.PENDING
      }
    })

    // 添加购物项目
    for (const suggestion of suggestions) {
      await prisma.shoppingItem.create({
        data: {
          listId: shoppingList.id,
          foodId: suggestion.foodId,
          amount: suggestion.suggestedQuantity,
          category: suggestion.category as any,
          estimatedPrice: suggestion.estimatedPrice,
          addedBy: memberId
        }
      })
    }

    return {
      id: shoppingList.id,
      name: shoppingList.name,
      suggestions,
      totalEstimatedCost,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount
    }
  }

  /**
   * 同步购物清单到库存
   */
  async syncShoppingListToInventory(
    listId: string,
    memberId: string,
    purchasedItems: Array<{
      shoppingItemId: string
      actualQuantity: number
      actualPrice?: number
    }>
  ): Promise<{
    success: boolean
    addedItems: number
    updatedItems: number
    errors: string[]
  }> {
    const result = {
      success: true,
      addedItems: 0,
      updatedItems: 0,
      errors: []
    }

    try {
      // 获取购物清单详情
      const shoppingList = await prisma.shoppingList.findUnique({
        where: { id: listId },
        include: {
          items: {
            include: {
              food: true
            }
          }
        }
      })

      if (!shoppingList) {
        throw new Error('购物清单不存在')
      }

      for (const purchasedItem of purchasedItems) {
        try {
          const shoppingItem = shoppingList.items.find(item => item.id === purchasedItem.shoppingItemId)
          if (!shoppingItem) {
            result.errors.push(`购物项目 ${purchasedItem.shoppingItemId} 不存在`)
            continue
          }

          // 检查是否已存在相同食材的库存
          const existingItem = await prisma.inventoryItem.findFirst({
            where: {
              memberId,
              foodId: shoppingItem.foodId,
              deletedAt: null
            },
            orderBy: { createdAt: 'desc' }
          })

          if (existingItem) {
            // 更新现有库存
            const newQuantity = existingItem.quantity + purchasedItem.actualQuantity
            await inventoryTracker.updateInventoryItem(existingItem.id, {
              quantity: newQuantity,
              purchasePrice: purchasedItem.actualPrice,
              purchaseSource: `购物清单: ${shoppingList.name}`
            })
            result.updatedItems++
          } else {
            // 创建新库存条目
            await inventoryTracker.createInventoryItem({
              memberId,
              foodId: shoppingItem.foodId,
              quantity: purchasedItem.actualQuantity,
              unit: shoppingItem.unit || '个',
              purchasePrice: purchasedItem.actualPrice,
              purchaseSource: `购物清单: ${shoppingList.name}`,
              expiryDate: this.estimateExpiryDate(shoppingItem.food.category)
            })
            result.addedItems++
          }

          // 标记购物项目为已购买
          await prisma.shoppingItem.update({
            where: { id: purchasedItem.shoppingItemId },
            data: {
              purchased: true,
              purchasedAt: new Date(),
              actualPrice: purchasedItem.actualPrice,
              purchasedBy: memberId
            }
          })

        } catch (error) {
          result.errors.push(`处理购物项目 ${purchasedItem.shoppingItemId} 时出错: ${error}`)
        }
      }

      // 更新购物清单状态
      const allPurchased = shoppingList.items.every(item => 
        purchasedItems.some(purchased => purchased.shoppingItemId === item.id)
      )

      if (allPurchased) {
        await prisma.shoppingList.update({
          where: { id: listId },
          data: {
            status: ListStatus.COMPLETED,
            actualCost: purchasedItems.reduce((sum, item) => 
              sum + (item.actualPrice || 0), 0
            )
          }
        })
      }

    } catch (error) {
      result.success = false
      result.errors.push(`同步失败: ${error}`)
    }

    return result
  }

  /**
   * 基于库存优化购物清单
   */
  async optimizeShoppingList(listId: string, memberId: string): Promise<{
    optimizedItems: ShoppingSuggestion[]
    removedItems: string[]
    addedItems: ShoppingSuggestion[]
    savings: number
  }> {
    // 获取当前库存状态
    const currentInventory = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        deletedAt: null
      },
      include: {
        food: true
      }
    })

    // 获取购物清单
    const shoppingList = await prisma.shoppingList.findUnique({
      where: { id: listId },
      include: {
        items: {
          include: {
            food: true
          }
        }
      }
    })

    if (!shoppingList) {
      throw new Error('购物清单不存在')
    }

    const optimizedItems: ShoppingSuggestion[] = []
    const removedItems: string[] = []
    const addedItems: ShoppingSuggestion[] = []

    // 检查每个购物项目
    for (const shoppingItem of shoppingList.items) {
      const inventoryItem = currentInventory.find(item => item.foodId === shoppingItem.foodId)
      
      if (inventoryItem && inventoryItem.quantity > inventoryItem.minStockThreshold!) {
        // 库存充足，可以移除或减少数量
        const excessQuantity = inventoryItem.quantity - (inventoryItem.minStockThreshold || 0)
        
        if (excessQuantity >= shoppingItem.amount) {
          // 完全不需要购买
          removedItems.push(shoppingItem.id)
        } else {
          // 减少购买数量
          const reducedQuantity = shoppingItem.amount - excessQuantity
          optimizedItems.push({
            foodId: shoppingItem.foodId,
            foodName: shoppingItem.food.name,
            category: shoppingItem.food.category,
            suggestedQuantity: reducedQuantity,
            unit: shoppingItem.unit || '个',
            reason: '库存已有部分，减少购买量',
            priority: 'MEDIUM'
          })
        }
      } else {
        // 需要购买，保持原数量或适当调整
        optimizedItems.push({
          foodId: shoppingItem.foodId,
          foodName: shoppingItem.food.name,
          category: shoppingItem.food.category,
          suggestedQuantity: shoppingItem.amount,
          unit: shoppingItem.unit || '个',
          reason: '库存不足，需要购买',
          priority: 'HIGH'
        })
      }
    }

    // 添加基于库存的额外建议
    const additionalSuggestions = await this.generateShoppingSuggestions(memberId)
    const newSuggestions = additionalSuggestions.filter(suggestion => 
      !shoppingList.items.some(item => item.foodId === suggestion.foodId) &&
      !optimizedItems.some(item => item.foodId === suggestion.foodId)
    )

    addedItems.push(...newSuggestions.slice(0, 5)) // 最多添加5个新建议

    // 计算节省金额
    const originalCost = shoppingList.items.reduce((sum, item) => 
      sum + (item.estimatedPrice || 0), 0
    )
    const optimizedCost = optimizedItems.reduce((sum, item) => 
      sum + (item.estimatedPrice || 0), 0
    )
    const savings = originalCost - optimizedCost

    return {
      optimizedItems,
      removedItems,
      addedItems,
      savings
    }
  }

  // 私有方法

  private calculateSuggestedQuantity(item: any): number {
    const threshold = item.minStockThreshold || 1
    const currentQuantity = item.quantity
    
    if (currentQuantity <= 0) {
      return threshold * 2 // 如果没有库存，建议采购2倍阈值
    } else {
      return threshold * 2 - currentQuantity // 采购到2倍阈值
    }
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
      take: 20
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

  private async getSeasonalSuggestions(memberId: string): Promise<ShoppingSuggestion[]> {
    const currentMonth = new Date().getMonth()
    const seasonalItems = this.getSeasonalItems(currentMonth)

    const suggestions: ShoppingSuggestion[] = []
    
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
          category: seasonalItem.category,
          suggestedQuantity: seasonalItem.suggestedQuantity,
          unit: seasonalItem.unit,
          reason: seasonalItem.reason,
          priority: 'LOW'
        })
      }
    }

    return suggestions
  }

  private getSeasonalItems(month: number) {
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

  private deduplicateSuggestions(suggestions: ShoppingSuggestion[]): ShoppingSuggestion[] {
    const uniqueMap = new Map<string, ShoppingSuggestion>()

    for (const suggestion of suggestions) {
      const existing = uniqueMap.get(suggestion.foodId)
      
      if (!existing || suggestion.priority === 'HIGH' || 
          (suggestion.priority === 'MEDIUM' && existing.priority === 'LOW')) {
        uniqueMap.set(suggestion.foodId, suggestion)
      }
    }

    return Array.from(uniqueMap.values())
  }

  private async calculateEstimatedCost(suggestions: ShoppingSuggestion[]): Promise<number> {
    // 简化的成本估算，实际应该基于历史价格数据
    return suggestions.reduce((sum, suggestion) => 
      sum + (suggestion.estimatedPrice || 0), 0
    )
  }

  private estimateExpiryDate(category: string): Date {
    const now = new Date()
    let daysToAdd = 7

    const expiryMap: { [key: string]: number } = {
      'VEGETABLES': 5,
      'FRUITS': 7,
      'PROTEIN': 3,
      'SEAFOOD': 2,
      'DAIRY': 10,
      'GRAINS': 30
    }

    daysToAdd = expiryMap[category] || 7
    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
  }
}

export const inventoryShoppingIntegration = new InventoryShoppingIntegration()
