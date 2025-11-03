import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createQuickTemplate,
  getQuickTemplates,
  getRecommendedTemplates,
  createTemplateFromMealLog,
  useTemplate,
  autoGenerateTemplates,
} from '@/lib/services/tracking/template-manager';
import { z } from 'zod';

const createTemplateSchema = z.object({
  memberId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  foods: z.array(
    z.object({
      foodId: z.string(),
      amount: z.number().positive(),
    })
  ),
});

/**
 * POST /api/tracking/templates
 * 创建快速模板
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await req.json();

    // 检查是否是从餐饮记录创建模板
    if (body.mealLogId) {
      const template = await createTemplateFromMealLog(
        body.mealLogId,
        body.name,
        body.description
      );
      return NextResponse.json(template, { status: 201 });
    }

    // 检查是否是自动生成模板
    if (body.autoGenerate) {
      const templates = await autoGenerateTemplates(body.memberId);
      return NextResponse.json({ templates }, { status: 201 });
    }

    // 常规创建模板
    const validatedData = createTemplateSchema.parse(body);
    const template = await createQuickTemplate(validatedData);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的请求数据', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '创建模板失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking/templates?memberId=xxx&mealType=BREAKFAST&recommended=true
 * 获取模板列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    const mealType = searchParams.get('mealType');
    const recommended = searchParams.get('recommended') === 'true';
    const limit = searchParams.get('limit');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    if (recommended) {
      const templates = await getRecommendedTemplates(
        memberId,
        mealType as any,
        limit ? parseInt(limit) : undefined
      );
      return NextResponse.json({ templates });
    }

    const templates = await getQuickTemplates(memberId, mealType as any);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);

    return NextResponse.json(
      { error: '获取模板失败' },
      { status: 500 }
    );
  }
}

