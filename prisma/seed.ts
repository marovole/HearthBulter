import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始数据库种子数据初始化...')

  // 创建测试用户
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: '测试用户',
      password: await bcrypt.hash('test123456', 10),
      role: 'USER',
    },
  })

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理员',
      password: await bcrypt.hash('admin123456', 10),
      role: 'ADMIN',
    },
  })

  console.log('✅ 创建用户完成')

  // 创建测试家庭
  const testFamily = await prisma.family.upsert({
    where: { id: 'test-family-1' },
    update: {},
    create: {
      id: 'test-family-1',
      name: '黄家',
      description: '测试家庭',
      inviteCode: 'FAMILY123',
      creatorId: testUser.id,
    },
  })

  console.log('✅ 创建家庭完成')

  // 创建家庭成员
  const testMembers = [
    {
      name: '黄爸爸',
      gender: 'MALE' as const,
      birthDate: new Date('1980-06-15'),
      height: 175,
      weight: 75,
      familyId: testFamily.id,
      role: 'ADMIN' as const,
    },
    {
      name: '黄妈妈',
      gender: 'FEMALE' as const,
      birthDate: new Date('1982-09-20'),
      height: 165,
      weight: 60,
      familyId: testFamily.id,
      role: 'MEMBER' as const,
    },
    {
      name: '小明',
      gender: 'MALE' as const,
      birthDate: new Date('2010-03-10'),
      height: 145,
      weight: 40,
      familyId: testFamily.id,
      role: 'MEMBER' as const,
    },
  ]

  for (const memberData of testMembers) {
    const member = await prisma.familyMember.create({
      data: {
        ...memberData,
        // 自动计算BMI
        bmi: memberData.weight && memberData.height
          ? Number((memberData.weight / Math.pow(memberData.height / 100, 2)).toFixed(1))
          : undefined,
      },
    })

    // 为成人创建健康目标
    if (member.name !== '小明') {
      await prisma.healthGoal.create({
        data: {
          memberId: member.id,
          goalType: member.name === '黄爸爸' ? 'LOSE_WEIGHT' : 'MAINTAIN',
          currentWeight: member.weight,
          targetWeight: member.name === '黄爸爸' ? 70 : member.weight,
          startWeight: member.weight,
          targetWeeks: 12,
          startDate: new Date(),
          status: 'ACTIVE',
          tdee: 2000, // 示例TDEE
          bmr: 1500,  // 示例BMR
          activityFactor: 1.3,
          carbRatio: 0.5,
          proteinRatio: 0.2,
          fatRatio: 0.3,
        },
      })
    }

    // 创建过敏史
    if (member.name === '小明') {
      await prisma.allergy.create({
        data: {
          memberId: member.id,
          allergenType: 'FOOD',
          allergenName: '海鲜',
          severity: 'SEVERE',
          description: '虾、蟹、贝类过敏',
        },
      })
    }

    // 创建饮食偏好
    await prisma.dietaryPreference.create({
      data: {
        memberId: member.id,
        dietType: 'OMNIVORE',
        isVegetarian: member.name === '黄妈妈',
        notes: member.name === '黄妈妈' ? '偏向素食，偶尔吃鱼' : '均衡饮食',
      },
    })
  }

  console.log('✅ 创建家庭成员和相关数据完成')

  // 创建邀请示例
  await prisma.familyInvitation.upsert({
    where: { inviteCode: 'INVITE456' },
    update: {},
    create: {
      familyId: testFamily.id,
      email: 'newmember@example.com',
      inviteCode: 'INVITE456',
      role: 'MEMBER',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
    },
  })

  console.log('✅ 创建邀请记录完成')
  console.log('🎉 数据库种子数据初始化完成！')
  console.log('')
  console.log('📋 测试账户信息：')
  console.log('管理员账户：admin@example.com / admin123456')
  console.log('测试账户：test@example.com / test123456')
  console.log('家庭邀请码：FAMILY123')
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })