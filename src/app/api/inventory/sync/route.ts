import { NextRequest, NextResponse } from 'next/server';
import { inventorySync } from '@/services/inventory-sync';
import { getCurrentUser } from '@/lib/auth';

// POST - 手动添加库存

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    
    if (body.type === 'manual') {
      // 手动添加库存
      const requiredFields = ['memberId', 'items'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
        }
      }

      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json({ error: '物品列表不能为空' }, { status: 400 });
      }

      // 验证物品格式
      for (const item of body.items) {
        if (!item.foodName || !item.quantity || !item.unit) {
          return NextResponse.json({ error: '物品格式不正确，需要包含foodName、quantity和unit' }, { status: 400 });
        }
      }

      const result = await inventorySync.manualAddInventory(
        body.memberId,
        body.items.map((item: any) => ({
          foodName: item.foodName,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          purchasePrice: item.purchasePrice ? parseFloat(item.purchasePrice) : undefined,
          purchaseSource: item.purchaseSource,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          storageLocation: item.storageLocation,
        }))
      );

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? '库存添加成功' : '库存添加失败',
      });

    } else if (body.type === 'order') {
      // 从订单同步
      const requiredFields = ['memberId', 'orderId'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
        }
      }

      const result = await inventorySync.syncFromOrder(body.orderId, body.memberId);

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? '订单同步成功' : '订单同步失败',
      });

    } else if (body.type === 'meal') {
      // 从餐食记录同步
      const requiredFields = ['memberId', 'mealLogId'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
        }
      }

      const result = await inventorySync.syncFromMealLog(body.mealLogId, body.memberId);

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? '餐食同步成功' : '餐食同步失败',
      });

    } else {
      return NextResponse.json({ error: '无效的同步类型' }, { status: 400 });
    }

  } catch (error) {
    console.error('库存同步失败:', error);
    return NextResponse.json(
      { error: '库存同步失败', details: error },
      { status: 500 }
    );
  }
}

// GET - 获取同步历史
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    const history = await inventorySync.getSyncHistory(memberId, limit);

    return NextResponse.json({
      success: true,
      data: history,
    });

  } catch (error) {
    console.error('获取同步历史失败:', error);
    return NextResponse.json(
      { error: '获取同步历史失败', details: error },
      { status: 500 }
    );
  }
}
