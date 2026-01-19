import { NextRequest, NextResponse } from "next/server";
import { taskRepository } from "@/lib/repositories/task-repository-singleton";
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from "@/middleware/permissions";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";

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

      const member = await convexClient.query<Doc<"familyMembers"> | null>(
        api.members.getByClerkInFamily,
        {
          familyId: familyId as Id<"families">,
          clerkId: userId,
        },
      );

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
