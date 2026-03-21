// ============================================================================
// Instacart 购物车管理端点
// 创建、更新、查询购物车
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  InstacartAdapter,
  type InstacartCartItem,
} from "@/lib/services/ecommerce/instacart-adapter";
import { prisma } from "@/lib/db";
import { EcommercePlatform } from "@/lib/services/ecommerce/types";

export const dynamic = "force-dynamic";

const instacartAdapter = new InstacartAdapter();

// --------------------------------------------------------------------------
// 获取用户 Token
// --------------------------------------------------------------------------

async function getUserToken(userId: string): Promise<string | null> {
  const account = await prisma.platformAccount.findFirst<{
    id: string;
    accessToken?: string;
    expiresAt?: Date;
    refreshToken?: string;
  }>({
    where: {
      userId,
      platform: EcommercePlatform.INSTACART,
      status: "ACTIVE",
    },
  });

  if (!account?.accessToken) {
    return null;
  }

  if (account.expiresAt && account.expiresAt < new Date()) {
    if (account.refreshToken) {
      try {
        const newToken = await instacartAdapter.refreshToken(account.refreshToken);
        await prisma.platformAccount.update({
          where: { id: account.id },
          data: {
            accessToken: newToken.accessToken,
            refreshToken: newToken.refreshToken || account.refreshToken,
            expiresAt: newToken.expiresAt,
          },
        });
        return newToken.accessToken;
      } catch {
        await prisma.platformAccount.update({
          where: { id: account.id },
          data: { status: "EXPIRED" },
        });
        return null;
      }
    }
    return null;
  }

  return account.accessToken;
}

// --------------------------------------------------------------------------
// GET: 获取可用零售商
// --------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getUserToken(session.user.id);
    if (!token) {
      return NextResponse.json({ error: "Instacart not connected" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const zipCode = searchParams.get("zipCode") || "10001";

    const retailers = await instacartAdapter.getAvailableRetailers(zipCode, token);

    return NextResponse.json({ retailers });
  } catch (error) {
    console.error("Get retailers error:", error);
    return NextResponse.json({ error: "Failed to get retailers" }, { status: 500 });
  }
}

// --------------------------------------------------------------------------
// POST: 创建购物车
// --------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getUserToken(session.user.id);
    if (!token) {
      return NextResponse.json({ error: "Instacart not connected" }, { status: 403 });
    }

    const body = await request.json();
    const { items, retailerId, zipCode } = body as {
      items: InstacartCartItem[];
      retailerId?: string;
      zipCode?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items required" }, { status: 400 });
    }

    let selectedRetailerId = retailerId;

    if (!selectedRetailerId) {
      const retailers = await instacartAdapter.getAvailableRetailers(zipCode || "10001", token);
      const availableRetailer = retailers.find((r) => r.isAvailable);
      if (!availableRetailer) {
        return NextResponse.json({ error: "No available retailers" }, { status: 400 });
      }
      selectedRetailerId = availableRetailer.id;
    }

    const cart = await instacartAdapter.createCart(items, selectedRetailerId, token);

    await prisma.instacartCart.create({
      data: {
        userId: session.user.id,
        cartId: cart.cartId,
        retailerId: cart.retailerId,
        checkoutUrl: cart.checkoutUrl,
        deepLink: cart.deepLink,
        itemsJson: JSON.stringify(cart.items),
        expiresAt: cart.expiresAt,
      },
    });

    return NextResponse.json({
      cartId: cart.cartId,
      checkoutUrl: cart.checkoutUrl,
      deepLink: cart.deepLink,
      expiresAt: cart.expiresAt,
    });
  } catch (error) {
    console.error("Create cart error:", error);
    return NextResponse.json({ error: "Failed to create cart" }, { status: 500 });
  }
}
