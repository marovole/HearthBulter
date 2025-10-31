import { NextRequest, NextResponse } from 'next/server'
import { expiryMonitor } from '@/services/expiry-monitor'
import { getCurrentUser } from '@/lib/auth'

// GET - 获取保质期提醒
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

    const summary = await expiryMonitor.getExpiryAlerts(memberId)

    return NextResponse.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error('获取保质期提醒失败:', error)
    return NextResponse.json(
      { error: '获取保质期提醒失败', details: error },
      { status: 500 }
    )
  }
}

// POST - 处理过期物品
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    
    const requiredFields = ['memberId', 'itemIds']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 })
      }
    }

    if (!Array.isArray(body.itemIds) || body.itemIds.length === 0) {
      return NextResponse.json({ error: '物品ID列表不能为空' }, { status: 400 })
    }

    await expiryMonitor.handleExpiredItems(
      body.memberId,
      body.itemIds,
      body.wasteReason
    )

    return NextResponse.json({
      success: true,
      message: `成功处理了${body.itemIds.length}件过期物品`
    })

  } catch (error) {
    console.error('处理过期物品失败:', error)
    return NextResponse.json(
      { error: '处理过期物品失败', details: error },
      { status: 500 }
    )
  }
}
