// ============================================================================
// Instacart OAuth 回调端点
// 处理 OAuth 授权码交换和 Token 存储
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

interface OAuthState {
  _id: string;
  userId: string;
  expiresAt: number;
  redirectUri: string;
}

export const dynamic = "force-dynamic";

const instacartAdapter = new InstacartAdapter();

// --------------------------------------------------------------------------
// GET: 获取授权 URL
// --------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "status") {
      // 使用 Convex 查询平台账号状态
      const account = (await convexClient.query(
        asConvexQueryReference("ecommerce:getOrCreatePlatformAccount"),
        {
          memberId: session.user.id,
          platform: EcommercePlatform.INSTACART,
        }
      )) as PlatformAccount | null;

      return NextResponse.json({
        connected: !!account,
        expiresAt: account?.tokenExpiresAt ? new Date(account.tokenExpiresAt) : undefined,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/instacart/auth/callback`;

    const oauthResponse = await instacartAdapter.getAuthorizationUrl({
      redirectUri,
      scope: ["cart:write", "products:read", "orders:read"],
    });

    // 使用 Convex 创建 OAuth state
    await convexClient.mutation(asConvexMutationReference("instacart:createOAuthState"), {
      state: oauthResponse.state,
      userId: session.user.id,
      platform: EcommercePlatform.INSTACART,
      redirectUri,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes in milliseconds
    });

    return NextResponse.json({
      authorizationUrl: oauthResponse.authorizationUrl,
      state: oauthResponse.state,
    });
  } catch (error) {
    console.error("Instacart auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// --------------------------------------------------------------------------
// POST: 处理授权码交换
// --------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, state } = body;

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    // 使用 Convex 查询 OAuth state
    const oauthState = (await convexClient.query(
      asConvexQueryReference("instacart:getOAuthState"),
      {
        state,
      }
    )) as OAuthState | null;

    if (!oauthState || oauthState.userId !== session.user.id) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    if (oauthState.expiresAt < Date.now()) {
      // 删除过期的 state
      await convexClient.mutation(asConvexMutationReference("instacart:deleteOAuthState"), {
        id: oauthState._id,
      });
      return NextResponse.json({ error: "State expired" }, { status: 400 });
    }

    const tokenInfo = await instacartAdapter.exchangeToken({
      code,
      redirectUri: oauthState.redirectUri,
      state,
    });

    // 使用 Convex upsert 平台账号
    await convexClient.mutation(asConvexMutationReference("ecommerce:upsertPlatformAccount"), {
      memberId: session.user.id,
      platform: EcommercePlatform.INSTACART,
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      tokenExpiresAt: tokenInfo.expiresAt?.getTime(),
      platformUserId: tokenInfo.platformUserId,
    });

    // 删除已使用的 OAuth state
    await convexClient.mutation(asConvexMutationReference("instacart:deleteOAuthState"), {
      id: oauthState._id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Instacart token exchange error:", error);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}

// --------------------------------------------------------------------------
// DELETE: 断开连接
// --------------------------------------------------------------------------

export async function DELETE(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取现有账号并更新为失效状态
    const account = (await convexClient.query(
      asConvexQueryReference("ecommerce:getOrCreatePlatformAccount"),
      {
        memberId: session.user.id,
        platform: EcommercePlatform.INSTACART,
      }
    )) as PlatformAccount | null;

    if (account) {
      // 使用 upsert 更新账号状态为失效（通过设置过期时间为过去）
      await convexClient.mutation(asConvexMutationReference("ecommerce:upsertPlatformAccount"), {
        memberId: session.user.id,
        platform: EcommercePlatform.INSTACART,
        accessToken: "",
        tokenExpiresAt: 0, // 设置为已过期
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Instacart disconnect error:", error);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}
