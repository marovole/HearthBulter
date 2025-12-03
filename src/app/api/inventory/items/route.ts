import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { getCurrentUser } from '@/lib/auth';
import { inventoryRepository } from '@/lib/repositories/inventory-repository-singleton';
import { requireMemberDataAccess } from '@/lib/middleware/authorization';
import type { InventoryItemCreateDTO, InventoryItemFilterDTO } from '@/lib/repositories/types/inventory';

/**
 * GET /api/inventory/items
 * 获取库存列表
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    // 验证用户对该成员数据的访问权限
    const accessResult = await requireMemberDataAccess(user.id, memberId);
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || '无权访问此成员数据' },
        { status: 403 }
      );
    }

    // 构建过滤器
    const filter: InventoryItemFilterDTO = {};

    const status = searchParams.get('status');
    if (status) {
      filter.status = status as InventoryItemFilterDTO['status'];
    }

    const storageLocation = searchParams.get('storageLocation');
    if (storageLocation) {
      filter.storageLocation = storageLocation as InventoryItemFilterDTO['storageLocation'];
    }

    const category = searchParams.get('category');
    if (category) {
      filter.category = category;
    }

    const isExpiring = searchParams.get('isExpiring') === 'true';
    if (isExpiring) {
      filter.isExpiring = true;
    }

    const isExpired = searchParams.get('isExpired') === 'true';
    if (isExpired) {
      filter.isExpired = true;
    }

    const isLowStock = searchParams.get('isLowStock') === 'true';
    if (isLowStock) {
      filter.isLowStock = true;
    }

    // 使用 Repository 获取库存列表
    const result = await inventoryRepository.listInventoryItems(
      memberId,
      Object.keys(filter).length > 0 ? filter : undefined,
      undefined // 不使用分页，返回所有结果
    );

    return NextResponse.json({
      success: true,
      data: result.items || [],
      count: result.items?.length || 0,
    });

  } catch (error) {
    console.error('获取库存列表失败:', error);
    return NextResponse.json(
      { error: '获取库存列表失败', details: error },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/items
 * 创建库存条目
 *
 * 使用双写框架迁移
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();

    const requiredFields = ['memberId', 'foodId', 'quantity', 'unit'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
      }
    }

    // 验证用户对该成员数据的访问权限
    const accessResult = await requireMemberDataAccess(user.id, body.memberId);
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || '无权访问此成员数据' },
        { status: 403 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // Verify member exists
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', body.memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: '成员不存在' },
        { status: 404 }
      );
    }

    // Verify food exists
    const { data: food, error: foodError } = await supabase
      .from('foods')
      .select('id, category')
      .eq('id', body.foodId)
      .single();

    if (foodError || !food) {
      return NextResponse.json(
        { error: '食物不存在' },
        { status: 404 }
      );
    }

    // 构建 InventoryItemCreateDTO
    // Repository 会自动计算 daysToExpiry, status, isLowStock
    const createData: InventoryItemCreateDTO = {
      memberId: body.memberId,
      foodId: body.foodId,
      quantity: parseFloat(body.quantity),
      unit: body.unit,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : undefined,
      purchaseSource: body.purchaseSource || undefined,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      productionDate: body.productionDate ? new Date(body.productionDate) : undefined,
      storageLocation: body.storageLocation || undefined,
      storageNotes: body.storageNotes || undefined,
      minStockThreshold: body.minStockThreshold ? parseFloat(body.minStockThreshold) : undefined,
      barcode: body.barcode || undefined,
      brand: body.brand || undefined,
      packageInfo: body.packageInfo || undefined,
    };

    // 使用 Repository 创建库存物品
    const item = await inventoryRepository.createInventoryItem(createData);

    return NextResponse.json({
      success: true,
      data: item,
      message: '库存条目创建成功',
    });

  } catch (error) {
    console.error('创建库存条目失败:', error);
    return NextResponse.json(
      { error: '创建库存条目失败', details: error },
      { status: 500 }
    );
  }
}
