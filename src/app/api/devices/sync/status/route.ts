import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deviceSyncService } from "@/lib/services/device-sync-service";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const accessibleMembers = await convexClient.query<Array<{ _id: string }>>(
      api.members.listAccessibleByClerkId,
      {
        clerkId: session.user.id,
      },
    );

    const memberIds = accessibleMembers.map(
      (member) => member._id as Id<"familyMembers">,
    );

    if (memberIds.length === 0) {
      const syncStatus = await deviceSyncService.getSyncStatus();
      return NextResponse.json({
        success: true,
        data: {
          userDevices: [],
          globalStats: {
            totalCount: syncStatus.totalDevices,
            successCount: syncStatus.recentlySynced,
            errorCount: syncStatus.staleDevices,
            syncedDataCount: 0,
          },
          serviceStatus: syncStatus.status,
        },
      });
    }

    const { data: deviceStats } = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.devices.listConnections, {
      memberIds,
      offset: 0,
      limit: 200,
    });

    const syncStatus = await deviceSyncService.getSyncStatus();

    return NextResponse.json({
      success: true,
      data: {
        userDevices: deviceStats || [],
        globalStats: {
          totalCount: syncStatus.totalDevices,
          successCount: syncStatus.recentlySynced,
          errorCount: syncStatus.staleDevices,
          syncedDataCount: 0,
        },
        serviceStatus: syncStatus.status,
      },
    });
  } catch (error) {
    console.error("获取同步状态失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
