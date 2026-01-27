// ============================================================================
// Instacart OAuth 回调端点
// 处理 OAuth 授权码交换和 Token 存储
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { InstacartAdapter } from "@/lib/services/ecommerce/instacart-adapter";
import { prisma } from "@/lib/db";
import { EcommercePlatform } from "@/lib/services/ecommerce/types";

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
      const account = await prisma.platformAccount.findFirst({
        where: {
          userId: session.user.id,
          platform: EcommercePlatform.INSTACART,
          status: "ACTIVE",
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      });

      return NextResponse.json({
        connected: !!account,
        expiresAt: account?.expiresAt,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/instacart/auth/callback`;

    const oauthResponse = await instacartAdapter.getAuthorizationUrl({
      redirectUri,
      scope: ["cart:write", "products:read", "orders:read"],
    });

    await prisma.oAuthState.create({
      data: {
        state: oauthResponse.state,
        userId: session.user.id,
        platform: EcommercePlatform.INSTACART,
        redirectUri,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
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

    const oauthState = await prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!oauthState || oauthState.userId !== session.user.id) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    if (oauthState.expiresAt < new Date()) {
      await prisma.oAuthState.delete({ where: { state } });
      return NextResponse.json({ error: "State expired" }, { status: 400 });
    }

    const tokenInfo = await instacartAdapter.exchangeToken({
      code,
      redirectUri: oauthState.redirectUri,
      state,
    });

    await prisma.platformAccount.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: EcommercePlatform.INSTACART,
        },
      },
      update: {
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        tokenType: tokenInfo.tokenType,
        scope: tokenInfo.scope,
        expiresAt: tokenInfo.expiresAt,
        platformUserId: tokenInfo.platformUserId,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: EcommercePlatform.INSTACART,
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        tokenType: tokenInfo.tokenType,
        scope: tokenInfo.scope,
        expiresAt: tokenInfo.expiresAt,
        platformUserId: tokenInfo.platformUserId,
        status: "ACTIVE",
      },
    });

    await prisma.oAuthState.delete({ where: { state } });

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

    await prisma.platformAccount.updateMany({
      where: {
        userId: session.user.id,
        platform: EcommercePlatform.INSTACART,
      },
      data: {
        status: "INACTIVE",
        accessToken: null,
        refreshToken: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Instacart disconnect error:", error);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}
