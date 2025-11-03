import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { platformAdapterFactory } from '@/lib/services/ecommerce';
import { PlatformError, PlatformErrorType } from '@/lib/services/ecommerce/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取订单信息
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        platformAccount: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 获取平台账号信息
    const platformAccount = order.platformAccount;
    if (!platformAccount || !platformAccount.isActive) {
      return NextResponse.json(
        { error: 'Platform account is not active' },
        { status: 400 }
      );
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
          
          // 更新数据库中的token
          await prisma.platformAccount.update({
            where: { id: platformAccount.id },
            data: {
              accessToken: newTokenInfo.accessToken,
              refreshToken: newTokenInfo.refreshToken,
              expiresAt: newTokenInfo.expiresAt,
              lastSyncAt: new Date(),
            },
          });
          
          accessToken = newTokenInfo.accessToken;
        } catch (refreshError) {
          return NextResponse.json(
            { error: 'Token expired and refresh failed' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Token expired and no refresh token available' },
          { status: 401 }
        );
      }
    }

    // 同步订单状态
    const platformOrderStatus = await adapter.getOrderStatus(
      order.platformOrderId,
      accessToken
    );

    // 更新数据库中的订单状态
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: platformOrderStatus.status,
        paymentStatus: platformOrderStatus.paymentStatus,
        deliveryStatus: platformOrderStatus.deliveryStatus,
        trackingNumber: platformOrderStatus.trackingNumber,
        estimatedDeliveryTime: platformOrderStatus.estimatedDeliveryTime,
        actualDeliveryTime: platformOrderStatus.actualDeliveryTime,
        lastSyncAt: new Date(),
        platformResponse: platformOrderStatus.platformResponse,
      },
    });

    // 格式化响应
    const formattedOrder = {
      id: updatedOrder.id,
      platformOrderId: updatedOrder.platformOrderId,
      platform: updatedOrder.platform,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      deliveryStatus: updatedOrder.deliveryStatus,
      items: updatedOrder.items,
      totalAmount: updatedOrder.totalAmount,
      subtotal: updatedOrder.subtotal,
      shippingFee: updatedOrder.shippingFee,
      discount: updatedOrder.discount,
      deliveryAddress: updatedOrder.deliveryAddress,
      estimatedDeliveryTime: updatedOrder.estimatedDeliveryTime,
      actualDeliveryTime: updatedOrder.actualDeliveryTime,
      trackingNumber: updatedOrder.trackingNumber,
      paymentMethod: updatedOrder.paymentMethod,
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
      lastSyncAt: updatedOrder.lastSyncAt,
      platformResponse: updatedOrder.platformResponse,
    };

    return NextResponse.json({
      success: true,
      order: formattedOrder,
      syncStatus: 'updated',
    });
  } catch (error) {
    console.error('Get order status error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'cancel') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 获取订单信息
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        platformAccount: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 检查订单是否可以取消
    if (order.status !== 'PENDING' && order.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Order cannot be cancelled in current status' },
        { status: 400 }
      );
    }

    // 获取平台账号信息
    const platformAccount = order.platformAccount;
    if (!platformAccount || !platformAccount.isActive) {
      return NextResponse.json(
        { error: 'Platform account is not active' },
        { status: 400 }
      );
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
          
          // 更新数据库中的token
          await prisma.platformAccount.update({
            where: { id: platformAccount.id },
            data: {
              accessToken: newTokenInfo.accessToken,
              refreshToken: newTokenInfo.refreshToken,
              expiresAt: newTokenInfo.expiresAt,
              lastSyncAt: new Date(),
            },
          });
          
          accessToken = newTokenInfo.accessToken;
        } catch (refreshError) {
          return NextResponse.json(
            { error: 'Token expired and refresh failed' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Token expired and no refresh token available' },
          { status: 401 }
        );
      }
    }

    // 调用平台API取消订单
    const cancelResult = await adapter.cancelOrder(
      order.platformOrderId,
      accessToken
    );

    if (cancelResult) {
      // 更新数据库中的订单状态
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        order: {
          id: updatedOrder.id,
          platformOrderId: updatedOrder.platformOrderId,
          status: updatedOrder.status,
          updatedAt: updatedOrder.updatedAt,
        },
        message: 'Order cancelled successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to cancel order on platform' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Cancel order error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
