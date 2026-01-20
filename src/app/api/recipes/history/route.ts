import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import { recipeRepository } from "@/lib/repositories/recipe-repository-singleton";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const days = parseInt(searchParams.get("days") || "30");

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = startDate.getTime();

    const views = await convexClient.query<Array<Record<string, unknown>>>(
      api["recipe-interactions"].listViewsByMember,
      {
        memberId: memberId as Id<"familyMembers">,
        startDate: startTimestamp,
      }
    );

    const total = views.length;
    const offset = (page - 1) * limit;
    const pageViews = views.slice(offset, offset + limit);

    const recipeIds = pageViews.map((view) => view.recipeId as string);
    const recipes = recipeIds.length
      ? await convexClient.query<Array<Record<string, unknown>>>(api.recipes.listByIds, {
          ids: recipeIds as Id<"recipes">[],
        })
      : [];

    const recipeMap = new Map(recipes.map((recipe) => [recipe._id, recipe]));

    const viewResults = pageViews.map((view) => ({
      id: view._id as string,
      viewedAt: view.viewedAt,
      viewDuration: view.viewDuration,
      source: view.source,
      recipe: recipeMap.get(view.recipeId as string) ?? null,
    }));

    return NextResponse.json({
      success: true,
      views: viewResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting recipe history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { memberId, recipeId, viewDuration, source } = await request.json();

    if (!memberId || !recipeId) {
      return NextResponse.json(
        { error: "Missing required parameters: memberId and recipeId" },
        { status: 400 }
      );
    }

    const recipeExists = await recipeRepository.recipeExists(recipeId);
    if (!recipeExists) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const view = await convexClient.mutation<Record<string, unknown>>(
      api["recipe-interactions"].addView,
      {
        recipeId: recipeId as Id<"recipes">,
        memberId: memberId as Id<"familyMembers">,
        viewDuration: viewDuration ?? undefined,
        source: source ?? "direct",
      }
    );

    return NextResponse.json({
      success: true,
      view,
    });
  } catch (error) {
    console.error("Error recording recipe view:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
