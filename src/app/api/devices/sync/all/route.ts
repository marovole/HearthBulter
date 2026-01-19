import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import { z } from "zod";
import type { SyncResult } from "@/types/wearable-devices";

export const dynamic = "force-dynamic";
const BatchSyncSchema = z.object({
  memberId: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

type DeviceConnectionRecord = {
  _id: Id<"deviceConnections">;
  memberId: Id<"familyMembers">;
  deviceId: string;
  platform: string;
  legacyId?: string;
  lastSyncAt?: number;
  retryCount?: number;
  syncStatus?: string;
  isAutoSync?: boolean;
  isActive?: boolean;
  member?: Record<string, unknown> | null;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = BatchSyncSchema.parse(body);

    let memberIds: Id<"familyMembers">[] = [];

    if (validatedData.memberId) {
      const access = await convexClient.query<{ hasAccess: boolean }>(
        api.members.verifyAccess,
        {
          memberId: validatedData.memberId as Id<"familyMembers">,
          clerkId: session.user.id,
        },
      );

      if (!access.hasAccess) {
        return NextResponse.json(
          { error: "无权限访问该家庭成员" },
          { status: 403 },
        );
      }

      memberIds = [validatedData.memberId as Id<"familyMembers">];
    } else {
      const accessibleMembers = await convexClient.query<
        Array<{ _id: string }>
      >(api.members.listAccessibleByClerkId, {
        clerkId: session.user.id,
      });

      memberIds = accessibleMembers.map(
        (member) => member._id as Id<"familyMembers">,
      );
    }

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: "没有需要同步的设备",
          devices: [],
          summary: { total: 0, success: 0, failed: 0, skipped: 0 },
        },
      });
    }

    const deviceResponse = await convexClient.query<{
      data: DeviceConnectionRecord[];
      total: number;
    }>(api.devices.listConnections, {
      memberIds,
      isActive: true,
      offset: 0,
      limit: 200,
    });
    const deviceConnections = deviceResponse.data as DeviceConnectionRecord[];

    let devicesToSync = (deviceConnections || []) as DeviceConnectionRecord[];
    devicesToSync = devicesToSync.filter(
      (device) =>
        device.isAutoSync !== false && device.syncStatus !== "DISABLED",
    );

    if (validatedData.platforms && validatedData.platforms.length > 0) {
      const platforms = new Set(validatedData.platforms);
      devicesToSync = devicesToSync.filter((device) =>
        platforms.has(String(device.platform)),
      );
    }

    if (devicesToSync.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: "没有需要同步的设备",
          devices: [],
          summary: { total: 0, success: 0, failed: 0, skipped: 0 },
        },
      });
    }

    const deviceUpdatePromises = devicesToSync.map(
      async (deviceRecord: DeviceConnectionRecord) => {
        let syncResult: SyncResult = {
          success: false,
          syncedCount: 0,
          skippedCount: 0,
          errors: ["该平台暂不支持自动同步"],
          lastSyncDate: new Date(),
        };

        try {
          await convexClient.mutation(api.devices.updateConnection, {
            id: deviceRecord._id,
            patch: { syncStatus: "SYNCING" },
          });

          const platform = String(deviceRecord.platform);
          const legacyId = deviceRecord.legacyId as string | undefined;
          const lastSyncAt = deviceRecord.lastSyncAt as number | undefined;
          if (platform === "APPLE_HEALTHKIT" && legacyId) {
            const { healthKitService } = await import(
              "@/lib/services/healthkit-service"
            );
            syncResult = await healthKitService.syncAllData(
              String(deviceRecord.memberId),
              deviceRecord._id,
              lastSyncAt ? new Date(lastSyncAt) : undefined,
            );
          } else if (platform === "HUAWEI_HEALTH" && legacyId) {
            const { huaweiHealthService } = await import(
              "@/lib/services/huawei-health-service"
            );
            syncResult = await huaweiHealthService.syncAllData(
              String(deviceRecord.memberId),
              deviceRecord._id,
              lastSyncAt ? new Date(lastSyncAt) : undefined,
            );
          }

          if (syncResult.success) {
            await convexClient.mutation(api.devices.updateConnection, {
              id: deviceRecord._id,
              patch: {
                syncStatus: "SUCCESS",
                lastSyncAt: Date.now(),
                errorCount: 0,
                lastError: null,
                retryCount: 0,
              },
            });
          } else {
            const retryCount = Number(deviceRecord.retryCount ?? 0) + 1;
            await convexClient.mutation(api.devices.updateConnection, {
              id: deviceRecord._id,
              patch: {
                syncStatus: "FAILED",
                lastError: syncResult.errors[0] || "Unknown error",
                retryCount,
              },
            });
          }
        } catch (updateError) {
          console.error("更新设备状态失败:", updateError);
          syncResult = {
            success: false,
            syncedCount: 0,
            skippedCount: 0,
            errors: [
              updateError instanceof Error ? updateError.message : "同步失败",
            ],
            lastSyncDate: new Date(),
          };
        }

        return {
          deviceId: String(deviceRecord.deviceId),
          platform: String(deviceRecord.platform),
          success: syncResult.success,
          skipped: syncResult.skippedCount && syncResult.skippedCount > 0,
          errors: syncResult.errors,
          endTime: syncResult.lastSyncDate?.toISOString(),
          member: deviceRecord.member,
        };
      },
    );

    const updatedResults = await Promise.all(deviceUpdatePromises);

    const summary = {
      total: devicesToSync.length,
      success: updatedResults.filter((r) => r.success && !r.skipped).length,
      failed: updatedResults.filter((r) => !r.success).length,
      skipped: updatedResults.filter((r) => r.skipped).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        message: `完成 ${summary.total} 个设备的同步`,
        devices: updatedResults,
        summary,
      },
    });
  } catch (error) {
    console.error("批量设备同步失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数错误", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let memberIds: Id<"familyMembers">[] = [];

    if (memberId) {
      const access = await convexClient.query<{ hasAccess: boolean }>(
        api.members.verifyAccess,
        {
          memberId: memberId as Id<"familyMembers">,
          clerkId: session.user.id,
        },
      );

      if (!access.hasAccess) {
        return NextResponse.json(
          { error: "无权限访问该家庭成员" },
          { status: 403 },
        );
      }

      memberIds = [memberId as Id<"familyMembers">];
    } else {
      const accessibleMembers = await convexClient.query<
        Array<{ _id: string }>
      >(api.members.listAccessibleByClerkId, {
        clerkId: session.user.id,
      });

      memberIds = accessibleMembers.map(
        (member) => member._id as Id<"familyMembers">,
      );
    }

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          syncHistory: [],
          dailyStats: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
        },
      });
    }

    const sources = ["APPLE_HEALTHKIT", "HUAWEI_HEALTH", "GOOGLE_FIT"];

    const { data: syncHistory, total } = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.health.listByMembers, {
      memberIds,
      sources,
      offset,
      limit,
    });

    const memberCache = new Map<string, { id: string; name: string }>();
    const deviceCache = new Map<
      string,
      { id: string; deviceId: string; deviceName: string; platform: string }
    >();

    const history = await Promise.all(
      (syncHistory || []).map(async (record) => {
        const memberIdValue = record.memberId as string;
        const deviceIdValue = record.deviceConnectionId as string | undefined;

        let member = memberCache.get(memberIdValue);
        if (!member) {
          const memberDoc = await convexClient.query<Record<
            string,
            unknown
          > | null>(api.members.getById, {
            memberId: memberIdValue as Id<"familyMembers">,
          });
          member = memberDoc
            ? { id: String(memberDoc._id), name: String(memberDoc.name) }
            : { id: memberIdValue, name: "" };
          memberCache.set(memberIdValue, member);
        }

        let deviceConnection:
          | {
              id: string;
              deviceId: string;
              deviceName: string;
              platform: string;
            }
          | undefined;
        if (deviceIdValue) {
          deviceConnection = deviceCache.get(deviceIdValue);
          if (!deviceConnection) {
            const deviceDoc = await convexClient.query<Record<
              string,
              unknown
            > | null>(api.devices.getById, {
              id: deviceIdValue as Id<"deviceConnections">,
            });
            if (deviceDoc) {
              deviceConnection = {
                id: String(deviceDoc._id),
                deviceId: String(deviceDoc.deviceId),
                deviceName: String(deviceDoc.deviceName),
                platform: String(deviceDoc.platform),
              };
              deviceCache.set(deviceIdValue, deviceConnection);
            }
          }
        }

        return {
          id: record._id,
          measuredAt: record.measuredAt,
          source: record.source,
          createdAt: record.createdAt,
          member,
          deviceConnection: deviceConnection ?? null,
        };
      }),
    );

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const { data: recentData } = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.health.listByMembers, {
      memberIds,
      sources,
      offset: 0,
      limit: 1000,
    });

    const dailyStatsMap: Record<string, number> = {};
    (recentData || []).forEach((record) => {
      const createdAt = record.createdAt as number | undefined;
      if (!createdAt || createdAt < thirtyDaysAgo) return;
      const date = new Date(createdAt).toISOString().slice(0, 10);
      dailyStatsMap[date] = (dailyStatsMap[date] || 0) + 1;
    });

    const dailyStats = Object.entries(dailyStatsMap)
      .map(([date, count]) => ({
        createdAt: date,
        _count: { id: count },
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        syncHistory: history,
        dailyStats,
        pagination: {
          total: total || 0,
          limit,
          offset,
          hasMore: offset + history.length < (total || 0),
        },
      },
    });
  } catch (error) {
    console.error("获取同步历史失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
