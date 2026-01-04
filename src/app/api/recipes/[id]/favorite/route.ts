import { NextRequest, NextResponse } from "next/server";
import { recipeRepository } from "@/lib/repositories/recipe-repository-singleton";
import { updateRecipeFavoriteCount } from "@/lib/db/supabase-rpc-helpers";

/**
 * POST /api/recipes/[id]/favorite
 * 收藏食谱
 *
 * 使用双写框架迁移 - 保留 RPC 函数用于原子性计数更新
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recipeId } = await params;
    const { memberId, notes } = await request.json();

    // 验证必需参数
    if (!memberId) {
      return NextResponse.json(
        { error: "Missing required parameter: memberId" },
        { status: 400 },
      );
    }

    // 检查食谱是否存在
    const recipeExists = await recipeRepository.recipeExists(recipeId);
    if (!recipeExists) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // 使用 Repository 添加收藏
    const favorite = await recipeRepository.addFavorite({
      recipeId,
      memberId,
      notes,
    });

    // 使用 RPC 函数更新食谱收藏计数
    const favoriteCountUpdate = await updateRecipeFavoriteCount(recipeId);

    if (!favoriteCountUpdate.success) {
      console.error(
        "Error updating favorite count:",
        favoriteCountUpdate.error,
      );
      // 不阻止请求，只记录错误
    }

    return NextResponse.json({
      success: true,
      favorite,
    });
  } catch (error) {
    console.error("Error favoriting recipe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/recipes/[id]/favorite
 * 取消收藏食谱
 *
 * 使用双写框架迁移 - 保留 RPC 函数用于原子性计数更新
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recipeId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 },
      );
    }

    // 使用 Repository 删除收藏
    await recipeRepository.removeFavorite(recipeId, memberId);

    // 使用 RPC 函数更新食谱收藏计数
    const favoriteCountUpdate = await updateRecipeFavoriteCount(recipeId);

    if (!favoriteCountUpdate.success) {
      console.error(
        "Error updating favorite count:",
        favoriteCountUpdate.error,
      );
      // 不阻止请求，只记录错误
    }

    return NextResponse.json({
      success: true,
      message: "Recipe unfavorited successfully",
    });
  } catch (error) {
    console.error("Error unfavoriting recipe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/recipes/[id]/favorite
 * 检查食谱收藏状态
 *
 * 使用双写框架迁移
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recipeId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 },
      );
    }

    // 使用 Repository 检查收藏状态
    const favorite = await recipeRepository.checkFavoriteStatus(
      recipeId,
      memberId,
    );

    return NextResponse.json({
      success: true,
      isFavorited: !!favorite,
      favorite,
    });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
