import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

    // 初始化价格比较服务
    const priceComparator = new PriceComparator(prisma);

    // 执行价格比较
    const comparisonConfig = {
      includeShipping: config?.includeShipping !== false,
      minConfidence: config?.minConfidence || 0.6,
      maxResultsPerFood: config?.maxResultsPerFood || 5,
      considerDiscounts: config?.considerDiscounts !== false,
      preferInStock: config?.preferInStock !== false,
    };

    const comparisonResults = await priceComparator.comparePrices(foods, comparisonConfig);

    // 转换结果格式
    const results = comparisonResults.map(result => ({
      foodId: result.foodId,
      foodName: result.foodName,
      matches: result.matches.map(match => ({
        platform: match.platformProduct.platform,
        platformProductId: match.platformProduct.platformProductId,
        name: match.platformProduct.name,
        brand: match.platformProduct.brand,
        price: match.platformProduct.price,
        originalPrice: match.platformProduct.originalPrice,
        totalPrice: (match.platformProduct as any).totalPrice,
        unitPrice: (match.platformProduct as any).unitPrice,
        shippingFee: (match.platformProduct as any).shippingFee,
        discountAmount: (match.platformProduct as any).discountAmount,
        discountPercentage: (match.platformProduct as any).discountPercentage,
        stock: match.platformProduct.stock,
        isInStock: match.platformProduct.isInStock,
        imageUrl: match.platformProduct.imageUrl,
        confidence: match.confidence,
        valueScore: (match.platformProduct as any).valueScore,
        rating: match.platformProduct.rating,
        salesCount: match.platformProduct.salesCount,
      })),
      bestPrice: result.bestPrice ? {
        platform: result.bestPrice.platform,
        platformProductId: result.bestPrice.product.platformProductId,
        name: result.bestPrice.product.name,
        totalPrice: result.bestPrice.totalPrice,
        unitPrice: result.bestPrice.unitPrice,
        price: result.bestPrice.product.price,
        shippingFee: (result.bestPrice.product as any).shippingFee,
      } : null,
    }));

    // 计算汇总统计
    const statistics = {
      totalFoods: foods.length,
      totalMatches: results.reduce((sum, result) => sum + result.matches.length, 0),
      foodsWithBestPrice: results.filter(result => result.bestPrice !== null).length,
      averageSavings: calculateAverageSavings(results),
      platformDistribution: calculatePlatformDistribution(results),
    };

    return NextResponse.json({
      success: true,
      results,
      statistics,
    });
  } catch (error) {
    console.error('Price comparison error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to compare prices' },
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
    const includeShipping = searchParams.get('includeShipping') !== 'false';

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

    // 初始化价格比较服务
    const priceComparator = new PriceComparator(prisma);

    // 执行单个食材价格比较
    const comparisonResults = await priceComparator.comparePrices([food], {
      includeShipping,
      minConfidence: 0.6,
      maxResultsPerFood: 10,
      considerDiscounts: true,
      preferInStock: true,
    });

    if (comparisonResults.length === 0) {
      return NextResponse.json({ error: 'No comparison results found' }, { status: 404 });
    }

    const result = comparisonResults[0];

    // 转换结果格式
    const formattedResult = {
      foodId: result.foodId,
      foodName: result.foodName,
      matches: result.matches.map(match => ({
        platform: match.platformProduct.platform,
        platformProductId: match.platformProduct.platformProductId,
        name: match.platformProduct.name,
        brand: match.platformProduct.brand,
        price: match.platformProduct.price,
        originalPrice: match.platformProduct.originalPrice,
        totalPrice: (match.platformProduct as any).totalPrice,
        unitPrice: (match.platformProduct as any).unitPrice,
        shippingFee: (match.platformProduct as any).shippingFee,
        discountAmount: (match.platformProduct as any).discountAmount,
        discountPercentage: (match.platformProduct as any).discountPercentage,
        stock: match.platformProduct.stock,
        isInStock: match.platformProduct.isInStock,
        imageUrl: match.platformProduct.imageUrl,
        confidence: match.confidence,
        valueScore: (match.platformProduct as any).valueScore,
        rating: match.platformProduct.rating,
        salesCount: match.platformProduct.salesCount,
        matchedKeywords: match.matchedKeywords,
        matchReasons: match.matchReasons,
      })),
      bestPrice: result.bestPrice ? {
        platform: result.bestPrice.platform,
        platformProductId: result.bestPrice.product.platformProductId,
        name: result.bestPrice.product.name,
        totalPrice: result.bestPrice.totalPrice,
        unitPrice: result.bestPrice.unitPrice,
        price: result.bestPrice.product.price,
        shippingFee: (result.bestPrice.product as any).shippingFee,
      } : null,
    };

    return NextResponse.json({
      success: true,
      result: formattedResult,
    });
  } catch (error) {
    console.error('Single price comparison error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to compare price' },
      { status: 500 }
    );
  }
}

// 计算平均节省金额
function calculateAverageSavings(results: any[]): number {
  const savings = results.map(result => {
    if (!result.bestPrice || result.matches.length < 2) return 0;
    
    const prices = result.matches.map(match => match.totalPrice || match.price);
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    
    return highestPrice - lowestPrice;
  }).filter(saving => saving > 0);

  return savings.length > 0 ? savings.reduce((sum, saving) => sum + saving, 0) / savings.length : 0;
}

// 计算平台分布
function calculatePlatformDistribution(results: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  results.forEach(result => {
    result.matches.forEach((match: any) => {
      const platform = match.platform;
      distribution[platform] = (distribution[platform] || 0) + 1;
    });
  });

  return distribution;
}
