import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/user/preferences
 * 获取用户偏好设置
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 获取用户偏好
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('memberId', memberId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected
      console.error('Error getting user preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user preferences' },
        { status: 500 }
      );
    }

    if (!preferences) {
      // 如果没有设置偏好，返回默认值
      return NextResponse.json({
        success: true,
        preferences: {
          memberId,
          spiceLevel: 'MEDIUM',
          sweetness: 'MEDIUM',
          saltiness: 'MEDIUM',
          preferredCuisines: [],
          avoidedIngredients: [],
          preferredIngredients: [],
          maxCookTime: null,
          minServings: 1,
          maxServings: 10,
          costLevel: 'MEDIUM',
          maxEstimatedCost: null,
          dietType: 'OMNIVORE',
          isLowCarb: false,
          isLowFat: false,
          isHighProtein: false,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          isDairyFree: false,
          enableRecommendations: true,
          learnedPreferences: {},
          preferenceScore: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        ...preferences,
        preferredCuisines: Array.isArray(preferences.preferredCuisines)
          ? preferences.preferredCuisines
          : JSON.parse(preferences.preferredCuisines as string),
        avoidedIngredients: Array.isArray(preferences.avoidedIngredients)
          ? preferences.avoidedIngredients
          : JSON.parse(preferences.avoidedIngredients as string),
        preferredIngredients: Array.isArray(preferences.preferredIngredients)
          ? preferences.preferredIngredients
          : JSON.parse(preferences.preferredIngredients as string),
        learnedPreferences: typeof preferences.learnedPreferences === 'object'
          ? preferences.learnedPreferences
          : (preferences.learnedPreferences ? JSON.parse(preferences.learnedPreferences as string) : {}),
      },
    });

  } catch (error) {
    console.error('Error getting user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/preferences
 * 创建或更新用户偏好设置
 *
 * Migrated from Prisma to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const preferences = await request.json();
    const { memberId } = preferences;

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 准备数据 - Supabase 可以直接存储 JSON 类型
    const data = {
      memberId,
      spiceLevel: preferences.spiceLevel || 'MEDIUM',
      sweetness: preferences.sweetness || 'MEDIUM',
      saltiness: preferences.saltiness || 'MEDIUM',
      preferredCuisines: preferences.preferredCuisines || [],
      avoidedIngredients: preferences.avoidedIngredients || [],
      preferredIngredients: preferences.preferredIngredients || [],
      maxCookTime: preferences.maxCookTime || null,
      minServings: preferences.minServings || 1,
      maxServings: preferences.maxServings || 10,
      costLevel: preferences.costLevel || 'MEDIUM',
      maxEstimatedCost: preferences.maxEstimatedCost || null,
      dietType: preferences.dietType || 'OMNIVORE',
      isLowCarb: preferences.isLowCarb || false,
      isLowFat: preferences.isLowFat || false,
      isHighProtein: preferences.isHighProtein || false,
      isVegetarian: preferences.isVegetarian || false,
      isVegan: preferences.isVegan || false,
      isGlutenFree: preferences.isGlutenFree || false,
      isDairyFree: preferences.isDairyFree || false,
      enableRecommendations: preferences.enableRecommendations !== false,
      updatedAt: new Date().toISOString(),
    };

    // 使用 Supabase 的 upsert
    const { data: userPreference, error } = await supabase
      .from('user_preferences')
      .upsert(data, { onConflict: 'memberId' })
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update user preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: {
        ...userPreference,
        preferredCuisines: Array.isArray(userPreference.preferredCuisines)
          ? userPreference.preferredCuisines
          : userPreference.preferredCuisines,
        avoidedIngredients: Array.isArray(userPreference.avoidedIngredients)
          ? userPreference.avoidedIngredients
          : userPreference.avoidedIngredients,
        preferredIngredients: Array.isArray(userPreference.preferredIngredients)
          ? userPreference.preferredIngredients
          : userPreference.preferredIngredients,
        learnedPreferences: typeof userPreference.learnedPreferences === 'object'
          ? userPreference.learnedPreferences
          : (userPreference.learnedPreferences || {}),
      },
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
