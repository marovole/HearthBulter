import { NextRequest, NextResponse } from 'next/server';
import { inventoryTracker } from '@/services/inventory-tracker';
import { getCurrentUser } from '@/lib/auth';

// POST - 使用库存
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    
    const requiredFields = ['inventoryItemId', 'usedQuantity', 'usageType', 'memberId'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
      }
    }

    const item = await inventoryTracker.useInventory(
      body.inventoryItemId,
      parseFloat(body.usedQuantity),
      body.usageType,
      body.memberId,
      {
        relatedId: body.relatedId,
        relatedType: body.relatedType,
        notes: body.notes,
        recipeName: body.recipeName,
      }
    );

    return NextResponse.json({
      success: true,
      data: item,
      message: '库存使用成功',
    });

  } catch (error) {
    console.error('使用库存失败:', error);
    return NextResponse.json(
      { error: '使用库存失败', details: error },
      { status: 500 }
    );
  }
}

// GET - 获取使用记录
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const inventoryItemId = searchParams.get('inventoryItemId');
    const usageType = searchParams.get('usageType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!memberId && !inventoryItemId) {
      return NextResponse.json({ error: '缺少成员ID或库存条目ID' }, { status: 400 });
    }

    // 这里需要创建一个获取使用记录的方法
    // 暂时返回空结果
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
    });

  } catch (error) {
    console.error('获取使用记录失败:', error);
    return NextResponse.json(
      { error: '获取使用记录失败', details: error },
      { status: 500 }
    );
  }
}
