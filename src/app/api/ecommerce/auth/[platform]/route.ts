// @ts-nocheck - Convex returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient } from "@/lib/convex-client";
import { asConvexQueryReference, asConvexMutationReference } from "@/lib/convex-reference";
import { platformAdapterFactory } from "@/lib/services/ecommerce";
import { EcommercePlatform } from "@/lib/services/ecommerce/types";
import { PlatformError, PlatformErrorType } from "@/lib/services/ecommerce/types";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const platform = platformParam?.toUpperCase() as EcommercePlatform;
    if (!platformAdapterFactory.isPlatformSupported(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");

    if (!redirectUri) {
      return NextResponse.json({ error: "redirect_uri is required" }, { status: 400 });
    }

    const adapter = platformAdapterFactory.createAdapter(platform);
    const authResponse = await adapter.getAuthorizationUrl({
      redirectUri,
      state: state || undefined,
      scope: ["read", "write"],
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Get authorization URL error:", error);
    return NextResponse.json({ error: "Failed to get authorization URL" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const platform = platformParam?.toUpperCase() as EcommercePlatform;
    if (!platformAdapterFactory.isPlatformSupported(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    const body = await request.json();
    const { code, redirectUri, state } = body;

    if (!code || !redirectUri) {
      return NextResponse.json({ error: "code and redirect_uri are required" }, { status: 400 });
    }

    const adapter = platformAdapterFactory.createAdapter(platform);
    const tokenInfo = await adapter.exchangeToken({
      code,
      redirectUri,
      state,
    });

    // 保存平台账号信息到数据库 (Convex)
    const accountId = await convexClient.mutation(
      asConvexMutationReference("ecommerce:upsertPlatformAccount"),
      {
        memberId: session.user.id,
        platform,
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        tokenExpiresAt: tokenInfo.expiresAt?.getTime(),
        platformUserId: tokenInfo.platformUserId,
      }
    );

    return NextResponse.json({
      success: true,
      accountId,
      platform,
      platformName: adapter.platformName,
    });
  } catch (error) {
    console.error("Token exchange error:", error);

    if (error instanceof PlatformError) {
      return NextResponse.json({ error: error.message, type: error.type }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
  }
}
