import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { inventoryRepository } from '@/lib/repositories/inventory-repository-singleton';
import { requireOwnership } from '@/lib/middleware/authorization';
import type { InventoryItemUpdateDTO } from '@/lib/repositories/types/inventory';

/**
 * GET /api/inventory/items/[id]
 * 获取单个库存条目（含关联数据）
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 验证用户对该库存项的访问权限
    const accessResult = await requireOwnership(user.id, 'inventory_item', id);
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || '无权访问此库存项' },
        { status: 403 }
      );
    }

    // 使用 Repository 获取库存物品（含使用记录和浪费记录）
    const item = await inventoryRepository.getInventoryItemById(id);

    if (!item) {
      return NextResponse.json({ error: '库存条目不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: item,
    });

  } catch (error) {
    console.error('获取库存条目失败:', error);
    return NextResponse.json(
      { error: '获取库存条目失败', details: error },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/items/[id]
 * 更新库存条目
 *
 * 使用双写框架迁移
 * 注意：Repository 会自动计算 daysToExpiry，但 status 和 isLowStock 需要手动处理
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 验证用户对该库存项的访问权限
    const accessResult = await requireOwnership(user.id, 'inventory_item', id);
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || '无权访问此库存项' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 构建 InventoryItemUpdateDTO
    const updateData: InventoryItemUpdateDTO = {};

    if (body.quantity !== undefined) {
      updateData.quantity = parseFloat(body.quantity);
    }

    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.purchasePrice !== undefined) updateData.purchasePrice = parseFloat(body.purchasePrice);
    if (body.purchaseSource !== undefined) updateData.purchaseSource = body.purchaseSource;
    if (body.expiryDate !== undefined) updateData.expiryDate = new Date(body.expiryDate);
    if (body.productionDate !== undefined) updateData.productionDate = new Date(body.productionDate);
    if (body.storageLocation !== undefined) updateData.storageLocation = body.storageLocation;
    if (body.storageNotes !== undefined) updateData.storageNotes = body.storageNotes;
    if (body.minStockThreshold !== undefined) updateData.minStockThreshold = parseFloat(body.minStockThreshold);
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.packageInfo !== undefined) updateData.packageInfo = body.packageInfo;

    // 使用 Repository 更新库存物品
    // Repository 会自动重新计算 daysToExpiry（如果更新了 expiryDate）
    const updatedItem = await inventoryRepository.updateInventoryItem(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: '库存条目更新成功',
    });

  } catch (error) {
    console.error('更新库存条目失败:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: '库存条目不存在' }, { status: 404 });
    }

    return NextResponse.json(
      { error: '更新库存条目失败', details: error },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/items/[id]
 * 软删除库存条目（保留历史数据）
 *
 * 使用双写框架迁移
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 验证用户对该库存项的访问权限
    const accessResult = await requireOwnership(user.id, 'inventory_item', id);
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || '无权访问此库存项' },
        { status: 403 }
      );
    }

    // 使用 Repository 软删除库存物品
    await inventoryRepository.softDeleteInventoryItem(id);

    return NextResponse.json({
      success: true,
      message: '库存条目删除成功',
    });

  } catch (error) {
    console.error('删除库存条目失败:', error);
    return NextResponse.json(
      { error: '删除库存条目失败', details: error },
      { status: 500 }
    );
  }
}
