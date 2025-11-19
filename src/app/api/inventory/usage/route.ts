import { NextRequest, NextResponse } from 'next/server';
import { inventoryRepository } from '@/lib/repositories/inventory-repository-singleton';
import { getCurrentUser } from '@/lib/auth';
import type { UseInventoryInputDTO } from '@/lib/repositories/types/inventory';

// POST - 使用库存
// 使用双写框架迁移

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();

    const requiredFields = ['inventoryItemId', 'usedQuantity', 'usageType'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
      }
    }

    // 构建 UseInventoryInputDTO
    const useInventoryData: UseInventoryInputDTO = {
      inventoryItemId: body.inventoryItemId,
      quantity: parseFloat(body.usedQuantity),
      reason: body.usageType, // usageType → reason
      notes: body.notes || undefined,
    };

    // 处理 relatedId/relatedType → mealId/recipeId 映射
    if (body.relatedId && body.relatedType) {
      if (body.relatedType === 'meal') {
        useInventoryData.mealId = body.relatedId;
      } else if (body.relatedType === 'recipe') {
        useInventoryData.recipeId = body.relatedId;
      }
    }

    // 使用 Repository 使用库存
    // Repository 会自动扣减数量、创建使用记录、更新状态
    const item = await inventoryRepository.useInventoryItem(useInventoryData);

    return NextResponse.json({
      success: true,
      data: item,
      message: '库存使用成功',
    });

  } catch (error) {
    console.error('使用库存失败:', error);

    if (error instanceof Error && error.message.includes('Insufficient inventory')) {
      return NextResponse.json({ error: '库存不足' }, { status: 400 });
    }

    return NextResponse.json(
      { error: '使用库存失败', details: error },
      { status: 500 }
    );
  }
}

// GET - 获取使用记录
// 使用双写框架迁移
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inventoryItemId = searchParams.get('inventoryItemId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!inventoryItemId) {
      return NextResponse.json({ error: '缺少库存条目ID' }, { status: 400 });
    }

    // 使用 Repository 获取使用记录
    const result = await inventoryRepository.listInventoryUsages(
      inventoryItemId,
      { limit, offset }
    );

    return NextResponse.json({
      success: true,
      data: result.items || [],
      count: result.total,
      hasMore: result.hasMore,
    });

  } catch (error) {
    console.error('获取使用记录失败:', error);
    return NextResponse.json(
      { error: '获取使用记录失败', details: error },
      { status: 500 }
    );
  }
}
