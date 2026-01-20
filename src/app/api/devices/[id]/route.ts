import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ id: string }>;
}

const DELETEBodySchema = z.object({
  reason: z.string().optional(),
});

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    DELETEBodySchema.parse(body);

    const deviceConnection = await convexClient.query<Record<string, unknown> | null>(
      api.devices.getById,
      { id: id as Id<"deviceConnections"> }
    );

    if (!deviceConnection) {
      return NextResponse.json({ error: "设备未找到" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(api.members.verifyAccess, {
      memberId: deviceConnection.memberId as Id<"familyMembers">,
      clerkId: session.user.id,
    });

    if (!access.hasAccess) {
      return NextResponse.json({ error: "设备未找到" }, { status: 404 });
    }

    if (deviceConnection.platform === "APPLE_HEALTHKIT") {
      const { disconnectHealthKitDevice } = await import("@/lib/services/healthkit-service");
      await disconnectHealthKitDevice(String(deviceConnection.deviceId));
    } else if (deviceConnection.platform === "HUAWEI_HEALTH") {
      const { disconnectHuaweiHealthDevice } = await import("@/lib/services/huawei-health-service");
      await disconnectHuaweiHealthDevice(String(deviceConnection.deviceId));
    }

    await convexClient.mutation(api.devices.updateConnection, {
      id: id as Id<"deviceConnections">,
      patch: {
        isActive: false,
        isAutoSync: false,
        syncStatus: "DISABLED",
        disconnectionDate: Date.now(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "设备断开连接成功",
    });
  } catch (error) {
    console.error("断开设备连接失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { id } = await params;

    const deviceConnection = await convexClient.query<Record<string, unknown> | null>(
      api.devices.getById,
      { id: id as Id<"deviceConnections"> }
    );

    if (!deviceConnection) {
      return NextResponse.json({ error: "设备未找到" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(api.members.verifyAccess, {
      memberId: deviceConnection.memberId as Id<"familyMembers">,
      clerkId: session.user.id,
    });

    if (!access.hasAccess) {
      return NextResponse.json({ error: "设备未找到" }, { status: 404 });
    }

    const healthData = await convexClient.query<Array<Record<string, unknown>>>(
      api.health.listByDeviceConnection,
      {
        deviceConnectionId: id as Id<"deviceConnections">,
        limit: 10,
      }
    );

    const member = deviceConnection.member as { id: string; name: string } | null | undefined;

    const simplifiedDevice = {
      ...deviceConnection,
      member: member
        ? {
            id: member.id,
            name: member.name,
          }
        : null,
      healthData: healthData || [],
    };

    return NextResponse.json({
      success: true,
      data: simplifiedDevice,
    });
  } catch (error) {
    console.error("获取设备详情失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
