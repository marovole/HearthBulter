import { NextRequest, NextResponse } from 'next/server'
import { inventoryTracker } from '@/services/inventory-tracker'
import { inventoryAnalyzer } from '@/services/inventory-analyzer'
import { expiryMonitor } from '@/services/expiry-monitor'
import { getCurrentUser } from '@/lib/auth'

// GET - 获取库存统计信息
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const type = searchParams.get('type') || 'basic'
    
    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 })
    }

    let data: any = {}

    switch (type) {
      case 'basic':
        // 基础统计
        data = await inventoryTracker.getInventoryStats(memberId)
        break

      case 'efficiency':
        // 效率评分
        data = await inventoryAnalyzer.calculateInventoryEfficiency(memberId)
        break

      case 'trends':
        // 趋势数据
        const days = parseInt(searchParams.get('days') || '30')
        data = await inventoryAnalyzer.getInventoryTrends(memberId, days)
        break

      case 'expiry':
        // 保质期趋势
        const expiryDays = parseInt(searchParams.get('days') || '30')
        data = await expiryMonitor.getExpiryTrends(memberId, expiryDays)
        break

      default:
        return NextResponse.json({ error: '无效的统计类型' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data,
      type
    })

  } catch (error) {
    console.error('获取库存统计失败:', error)
    return NextResponse.json(
      { error: '获取库存统计失败', details: error },
      { status: 500 }
    )
  }
}
