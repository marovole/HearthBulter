import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// 创建家庭的验证 schema
const createFamilySchema = z.object({
  name: z.string().min(2, '家庭名称至少需要2个字符'),
  description: z.string().optional(),
})

// GET查询的验证 schema
const GETQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
})

// GET /api/families - 获取用户所属的家庭列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams)
    const validatedQuery = GETQuerySchema.parse(query)
    
    const skip = (validatedQuery.page - 1) * validatedQuery.limit

    // 查找用户创建的家庭和作为成员加入的家庭
    const [createdFamilies, memberFamilies, [createdCount, memberCount]] = await Promise.all([
      prisma.family.findMany({
        where: {
          creatorId: session.user.id,
          deletedAt: null,
        },
        include: {
          members: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validatedQuery.limit,
      }),
      prisma.family.findMany({
        where: {
          members: {
            some: {
              userId: session.user.id,
              deletedAt: null,
            },
          },
          deletedAt: null,
        },
        include: {
          members: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validatedQuery.limit,
      }),
      Promise.all([
        prisma.family.count({
          where: {
            creatorId: session.user.id,
            deletedAt: null,
          }
        }),
        prisma.family.count({
          where: {
            members: {
              some: {
                userId: session.user.id,
                deletedAt: null,
              },
            },
            deletedAt: null,
          }
        })
      ])
    ])

    // 合并并去重
    const familyMap = new Map()
    ;[...createdFamilies, ...memberFamilies].forEach((family) => {
      familyMap.set(family.id, family)
    })

    const families = Array.from(familyMap.values())

    return NextResponse.json({ 
      families,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: createdCount + memberCount,
        totalPages: Math.ceil((createdCount + memberCount) / validatedQuery.limit)
      }
    }, { status: 200 })
  } catch (error) {
    console.error('获取家庭列表失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// POST /api/families - 创建新家庭
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()

    // 验证输入数据
    const validation = createFamilySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { name, description } = validation.data

    // 生成唯一的邀请码
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

    // 创建家庭
    const family = await prisma.family.create({
      data: {
        name,
        description,
        inviteCode,
        creatorId: session.user.id,
      },
      include: {
        members: {
          where: { deletedAt: null },
        },
        _count: {
          select: { members: true },
        },
      },
    })

    return NextResponse.json(
      {
        message: '家庭创建成功',
        family,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建家庭失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
