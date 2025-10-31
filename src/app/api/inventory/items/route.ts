import { NextRequest, NextResponse } from 'next/server'
import { inventoryTracker } from '@/services/inventory-tracker'
import { getCurrentUser } from '@/lib/auth'
import { InventoryStatus, StorageLocation } from '@prisma/client'

// GET - 获取库存列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    
    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 })
    }

    // 解析筛选参数
    const filters: any = {}
    
    const status = searchParams.get('status') as InventoryStatus
    if (status) filters.status = status
    
    const storageLocation = searchParams.get('storageLocation') as StorageLocation
    if (storageLocation) filters.storageLocation = storageLocation
    
    const category = searchParams.get('category')
    if (category) filters.category = category
    
    const isExpiring = searchParams.get('isExpiring') === 'true'
    if (isExpiring) filters.isExpiring = true
    
    const isExpired = searchParams.get('isExpired') === 'true'
    if (isExpired) filters.isExpired = true
    
    const isLowStock = searchParams.get('isLowStock') === 'true'
    if (isLowStock) filters.isLowStock = true

    const items = await inventoryTracker.getInventoryItems(memberId, filters)

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length
    })

  } catch (error) {
    console.error('获取库存列表失败:', error)
    return NextResponse.json(
      { error: '获取库存列表失败', details: error },
      { status: 500 }
    )
  }
}

// POST - 创建库存条目
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    
    const requiredFields = ['memberId', 'foodId', 'quantity', 'unit']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 })
      }
    }

    const item = await inventoryTracker.createInventoryItem({
      memberId: body.memberId,
      foodId: body.foodId,
      quantity: parseFloat(body.quantity),
      unit: body.unit,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : undefined,
      purchaseSource: body.purchaseSource,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      productionDate: body.productionDate ? new Date(body.productionDate) : undefined,
      storageLocation: body.storageLocation as StorageLocation,
      storageNotes: body.storageNotes,
      minStockThreshold: body.minStockThreshold ? parseFloat(body.minStockThreshold) : undefined,
      barcode: body.barcode,
      brand: body.brand,
      packageInfo: body.packageInfo
    })

    return NextResponse.json({
      success: true,
      data: item,
      message: '库存条目创建成功'
    })

  } catch (error) {
    console.error('创建库存条目失败:', error)
    return NextResponse.json(
      { error: '创建库存条目失败', details: error },
      { status: 500 }
    )
  }
}
