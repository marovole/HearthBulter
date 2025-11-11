import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * POST /api/recipes/substitute - 创建食材替换记录
 *
 * Migrated from Prisma to Supabase
 */
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

    const supabase = SupabaseClientManager.getInstance();

    // 检查食材是否存在
    const { data: originalIngredient, error: originalError } = await supabase
      .from('recipe_ingredients')
      .select('id')
      .eq('id', originalIngredientId)
      .maybeSingle();

    if (originalError) {
      console.error('查询原始食材失败:', originalError);
      return NextResponse.json(
        { error: 'Failed to check original ingredient' },
        { status: 500 }
      );
    }

    if (!originalIngredient) {
      return NextResponse.json(
        { error: 'Original ingredient not found' },
        { status: 404 }
      );
    }

    const { data: substituteFood, error: substituteFoodError } = await supabase
      .from('foods')
      .select('id')
      .eq('id', substituteFoodId)
      .maybeSingle();

    if (substituteFoodError) {
      console.error('查询替代食物失败:', substituteFoodError);
      return NextResponse.json(
        { error: 'Failed to check substitute food' },
        { status: 500 }
      );
    }

    if (!substituteFood) {
      return NextResponse.json(
        { error: 'Substitute food not found' },
        { status: 404 }
      );
    }

    // 创建食材替换记录
    const { data: substitution, error: createError } = await supabase
      .from('ingredient_substitutions')
      .insert({
        originalIngredientId,
        substituteFoodId,
        substitutionType,
        reason: reason || null,
        nutritionDelta: nutritionDelta ? JSON.stringify(nutritionDelta) : null,
        costDelta: costDelta || null,
        tasteSimilarity: tasteSimilarity || null,
        conditions: '[]', // 默认空条件
      })
      .select()
      .single();

    if (createError) {
      console.error('创建食材替换记录失败:', createError);
      return NextResponse.json(
        { error: 'Failed to create substitution' },
        { status: 500 }
      );
    }

    // 查询关联的食材和食物信息
    const { data: originalWithFood } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        amount,
        unit,
        food:foods!inner(
          id,
          name,
          nameEn,
          calories,
          protein,
          carbs,
          fat
        )
      `)
      .eq('id', originalIngredientId)
      .single();

    const { data: substituteDetail } = await supabase
      .from('foods')
      .select('*')
      .eq('id', substituteFoodId)
      .single();

    return NextResponse.json({
      success: true,
      substitution: {
        ...(substitution as any),
        originalIngredient: originalWithFood,
        substituteFood: substituteDetail,
        nutritionDelta: nutritionDelta || null,
      },
    });

  } catch (error) {
    console.error('Error creating ingredient substitution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recipes/substitute - 获取食材替换建议
 *
 * Migrated from Prisma to Supabase
 */
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

    const supabase = SupabaseClientManager.getInstance();

    // 获取替换建议
    let query = supabase
      .from('ingredient_substitutions')
      .select(`
        id,
        originalIngredientId,
        substituteFoodId,
        substitutionType,
        reason,
        nutritionDelta,
        costDelta,
        tasteSimilarity,
        conditions,
        isValid,
        createdAt,
        updatedAt,
        substituteFood:foods!inner(
          id,
          name,
          nameEn,
          calories,
          protein,
          carbs,
          fat,
          category
        )
      `)
      .eq('originalIngredientId', originalIngredientId)
      .eq('isValid', true);

    if (substitutionType) {
      query = query.eq('substitutionType', substitutionType);
    }

    const { data: substitutions, error } = await query
      .order('tasteSimilarity', { ascending: false, nullsFirst: false })
      .order('costDelta', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('查询食材替换建议失败:', error);
      return NextResponse.json(
        { error: 'Failed to fetch substitutions' },
        { status: 500 }
      );
    }

    // 查询原始食材信息
    const { data: originalIngredient } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        amount,
        unit,
        food:foods!inner(
          id,
          name,
          nameEn,
          calories,
          protein,
          carbs,
          fat
        )
      `)
      .eq('id', originalIngredientId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      substitutions: (substitutions || []).map((sub: any) => ({
        ...sub,
        originalIngredient,
        nutritionDelta: sub.nutritionDelta ? JSON.parse(sub.nutritionDelta) : null,
        conditions: JSON.parse(sub.conditions || '[]'),
      })),
    });

  } catch (error) {
    console.error('Error getting ingredient substitutions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
