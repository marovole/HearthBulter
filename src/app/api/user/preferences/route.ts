import { NextRequest, NextResponse } from "next/server";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { safeParseArray, safeParseObject } from "@/lib/utils/json-helpers";

interface UserPreference {
  memberId: string;
  spiceLevel?: string;
  sweetness?: string;
  saltiness?: string;
  preferredCuisines?: unknown;
  avoidedIngredients?: unknown;
  preferredIngredients?: unknown;
  maxCookTime?: number | null;
  minServings?: number;
  maxServings?: number;
  costLevel?: string;
  maxEstimatedCost?: number | null;
  dietType?: string;
  isLowCarb?: boolean;
  isLowFat?: boolean;
  isHighProtein?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  enableRecommendations?: boolean;
  learnedPreferences?: unknown;
  preferenceScore?: number;
}

/**
 * GET /api/user/preferences
 * 获取用户偏好设置
 *
 * Migrated from Supabase to Neon
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const preferences = await neonAdapter.userPreference.findUnique<UserPreference>({
      where: { memberId },
    });

    if (!preferences) {
      return NextResponse.json({
        success: true,
        preferences: {
          memberId,
          spiceLevel: "MEDIUM",
          sweetness: "MEDIUM",
          saltiness: "MEDIUM",
          preferredCuisines: [],
          avoidedIngredients: [],
          preferredIngredients: [],
          maxCookTime: null,
          minServings: 1,
          maxServings: 10,
          costLevel: "MEDIUM",
          maxEstimatedCost: null,
          dietType: "OMNIVORE",
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

    const normalizedPreferences = {
      ...preferences,
      preferredCuisines: safeParseArray(preferences.preferredCuisines),
      avoidedIngredients: safeParseArray(preferences.avoidedIngredients),
      preferredIngredients: safeParseArray(preferences.preferredIngredients),
      learnedPreferences: safeParseObject(preferences.learnedPreferences),
    };

    return NextResponse.json({
      success: true,
      preferences: normalizedPreferences,
    });
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/user/preferences
 * 创建或更新用户偏好设置
 *
 * Migrated from Supabase to Neon
 */
export async function POST(request: NextRequest) {
  try {
    const preferences = await request.json();
    const { memberId } = preferences;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const data = {
      memberId,
      spiceLevel: preferences.spiceLevel || "MEDIUM",
      sweetness: preferences.sweetness || "MEDIUM",
      saltiness: preferences.saltiness || "MEDIUM",
      preferredCuisines: preferences.preferredCuisines || [],
      avoidedIngredients: preferences.avoidedIngredients || [],
      preferredIngredients: preferences.preferredIngredients || [],
      maxCookTime: preferences.maxCookTime || null,
      minServings: preferences.minServings || 1,
      maxServings: preferences.maxServings || 10,
      costLevel: preferences.costLevel || "MEDIUM",
      maxEstimatedCost: preferences.maxEstimatedCost || null,
      dietType: preferences.dietType || "OMNIVORE",
      isLowCarb: preferences.isLowCarb || false,
      isLowFat: preferences.isLowFat || false,
      isHighProtein: preferences.isHighProtein || false,
      isVegetarian: preferences.isVegetarian || false,
      isVegan: preferences.isVegan || false,
      isGlutenFree: preferences.isGlutenFree || false,
      isDairyFree: preferences.isDairyFree || false,
      enableRecommendations: preferences.enableRecommendations !== false,
    };

    const userPreference = await neonAdapter.userPreference.upsert<UserPreference>({
      where: { memberId },
      create: data,
      update: data,
    });

    const normalizedPreference = {
      ...userPreference,
      preferredCuisines: safeParseArray(userPreference.preferredCuisines),
      avoidedIngredients: safeParseArray(userPreference.avoidedIngredients),
      preferredIngredients: safeParseArray(userPreference.preferredIngredients),
      learnedPreferences: safeParseObject(userPreference.learnedPreferences),
    };

    return NextResponse.json({
      success: true,
      preferences: normalizedPreference,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
