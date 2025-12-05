import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * POST /api/auth/register
 * 用户注册
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: '密码必须至少8个字符' },
        { status: 400 }
      );
    }

    try {
      const supabase = SupabaseClientManager.getInstance();

      // 检查用户是否已存在
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing user:', checkError);
        throw checkError;
      }

      if (existingUser) {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 409 }
        );
      }

      // 创建新用户
      const hashedPassword = await bcrypt.hash(password, 12);

      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          name,
          email,
          password: hashedPassword,
          role: 'USER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('id, name, email, role')
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      return NextResponse.json({
        success: true,
        message: '注册成功',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

    } catch (dbError) {
      console.error('Database error in registration:', dbError);

      // 检查是否是唯一约束冲突（邮箱已存在）
      const errorCode =
        dbError && typeof dbError === 'object'
          ? (dbError as { code?: string }).code
          : undefined;

      if (errorCode === '23505') {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 409 }
        );
      }

      // 数据库不可用时返回服务不可用错误，不再创建临时用户
      return NextResponse.json(
        { error: '注册服务暂时不可用，请稍后重试' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
