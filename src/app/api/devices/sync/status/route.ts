/**
 * 设备同步状态API
 *
 * Migrated from Prisma to Supabase
 * Note: deviceSyncService still uses external service
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { deviceSyncService } from "@/lib/services/device-sync-service";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 获取用户可访问的成员ID列表
    const { data: accessibleMembers } = await supabase
      .from("family_members")
      .select("id")
      .eq("userId", session.user.id)
      .is("deletedAt", null);

    const memberIds = (accessibleMembers || []).map((row) => row.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          userDevices: [],
          globalStats: await deviceSyncService.getSyncStats(),
          serviceStatus: deviceSyncService.getServiceStatus(),
        },
      });
    }

    // 获取用户相关的设备统计
    const { data: deviceStats, error } = await supabase
      .from("device_connections")
      .select(
        `
        id,
        deviceName,
        platform,
        syncStatus,
        lastSyncAt,
        isActive,
        errorCount,
        lastError,
        member:family_members!inner(
          id,
          name
        )
      `,
      )
      .in("memberId", memberIds)
      .order("deviceName", { ascending: true });

    if (error) {
      console.error("查询设备统计失败:", error);
      return NextResponse.json({ error: "查询设备统计失败" }, { status: 500 });
    }

    // 获取全局同步统计
    const globalStats = await deviceSyncService.getSyncStats();

    // 获取服务状态
    const serviceStatus = deviceSyncService.getServiceStatus();

    return NextResponse.json({
      success: true,
      data: {
        userDevices: deviceStats || [],
        globalStats,
        serviceStatus,
      },
    });
  } catch (error) {
    console.error("获取同步状态失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
