// @ts-nocheck - Convex returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient } from "@/lib/convex-client";
import { asConvexQueryReference, asConvexMutationReference } from "@/lib/convex-reference";
import { platformAdapterFactory } from "@/lib/services/ecommerce";
import { PlatformError, PlatformErrorType } from "@/lib/services/ecommerce/types";
import { Id } from "../../../../convex/_generated/dataModel";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取订单信息 (Convex)
    const orders = await convexClient.query(asConvexQueryReference("ecommerce:getOrders"), {
      memberId: session.user.id,
      limit: 100, // 获取较多订单以便查找
    });

    const order = orders?.orders?.find((o: any) => o._id === orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 获取平台账号信息 (Convex)
    const platformAccount = await convexClient.query(
      asConvexQueryReference("ecommerce:getOrCreatePlatformAccount"),
      {
        memberId: session.user.id,
        platform: order.platform,
      }
    );

    if (!platformAccount || !platformAccount.accessToken) {
      return NextResponse.json({ error: "Platform account is not active" }, { status: 400 });
    }

    // 创建平台适配器
    const adapter = platformAdapterFactory.createAdapter(order.platform);

    // 检查token是否有效
    let accessToken = platformAccount.accessToken;
    const isValidToken = await adapter.validateToken(accessToken);

    if (!isValidToken) {
      // 尝试刷新token
      if (platformAccount.refreshToken) {
        try {
          const newTokenInfo = await adapter.refreshToken(platformAccount.refreshToken);

          // 更新数据库中的token (Convex)
          await convexClient.mutation(
            asConvexMutationReference("ecommerce:upsertPlatformAccount"),
            {
              memberId: session.user.id,
              platform: order.platform,
              accessToken: newTokenInfo.accessToken,
              refreshToken: newTokenInfo.refreshToken,
              tokenExpiresAt: newTokenInfo.expiresAt?.getTime(),
            }
          );

          accessToken = newTokenInfo.accessToken;
        } catch (refreshError) {
          return NextResponse.json({ error: "Token expired and refresh failed" }, { status: 401 });
        }
      } else {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 }
        );
      }
    }

    // 同步订单状态
    const platformOrderStatus = await adapter.getOrderStatus(order.platformOrderId, accessToken);

    // 更新数据库中的订单状态 (Convex)
    await convexClient.mutation(asConvexMutationReference("ecommerce:updateOrderStatus"), {
      orderId: orderId as Id<"ecommerceOrders">,
      status: platformOrderStatus.status,
    });

    // 格式化响应
    const formattedOrder = {
      id: order._id,
      platformOrderId: order.platformOrderId,
      platform: order.platform,
      status: platformOrderStatus.status || order.status,
      paymentStatus: platformOrderStatus.paymentStatus || order.paymentStatus,
      deliveryStatus: platformOrderStatus.deliveryStatus || order.deliveryStatus,
      items: order.items,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discount: order.discount,
      deliveryAddress: order.deliveryAddress,
      estimatedDeliveryTime:
        platformOrderStatus.estimatedDeliveryTime || order.estimatedDeliveryTime,
      actualDeliveryTime: platformOrderStatus.actualDeliveryTime || order.actualDeliveryTime,
      trackingNumber: platformOrderStatus.trackingNumber || order.trackingNumber,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt ? new Date(order.createdAt) : undefined,
      updatedAt: Date.now(),
      lastSyncAt: new Date(),
      platformResponse: platformOrderStatus.platformResponse,
    };

    return NextResponse.json({
      success: true,
      order: formattedOrder,
      syncStatus: "updated",
    });
  } catch (error) {
    console.error("Get order status error:", error);

    if (error instanceof PlatformError) {
      return NextResponse.json({ error: error.message, type: error.type }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to get order status" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== "cancel") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 获取订单信息 (Convex)
    const orders = await convexClient.query(asConvexQueryReference("ecommerce:getOrders"), {
      memberId: session.user.id,
      limit: 100,
    });

    const order = orders?.orders?.find((o: any) => o._id === orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 检查订单是否可以取消
    if (order.status !== "PENDING" && order.status !== "PAID") {
      return NextResponse.json(
        { error: "Order cannot be cancelled in current status" },
        { status: 400 }
      );
    }

    // 获取平台账号信息 (Convex)
    const platformAccount = await convexClient.query(
      asConvexQueryReference("ecommerce:getOrCreatePlatformAccount"),
      {
        memberId: session.user.id,
        platform: order.platform,
      }
    );

    if (!platformAccount || !platformAccount.accessToken) {
      return NextResponse.json({ error: "Platform account is not active" }, { status: 400 });
    }

    // 创建平台适配器
    const adapter = platformAdapterFactory.createAdapter(order.platform);

    // 检查token是否有效
    let accessToken = platformAccount.accessToken;
    const isValidToken = await adapter.validateToken(accessToken);

    if (!isValidToken) {
      // 尝试刷新token
      if (platformAccount.refreshToken) {
        try {
          const newTokenInfo = await adapter.refreshToken(platformAccount.refreshToken);

          // 更新数据库中的token (Convex)
          await convexClient.mutation(
            asConvexMutationReference("ecommerce:upsertPlatformAccount"),
            {
              memberId: session.user.id,
              platform: order.platform,
              accessToken: newTokenInfo.accessToken,
              refreshToken: newTokenInfo.refreshToken,
              tokenExpiresAt: newTokenInfo.expiresAt?.getTime(),
            }
          );

          accessToken = newTokenInfo.accessToken;
        } catch (refreshError) {
          return NextResponse.json({ error: "Token expired and refresh failed" }, { status: 401 });
        }
      } else {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 }
        );
      }
    }

    // 调用平台API取消订单
    const cancelResult = await adapter.cancelOrder(order.platformOrderId, accessToken);

    if (cancelResult) {
      // 更新数据库中的订单状态 (Convex)
      await convexClient.mutation(asConvexMutationReference("ecommerce:updateOrderStatus"), {
        orderId: orderId as Id<"ecommerceOrders">,
        status: "CANCELLED",
      });

      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          platformOrderId: order.platformOrderId,
          status: "CANCELLED",
          updatedAt: new Date(),
        },
        message: "Order cancelled successfully",
      });
    } else {
      return NextResponse.json({ error: "Failed to cancel order on platform" }, { status: 400 });
    }
  } catch (error) {
    console.error("Cancel order error:", error);

    if (error instanceof PlatformError) {
      return NextResponse.json({ error: error.message, type: error.type }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}
