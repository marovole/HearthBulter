import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SKUMatcher } from '@/lib/services/sku-matcher';
import { PriceComparator } from '@/lib/services/price-comparator';
import { PlatformError, PlatformErrorType } from '@/lib/services/ecommerce/types';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { foodIds, config } = body;

    if (!foodIds || !Array.isArray(foodIds) || foodIds.length === 0) {
      return NextResponse.json(
        { error: 'foodIds array is required' },
        { status: 400 }
      );
    }

    // 获取食材信息
    const foods = await prisma.food.findMany({
      where: {
        id: { in: foodIds },
      },
    });

    if (foods.length === 0) {
      return NextResponse.json({ error: 'No foods found' }, { status: 404 });
    }

    // 初始化服务
    const skuMatcher = new SKUMatcher(prisma);
    const priceComparator = new PriceComparator(prisma);

    // 执行SKU匹配
    const matchConfig = {
      minConfidence: config?.minConfidence || 0.6,
      maxResults: config?.maxResults || 5,
      includeOutOfStock: config?.includeOutOfStock || false,
      priceRange: config?.priceRange,
    };

    const matches = await skuMatcher.matchMultipleFoods(foods, matchConfig);

    // 转换结果格式
    const results = Array.from(matches.entries()).map(([foodId, foodMatches]) => {
      const food = foods.find(f => f.id === foodId);
      return {
        foodId,
        foodName: food?.name || 'Unknown',
        matches: foodMatches.map(match => ({
          platform: match.platformProduct.platform,
          platformProductId: match.platformProduct.platformProductId,
          name: match.platformProduct.name,
          brand: match.platformProduct.brand,
          price: match.platformProduct.price,
          originalPrice: match.platformProduct.originalPrice,
          unitPrice: match.platformProduct.priceUnit,
          stock: match.platformProduct.stock,
          isInStock: match.platformProduct.isInStock,
          imageUrl: match.platformProduct.imageUrl,
          confidence: match.confidence,
          matchedKeywords: match.matchedKeywords,
          matchReasons: match.matchReasons,
          shippingFee: match.platformProduct.shippingFee,
          rating: match.platformProduct.rating,
          salesCount: match.platformProduct.salesCount,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      results,
      totalFoods: foods.length,
      totalMatches: results.reduce((sum, result) => sum + result.matches.length, 0),
    });
  } catch (error) {
    console.error('SKU match error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to match SKUs' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const foodId = searchParams.get('foodId');

    if (!foodId) {
      return NextResponse.json({ error: 'foodId is required' }, { status: 400 });
    }

    // 获取食材信息
    const food = await prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      return NextResponse.json({ error: 'Food not found' }, { status: 404 });
    }

    // 初始化服务
    const skuMatcher = new SKUMatcher(prisma);

    // 执行单个食材匹配
    const matches = await skuMatcher.matchFoodToSKUs(food, {
      minConfidence: 0.6,
      maxResults: 10,
      includeOutOfStock: false,
    });

    // 转换结果格式
    const result = {
      foodId: food.id,
      foodName: food.name,
      matches: matches.map(match => ({
        platform: match.platformProduct.platform,
        platformProductId: match.platformProduct.platformProductId,
        name: match.platformProduct.name,
        brand: match.platformProduct.brand,
        price: match.platformProduct.price,
        originalPrice: match.platformProduct.originalPrice,
        unitPrice: match.platformProduct.priceUnit,
        stock: match.platformProduct.stock,
        isInStock: match.platformProduct.isInStock,
        imageUrl: match.platformProduct.imageUrl,
        confidence: match.confidence,
        matchedKeywords: match.matchedKeywords,
        matchReasons: match.matchReasons,
        shippingFee: match.platformProduct.shippingFee,
        rating: match.platformProduct.rating,
        salesCount: match.platformProduct.salesCount,
      })),
    };

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Single SKU match error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to match SKU' },
      { status: 500 }
    );
  }
}
