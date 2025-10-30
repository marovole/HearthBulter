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

  // 创建常用中文食材库
  const commonFoods = [
    {
      name: '鸡胸肉',
      nameEn: 'chicken breast',
      aliases: ['鸡胸', '鸡脯肉'],
      calories: 165,
      protein: 23,
      carbs: 0,
      fat: 1.2,
      fiber: 0,
      category: 'PROTEIN' as const,
      tags: ['高蛋白', '低脂'],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '牛肉',
      nameEn: 'beef',
      aliases: ['牛肉块'],
      calories: 250,
      protein: 26,
      carbs: 0,
      fat: 15,
      fiber: 0,
      category: 'PROTEIN' as const,
      tags: ['高蛋白'],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '西兰花',
      nameEn: 'broccoli',
      aliases: ['青花菜'],
      calories: 34,
      protein: 2.8,
      carbs: 7,
      fat: 0.4,
      fiber: 2.6,
      vitaminC: 89.2,
      calcium: 47,
      iron: 0.7,
      category: 'VEGETABLES' as const,
      tags: ['低碳水', '高维生素C'],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '鸡蛋',
      nameEn: 'egg',
      aliases: ['鸡卵'],
      calories: 155,
      protein: 13,
      carbs: 1.1,
      fat: 11,
      category: 'PROTEIN' as const,
      tags: ['高蛋白'],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '米饭',
      nameEn: 'rice',
      aliases: ['白米饭', '大米'],
      calories: 130,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      fiber: 0.4,
      category: 'GRAINS' as const,
      tags: [],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '牛奶',
      nameEn: 'milk',
      aliases: ['鲜奶'],
      calories: 61,
      protein: 3.2,
      carbs: 4.8,
      fat: 3.3,
      calcium: 113,
      category: 'DAIRY' as const,
      tags: ['高钙'],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '香蕉',
      nameEn: 'banana',
      aliases: ['香蕉果'],
      calories: 89,
      protein: 1.1,
      carbs: 23,
      fat: 0.3,
      fiber: 2.6,
      sugar: 12.2,
      vitaminC: 8.7,
      category: 'FRUITS' as const,
      tags: [],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '苹果',
      nameEn: 'apple',
      aliases: ['苹果果'],
      calories: 52,
      protein: 0.3,
      carbs: 14,
      fat: 0.2,
      fiber: 2.4,
      sugar: 10.4,
      vitaminC: 4.6,
      category: 'FRUITS' as const,
      tags: [],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '三文鱼',
      nameEn: 'salmon',
      aliases: ['鲑鱼'],
      calories: 208,
      protein: 20,
      carbs: 0,
      fat: 13,
      category: 'SEAFOOD' as const,
      tags: ['高蛋白', '高omega-3'],
      source: 'LOCAL' as const,
      verified: true,
    },
    {
      name: '燕麦',
      nameEn: 'oats',
      aliases: ['燕麦片'],
      calories: 389,
      protein: 17,
      carbs: 66,
      fat: 7,
      fiber: 11,
      category: 'GRAINS' as const,
      tags: ['高纤维'],
      source: 'LOCAL' as const,
      verified: true,
    },
  ]

  for (const foodData of commonFoods) {
    // 检查是否已存在
    const existing = await prisma.food.findFirst({
      where: { name: foodData.name },
    })

    if (!existing) {
      await prisma.food.create({
        data: {
        name: foodData.name,
        nameEn: foodData.nameEn,
        aliases: JSON.stringify(foodData.aliases),
        calories: foodData.calories,
        protein: foodData.protein,
        carbs: foodData.carbs,
        fat: foodData.fat,
        fiber: foodData.fiber,
        sugar: foodData.sugar,
        sodium: foodData.sodium,
        vitaminA: foodData.vitaminA,
        vitaminC: foodData.vitaminC,
        calcium: foodData.calcium,
        iron: foodData.iron,
        category: foodData.category,
        tags: JSON.stringify(foodData.tags),
        source: foodData.source,
        verified: foodData.verified,
      },
      })
    }
  }

  console.log(`✅ 创建${commonFoods.length}种常用食材完成`)
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