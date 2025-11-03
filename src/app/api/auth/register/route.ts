import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { withAuthRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { logger } from '@/lib/logger';

// 注册数据验证schema - 增强的密码要求
const registerSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string()
    .min(12, '密码至少需要12个字符')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字')
    .regex(/[^A-Za-z0-9]/, '密码必须包含特殊字符'),
});

const handler = async (request: NextRequest) => {
  try {
    const body = await request.json();

    // 验证输入数据
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: '注册成功',
      user,
    }, { status: 201 });

  } catch (error) {
    logger.error('用户注册失败', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
};

export const POST = withAuthRateLimit(handler);
