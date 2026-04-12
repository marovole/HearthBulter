// @ts-nocheck - Convex returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient } from "@/lib/convex-client";
import { asConvexQueryReference, asConvexMutationReference } from "@/lib/convex-reference";
import { platformAdapterFactory } from "@/lib/services/ecommerce";
import { EcommercePlatform } from "@/lib/services/ecommerce/types";
import {
  ProductSearchRequest,
  PlatformError,
  PlatformErrorType,
} from "@/lib/services/ecommerce/types";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const platform = searchParams.get("platform")?.toUpperCase() as EcommercePlatform;
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const inStock = searchParams.get("inStock");
    const sortBy = searchParams.get("sortBy") as "price" | "sales" | "rating" | "name";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    if (!keyword) {
      return NextResponse.json({ error: "keyword is required" }, { status: 400 });
    }

    // 如果指定了平台，从平台API搜索
    if (platform && platformAdapterFactory.isPlatformSupported(platform)) {
      return await searchFromPlatformAPI(session.user.id, platform, {
        keyword,
        category: category ?? undefined,
        brand: brand ?? undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        inStock: inStock === "true",
        sortBy,
        sortOrder,
        page,
        pageSize,
      });
    }

    // 否则从缓存搜索 (Convex)
    return await searchFromCache({
      keyword,
      category: category ?? undefined,
      brand: brand ?? undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStock: inStock === "true",
      sortBy,
      sortOrder,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Product search error:", error);

    if (error instanceof PlatformError) {
      return NextResponse.json({ error: error.message, type: error.type }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to search products" }, { status: 500 });
  }
}

async function searchFromPlatformAPI(
  userId: string,
  platform: EcommercePlatform,
  request: ProductSearchRequest
) {
  try {
    // 获取用户的平台账号 (Convex)
    const platformAccount = await convexClient.query(
      asConvexQueryReference("ecommerce:getOrCreatePlatformAccount"),
      {
        memberId: userId,
        platform,
      }
    );

    if (!platformAccount || !platformAccount.accessToken) {
      return NextResponse.json(
        { error: "Platform account not found or inactive" },
        { status: 400 }
      );
    }

    // 检查token是否有效
    const adapter = platformAdapterFactory.createAdapter(platform);
    const isValidToken = await adapter.validateToken(platformAccount.accessToken);

    if (!isValidToken) {
      // 尝试刷新token
      if (platformAccount.refreshToken) {
        try {
          const newTokenInfo = await adapter.refreshToken(platformAccount.refreshToken);

          // 更新数据库中的token (Convex)
          await convexClient.mutation(
            asConvexMutationReference("ecommerce:upsertPlatformAccount"),
            {
              memberId: userId,
              platform,
              accessToken: newTokenInfo.accessToken,
              refreshToken: newTokenInfo.refreshToken,
              tokenExpiresAt: newTokenInfo.expiresAt?.getTime(),
            }
          );

          platformAccount.accessToken = newTokenInfo.accessToken;
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

    // 调用平台API搜索
    const searchResponse = await adapter.searchProducts(request, platformAccount.accessToken);

    return NextResponse.json({
      success: true,
      platform,
      platformName: adapter.platformName,
      ...searchResponse,
    });
  } catch (error) {
    console.error("Platform API search error:", error);
    throw error;
  }
}

async function searchFromCache(request: ProductSearchRequest) {
  try {
    // 使用 Convex 搜索产品
    const offset = ((request.page ?? 1) - 1) * (request.pageSize ?? 20);
    const limit = request.pageSize ?? 20;

    const result = await convexClient.query(asConvexQueryReference("ecommerce:searchProducts"), {
      keyword: request.keyword || "",
      minPrice: request.minPrice,
      maxPrice: request.maxPrice,
      inStock: request.inStock,
      limit,
      offset,
    });

    // 客户端排序
    let products = result.products || [];
    if (request.sortBy) {
      products = products.sort((a: any, b: any) => {
        let comparison = 0;
        switch (request.sortBy) {
          case "price":
            comparison = (a.price || 0) - (b.price || 0);
            break;
          case "sales":
            comparison = (a.salesCount || 0) - (b.salesCount || 0);
            break;
          case "rating":
            comparison = (a.rating || 0) - (b.rating || 0);
            break;
          case "name":
            comparison = (a.name || "").localeCompare(b.name || "");
            break;
          default:
            comparison = (a.cachedAt || 0) - (b.cachedAt || 0);
        }
        return request.sortOrder === "desc" ? -comparison : comparison;
      });
    }

    // 转换为标准格式
    const standardizedProducts = products.map((product: any) => ({
      platformProductId: product.platformProductId,
      platform: product.platform,
      sku: product.sku,
      name: product.name,
      description: product.description,
      brand: product.brand,
      category: product.category,
      imageUrl: product.imageUrl,
      specification: product.specification,
      weight: product.weight,
      volume: product.volume,
      unit: product.unit,
      price: product.price,
      originalPrice: product.originalPrice,
      currency: product.currency,
      priceUnit: product.priceUnit,
      stock: product.stock,
      isInStock: product.isInStock,
      stockStatus: product.stockStatus,
      salesCount: product.salesCount,
      rating: product.rating,
      reviewCount: product.reviewCount,
      deliveryOptions: product.deliveryOptions,
      deliveryTime: product.deliveryTime,
      shippingFee: product.shippingFee,
      matchConfidence: product.matchConfidence,
      platformData: product.platformData,
    }));

    return NextResponse.json({
      success: true,
      products: standardizedProducts,
      total: result.total,
      page: request.page,
      pageSize: request.pageSize,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("Cache search error:", error);
    throw error;
  }
}
