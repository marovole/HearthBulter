import { NextRequest, NextResponse } from 'next/server';
import { inventoryRepository } from '@/lib/repositories/inventory-repository-singleton';
import { getCurrentUser } from '@/lib/auth';
import type { WasteRecordCreateDTO } from '@/lib/repositories/types/inventory';

// GET - 获取即将过期的物品
// 使用双写框架迁移
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const daysThreshold = parseInt(searchParams.get('days') || '7');

    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    // 使用 Repository 获取即将过期的物品
    const expiringItems = await inventoryRepository.decorateMethod(
      'getExpiringItems',
      memberId,
      daysThreshold
    );

    return NextResponse.json({
      success: true,
      data: {
        expiringItems,
        count: expiringItems.length,
        daysThreshold,
      },
    });

  } catch (error) {
    console.error('获取保质期提醒失败:', error);
    return NextResponse.json(
      { error: '获取保质期提醒失败', details: error },
      { status: 500 }
    );
  }
}

// POST - 处理过期物品（创建浪费记录并删除）
// 使用双写框架迁移
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();

    const requiredFields = ['itemIds'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
      }
    }

    if (!Array.isArray(body.itemIds) || body.itemIds.length === 0) {
      return NextResponse.json({ error: '物品ID列表不能为空' }, { status: 400 });
    }

    // 处理每个过期物品
    const processedCount = body.itemIds.length;
    const errors: string[] = [];

    for (const itemId of body.itemIds) {
      try {
        // 1. 获取物品信息
        const item = await inventoryRepository.decorateMethod('getInventoryItemById', itemId);

        if (!item) {
          errors.push(`物品 ${itemId} 不存在`);
          continue;
        }

        // 2. 创建浪费记录（会自动扣减数量）
        const wasteData: WasteRecordCreateDTO = {
          inventoryItemId: itemId,
          quantity: item.quantity,
          reason: body.wasteReason || 'EXPIRED',
          wasteDate: new Date(),
          notes: '自动处理过期物品',
        };

        await inventoryRepository.decorateMethod('createWasteRecord', wasteData);

        // 3. 软删除物品
        await inventoryRepository.decorateMethod('softDeleteInventoryItem', itemId);
      } catch (itemError) {
        console.error(`处理物品 ${itemId} 失败:`, itemError);
        errors.push(`物品 ${itemId}: ${itemError instanceof Error ? itemError.message : '未知错误'}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `处理了 ${processedCount} 件物品，但有 ${errors.length} 件失败`,
        errors,
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `成功处理了 ${processedCount} 件过期物品`,
    });

  } catch (error) {
    console.error('处理过期物品失败:', error);
    return NextResponse.json(
      { error: '处理过期物品失败', details: error },
      { status: 500 }
    );
  }
}
