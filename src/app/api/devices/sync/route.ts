import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import type { SyncResult } from "@/types/wearable-devices";

export const dynamic = "force-dynamic";
const SyncRequestSchema = z.object({
  deviceId: z.string(),
  memberId: z.string(),
  dataTypes: z.array(z.string()).optional(),
});

type DeviceConnectionRecord = {
  _id: Id<"deviceConnections">;
  deviceId: string;
  memberId: Id<"familyMembers">;
  platform: string;
  legacyId?: string;
  lastSyncAt?: number;
  retryCount?: number;
  syncStatus?: string;
  isAutoSync?: boolean;
  isActive?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SyncRequestSchema.parse(body);

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

    const deviceConnection =
      await convexClient.query<DeviceConnectionRecord | null>(
        api.devices.getActiveByDeviceAndMember,
        {
          deviceId: validatedData.deviceId,
          memberId: validatedData.memberId as Id<"familyMembers">,
        },
      );

    if (!deviceConnection) {
      return NextResponse.json(
        { error: "设备未连接或已禁用" },
        { status: 404 },
      );
    }

    await convexClient.mutation(api.devices.updateConnection, {
      id: deviceConnection._id as Id<"deviceConnections">,
      patch: { syncStatus: "SYNCING" },
    });

    let syncResult:
      | {
          success: boolean;
          syncedCount: number;
          skippedCount: number;
          errors: string[];
          lastSyncDate: Date;
        }
      | undefined;

    const platform = String(deviceConnection.platform);
    const legacyId = deviceConnection.legacyId as string | undefined;
    const lastSyncAt = deviceConnection.lastSyncAt as number | undefined;

    if (platform === "APPLE_HEALTHKIT" && legacyId) {
      const { healthKitService } = await import(
        "@/lib/services/healthkit-service"
      );
      syncResult = await healthKitService.syncAllData(
        validatedData.memberId,
        deviceConnection._id as Id<"deviceConnections">,
        lastSyncAt ? new Date(lastSyncAt) : undefined,
      );
    } else if (platform === "HUAWEI_HEALTH" && legacyId) {
      const { huaweiHealthService } = await import(
        "@/lib/services/huawei-health-service"
      );
      syncResult = await huaweiHealthService.syncAllData(
        validatedData.memberId,
        deviceConnection._id as Id<"deviceConnections">,
        lastSyncAt ? new Date(lastSyncAt) : undefined,
      );
    } else {
      syncResult = {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errors: ["该平台暂不支持自动同步"],
        lastSyncDate: new Date(),
      };
    }

    if (!syncResult.success) {
      const retryCount = Number(deviceConnection.retryCount ?? 0) + 1;
      await convexClient.mutation(api.devices.updateConnection, {
        id: deviceConnection._id as Id<"deviceConnections">,
        patch: {
          syncStatus: "FAILED",
          lastError: syncResult.errors[0],
          retryCount,
        },
      });
    } else {
      await convexClient.mutation(api.devices.updateConnection, {
        id: deviceConnection._id as Id<"deviceConnections">,
        patch: {
          syncStatus: "SUCCESS",
          lastError: null,
          lastSyncAt: Date.now(),
          retryCount: 0,
          errorCount: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        deviceId: deviceConnection.deviceId,
        syncResult,
        syncStatus: syncResult.success ? "SUCCESS" : "FAILED",
      },
      message: syncResult.success ? "同步完成" : "同步失败",
    });
  } catch (error) {
    console.error("设备同步失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数错误", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "缺少memberId参数" }, { status: 400 });
    }

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

    const devicesResult = await convexClient.query<{
      data: DeviceConnectionRecord[];
      total: number;
    }>(api.devices.listConnections, {
      memberIds: [memberId as Id<"familyMembers">],
      memberId: memberId as Id<"familyMembers">,
      isActive: true,
      offset: 0,
      limit: 200,
    });

    const devices: DeviceConnectionRecord[] = (devicesResult.data ?? [])
      .filter(
        (device) =>
          device.isAutoSync !== false && device.syncStatus !== "DISABLED",
      )
      .map((device) => device as DeviceConnectionRecord);

    if (devices.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          syncedDevices: [],
          totalSynced: 0,
          errors: ["没有可同步的设备"],
        },
        message: "没有可同步的设备",
      });
    }

    const syncResults: Array<{
      deviceId: string;
      platform: string;
      syncResult?: SyncResult;
      error?: string;
    }> = [];
    let totalSynced = 0;

    const syncPromises = devices.map(async (device) => {
      try {
        await convexClient.mutation(api.devices.updateConnection, {
          id: device._id as Id<"deviceConnections">,
          patch: { syncStatus: "SYNCING" },
        });

        let syncResult: SyncResult = {
          success: false,
          syncedCount: 0,
          skippedCount: 0,
          errors: ["该平台暂不支持自动同步"],
          lastSyncDate: new Date(),
        };

        const platform = String(device.platform);
        const legacyId = device.legacyId as string | undefined;
        const lastSyncAt = device.lastSyncAt as number | undefined;

        if (platform === "APPLE_HEALTHKIT" && legacyId) {
          const { healthKitService } = await import(
            "@/lib/services/healthkit-service"
          );
          syncResult = await healthKitService.syncAllData(
            memberId,
            device._id,
            lastSyncAt ? new Date(lastSyncAt) : undefined,
          );
        } else if (platform === "HUAWEI_HEALTH" && legacyId) {
          const { huaweiHealthService } = await import(
            "@/lib/services/huawei-health-service"
          );
          syncResult = await huaweiHealthService.syncAllData(
            memberId,
            device._id,
            lastSyncAt ? new Date(lastSyncAt) : undefined,
          );
        }

        if (!syncResult.success) {
          const retryCount = Number(device.retryCount ?? 0) + 1;
          await convexClient.mutation(api.devices.updateConnection, {
            id: device._id as Id<"deviceConnections">,
            patch: {
              syncStatus: "FAILED",
              lastError: syncResult.errors[0],
              retryCount,
            },
          });
        } else {
          await convexClient.mutation(api.devices.updateConnection, {
            id: device._id as Id<"deviceConnections">,
            patch: {
              syncStatus: "SUCCESS",
              lastError: null,
              lastSyncAt: Date.now(),
              retryCount: 0,
              errorCount: 0,
            },
          });
        }

        return {
          deviceId: String(device.deviceId),
          platform: String(device.platform),
          syncResult,
        };
      } catch (error) {
        console.error(`设备 ${device.deviceId} 同步失败:`, error);
        return {
          deviceId: String(device.deviceId),
          platform: String(device.platform),
          error: error instanceof Error ? error.message : "同步失败",
        };
      }
    });

    const results = await Promise.all(syncPromises);

    results.forEach((result) => {
      if (result.syncResult) {
        totalSynced += result.syncResult.syncedCount;
      }

      syncResults.push({
        deviceId: result.deviceId,
        platform: result.platform,
        syncResult: result.syncResult,
        error: result.error,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        syncedDevices: syncResults,
        totalSynced,
        totalDevices: devices.length,
      },
      message: `完成 ${devices.length} 个设备的同步`,
    });
  } catch (error) {
    console.error("批量设备同步失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
