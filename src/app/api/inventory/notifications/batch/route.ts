import { NextRequest, NextResponse } from 'next/server'
import { inventoryNotificationService } from '@/services/inventory-notification'
import { getCurrentUser } from '@/lib/auth'

// POST - 批量操作通知
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { memberId, action, notificationIds } = body

    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 })
    }

    if (!action) {
      return NextResponse.json({ error: '缺少操作类型' }, { status: 400 })
    }

    let success = false
    let message = ''
    let processedCount = 0

    switch (action) {
      case 'mark_all_as_read':
        success = await inventoryNotificationService.markAllNotificationsAsRead(memberId)
        message = success ? '全部标记已读成功' : '全部标记已读失败'
        break

      case 'mark_selected_as_read':
        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
          return NextResponse.json({ error: '请选择要操作的通知' }, { status: 400 })
        }

        for (const notificationId of notificationIds) {
          const result = await inventoryNotificationService.markNotificationAsRead(notificationId, memberId)
          if (result) processedCount++
        }
        
        success = processedCount > 0
        message = `成功标记 ${processedCount} 条通知为已读`
        break

      case 'delete_selected':
        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
          return NextResponse.json({ error: '请选择要删除的通知' }, { status: 400 })
        }

        for (const notificationId of notificationIds) {
          const result = await inventoryNotificationService.deleteNotification(notificationId, memberId)
          if (result) processedCount++
        }
        
        success = processedCount > 0
        message = `成功删除 ${processedCount} 条通知`
        break

      default:
        return NextResponse.json({ error: '无效的操作类型' }, { status: 400 })
    }

    return NextResponse.json({
      success,
      message,
      processedCount
    })

  } catch (error) {
    console.error('批量操作通知失败:', error)
    return NextResponse.json(
      { error: '批量操作通知失败', details: error },
      { status: 500 }
    )
  }
}
