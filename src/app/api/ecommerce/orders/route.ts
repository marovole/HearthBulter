// @ts-nocheck - Convex returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient } from "@/lib/convex-client";
import { asConvexQueryReference, asConvexMutationReference } from "@/lib/convex-reference";
import { foodRepository } from "@/lib/repositories/food-repository-singleton";
import { CartAggregator } from "@/lib/services/cart-aggregator";
import { platformAdapterFactory } from "@/lib/services/ecommerce";
import { EcommercePlatform, OrderStatus } from "@/lib/services/ecommerce/types";
import { PlatformError, PlatformErrorType } from "@/lib/services/ecommerce/types";
import { Id } from "../../../../convex/_generated/dataModel";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, address, paymentMethod, config } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    if (!address || !address.province || !address.city || !address.district || !address.detail) {
      return NextResponse.json({ error: "Valid address is required" }, { status: 400 });
    }

    // 提取食材ID和数量
    const foodIds = items.map((item: any) => item.foodId);
    const quantities = new Map<string, number>();

    items.forEach((item: any) => {
      quantities.set(item.foodId, item.quantity || 1);
    });

    // 使用 Food Repository 获取食材信息
    const foods = await Promise.all(
      foodIds.map(async (id: string) => {
        try {
          return await foodRepository.findById(id);
        } catch {
          return null;
        }
      })
    );
    const validFoods = foods.filter((f): f is NonNullable<typeof f> => f !== null);

    if (validFoods.length === 0) {
      return NextResponse.json({ error: "No foods found" }, { status: 404 });
    }

    // 初始化购物车聚合服务
    const cartAggregator = new CartAggregator();

    // 执行购物车聚合
    const aggregationConfig = {
      includeShipping: config?.includeShipping !== false,
      minConfidence: config?.minConfidence || 0.6,
      maxResultsPerItem: config?.maxResultsPerItem || 1, // 订单创建时只选择最佳匹配
      considerDiscounts: config?.considerDiscounts !== false,
      preferInStock: true, // 订单必须选择有库存的商品
      allowCrossPlatform: config?.allowCrossPlatform !== false,
      optimizeFor: config?.optimizeFor || "balance",
    };

    const aggregationResult = await cartAggregator.aggregateCart(
      validFoods,
      quantities,
      address,
      aggregationConfig
    );

    // 检查是否所有商品都有选择
    const unselectedItems = aggregationResult.items.filter((item) => !item.selectedProduct);
    if (unselectedItems.length > 0) {
      return NextResponse.json(
        {
          error: "Some items could not be matched to available products",
          unselectedItems: unselectedItems.map((item) => ({
            foodId: item.foodId,
            foodName: item.foodName,
          })),
        },
        { status: 400 }
      );
    }

    // 创建订单
    const orderResults = await cartAggregator.createOrders(
      aggregationResult.items,
      address,
      paymentMethod || "wechat_pay"
    );

    // 保存订单到数据库 (Convex)
    const savedOrders = [];
    for (const orderResult of orderResults) {
      // 获取平台账号
      const platformAccount = await convexClient.query(
        asConvexQueryReference("ecommerce:getOrCreatePlatformAccount"),
        {
          memberId: session.user.id,
          platform: orderResult.platform,
        }
      );

      if (!platformAccount) {
        throw new PlatformError(
          PlatformErrorType.PLATFORM_ERROR,
          `No active platform account found for ${orderResult.platform}`
        );
      }

      // 获取该平台的订单项
      const platformItems = aggregationResult.items.filter(
        (item) => item.selectedPlatform === orderResult.platform
      );

      const orderItems = platformItems.map((item) => ({
        platformProductId: item.selectedProduct!.platformProductId,
        foodId: item.foodId,
        name: item.selectedProduct!.name,
        quantity: item.quantity,
        price: item.selectedProduct!.price,
        subtotal: item.selectedProduct!.price * item.quantity,
        specification: item.selectedProduct!.specification,
      }));

      const subtotal = platformItems.reduce(
        (sum, item) => sum + item.selectedProduct!.price * item.quantity,
        0
      );
      const shippingFee = orderResult.total - subtotal;

      // 创建订单 (Convex)
      const orderId = await convexClient.mutation(
        asConvexMutationReference("ecommerce:createOrder"),
        {
          memberId: session.user.id as Id<"familyMembers">,
          platform: orderResult.platform,
          platformOrderId: orderResult.orderId,
          status: OrderStatus.PENDING_PAYMENT,
          items: orderItems,
          totalAmount: orderResult.total,
          subtotal,
          shippingFee,
          discount: 0,
          deliveryAddress: address,
          estimatedDeliveryTime: orderResult.estimatedDeliveryTime,
        }
      );

      // 获取创建的订单详情
      const orders = await convexClient.query(asConvexQueryReference("ecommerce:getOrders"), {
        memberId: session.user.id,
        limit: 1,
      });
      const savedOrder = orders?.orders?.find((o: any) => o._id === orderId);

      savedOrders.push({
        id: orderId,
        platformOrderId: orderResult.orderId,
        platform: orderResult.platform,
        status: OrderStatus.PENDING_PAYMENT,
        totalAmount: orderResult.total,
        estimatedDeliveryTime: orderResult.estimatedDeliveryTime,
        items: orderItems,
      });
    }

    return NextResponse.json({
      success: true,
      orders: savedOrders,
      summary: {
        totalOrders: savedOrders.length,
        grandTotal: savedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        platformsUsed: savedOrders.map((order) => order.platform),
      },
    });
  } catch (error) {
    console.error("Order creation error:", error);

    if (error instanceof PlatformError) {
      return NextResponse.json({ error: error.message, type: error.type }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create orders" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const limit = parseInt(searchParams.get("limit") || "20");

    const offset = (page - 1) * pageSize;
    const actualLimit = Math.min(pageSize, limit);

    // 使用 Convex 查询订单
    const result = await convexClient.query(asConvexQueryReference("ecommerce:getOrders"), {
      memberId: session.user.id,
      status: status?.toUpperCase(),
      platform: platform?.toUpperCase(),
      limit: actualLimit,
      offset,
    });

    const orders = result?.orders || [];
    const total = result?.total || 0;

    // 格式化订单数据
    const formattedOrders = orders.map((order: any) => ({
      id: order._id,
      platformOrderId: order.platformOrderId,
      platform: order.platform,
      platformUserId: undefined, // Convex schema doesn't store this in orders
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
      createdAt: order.createdAt ? new Date(order.createdAt) : undefined,
      updatedAt: order.updatedAt ? new Date(order.updatedAt) : undefined,
      lastSyncAt: order.lastSyncAt ? new Date(order.lastSyncAt) : undefined,
    }));

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
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "Failed to get orders" }, { status: 500 });
  }
}
