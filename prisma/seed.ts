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
        sugar: 'sugar' in foodData ? (foodData as any).sugar : undefined,
        sodium: 'sodium' in foodData ? (foodData as any).sodium : undefined,
        vitaminA: 'vitaminA' in foodData ? (foodData as any).vitaminA : undefined,
        vitaminC: 'vitaminC' in foodData ? (foodData as any).vitaminC : undefined,
        calcium: 'calcium' in foodData ? (foodData as any).calcium : undefined,
        iron: 'iron' in foodData ? (foodData as any).iron : undefined,
        category: foodData.category,
        tags: JSON.stringify(foodData.tags),
        source: foodData.source,
        verified: foodData.verified,
      },
      })
    }
  }

  console.log(`✅ 创建${commonFoods.length}种常用食材完成`)

  // 创建电商测试数据
  console.log('🛒 开始创建电商测试数据...')

  // 获取食材ID用于匹配
  const chickenFood = await prisma.food.findFirst({ where: { name: '鸡胸肉' } })
  const beefFood = await prisma.food.findFirst({ where: { name: '牛肉' } })
  const broccoliFood = await prisma.food.findFirst({ where: { name: '西兰花' } })
  const eggFood = await prisma.food.findFirst({ where: { name: '鸡蛋' } })
  const riceFood = await prisma.food.findFirst({ where: { name: '米饭' } })

  // 创建平台账号测试数据
  const platformAccounts = [
    {
      userId: testUser.id,
      platform: 'SAMS_CLUB' as const,
      platformUserId: 'sams_user_001',
      username: 'test_sams_user',
      accessToken: 'encrypted_sams_access_token_demo',
      refreshToken: 'encrypted_sams_refresh_token_demo',
      tokenType: 'Bearer',
      scope: 'read write',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
      status: 'ACTIVE' as const,
      isActive: true,
      defaultDeliveryAddress: {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        detail: '张江高科技园区',
        postalCode: '201203',
        contactName: '测试用户',
        contactPhone: '13800138000'
      },
      preferences: {
        defaultPayment: 'wechat_pay',
        deliveryPreference: 'fastest'
      }
    },
    {
      userId: testUser.id,
      platform: 'HEMA' as const,
      platformUserId: 'hema_user_001',
      username: 'test_hema_user',
      accessToken: 'encrypted_hema_access_token_demo',
      refreshToken: 'encrypted_hema_refresh_token_demo',
      tokenType: 'Bearer',
      scope: 'read write',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE' as const,
      isActive: true,
      defaultDeliveryAddress: {
        province: '上海市',
        city: '上海市',
        district: '黄浦区',
        detail: '南京东路100号',
        postalCode: '200001',
        contactName: '测试用户',
        contactPhone: '13800138000'
      },
      preferences: {
        defaultPayment: 'alipay',
        deliveryPreference: 'scheduled'
      }
    }
  ]

  for (const accountData of platformAccounts) {
    await prisma.platformAccount.upsert({
      where: {
        userId_platform: {
          userId: accountData.userId,
          platform: accountData.platform
        }
      },
      update: accountData,
      create: accountData
    })
  }

  console.log('✅ 创建平台账号完成')

  // 创建平台商品测试数据（山姆会员商店）
  const samsProducts = [
    {
      platform: 'SAMS_CLUB' as const,
      platformProductId: 'SAMS_001',
      sku: 'SAMS_CHICKEN_001',
      name: '山姆会员牌 鸡胸肉 1kg',
      description: '优质鸡胸肉，高蛋白低脂肪，适合健身人士',
      brand: '山姆会员牌',
      category: '肉类',
      imageUrl: 'https://example.com/sams-chicken.jpg',
      specification: {
        weight: '1000g',
        package: '真空包装',
        storage: '冷藏'
      },
      weight: 1000,
      unit: 'g',
      price: 29.9,
      originalPrice: 39.9,
      currency: 'CNY',
      priceUnit: 'kg',
      stock: 100,
      isInStock: true,
      stockStatus: '充足',
      salesCount: 1250,
      rating: 4.8,
      reviewCount: 326,
      deliveryOptions: {
        standard: { time: '次日达', fee: 6 },
        express: { time: '当日达', fee: 12 }
      },
      matchedFoodId: chickenFood?.id,
      matchConfidence: 0.95,
      matchKeywords: ['鸡胸肉', '鸡肉', '胸肉'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
      platformData: {
        category_id: 'MEAT_001',
        brand_id: 'SAMS_BRAND',
        tags: ['高蛋白', '低脂', '健身']
      }
    },
    {
      platform: 'SAMS_CLUB' as const,
      platformProductId: 'SAMS_002',
      sku: 'SAMS_BEEF_001',
      name: '澳洲进口 牛腩块 500g',
      description: '澳洲进口优质牛腩，肉质鲜嫩',
      brand: '山姆会员牌',
      category: '肉类',
      imageUrl: 'https://example.com/sams-beef.jpg',
      specification: {
        weight: '500g',
        origin: '澳洲',
        package: '真空包装'
      },
      weight: 500,
      unit: 'g',
      price: 45.8,
      originalPrice: 55.8,
      currency: 'CNY',
      priceUnit: '500g',
      stock: 50,
      isInStock: true,
      stockStatus: '充足',
      salesCount: 890,
      rating: 4.6,
      reviewCount: 215,
      deliveryOptions: {
        standard: { time: '次日达', fee: 6 },
        express: { time: '当日达', fee: 12 }
      },
      matchedFoodId: beefFood?.id,
      matchConfidence: 0.88,
      matchKeywords: ['牛肉', '牛腩'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      platformData: {
        category_id: 'MEAT_002',
        brand_id: 'SAMS_BRAND',
        tags: ['进口', '优质']
      }
    },
    {
      platform: 'SAMS_CLUB' as const,
      platformProductId: 'SAMS_003',
      sku: 'SAMS_EGG_001',
      name: '山姆会员牌 鲜鸡蛋 30枚装',
      description: '农场直供新鲜鸡蛋，营养丰富',
      brand: '山姆会员牌',
      category: '蛋类',
      imageUrl: 'https://example.com/sams-eggs.jpg',
      specification: {
        quantity: '30枚',
        package: '纸盒装'
      },
      weight: 1500,
      unit: 'g',
      price: 18.9,
      originalPrice: 22.9,
      currency: 'CNY',
      priceUnit: '30枚',
      stock: 200,
      isInStock: true,
      stockStatus: '充足',
      salesCount: 2100,
      rating: 4.7,
      reviewCount: 542,
      deliveryOptions: {
        standard: { time: '次日达', fee: 6 },
        express: { time: '当日达', fee: 12 }
      },
      matchedFoodId: eggFood?.id,
      matchConfidence: 0.92,
      matchKeywords: ['鸡蛋', '鲜蛋'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      platformData: {
        category_id: 'EGG_001',
        brand_id: 'SAMS_BRAND',
        tags: ['新鲜', '营养']
      }
    }
  ]

  // 创建平台商品测试数据（盒马鲜生）
  const hemaProducts = [
    {
      platform: 'HEMA' as const,
      platformProductId: 'HEMA_001',
      sku: 'HEMA_CHICKEN_001',
      name: '盒马鲜生 有机鸡胸肉 400g',
      description: '有机养殖鸡胸肉，无激素添加',
      brand: '盒马鲜生',
      category: '肉类',
      imageUrl: 'https://example.com/hema-chicken.jpg',
      specification: {
        weight: '400g',
        organic: true,
        package: '保鲜包装'
      },
      weight: 400,
      unit: 'g',
      price: 22.5,
      originalPrice: 28.5,
      currency: 'CNY',
      priceUnit: '400g',
      stock: 80,
      isInStock: true,
      stockStatus: '充足',
      salesCount: 650,
      rating: 4.9,
      reviewCount: 178,
      deliveryOptions: {
        standard: { time: '30分钟达', fee: 0 },
        scheduled: { time: '预约配送', fee: 0 }
      },
      matchedFoodId: chickenFood?.id,
      matchConfidence: 0.90,
      matchKeywords: ['鸡胸肉', '有机', '鸡肉'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      platformData: {
        category_id: 'ORGANIC_MEAT_001',
        brand_id: 'HEMA_BRAND',
        tags: ['有机', '无激素']
      }
    },
    {
      platform: 'HEMA' as const,
      platformProductId: 'HEMA_002',
      sku: 'HEMA_BROCCOLI_001',
      name: '有机西兰花 300g',
      description: '新鲜有机西兰花，富含维生素C',
      brand: '盒马鲜生',
      category: '蔬菜',
      imageUrl: 'https://example.com/hema-broccoli.jpg',
      specification: {
        weight: '300g',
        organic: true,
        origin: '云南'
      },
      weight: 300,
      unit: 'g',
      price: 12.8,
      originalPrice: 15.8,
      currency: 'CNY',
      priceUnit: '300g',
      stock: 120,
      isInStock: true,
      stockStatus: '充足',
      salesCount: 980,
      rating: 4.7,
      reviewCount: 234,
      deliveryOptions: {
        standard: { time: '30分钟达', fee: 0 },
        scheduled: { time: '预约配送', fee: 0 }
      },
      matchedFoodId: broccoliFood?.id,
      matchConfidence: 0.93,
      matchKeywords: ['西兰花', '青花菜', '有机'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      platformData: {
        category_id: 'ORGANIC_VEG_001',
        brand_id: 'HEMA_BRAND',
        tags: ['有机', '新鲜', '高维生素C']
      }
    }
  ]

  // 创建平台商品测试数据（叮咚买菜）
  const dingdongProducts = [
    {
      platform: 'DINGDONG' as const,
      platformProductId: 'DD_001',
      sku: 'DD_EGG_001',
      name: '叮咚农场 鲜鸡蛋 20枚装',
      description: '农场直供，当日新鲜鸡蛋',
      brand: '叮咚农场',
      category: '蛋类',
      imageUrl: 'https://example.com/dd-eggs.jpg',
      specification: {
        quantity: '20枚',
        package: '环保包装'
      },
      weight: 1000,
      unit: 'g',
      price: 15.9,
      originalPrice: 18.9,
      currency: 'CNY',
      priceUnit: '20枚',
      stock: 150,
      isInStock: true,
      stockStatus: '充足',
      salesCount: 1580,
      rating: 4.5,
      reviewCount: 389,
      deliveryOptions: {
        standard: { time: '最快29分钟达', fee: 3 },
        next_day: { time: '次日达', fee: 0 }
      },
      matchedFoodId: eggFood?.id,
      matchConfidence: 0.85,
      matchKeywords: ['鸡蛋', '鲜蛋', '农场'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      platformData: {
        category_id: 'FRESH_EGG_001',
        brand_id: 'DINGDONG_FARM',
        tags: ['新鲜', '农场直供']
      }
    }
  ]

  // 插入所有平台商品
  const allProducts = [...samsProducts, ...hemaProducts, ...dingdongProducts]
  for (const productData of allProducts) {
    await prisma.platformProduct.upsert({
      where: {
        platform_platformProductId: {
          platform: productData.platform,
          platformProductId: productData.platformProductId
        }
      },
      update: productData,
      create: productData
    })
  }

  console.log(`✅ 创建${allProducts.length}个平台商品完成`)

  // 创建测试订单
  const samsAccount = await prisma.platformAccount.findFirst({
    where: { userId: testUser.id, platform: 'SAMS_CLUB' }
  })

  if (samsAccount) {
    const testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        accountId: samsAccount.id,
        platformOrderId: 'SAMS_ORDER_001',
        platform: 'SAMS_CLUB',
        subtotal: 94.6,
        shippingFee: 6,
        discount: 10,
        totalAmount: 90.6,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        deliveryStatus: 'DELIVERED',
        orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
        paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        shipmentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        deliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        actualDeliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
        deliveryAddress: {
          province: '上海市',
          city: '上海市',
          district: '浦东新区',
          detail: '张江高科技园区',
          postalCode: '201203',
          contactName: '测试用户',
          contactPhone: '13800138000'
        },
        trackingNumber: 'SF1234567890',
        deliveryNotes: '请放在门口',
        items: [
          {
            platformProductId: 'SAMS_001',
            name: '山姆会员牌 鸡胸肉 1kg',
            quantity: 2,
            price: 29.9,
            subtotal: 59.8
          },
          {
            platformProductId: 'SAMS_003',
            name: '山姆会员牌 鲜鸡蛋 30枚装',
            quantity: 1,
            price: 18.9,
            subtotal: 18.9
          }
        ],
        orderSummary: {
          totalItems: 2,
          totalQuantity: 3,
          estimatedDelivery: '次日达'
        },
        lastSyncAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    })

    console.log('✅ 创建测试订单完成')
  }

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