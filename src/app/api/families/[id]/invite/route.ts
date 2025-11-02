import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

import { z } from 'zod';
import crypto from 'crypto';

// 输入验证schema
const createInviteSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// 生成安全的随机邀请码
function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url').toUpperCase();
}

// 检查邀请码唯一性
async function ensureUniqueInviteCode(): Promise<string> {
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateInviteCode();
    attempts++;

    const existing = await prisma.familyInvitation.findFirst({
      where: {
        inviteCode: code,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });

    if (!existing) {
      return code;
    }
  } while (attempts < maxAttempts);

  throw new Error('无法生成唯一邀请码，请稍后重试');
}

// POST /api/families/:id/invite - 创建家庭邀请
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 解析和验证请求体
    const body = await request.json();
    const validationResult = createInviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '输入验证失败',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;

    // 获取家庭信息并验证权限
    const family = await prisma.family.findUnique({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { userId: session.user.id, deletedAt: null },
          select: { role: true },
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 });
    }

    // 验证权限：只有创建者和管理员可以创建邀请
    const isCreator = family.creatorId === session.user.id;
    const currentUserRole = family.members[0]?.role;
    const isAdmin = currentUserRole === 'ADMIN' || isCreator;

    if (!isAdmin) {
      return NextResponse.json(
        { error: '只有管理员可以创建邀请' },
        { status: 403 }
      );
    }

    // 检查是否已有未处理的邀请
    const existingInvitation = await prisma.familyInvitation.findFirst({
      where: {
        familyId: id,
        email: email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        {
          error: '该邮箱已有待处理的邀请',
          inviteCode: existingInvitation.inviteCode,
        },
        { status: 409 }
      );
    }

    // 生成唯一的邀请码
    const inviteCode = await ensureUniqueInviteCode();

    // 创建邀请记录（7天后过期）
    const invitation = await prisma.familyInvitation.create({
      data: {
        familyId: id,
        email: email.toLowerCase(),
        inviteCode,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
      },
    });

    // 构建邀请链接
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${invitation.inviteCode}`;

    // TODO: 发送邀请邮件（暂时返回邀请信息）
    console.log(`邀请邮件应发送至 ${email}: ${inviteUrl}`);

    return NextResponse.json(
      {
        message: '邀请创建成功',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          inviteCode: invitation.inviteCode,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          inviteUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建邀请失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// GET /api/families/:id/invite - 获取邀请列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取家庭信息并验证权限
    const family = await prisma.family.findUnique({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { userId: session.user.id, deletedAt: null },
          select: { role: true },
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 });
    }

    // 验证权限：只有家庭成员可以查看邀请
    const isCreator = family.creatorId === session.user.id;
    const currentUserRole = family.members[0]?.role;
    const isAdmin = currentUserRole === 'ADMIN' || isCreator;

    if (!isCreator && !currentUserRole) {
      return NextResponse.json(
        { error: '无权限访问该家庭' },
        { status: 403 }
      );
    }

    // 获取邀请列表
    const invitations = await prisma.familyInvitation.findMany({
      where: {
        familyId: id,
      },
      select: {
        id: true,
        email: true,
        inviteCode: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 构建邀请链接
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const invitationsWithUrls = invitations.map(invitation => ({
      ...invitation,
      inviteUrl: `${baseUrl}/invite/${invitation.inviteCode}`,
      isExpired: invitation.expiresAt < new Date(),
    }));

    return NextResponse.json(
      {
        family: {
          id: family.id,
          name: family.name,
        },
        invitations: invitationsWithUrls,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取邀请列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
