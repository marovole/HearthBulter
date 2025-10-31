import { NextRequest, NextResponse } from 'next/server'
import { inventoryNotificationService } from '@/services/inventory-notification'
import { getCurrentUser } from '@/lib/auth'

// GET - 获取通知配置
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

    const config = await inventoryNotificationService.getNotificationConfig(memberId)

    return NextResponse.json({
      success: true,
      data: config
    })

  } catch (error) {
    console.error('获取通知配置失败:', error)
    return NextResponse.json(
      { error: '获取通知配置失败', details: error },
      { status: 500 }
    )
  }
}

// PUT - 更新通知配置
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { memberId, config } = body
    
    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 })
    }

    if (!config) {
      return NextResponse.json({ error: '缺少配置信息' }, { status: 400 })
    }

    const success = await inventoryNotificationService.updateNotificationConfig(memberId, config)

    return NextResponse.json({
      success,
      message: success ? '配置更新成功' : '配置更新失败'
    })

  } catch (error) {
    console.error('更新通知配置失败:', error)
    return NextResponse.json(
      { error: '更新通知配置失败', details: error },
      { status: 500 }
    )
  }
}
