import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { getCurrentUser } from '@/lib/auth';

// Type definitions
type InventoryStatus = 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED' | 'USED_UP' | 'WASTED';
type StorageLocation = 'FRIDGE' | 'FREEZER' | 'PANTRY' | 'CUPBOARD' | 'WINE_CELLAR' | 'OTHER';

/**
 * GET /api/inventory/items/[id]
 * 获取单个库存条目
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const supabase = SupabaseClientManager.getInstance();

    const { data: item, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        food:foods(*),
        member:family_members(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !item) {
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
 * Migrated from Prisma to Supabase
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = SupabaseClientManager.getInstance();

    // Verify item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingItem) {
      return NextResponse.json({ error: '库存条目不存在' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (body.quantity !== undefined) {
      const newQuantity = parseFloat(body.quantity);
      updateData.quantity = newQuantity;

      // Recalculate isLowStock if threshold exists
      if (existingItem.minStockThreshold) {
        updateData.isLowStock = newQuantity <= existingItem.minStockThreshold;
      }

      // Update status if quantity is 0
      if (newQuantity === 0) {
        updateData.status = 'USED_UP';
      }
    }

    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.purchasePrice !== undefined) updateData.purchasePrice = parseFloat(body.purchasePrice);
    if (body.purchaseSource !== undefined) updateData.purchaseSource = body.purchaseSource;

    if (body.expiryDate !== undefined) {
      const expiryDate = new Date(body.expiryDate);
      updateData.expiryDate = expiryDate.toISOString();

      // Recalculate daysToExpiry and status
      const now = new Date();
      const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      updateData.daysToExpiry = daysToExpiry;

      if (daysToExpiry < 0) {
        updateData.status = 'EXPIRED';
      } else if (daysToExpiry <= 3) {
        updateData.status = 'EXPIRING_SOON';
      } else if (body.quantity === undefined || parseFloat(body.quantity) > 0) {
        updateData.status = 'FRESH';
      }
    }

    if (body.productionDate !== undefined) {
      updateData.productionDate = new Date(body.productionDate).toISOString();
    }

    if (body.storageLocation !== undefined) {
      updateData.storageLocation = body.storageLocation as StorageLocation;
    }

    if (body.storageNotes !== undefined) updateData.storageNotes = body.storageNotes;

    if (body.minStockThreshold !== undefined) {
      const threshold = parseFloat(body.minStockThreshold);
      updateData.minStockThreshold = threshold;

      // Recalculate isLowStock with new threshold
      const currentQuantity = body.quantity !== undefined
        ? parseFloat(body.quantity)
        : existingItem.quantity;
      updateData.isLowStock = currentQuantity <= threshold;
    }

    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.packageInfo !== undefined) updateData.packageInfo = body.packageInfo;

    // Update item
    const { data: updatedItem, error: updateError } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        food:foods(*),
        member:family_members(id, name, email)
      `)
      .single();

    if (updateError) {
      console.error('更新库存条目失败:', updateError);
      return NextResponse.json(
        { error: '更新库存条目失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: '库存条目更新成功',
    });

  } catch (error) {
    console.error('更新库存条目失败:', error);
    return NextResponse.json(
      { error: '更新库存条目失败', details: error },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/items/[id]
 * 删除库存条目
 *
 * Migrated from Prisma to Supabase
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // Verify item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingItem) {
      return NextResponse.json({ error: '库存条目不存在' }, { status: 404 });
    }

    // Delete item
    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('删除库存条目失败:', deleteError);
      return NextResponse.json(
        { error: '删除库存条目失败' },
        { status: 500 }
      );
    }

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
