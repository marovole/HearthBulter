import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import { safeParseArray, safeParseObject } from "@/lib/utils/json-helpers";
import type { Id, Doc } from "@/convex/_generated/dataModel";

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
 * Migrated from Neon to Convex
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

    const preferences = await convexClient.query<Doc<"userPreferences"> | null>(
      api.recommendations.getUserPreference,
      {
        memberId: memberId as Id<"familyMembers">,
      }
    );

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
      memberId,
      spiceLevel: "MEDIUM",
      sweetness: "MEDIUM",
      saltiness: "MEDIUM",
      preferredCuisines: safeParseArray(preferences.preferredCuisines),
      avoidedIngredients: safeParseArray(preferences.avoidedIngredients),
      preferredIngredients: safeParseArray(preferences.preferredIngredients),
      maxCookTime: preferences.maxCookTime ?? null,
      minServings: 1,
      maxServings: 10,
      costLevel: preferences.costLevel ?? "MEDIUM",
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
      learnedPreferences: safeParseObject(preferences.learnedPreferences),
      preferenceScore: 0,
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
 * Migrated from Neon to Convex
 */
export async function POST(request: NextRequest) {
  try {
    const preferences = await request.json();
    const { memberId } = preferences;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // Upsert user preference using Convex mutation
    await convexClient.mutation(api.recommendations.upsertUserPreference, {
      memberId: memberId as Id<"familyMembers">,
      preferredIngredients: preferences.preferredIngredients || [],
      avoidedIngredients: preferences.avoidedIngredients || [],
      maxCookTime: preferences.maxCookTime || null,
      costLevel: preferences.costLevel || "MEDIUM",
      preferredCuisines: preferences.preferredCuisines || [],
      learnedPreferences: preferences.learnedPreferences || {},
    });

    // Fetch the updated preference to return
    const userPreference = await convexClient.query<Doc<"userPreferences"> | null>(
      api.recommendations.getUserPreference,
      {
        memberId: memberId as Id<"familyMembers">,
      }
    );

    const normalizedPreference: UserPreference = {
      memberId,
      spiceLevel: preferences.spiceLevel || "MEDIUM",
      sweetness: preferences.sweetness || "MEDIUM",
      saltiness: preferences.saltiness || "MEDIUM",
      preferredCuisines: safeParseArray(
        userPreference?.preferredCuisines ?? preferences.preferredCuisines ?? []
      ),
      avoidedIngredients: safeParseArray(
        userPreference?.avoidedIngredients ?? preferences.avoidedIngredients ?? []
      ),
      preferredIngredients: safeParseArray(
        userPreference?.preferredIngredients ?? preferences.preferredIngredients ?? []
      ),
      maxCookTime: preferences.maxCookTime ?? null,
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
      learnedPreferences: safeParseObject(
        userPreference?.learnedPreferences ?? preferences.learnedPreferences ?? {}
      ),
      preferenceScore: 0,
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
