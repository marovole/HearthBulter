import { NextRequest, NextResponse } from 'next/server';
import { inventoryRepository } from '@/lib/repositories/inventory-repository-singleton';
import { inventoryAnalyzer } from '@/services/inventory-analyzer';
import { expiryMonitor } from '@/services/expiry-monitor';
import { getCurrentUser } from '@/lib/auth';
import { requireMemberDataAccess } from '@/lib/middleware/authorization';

// GET - 获取库存统计信息

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
    const type = searchParams.get('type') || 'basic';
    
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

    let data: any = {};

    switch (type) {
    case 'basic':
      // 基础统计 - 使用双写框架迁移
      data = await inventoryRepository.getInventoryStats(memberId);
      break;

    case 'efficiency':
      // 效率评分
      data = await inventoryAnalyzer.calculateInventoryEfficiency(memberId);
      break;

    case 'trends':
      // 趋势数据
      const days = parseInt(searchParams.get('days') || '30');
      data = await inventoryAnalyzer.getInventoryTrends(memberId, days);
      break;

    case 'expiry':
      // 保质期趋势
      const expiryDays = parseInt(searchParams.get('days') || '30');
      data = await expiryMonitor.getExpiryTrends(memberId, expiryDays);
      break;

    default:
      return NextResponse.json({ error: '无效的统计类型' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data,
      type,
    });

  } catch (error) {
    console.error('获取库存统计失败:', error);
    return NextResponse.json(
      { error: '获取库存统计失败', details: error },
      { status: 500 }
    );
  }
}
