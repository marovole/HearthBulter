import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { familyRepository } from '@/lib/repositories/family-repository-singleton';
import { z } from 'zod';

// 创建家庭的验证 schema
const createFamilySchema = z.object({
  name: z.string().min(2, '家庭名称至少需要2个字符'),
  description: z.string().optional(),
});

// GET查询的验证 schema
const GETQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

/**
 * GET /api/families
 * 获取用户所属的家庭列表
 *
 * 使用双写框架迁移
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams);
    const validatedQuery = GETQuerySchema.parse(query);

    const offset = (validatedQuery.page - 1) * validatedQuery.limit;

    // 使用 FamilyRepository 的 listUserFamilies 方法
    const result = await familyRepository.decorateMethod(
      'listUserFamilies',
      {
        userId: session.user.id,
        includeDeleted: false,
        includeMembers: true,
      },
      {
        offset,
        limit: validatedQuery.limit,
      }
    );

    const total = result.total ?? 0;

    return NextResponse.json(
      {
        families: result.items,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取家庭列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/families
 * 创建新家庭
 *
 * 使用双写框架迁移
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入数据
    const validation = createFamilySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    // 使用 FamilyRepository 创建家庭（邀请码生成由 Repository 处理）
    const family = await familyRepository.decorateMethod('createFamily', {
      name,
      description,
      creatorId: session.user.id,
    });

    // 构造响应（新创建的家庭暂时没有成员）
    const familyWithMembers = {
      id: family.id,
      name: family.name,
      description: family.description,
      inviteCode: family.inviteCode,
      creatorId: family.creatorId,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
      deletedAt: family.deletedAt,
      members: [],
      _count: {
        members: 0,
      },
    };

    return NextResponse.json(
      {
        message: '家庭创建成功',
        family: familyWithMembers,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建家庭失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
