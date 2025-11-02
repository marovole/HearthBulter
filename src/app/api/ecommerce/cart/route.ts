import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CartAggregator } from '@/lib/services/cart-aggregator';
import { PlatformError, PlatformErrorType } from '@/lib/services/ecommerce/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, address, config } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    if (!address || !address.province || !address.city || !address.district || !address.detail) {
      return NextResponse.json(
        { error: 'Valid address is required' },
        { status: 400 }
      );
    }

    // 提取食材ID和数量
    const foodIds = items.map((item: any) => item.foodId);
    const quantities = new Map<string, number>();
    
    items.forEach((item: any) => {
      quantities.set(item.foodId, item.quantity || 1);
    });

    // 获取食材信息
    const foods = await prisma.food.findMany({
      where: {
        id: { in: foodIds },
      },
    });

    if (foods.length === 0) {
      return NextResponse.json({ error: 'No foods found' }, { status: 404 });
    }

    // 初始化购物车聚合服务
    const cartAggregator = new CartAggregator(prisma);

    // 执行购物车聚合
    const aggregationConfig = {
      includeShipping: config?.includeShipping !== false,
      minConfidence: config?.minConfidence || 0.6,
      maxResultsPerItem: config?.maxResultsPerItem || 3,
      considerDiscounts: config?.considerDiscounts !== false,
      preferInStock: config?.preferInStock !== false,
      allowCrossPlatform: config?.allowCrossPlatform !== false,
      optimizeFor: config?.optimizeFor || 'balance',
    };

    const aggregationResult = await cartAggregator.aggregateCart(
      foods,
      quantities,
      address,
      aggregationConfig
    );

    // 转换结果格式
    const formattedResult = {
      items: aggregationResult.items.map(item => ({
        foodId: item.foodId,
        foodName: item.foodName,
        quantity: item.quantity,
        selectedPlatform: item.selectedPlatform,
        selectedProduct: item.selectedProduct ? {
          platform: item.selectedProduct.platform,
          platformProductId: item.selectedProduct.platformProductId,
          name: item.selectedProduct.name,
          brand: item.selectedProduct.brand,
          price: item.selectedProduct.price,
          originalPrice: item.selectedProduct.originalPrice,
          totalPrice: (item.selectedProduct as any).totalPrice,
          unitPrice: (item.selectedProduct as any).unitPrice,
          shippingFee: (item.selectedProduct as any).shippingFee,
          stock: item.selectedProduct.stock,
          isInStock: item.selectedProduct.isInStock,
          imageUrl: item.selectedProduct.imageUrl,
          confidence: item.matches.find(m => m.platformProduct.platformProductId === item.selectedProduct?.platformProductId)?.confidence,
          valueScore: (item.selectedProduct as any).valueScore,
        } : null,
        alternatives: item.matches.slice(0, 3).map(match => ({
          platform: match.platformProduct.platform,
          platformProductId: match.platformProduct.platformProductId,
          name: match.platformProduct.name,
          brand: match.platformProduct.brand,
          price: match.platformProduct.price,
          originalPrice: match.platformProduct.originalPrice,
          totalPrice: (match.platformProduct as any).totalPrice,
          unitPrice: (match.platformProduct as any).unitPrice,
          shippingFee: (match.platformProduct as any).shippingFee,
          stock: match.platformProduct.stock,
          isInStock: match.platformProduct.isInStock,
          imageUrl: match.platformProduct.imageUrl,
          confidence: match.confidence,
          valueScore: (match.platformProduct as any).valueScore,
        })),
      })),
      totalByPlatform: aggregationResult.totalByPlatform,
      grandTotal: aggregationResult.grandTotal,
      recommendations: aggregationResult.recommendations,
      statistics: {
        totalItems: aggregationResult.items.length,
        totalQuantity: aggregationResult.items.reduce((sum, item) => sum + item.quantity, 0),
        platformsUsed: Object.keys(aggregationResult.totalByPlatform).length,
        averageConfidence: calculateAverageConfidence(aggregationResult.items),
        potentialSavings: calculatePotentialSavings(aggregationResult.recommendations),
      },
    };

    return NextResponse.json({
      success: true,
      result: formattedResult,
    });
  } catch (error) {
    console.error('Cart aggregation error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to aggregate cart' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const foodIds = searchParams.get('foodIds');

    if (!foodIds) {
      return NextResponse.json({ error: 'foodIds is required' }, { status: 400 });
    }

    const foodIdArray = foodIds.split(',').filter(id => id.trim());
    
    if (foodIdArray.length === 0) {
      return NextResponse.json({ error: 'No valid foodIds provided' }, { status: 400 });
    }

    // 获取食材信息
    const foods = await prisma.food.findMany({
      where: {
        id: { in: foodIdArray },
      },
    });

    if (foods.length === 0) {
      return NextResponse.json({ error: 'No foods found' }, { status: 404 });
    }

    // 初始化购物车聚合服务
    const cartAggregator = new CartAggregator(prisma);

    // 为每个食材设置默认数量1
    const quantities = new Map<string, number>();
    foods.forEach(food => {
      quantities.set(food.id, 1);
    });

    // 使用默认地址（示例）
    const defaultAddress = {
      province: '上海市',
      city: '上海市',
      district: '浦东新区',
      detail: '张江高科技园区',
      postalCode: '201203',
      contactName: '测试用户',
      contactPhone: '13800138000',
    };

    // 执行购物车聚合
    const aggregationResult = await cartAggregator.aggregateCart(
      foods,
      quantities,
      defaultAddress,
      {
        includeShipping: true,
        minConfidence: 0.6,
        maxResultsPerItem: 3,
        considerDiscounts: true,
        preferInStock: true,
        allowCrossPlatform: true,
        optimizeFor: 'balance',
      }
    );

    // 转换为简化格式
    const simplifiedResult = {
      foods: foods.map(food => ({
        foodId: food.id,
        foodName: food.name,
        category: food.category,
        matches: aggregationResult.items
          .find(item => item.foodId === food.id)
          ?.matches.map(match => ({
            platform: match.platformProduct.platform,
            platformProductId: match.platformProduct.platformProductId,
            name: match.platformProduct.name,
            price: match.platformProduct.price,
            stock: match.platformProduct.stock,
            isInStock: match.platformProduct.isInStock,
            confidence: match.confidence,
          })) || [],
      })),
      summary: {
        totalFoods: foods.length,
        totalMatches: aggregationResult.items.reduce((sum, item) => sum + item.matches.length, 0),
        platformsAvailable: Array.from(new Set(
          aggregationResult.items.flatMap(item => 
            item.matches.map(match => match.platformProduct.platform)
          )
        )),
      },
    };

    return NextResponse.json({
      success: true,
      result: simplifiedResult,
    });
  } catch (error) {
    console.error('Quick cart analysis error:', error);
    
    if (error instanceof PlatformError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze cart' },
      { status: 500 }
    );
  }
}

// 计算平均匹配置信度
function calculateAverageConfidence(items: any[]): number {
  const confidences = items
    .filter(item => item.selectedProduct)
    .map(item => {
      const match = item.matches.find(m => 
        m.platformProduct.platformProductId === item.selectedProduct?.platformProductId
      );
      return match?.confidence || 0;
    })
    .filter(confidence => confidence > 0);

  return confidences.length > 0 
    ? confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length 
    : 0;
}

// 计算潜在节省金额
function calculatePotentialSavings(recommendations: any[]): number {
  return recommendations
    .filter(rec => rec.potentialSavings)
    .reduce((sum, rec) => sum + rec.potentialSavings, 0);
}
