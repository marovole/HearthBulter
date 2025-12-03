import { NextRequest, NextResponse } from 'next/server';
import { inventoryAnalyzer } from '@/services/inventory-analyzer';
import { getCurrentUser } from '@/lib/auth';
import { requireMemberDataAccess } from '@/lib/middleware/authorization';

// GET - 获取库存分析报告

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
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

    const analysis = await inventoryAnalyzer.generateInventoryAnalysis(
      memberId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return NextResponse.json({
      success: true,
      data: analysis,
    });

  } catch (error) {
    console.error('获取库存分析失败:', error);
    return NextResponse.json(
      { error: '获取库存分析失败', details: error },
      { status: 500 }
    );
  }
}
