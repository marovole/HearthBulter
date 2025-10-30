import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateQuickTemplate,
  deleteQuickTemplate,
  useTemplate,
} from '@/lib/services/tracking/template-manager';
import { z } from 'zod';

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = updateTemplateSchema.parse(body);

    const template = await updateQuickTemplate(params.id, validatedData);

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
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    await deleteQuickTemplate(params.id);

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
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const template = await useTemplate(params.id);

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error using template:', error);

    return NextResponse.json(
      { error: '使用模板失败' },
      { status: 500 }
    );
  }
}

