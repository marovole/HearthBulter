import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { auth } from '@/lib/auth';

/**
 * GET /api/analytics/reports/[id]
 * 获取报告详情
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 查询报告详情（使用Supabase）
    const { data: report, error } = await supabase
      .from('health_reports')
      .select(
        `
        *,
        member:family_members!inner(
          id,
          name,
          avatar
        )
      `,
      )
      .eq('id', id)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) {
      console.error('查询报告失败:', error);
      return NextResponse.json({ error: '获取报告失败' }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Failed to get report:', error);
    return NextResponse.json({ error: '获取报告失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/analytics/reports/[id]
 * 删除报告（软删除）
 *
 * Migrated from Prisma to Supabase
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 软删除报告（使用Supabase）
    const { error } = await (supabase as any)
      .from('health_reports')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('删除报告失败:', error);
      return NextResponse.json({ error: '删除报告失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '报告已删除',
    });
  } catch (error) {
    console.error('Failed to delete report:', error);
    return NextResponse.json({ error: '删除报告失败' }, { status: 500 });
  }
}
