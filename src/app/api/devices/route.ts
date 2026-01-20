import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { withPermissions, requirePermissions } from "@/lib/middleware/permission-middleware";
import { withSecurity, defaultSecurityOptions } from "@/lib/security/security-middleware";
import { withPerformanceMonitoring } from "@/lib/monitoring/performance-monitor";
import { Permission } from "@/lib/permissions";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
const GETQuerySchema = z.object({
  memberId: z.string().optional(),
  platform: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const GET = withPermissions(
  requirePermissions([Permission.VIEW_FAMILY_DATA]),
  withSecurity(
    defaultSecurityOptions,
    withPerformanceMonitoring(async (request: NextRequest) => {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "未授权访问" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const validatedQuery = GETQuerySchema.parse(Object.fromEntries(searchParams));

      const accessibleMembers = await convexClient.query<Array<{ _id: string }>>(
        api.members.listAccessibleByClerkId,
        {
          clerkId: session.user.id,
        }
      );

      const accessibleMemberIds = accessibleMembers.map(
        (member) => member._id as Id<"familyMembers">
      );

      if (accessibleMemberIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          totalPages: 0,
        });
      }

      const skip = (validatedQuery.page - 1) * validatedQuery.limit;
      const result = await convexClient.query<{
        data: Array<Record<string, unknown>>;
        total: number;
      }>(api.devices.listConnections, {
        memberIds: accessibleMemberIds,
        memberId: validatedQuery.memberId as Id<"familyMembers"> | undefined,
        platform: validatedQuery.platform,
        isActive: validatedQuery.isActive,
        offset: skip,
        limit: validatedQuery.limit,
      });

      const total = result.total ?? 0;

      return NextResponse.json({
        success: true,
        data: result.data ?? [],
        total,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        totalPages: Math.ceil(total / validatedQuery.limit),
      });
    })
  )
);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();

    const connectionSchema = z.object({
      memberId: z.string(),
      deviceId: z.string(),
      deviceName: z.string(),
      deviceType: z.enum([
        "SMARTWATCH",
        "FITNESS_BAND",
        "SMART_SCALE",
        "BLOOD_PRESSURE_MONITOR",
        "GLUCOSE_METER",
        "SMART_RING",
        "OTHER",
      ]),
      manufacturer: z.string(),
      model: z.string().optional(),
      firmwareVersion: z.string().optional(),
      platform: z.enum([
        "APPLE_HEALTHKIT",
        "HUAWEI_HEALTH",
        "GOOGLE_FIT",
        "XIAOMI_HEALTH",
        "SAMSUNG_HEALTH",
        "GARMIN_CONNECT",
        "FITBIT",
        "OTHER_PLATFORM",
      ]),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      permissions: z.array(
        z.enum([
          "READ_STEPS",
          "READ_HEART_RATE",
          "READ_CALORIES",
          "READ_SLEEP",
          "READ_WEIGHT",
          "READ_BLOOD_PRESSURE",
          "READ_DISTANCE",
          "READ_ACTIVE_MINUTES",
          "READ_EXERCISE",
        ])
      ),
      dataTypes: z.array(
        z.enum([
          "STEPS",
          "HEART_RATE",
          "CALORIES_BURNED",
          "SLEEP_DURATION",
          "SLEEP_QUALITY",
          "WEIGHT",
          "BODY_FAT",
          "MUSCLE_MASS",
          "BLOOD_PRESSURE",
          "DISTANCE",
          "ACTIVE_MINUTES",
          "EXERCISE_TYPE",
          "EXERCISE_DURATION",
          "RESTING_HEART_RATE",
          "FLOORS_CLIMBED",
          "STANDING_HOURS",
        ])
      ),
      syncInterval: z.number().optional().default(1800),
    });

    const validatedData = connectionSchema.parse(body);

    const access = await convexClient.query<{ hasAccess: boolean }>(api.members.verifyAccess, {
      memberId: validatedData.memberId as Id<"familyMembers">,
      clerkId: session.user.id,
    });

    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限访问该家庭成员" }, { status: 403 });
    }

    const existingDevice = await convexClient.query<Record<string, unknown> | null>(
      api.devices.getActiveByDeviceId,
      {
        deviceId: validatedData.deviceId,
      }
    );

    if (existingDevice) {
      return NextResponse.json({ error: "设备已存在" }, { status: 409 });
    }

    let legacyId: string | undefined;
    let lastSyncAt: number | undefined;
    let syncStatus: string | undefined;

    if (validatedData.platform === "APPLE_HEALTHKIT") {
      const { connectHealthKitDevice } = await import("@/lib/services/healthkit-service");
      const deviceConnection = await connectHealthKitDevice(validatedData.memberId, validatedData);
      legacyId = deviceConnection.id;
      lastSyncAt = deviceConnection.lastSyncAt?.getTime();
      syncStatus = deviceConnection.syncStatus;
    } else if (validatedData.platform === "HUAWEI_HEALTH") {
      const { connectHuaweiHealthDevice } = await import("@/lib/services/huawei-health-service");
      const deviceConnection = await connectHuaweiHealthDevice(
        validatedData.memberId,
        validatedData
      );
      legacyId = deviceConnection.id;
      lastSyncAt = deviceConnection.lastSyncAt?.getTime();
      syncStatus = deviceConnection.syncStatus;
    }

    const connectionId = await convexClient.mutation<string>(api.devices.createConnection, {
      memberId: validatedData.memberId as Id<"familyMembers">,
      deviceId: validatedData.deviceId,
      legacyId,
      deviceName: validatedData.deviceName,
      deviceType: validatedData.deviceType,
      manufacturer: validatedData.manufacturer,
      model: validatedData.model,
      firmwareVersion: validatedData.firmwareVersion,
      platform: validatedData.platform,
      accessToken: validatedData.accessToken,
      refreshToken: validatedData.refreshToken,
      permissions: validatedData.permissions,
      dataTypes: validatedData.dataTypes,
      syncInterval: validatedData.syncInterval,
      syncStatus: syncStatus ?? (legacyId ? "SUCCESS" : undefined),
      lastSyncAt,
    });

    const deviceConnection = await convexClient.query<Record<string, unknown> | null>(
      api.devices.getById,
      {
        id: connectionId as Id<"deviceConnections">,
      }
    );

    return NextResponse.json({
      success: true,
      data: deviceConnection,
      message: "设备连接成功",
    });
  } catch (error) {
    console.error("连接设备失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "设备连接失败" },
      { status: 500 }
    );
  }
}
