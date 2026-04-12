// ============================================================================
// Instacart 结算端点
// 生成结算链接和 Deep Link
// ============================================================================

// @ts-nocheck - Convex returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { InstacartAdapter } from "@/lib/services/ecommerce/instacart-adapter";
import { convexClient } from "@/lib/convex-client";
import { asConvexQueryReference, asConvexMutationReference } from "@/lib/convex-reference";
import { EcommercePlatform } from "@/lib/services/ecommerce/types";

// Type definitions for Convex documents
interface PlatformAccount {
  _id?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  platformUserId?: string;
}

interface InstacartCartDoc {
  cartId: string;
  checkoutUrl: string;
  deepLink: string;
  expiresAt?: number;
}

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

    // 使用 Convex 查询购物车
    const carts = (await convexClient.query(asConvexQueryReference("instacart:getInstacartCart"), {
      userId: session.user.id,
    })) as InstacartCartDoc[] | null;

    const cart = carts?.find((c) => c.cartId === cartId);

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (cart.expiresAt && cart.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Cart expired" }, { status: 410 });
    }

    return NextResponse.json({
      cartId: cart.cartId,
      checkoutUrl: cart.checkoutUrl,
      deepLink: cart.deepLink,
      webUrl: instacartAdapter.generateWebCheckoutUrl(cart.cartId),
      expiresAt: cart.expiresAt ? new Date(cart.expiresAt) : undefined,
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

    // 使用 Convex 查询平台账号
    const account = (await convexClient.query(
      asConvexQueryReference("ecommerce:getOrCreatePlatformAccount"),
      {
        memberId: session.user.id,
        platform: EcommercePlatform.INSTACART,
      }
    )) as PlatformAccount | null;

    if (!account?.accessToken) {
      return NextResponse.json({ error: "Instacart not connected" }, { status: 403 });
    }

    const body = await request.json();
    const { mealPlanId, zipCode, retailerId } = body;

    if (!mealPlanId) {
      return NextResponse.json({ error: "Meal plan ID required" }, { status: 400 });
    }

    // 使用 Convex 查询餐食计划详情
    const mealPlan = (await convexClient.query(asConvexQueryReference("meals:getPlanDetails"), {
      planId: mealPlanId,
    })) as { meals?: any[] } | null;

    if (!mealPlan) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    // 从餐食中提取食材
    const ingredientMap = new Map<string, number>();
    for (const meal of mealPlan.meals || []) {
      for (const ingredient of meal.ingredients || []) {
        const key = ingredient.name?.toLowerCase() || "";
        if (!key) continue;
        const current = ingredientMap.get(key) || 0;
        ingredientMap.set(key, current + (ingredient.amount || 1));
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

    // 使用 Convex 创建购物车记录
    await convexClient.mutation(asConvexMutationReference("instacart:createInstacartCart"), {
      userId: session.user.id,
      cartId: cart.cartId,
      retailerId: cart.retailerId,
      checkoutUrl: cart.checkoutUrl,
      deepLink: cart.deepLink,
      items: cart.items,
      mealPlanId,
      status: "ACTIVE",
      expiresAt: cart.expiresAt?.getTime(),
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
