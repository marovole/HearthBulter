import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CartAggregator } from '@/lib/services/cart-aggregator';
import { platformAdapterFactory } from '@/lib/services/ecommerce';
import { EcommercePlatform, OrderStatus } from '@prisma/client';
import { PlatformError, PlatformErrorType } from '@/lib/services/ecommerce/types';


// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, address, paymentMethod, config } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    if (!address || !address.province || !address.city || !address.district || !address.detail) {
      return NextResponse.json(
        { error: 'Valid address is required' },
        { status: 400 }
      );
    }

    // 提取食材ID和数量
    const foodIds = items.map((item: any) => item.foodId);
    const quantities = new Map<string, number>();
    
    items.forEach((item: any) => {
      quantities.set(item.foodId, item.quantity || 1);
    });

    // 获取食材信息
    const foods = await prisma.food.findMany({
      where: {
        id: { in: foodIds },
      },
    });

    if (foods.length === 0) {
      return NextResponse.json({ error: 'No foods found' }, { status: 404 });
    }

    // 初始化购物车聚合服务
    const cartAggregator = new CartAggregator(prisma);

    // 执行购物车聚合
    const aggregationConfig = {
      includeShipping: config?.includeShipping !== false,
      minConfidence: config?.minConfidence || 0.6,
      maxResultsPerItem: config?.maxResultsPerItem || 1, // 订单创建时只选择最佳匹配
      considerDiscounts: config?.considerDiscounts !== false,
      preferInStock: true, // 订单必须选择有库存的商品
      allowCrossPlatform: config?.allowCrossPlatform !== false,
      optimizeFor: config?.optimizeFor || 'balance',
    };

    const aggregationResult = await cartAggregator.aggregateCart(
      foods,
      quantities,
      address,
      aggregationConfig
    );

    // 检查是否所有商品都有选择
    const unselectedItems = aggregationResult.items.filter(item => !item.selectedProduct);
    if (unselectedItems.length > 0) {
      return NextResponse.json({
        error: 'Some items could not be matched to available products',
        unselectedItems: unselectedItems.map(item => ({
          foodId: item.foodId,
          foodName: item.foodName,
        })),
      }, { status: 400 });
    }

    // 创建订单
    const orderResults = await cartAggregator.createOrders(
      aggregationResult.items,
      address,
      paymentMethod || 'wechat_pay'
    );

    // 保存订单到数据库
    const savedOrders = [];
    for (const orderResult of orderResults) {
      const platformAccount = await prisma.platformAccount.findFirst({
        where: {
          userId: session.user.id,
          platform: orderResult.platform,
          isActive: true,
          status: 'ACTIVE',
        },
      });

      if (!platformAccount) {
        throw new PlatformError({
          type: PlatformErrorType.PLATFORM_ERROR,
          message: `No active platform account found for ${orderResult.platform}`,
        });
      }

      // 获取该平台的订单项
      const platformItems = aggregationResult.items.filter(item => 
        item.selectedPlatform === orderResult.platform
      );

      const orderItems = platformItems.map(item => ({
        platformProductId: item.selectedProduct!.platformProductId,
        foodId: item.foodId,
        name: item.selectedProduct!.name,
        quantity: item.quantity,
        price: item.selectedProduct!.price,
        subtotal: item.selectedProduct!.price * item.quantity,
        specification: item.selectedProduct!.specification,
      }));

      const savedOrder = await prisma.order.create({
        data: {
          userId: session.user.id,
          platformAccountId: platformAccount.id,
          platformOrderId: orderResult.orderId,
          platform: orderResult.platform,
          status: OrderStatus.PENDING,
          items: orderItems,
          totalAmount: orderResult.total,
          subtotal: platformItems.reduce((sum, item) => 
            sum + (item.selectedProduct!.price * item.quantity), 0
          ),
          shippingFee: orderResult.total - platformItems.reduce((sum, item) => 
            sum + (item.selectedProduct!.price * item.quantity), 0
          ),
          deliveryAddress: address,
          estimatedDeliveryTime: orderResult.estimatedDeliveryTime,
          paymentMethod: paymentMethod || 'wechat_pay',
        },
      });

      savedOrders.push({
        id: savedOrder.id,
        platformOrderId: savedOrder.platformOrderId,
        platform: savedOrder.platform,
        status: savedOrder.status,
        totalAmount: savedOrder.totalAmount,
        estimatedDeliveryTime: savedOrder.estimatedDeliveryTime,
        items: orderItems,
      });
    }

    return NextResponse.json({
      success: true,
      orders: savedOrders,
      summary: {
        totalOrders: savedOrders.length,
        grandTotal: savedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        platformsUsed: savedOrders.map(order => order.platform),
      },
    });
  } catch (error) {
    console.error('Order creation error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create orders' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 构建查询条件
    const whereConditions: any = {
      userId: session.user.id,
    };

    if (status) {
      whereConditions.status = status.toUpperCase();
    }

    if (platform) {
      whereConditions.platform = platform.toUpperCase();
    }

    // 查询订单
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereConditions,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: Math.min(pageSize, limit),
      }),
      prisma.order.count({ where: whereConditions }),
    ]);

    // 获取平台账号信息
    const platformAccountIds = orders.map(order => order.platformAccountId);
    const platformAccounts = await prisma.platformAccount.findMany({
      where: { id: { in: platformAccountIds } },
      select: { id: true, platform: true, platformUserId: true },
    });

    const accountMap = new Map(
      platformAccounts.map(account => [account.id, account])
    );

    // 格式化订单数据
    const formattedOrders = orders.map(order => {
      const platformAccount = accountMap.get(order.platformAccountId);
      return {
        id: order.id,
        platformOrderId: order.platformOrderId,
        platform: order.platform,
        platformUserId: platformAccount?.platformUserId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        items: order.items,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        deliveryAddress: order.deliveryAddress,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        actualDeliveryTime: order.actualDeliveryTime,
        trackingNumber: order.trackingNumber,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lastSyncAt: order.lastSyncAt,
      };
    });

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        page,
        pageSize,
        total,
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    );
  }
}
