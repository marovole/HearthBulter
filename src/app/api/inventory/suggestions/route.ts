import { NextRequest, NextResponse } from 'next/server'
import { inventoryAnalyzer } from '@/services/inventory-analyzer'
import { getCurrentUser } from '@/lib/auth'

// GET - 获取采购建议
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

    const suggestions = await inventoryAnalyzer.generatePurchaseSuggestions(memberId)

    return NextResponse.json({
      success: true,
      data: suggestions,
      count: suggestions.length
    })

  } catch (error) {
    console.error('获取采购建议失败:', error)
    return NextResponse.json(
      { error: '获取采购建议失败', details: error },
      { status: 500 }
    )
  }
}
