import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    // 获取用户偏好
    const preferences = await prisma.userPreference.findUnique({
      where: { memberId }
    });

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
          preferenceScore: 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        ...preferences,
        preferredCuisines: JSON.parse(preferences.preferredCuisines),
        avoidedIngredients: JSON.parse(preferences.avoidedIngredients),
        preferredIngredients: JSON.parse(preferences.preferredIngredients),
        learnedPreferences: preferences.learnedPreferences ? JSON.parse(preferences.learnedPreferences) : {}
      }
    });

  } catch (error) {
    console.error('Error getting user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // 准备数据
    const data = {
      memberId,
      spiceLevel: preferences.spiceLevel || 'MEDIUM',
      sweetness: preferences.sweetness || 'MEDIUM',
      saltiness: preferences.saltiness || 'MEDIUM',
      preferredCuisines: JSON.stringify(preferences.preferredCuisines || []),
      avoidedIngredients: JSON.stringify(preferences.avoidedIngredients || []),
      preferredIngredients: JSON.stringify(preferences.preferredIngredients || []),
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
      enableRecommendations: preferences.enableRecommendations !== false
    };

    // 创建或更新偏好设置
    const userPreference = await prisma.userPreference.upsert({
      where: { memberId },
      update: data,
      create: data
    });

    return NextResponse.json({
      success: true,
      preferences: {
        ...userPreference,
        preferredCuisines: JSON.parse(userPreference.preferredCuisines),
        avoidedIngredients: JSON.parse(userPreference.avoidedIngredients),
        preferredIngredients: JSON.parse(userPreference.preferredIngredients),
        learnedPreferences: userPreference.learnedPreferences ? JSON.parse(userPreference.learnedPreferences) : {}
      }
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
