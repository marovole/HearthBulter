import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mealTrackingRepository } from '@/lib/repositories/meal-tracking-repository-singleton';
import {

  updateQuickTemplate,
  useTemplate,
} from '@/lib/services/tracking/template-manager';
import { z } from 'zod';

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  foods: z
    .array(
      z.object({
        foodId: z.string(),
        amount: z.number().positive(),
      })
    )
    .optional(),
});

/**
 * PATCH /api/tracking/templates/[id]
 * 更新模板
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = updateTemplateSchema.parse(body);

    const template = await updateQuickTemplate(id, validatedData);

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的请求数据', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '更新模板失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tracking/templates/[id]
 * 删除模板
 *
 * 使用双写框架迁移
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    // 使用 Repository 删除模板
    await mealTrackingRepository.deleteQuickTemplate( id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);

    return NextResponse.json(
      { error: '删除模板失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracking/templates/[id]/use
 * 使用模板（更新使用统计）
 *
 * Note: 此端点用于更新模板使用统计，不创建膳食记录
 * 要使用模板创建膳食记录，请调用 POST /api/tracking/meals 并传入 templateId
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const template = await useTemplate(id);

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error using template:', error);

    return NextResponse.json(
      { error: '使用模板失败' },
      { status: 500 }
    );
  }
}

