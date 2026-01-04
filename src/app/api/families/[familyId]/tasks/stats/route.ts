import { NextRequest, NextResponse } from "next/server";
import { taskRepository } from "@/lib/repositories/task-repository-singleton";
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from "@/middleware/permissions";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";

/**
 * GET /api/families/:familyId/tasks/stats
 * 获取任务统计
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;

      const supabase = SupabaseClientManager.getInstance();

      // 验证用户权限
      const { data: member } = await supabase
        .from("family_members")
        .select("id")
        .eq("user_id", userId)
        .eq("family_id", familyId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: "Not a family member" },
          { status: 403 },
        );
      }

      // 使用 Repository 获取任务统计
      const stats = await taskRepository.getTaskStats(familyId);

      return NextResponse.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting task stats:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get task stats",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}
