import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
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
 * Migrated from Prisma to Supabase
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

    const from = (validatedQuery.page - 1) * validatedQuery.limit;
    const to = from + validatedQuery.limit - 1;

    const supabase = SupabaseClientManager.getInstance();

    // Query 1: 用户创建的家庭
    const { data: createdFamilies, error: createdError } = await supabase
      .from('families')
      .select(`
        *,
        members:family_members!inner(id, name, avatar, role)
      `)
      .eq('creatorId', session.user.id)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (createdError) {
      console.error('查询创建的家庭失败:', createdError);
    }

    // Query 2: 用户作为成员加入的家庭
    const { data: memberFamilies, error: memberError } = await supabase
      .from('families')
      .select(`
        *,
        members:family_members!inner(id, name, avatar, role)
      `)
      .eq('family_members.userId', session.user.id)
      .is('deletedAt', null)
      .is('family_members.deletedAt', null)
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (memberError) {
      console.error('查询成员家庭失败:', memberError);
    }

    // 合并并去重
    const familyMap = new Map();
    [...(createdFamilies || []), ...(memberFamilies || [])].forEach((family) => {
      if (!familyMap.has(family.id)) {
        // 只保留未删除的成员
        const activeMembers = Array.isArray(family.members)
          ? family.members.filter((m: any) => !m.deletedAt)
          : [];

        familyMap.set(family.id, {
          ...family,
          members: activeMembers,
          _count: {
            members: activeMembers.length,
          },
        });
      }
    });

    const families = Array.from(familyMap.values());

    // Count total families
    const { count: createdCount } = await supabase
      .from('families')
      .select('id', { count: 'exact', head: true })
      .eq('creatorId', session.user.id)
      .is('deletedAt', null);

    const { count: memberCount } = await supabase
      .from('families')
      .select('id', { count: 'exact', head: true })
      .eq('family_members.userId', session.user.id)
      .is('deletedAt', null)
      .is('family_members.deletedAt', null);

    const total = (createdCount || 0) + (memberCount || 0);

    return NextResponse.json({
      families,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total,
        totalPages: Math.ceil(total / validatedQuery.limit),
      },
    }, { status: 200 });
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
 * Migrated from Prisma to Supabase
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

    const supabase = SupabaseClientManager.getInstance();

    // 生成唯一的邀请码
    let inviteCode = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // 检查邀请码是否唯一
      const { data: existing, error: checkError } = await supabase
        .from('families')
        .select('id')
        .eq('inviteCode', inviteCode)
        .maybeSingle();

      if (checkError) {
        console.error('检查邀请码失败:', checkError);
        break;
      }

      if (!existing) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: '生成邀请码失败，请重试' },
        { status: 500 }
      );
    }

    // 创建家庭
    const now = new Date().toISOString();
    const { data: family, error: createError } = await supabase
      .from('families')
      .insert({
        name,
        description: description || null,
        inviteCode,
        creatorId: session.user.id,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      console.error('创建家庭失败:', createError);
      return NextResponse.json(
        { error: '创建家庭失败' },
        { status: 500 }
      );
    }

    // 获取成员列表（新创建的家庭暂时没有成员）
    const { data: members } = await supabase
      .from('family_members')
      .select('id, name, avatar, role')
      .eq('familyId', family.id)
      .is('deletedAt', null);

    // 构造响应
    const familyWithMembers = {
      ...family,
      members: members || [],
      _count: {
        members: members?.length || 0,
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
