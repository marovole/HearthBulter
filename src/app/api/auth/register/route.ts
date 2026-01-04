import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { rateLimiter } from '@/lib/middleware/rate-limit-middleware';

/**
 * POST /api/auth/register
 * 用户注册
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, '密码需包含字母和数字'),
});
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '请求参数无效', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const rateLimitResult = await rateLimiter.checkLimit(request, {
      windowMs: 60_000,
      maxRequests: 5,
      identifier: 'ip',
      message: '注册请求过于频繁',
    });

    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({ error: '请求过于频繁，请稍后再试' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter ?? 60),
          },
        },
      );
    }

    const { name, email, password } = parsed.data;

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
        return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
      }

      // 创建新用户
      const hashedPassword = await bcrypt.hash(password, 12);

      const now = new Date().toISOString();
      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          name,
          email,
          password: hashedPassword,
          role: 'USER',
          created_at: now,
          updated_at: now,
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
        return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
      }

      // 数据库不可用时返回服务不可用错误，不再创建临时用户
      return NextResponse.json(
        { error: '注册服务暂时不可用，请稍后重试' },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 },
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
