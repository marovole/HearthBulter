import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { platformAdapterFactory } from "@/lib/services/ecommerce";
import { EcommercePlatform } from "@prisma/client";
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
    const platform = searchParams
      .get("platform")
      ?.toUpperCase() as EcommercePlatform;
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const inStock = searchParams.get("inStock");
    const sortBy = searchParams.get("sortBy") as
      | "price"
      | "sales"
      | "rating"
      | "name";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    if (!keyword) {
      return NextResponse.json(
        { error: "keyword is required" },
        { status: 400 },
      );
    }

    // 如果指定了平台，从平台API搜索
    if (platform && platformAdapterFactory.isPlatformSupported(platform)) {
      return await searchFromPlatformAPI(session.user.id, platform, {
        keyword,
        category,
        brand,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        inStock: inStock === "true",
        sortBy,
        sortOrder,
        page,
        pageSize,
      });
    }

    // 否则从缓存搜索
    return await searchFromCache({
      keyword,
      category,
      brand,
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
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to search products" },
      { status: 500 },
    );
  }
}

async function searchFromPlatformAPI(
  userId: string,
  platform: EcommercePlatform,
  request: ProductSearchRequest,
) {
  try {
    // 获取用户的平台账号
    const platformAccount = await prisma.platformAccount.findFirst({
      where: {
        userId,
        platform,
        isActive: true,
        status: "ACTIVE",
      },
    });

    if (!platformAccount) {
      return NextResponse.json(
        { error: "Platform account not found or inactive" },
        { status: 400 },
      );
    }

    // 检查token是否有效
    const adapter = platformAdapterFactory.createAdapter(platform);
    const isValidToken = await adapter.validateToken(
      platformAccount.accessToken,
    );

    if (!isValidToken) {
      // 尝试刷新token
      if (platformAccount.refreshToken) {
        try {
          const newTokenInfo = await adapter.refreshToken(
            platformAccount.refreshToken,
          );

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

          platformAccount.accessToken = newTokenInfo.accessToken;
        } catch (refreshError) {
          return NextResponse.json(
            { error: "Token expired and refresh failed" },
            { status: 401 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 },
        );
      }
    }

    // 调用平台API搜索
    const searchResponse = await adapter.searchProducts(
      request,
      platformAccount.accessToken,
    );

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
    // 构建搜索条件
    const whereConditions: any = {
      isValid: true,
      expiresAt: { gt: new Date() },
    };

    if (request.keyword) {
      whereConditions.OR = [
        { name: { contains: request.keyword, mode: "insensitive" } },
        { description: { contains: request.keyword, mode: "insensitive" } },
        { brand: { contains: request.keyword, mode: "insensitive" } },
      ];
    }

    if (request.category) {
      whereConditions.category = {
        contains: request.category,
        mode: "insensitive",
      };
    }

    if (request.brand) {
      whereConditions.brand = { contains: request.brand, mode: "insensitive" };
    }

    if (request.minPrice !== undefined) {
      whereConditions.price = { gte: request.minPrice };
    }

    if (request.maxPrice !== undefined) {
      whereConditions.price = {
        ...whereConditions.price,
        lte: request.maxPrice,
      };
    }

    if (request.inStock !== undefined) {
      whereConditions.isInStock = request.inStock;
    }

    // 构建排序条件
    const orderBy: any = {};
    if (request.sortBy) {
      switch (request.sortBy) {
      case "price":
        orderBy.price = request.sortOrder || "asc";
        break;
      case "sales":
        orderBy.salesCount = request.sortOrder || "desc";
        break;
      case "rating":
        orderBy.rating = request.sortOrder || "desc";
        break;
      case "name":
        orderBy.name = request.sortOrder || "asc";
        break;
      default:
        orderBy.cachedAt = "desc";
      }
    } else {
      orderBy.cachedAt = "desc";
    }

    // 查询数据库
    const [products, total] = await Promise.all([
      prisma.platformProduct.findMany({
        where: whereConditions,
        orderBy,
        skip: (request.page! - 1) * request.pageSize!,
        take: request.pageSize!,
      }),
      prisma.platformProduct.count({ where: whereConditions }),
    ]);

    // 转换为标准格式
    const standardizedProducts = products.map((product) => ({
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
      total,
      page: request.page,
      pageSize: request.pageSize,
      hasMore: request.page! * request.pageSize! < total,
    });
  } catch (error) {
    console.error("Cache search error:", error);
    throw error;
  }
}
