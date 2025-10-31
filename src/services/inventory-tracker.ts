import { PrismaClient, InventoryItem, InventoryUsage, InventoryStatus, StorageLocation } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateInventoryItemInput {
  memberId: string
  foodId: string
  quantity: number
  unit: string
  purchasePrice?: number
  purchaseSource?: string
  expiryDate?: Date
  productionDate?: Date
  storageLocation?: StorageLocation
  storageNotes?: string
  minStockThreshold?: number
  barcode?: string
  brand?: string
  packageInfo?: string
}

export interface UpdateInventoryItemInput {
  quantity?: number
  unit?: string
  purchasePrice?: number
  purchaseSource?: string
  expiryDate?: Date
  productionDate?: Date
  storageLocation?: StorageLocation
  storageNotes?: string
  minStockThreshold?: number
  barcode?: string
  brand?: string
  packageInfo?: string
}

export interface InventoryFilters {
  status?: InventoryStatus
  storageLocation?: StorageLocation
  category?: string
  isExpiring?: boolean
  isExpired?: boolean
  isLowStock?: boolean
}

export interface InventoryWhereClause {
  memberId: string
  status?: InventoryStatus
  storageLocation?: StorageLocation
  food?: {
    category?: string
  }
  expiryDate?: {
    lt?: Date
    gt?: Date
  }
  quantity?: {
    lt?: number
  }
}

export interface WasteRecord {
  id: string
  inventoryItemId: string
  quantity: number
  reason: string
  wasteDate: Date
  notes?: string
  createdAt: Date
}

