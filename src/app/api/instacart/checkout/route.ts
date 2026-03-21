// ============================================================================
// Instacart 结算端点
// 生成结算链接和 Deep Link
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { InstacartAdapter } from "@/lib/services/ecommerce/instacart-adapter";
import { prisma } from "@/lib/db";
import { EcommercePlatform } from "@/lib/services/ecommerce/types";

export const dynamic = "force-dynamic";

const instacartAdapter = new InstacartAdapter();

// --------------------------------------------------------------------------
// GET: 获取结算链接
// --------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get("cartId");

    if (!cartId) {
      return NextResponse.json({ error: "Cart ID required" }, { status: 400 });
    }

    const cart = await prisma.instacartCart.findFirst<{
      cartId: string;
      userId: string;
      expiresAt: Date;
      checkoutUrl: string;
      deepLink: string;
    }>({
      where: {
        cartId,
        userId: session.user.id,
      },
    });

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (cart.expiresAt < new Date()) {
      return NextResponse.json({ error: "Cart expired" }, { status: 410 });
    }

    return NextResponse.json({
      cartId: cart.cartId,
      checkoutUrl: cart.checkoutUrl,
      deepLink: cart.deepLink,
      webUrl: instacartAdapter.generateWebCheckoutUrl(cart.cartId),
      expiresAt: cart.expiresAt,
    });
  } catch (error) {
    console.error("Get checkout error:", error);
    return NextResponse.json({ error: "Failed to get checkout" }, { status: 500 });
  }
}

// --------------------------------------------------------------------------
// POST: 从周计划生成结算链接
// --------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.platformAccount.findFirst<{
      accessToken?: string;
    }>({
      where: {
        userId: session.user.id,
        platform: EcommercePlatform.INSTACART,
        status: "ACTIVE",
      },
    });

    if (!account?.accessToken) {
      return NextResponse.json({ error: "Instacart not connected" }, { status: 403 });
    }

    const body = await request.json();
    const { mealPlanId, zipCode, retailerId } = body;

    if (!mealPlanId) {
      return NextResponse.json({ error: "Meal plan ID required" }, { status: 400 });
    }

    const mealPlan = await prisma.mealPlan.findUnique<{
      id: string;
      meals: Array<{
        ingredients: Array<{
          name: string;
          quantity?: number;
        }>;
      }>;
    }>({
      where: { id: mealPlanId },
      include: {
        meals: {
          include: {
            ingredients: true,
          },
        },
      },
    });

    if (!mealPlan) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    const ingredientMap = new Map<string, number>();
    for (const meal of mealPlan.meals) {
      for (const ingredient of meal.ingredients) {
        const key = ingredient.name.toLowerCase();
        const current = ingredientMap.get(key) || 0;
        ingredientMap.set(key, current + (ingredient.quantity || 1));
      }
    }

    const items = Array.from(ingredientMap.entries()).map(([name, quantity]) => ({
      productId: name,
      quantity: Math.ceil(quantity),
    }));

    let selectedRetailerId = retailerId;
    if (!selectedRetailerId) {
      const retailers = await instacartAdapter.getAvailableRetailers(
        zipCode || "10001",
        account.accessToken
      );
      const available = retailers.find((r) => r.isAvailable);
      if (!available) {
        return NextResponse.json({ error: "No available retailers" }, { status: 400 });
      }
      selectedRetailerId = available.id;
    }

    const cart = await instacartAdapter.createCart(items, selectedRetailerId, account.accessToken);

    await prisma.instacartCart.create({
      data: {
        userId: session.user.id,
        cartId: cart.cartId,
        retailerId: cart.retailerId,
        checkoutUrl: cart.checkoutUrl,
        deepLink: cart.deepLink,
        itemsJson: JSON.stringify(cart.items),
        mealPlanId,
        expiresAt: cart.expiresAt,
      },
    });

    return NextResponse.json({
      cartId: cart.cartId,
      checkoutUrl: cart.checkoutUrl,
      deepLink: cart.deepLink,
      webUrl: instacartAdapter.generateWebCheckoutUrl(cart.cartId),
      itemCount: items.length,
      expiresAt: cart.expiresAt,
    });
  } catch (error) {
    console.error("Create checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
