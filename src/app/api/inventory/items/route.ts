import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { getCurrentUser } from '@/lib/auth';

// Type definitions (replacing Prisma enums)
type InventoryStatus = 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED' | 'USED_UP' | 'WASTED';
type StorageLocation = 'FRIDGE' | 'FREEZER' | 'PANTRY' | 'CUPBOARD' | 'WINE_CELLAR' | 'OTHER';

/**
 * GET /api/inventory/items
 * 获取库存列表
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // Build query with filters
    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        food:foods(*),
        member:family_members(id, name, email)
      `)
      .eq('memberId', memberId);

    // Apply filters
    const status = searchParams.get('status') as InventoryStatus | null;
    if (status) {
      query = query.eq('status', status);
    }

    const storageLocation = searchParams.get('storageLocation') as StorageLocation | null;
    if (storageLocation) {
      query = query.eq('storageLocation', storageLocation);
    }

    const category = searchParams.get('category');
    if (category) {
      // Need to filter by food category (requires join)
      query = query.eq('food.category', category);
    }

    const isExpiring = searchParams.get('isExpiring') === 'true';
    if (isExpiring) {
      query = query.eq('status', 'EXPIRING_SOON');
    }

    const isExpired = searchParams.get('isExpired') === 'true';
    if (isExpired) {
      query = query.eq('status', 'EXPIRED');
    }

    const isLowStock = searchParams.get('isLowStock') === 'true';
    if (isLowStock) {
      query = query.eq('isLowStock', true);
    }

    // Order by creation date (newest first)
    query = query.order('createdAt', { ascending: false });

    const { data: items, error } = await query;

    if (error) {
      console.error('获取库存列表失败:', error);
      return NextResponse.json(
        { error: '获取库存列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: items || [],
      count: items?.length || 0,
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
 * Migrated from Prisma to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();

    const requiredFields = ['memberId', 'foodId', 'quantity', 'unit'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
      }
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

    // Calculate derived fields
    const quantity = parseFloat(body.quantity);
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    const now = new Date();
    let daysToExpiry: number | null = null;
    let status: InventoryStatus = 'FRESH';

    if (expiryDate) {
      daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToExpiry < 0) {
        status = 'EXPIRED';
      } else if (daysToExpiry <= 3) {
        status = 'EXPIRING_SOON';
      }
    }

    const minStockThreshold = body.minStockThreshold ? parseFloat(body.minStockThreshold) : null;
    const isLowStock = minStockThreshold ? quantity <= minStockThreshold : false;

    // Create inventory item
    const itemData = {
      memberId: body.memberId,
      foodId: body.foodId,
      quantity,
      unit: body.unit,
      originalQuantity: quantity,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : null,
      purchaseSource: body.purchaseSource || null,
      purchaseDate: now.toISOString(),
      expiryDate: expiryDate?.toISOString() || null,
      productionDate: body.productionDate ? new Date(body.productionDate).toISOString() : null,
      daysToExpiry,
      storageLocation: (body.storageLocation as StorageLocation) || 'PANTRY',
      storageNotes: body.storageNotes || null,
      status,
      minStockThreshold,
      isLowStock,
      barcode: body.barcode || null,
      brand: body.brand || null,
      packageInfo: body.packageInfo || null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const { data: item, error: createError } = await supabase
      .from('inventory_items')
      .insert(itemData)
      .select(`
        *,
        food:foods(*),
        member:family_members(id, name, email)
      `)
      .single();

    if (createError) {
      console.error('创建库存条目失败:', createError);
      return NextResponse.json(
        { error: '创建库存条目失败' },
        { status: 500 }
      );
    }

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