export interface InventoryItemWithRelations extends InventoryItem {
  food: {
    id: string
    name: string
    nameEn?: string
    category: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  usageRecords: InventoryUsage[]
  wasteRecords: WasteRecord[]
}

export class InventoryTracker {
  /**
   * 创建库存条目
   */
  async createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItemWithRelations> {
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        ...input,
        originalQuantity: input.quantity,
        daysToExpiry: input.expiryDate ? this.calculateDaysToExpiry(input.expiryDate) : null,
        status: this.calculateInventoryStatus(input.quantity, input.expiryDate, input.minStockThreshold),
        isLowStock: input.minStockThreshold ? input.quantity <= input.minStockThreshold : false
      },
      include: {
        food: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            category: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true
          }
        },
        usageRecords: true,
        wasteRecords: true
      }
    })

    return inventoryItem
  }

  /**
   * 更新库存条目
   */
  async updateInventoryItem(
    id: string,
    input: UpdateInventoryItemInput
  ): Promise<InventoryItemWithRelations> {
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id }
    })

    if (!existingItem) {
      throw new Error('库存条目不存在')
    }

    const updateData: Partial<UpdateInventoryItemInput> = { ...input }

    // 如果更新了数量或阈值，重新计算状态
    if (input.quantity !== undefined || input.minStockThreshold !== undefined) {
      const quantity = input.quantity ?? existingItem.quantity
      const minStockThreshold = input.minStockThreshold ?? existingItem.minStockThreshold
      
      updateData.status = this.calculateInventoryStatus(
        quantity,
        input.expiryDate ?? existingItem.expiryDate,
        minStockThreshold
      )
      updateData.isLowStock = minStockThreshold ? quantity <= minStockThreshold : false
    }

    // 如果更新了保质期，重新计算剩余天数
    if (input.expiryDate !== undefined) {
      updateData.daysToExpiry = this.calculateDaysToExpiry(input.expiryDate)
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
      include: {
        food: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            category: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true
          }
        },
        usageRecords: true,
        wasteRecords: true
      }
    })

    return updatedItem
  }

  /**
   * 删除库存条目
   */
  async deleteInventoryItem(id: string): Promise<void> {
    await prisma.inventoryItem.delete({
      where: { id }
    })
  }

  /**
   * 获取用户的库存列表
   */
  async getInventoryItems(
    memberId: string,
    filters?: {
      status?: InventoryStatus
      storageLocation?: StorageLocation
      category?: string
      isExpiring?: boolean
      isExpired?: boolean
      isLowStock?: boolean
    }
  ): Promise<InventoryItemWithRelations[]> {
    const where: InventoryWhereClause = { memberId }

    if (filters) {
      if (filters.status) where.status = filters.status
      if (filters.storageLocation) where.storageLocation = filters.storageLocation
      if (filters.isLowStock) where.isLowStock = true

      // 处理临期和过期筛选
      if (filters.isExpiring || filters.isExpired) {
        const now = new Date()
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        if (filters.isExpiring) {
          where.expiryDate = {
            gte: now,
            lte: sevenDaysLater
          }
        }
        if (filters.isExpired) {
          where.expiryDate = {
            lt: now
          }
        }
      }

      // 处理食物分类筛选
      if (filters.category) {
        where.food = {
          category: filters.category
        }
      }
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        food: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            category: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true
          }
        },
        usageRecords: {
          orderBy: { usedAt: 'desc' },
          take: 5
        },
        wasteRecords: {
          orderBy: { wastedAt: 'desc' },
          take: 5
        }
      },
      orderBy: [
        { status: 'asc' },
        { expiryDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return items
  }

  /**
   * 获取单个库存条目详情
   */
  async getInventoryItemById(id: string): Promise<InventoryItemWithRelations | null> {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        food: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            category: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true
          }
        },
        usageRecords: {
          orderBy: { usedAt: 'desc' }
        },
        wasteRecords: {
          orderBy: { wastedAt: 'desc' }
        }
      }
    })

    return item
  }

  /**
   * 使用库存
   */
  async useInventory(
    inventoryItemId: string,
    usedQuantity: number,
    usageType: string,
    memberId: string,
    options?: {
      relatedId?: string
      relatedType?: string
      notes?: string
      recipeName?: string
    }
  ): Promise<InventoryItemWithRelations> {
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId }
    })

    if (!inventoryItem) {
      throw new Error('库存条目不存在')
    }

    if (inventoryItem.quantity < usedQuantity) {
      throw new Error('库存不足')
    }

    // 创建使用记录
    await prisma.inventoryUsage.create({
      data: {
        inventoryItemId,
        memberId,
        usedQuantity,
        usageType,
        relatedId: options?.relatedId,
        relatedType: options?.relatedType,
        notes: options?.notes,
        recipeName: options?.recipeName
      }
    })

    // 更新库存数量
    const newQuantity = inventoryItem.quantity - usedQuantity
    const updatedItem = await this.updateInventoryItem(inventoryItemId, {
      quantity: newQuantity
    })

    return updatedItem
  }

  /**
   * 批量使用库存（用于食谱烹饪）
   */
  async useInventoryForRecipe(
    memberId: string,
    ingredients: Array<{
      foodId: string
      quantity: number
      unit: string
    }>,
    recipeName: string
  ): Promise<InventoryItemWithRelations[]> {
    const results: InventoryItemWithRelations[] = []

    for (const ingredient of ingredients) {
      // 查找匹配的库存条目（优先使用临期食材）
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          memberId,
          foodId: ingredient.foodId,
          quantity: { gte: ingredient.quantity },
          deletedAt: null
        },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              category: true,
              calories: true,
              protein: true,
              carbs: true,
              fat: true
            }
          },
          usageRecords: true,
          wasteRecords: true
        },
        orderBy: [
          { expiryDate: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      if (inventoryItem) {
        const updatedItem = await this.useInventory(
          inventoryItem.id,
          ingredient.quantity,
          'COOKING',
          memberId,
          {
            recipeName,
            notes: `食谱：${recipeName}`
          }
        )
        results.push(updatedItem)
      }
    }

    return results
  }

  /**
   * 计算剩余保质期天数
   */
  private calculateDaysToExpiry(expiryDate: Date): number {
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  /**
   * 计算库存状态
   */
  private calculateInventoryStatus(
    quantity: number,
    expiryDate?: Date,
    minStockThreshold?: number
  ): InventoryStatus {
    if (quantity <= 0) {
      return InventoryStatus.OUT_OF_STOCK
    }

    if (minStockThreshold && quantity <= minStockThreshold) {
      return InventoryStatus.LOW_STOCK
    }

    if (expiryDate) {
      const now = new Date()
      const daysToExpiry = this.calculateDaysToExpiry(expiryDate)

      if (daysToExpiry < 0) {
        return InventoryStatus.EXPIRED
      } else if (daysToExpiry <= 3) {
        return InventoryStatus.EXPIRING
      }
    }

    return InventoryStatus.FRESH
  }

  /**
   * 获取库存统计信息
   */
  async getInventoryStats(memberId: string): Promise<{
    totalItems: number
    totalCategories: number
    freshItems: number
    expiringItems: number
    expiredItems: number
    lowStockItems: number
    outOfStockItems: number
    estimatedValue: number
  }> {
    const items = await prisma.inventoryItem.findMany({
      where: { memberId, deletedAt: null },
      include: {
        food: {
          select: { category: true }
        }
      }
    })

    const stats = {
      totalItems: items.length,
      totalCategories: new Set(items.map(item => item.food.category)).size,
      freshItems: items.filter(item => item.status === InventoryStatus.FRESH).length,
      expiringItems: items.filter(item => item.status === InventoryStatus.EXPIRING).length,
      expiredItems: items.filter(item => item.status === InventoryStatus.EXPIRED).length,
      lowStockItems: items.filter(item => item.status === InventoryStatus.LOW_STOCK).length,
      outOfStockItems: items.filter(item => item.status === InventoryStatus.OUT_OF_STOCK).length,
      estimatedValue: items.reduce((sum, item) => {
        return sum + (item.purchasePrice || 0)
      }, 0)
    }

    return stats
  }
}

export const inventoryTracker = new InventoryTracker()
