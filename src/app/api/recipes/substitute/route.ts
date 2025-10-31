import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { originalIngredientId, substituteFoodId, substitutionType, reason, nutritionDelta, costDelta, tasteSimilarity } = await request.json();

    // 验证必需参数
    if (!originalIngredientId || !substituteFoodId || !substitutionType) {
      return NextResponse.json(
        { error: 'Missing required parameters: originalIngredientId, substituteFoodId, substitutionType' },
        { status: 400 }
      );
    }

    // 检查食材是否存在
    const originalIngredient = await prisma.recipeIngredient.findUnique({
      where: { id: originalIngredientId }
    });

    if (!originalIngredient) {
      return NextResponse.json(
        { error: 'Original ingredient not found' },
        { status: 404 }
      );
    }

    const substituteFood = await prisma.food.findUnique({
      where: { id: substituteFoodId }
    });

    if (!substituteFood) {
      return NextResponse.json(
        { error: 'Substitute food not found' },
        { status: 404 }
      );
    }

    // 创建食材替换记录
    const substitution = await prisma.ingredientSubstitution.create({
      data: {
        originalIngredientId,
        substituteFoodId,
        substitutionType,
        reason: reason || null,
        nutritionDelta: nutritionDelta ? JSON.stringify(nutritionDelta) : null,
        costDelta: costDelta || null,
        tasteSimilarity: tasteSimilarity || null,
        conditions: '[]' // 默认空条件
      },
      include: {
        originalIngredient: {
          include: { food: true }
        },
        substituteFood: true
      }
    });

    return NextResponse.json({
      success: true,
      substitution: {
        ...substitution,
        nutritionDelta: nutritionDelta ? JSON.parse(substitution.nutritionDelta) : null
      }
    });

  } catch (error) {
    console.error('Error creating ingredient substitution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const originalIngredientId = searchParams.get('originalIngredientId');
    const substitutionType = searchParams.get('substitutionType');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!originalIngredientId) {
      return NextResponse.json(
        { error: 'originalIngredientId is required' },
        { status: 400 }
      );
    }

    // 获取替换建议
    const substitutions = await prisma.ingredientSubstitution.findMany({
      where: {
        originalIngredientId,
        ...(substitutionType && { substitutionType }),
        isValid: true
      },
      include: {
        substituteFood: true,
        originalIngredient: {
          include: { food: true }
        }
      },
      orderBy: [
        { tasteSimilarity: 'desc' },
        { costDelta: 'asc' }
      ],
      take: limit
    });

    return NextResponse.json({
      success: true,
      substitutions: substitutions.map(sub => ({
        ...sub,
        nutritionDelta: sub.nutritionDelta ? JSON.parse(sub.nutritionDelta) : null,
        conditions: JSON.parse(sub.conditions)
      }))
    });

  } catch (error) {
    console.error('Error getting ingredient substitutions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
