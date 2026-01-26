import { NextRequest, NextResponse } from "next/server";
import { api, convexClient } from "@/lib/convex-client";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

/**
 * GET /api/members/:memberId/health-data
 * 查询成员的健康数据历史记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    const clerkId = request.headers.get("x-auth-user-id");
    if (!clerkId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const access = await convexClient.query<any>(api.members.verifyAccess, {
      memberId: memberId as any,
      clerkId,
    });

    if (!access?.hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的健康数据" }, { status: 403 });
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const now = Date.now();
    const startMs = startDate ? Date.parse(startDate) : now - 365 * 24 * 60 * 60 * 1000;
    const endMs = endDate ? Date.parse(endDate) : now;

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return NextResponse.json({ error: "日期格式错误" }, { status: 400 });
    }

    const records = await convexClient.query<any[]>(api.health.listByMemberDateRange, {
      memberId: memberId as any,
      startDate: startMs,
      endDate: endMs,
    });

    const sorted = (records || []).sort((a: any, b: any) => b.measuredAt - a.measuredAt);
    const total = sorted.length;

    const pageData = sorted.slice(offset, offset + limit).map((r: any) => ({
      id: r._id,
      weight: typeof r.weight === "number" ? r.weight : null,
      bodyFat: typeof r.bodyFat === "number" ? r.bodyFat : null,
      muscleMass: typeof r.muscleMass === "number" ? r.muscleMass : null,
      bloodPressureSystolic:
        typeof r.bloodPressureSystolic === "number" ? r.bloodPressureSystolic : null,
      bloodPressureDiastolic:
        typeof r.bloodPressureDiastolic === "number" ? r.bloodPressureDiastolic : null,
      heartRate: typeof r.heartRate === "number" ? r.heartRate : null,
      measuredAt: new Date(r.measuredAt).toISOString(),
      source: r.source ?? "MANUAL",
      notes: r.notes ?? null,
    }));

    return NextResponse.json({ data: pageData, total, limit, offset }, { status: 200 });
  } catch (error) {
    console.error("查询健康数据失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * POST /api/members/:memberId/health-data
 * 录入新的健康数据
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    const clerkId = request.headers.get("x-auth-user-id");
    if (!clerkId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const access = await convexClient.query<any>(api.members.verifyAccess, {
      memberId: memberId as any,
      clerkId,
    });

    if (!access?.hasAccess) {
      return NextResponse.json({ error: "无权限为该成员录入健康数据" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
    }

    const measuredAtInput = (body as any).measuredAt;
    const measuredAt = measuredAtInput ? new Date(measuredAtInput) : new Date();

    if (Number.isNaN(measuredAt.getTime())) {
      return NextResponse.json({ error: "measuredAt 日期格式错误" }, { status: 400 });
    }

    const result = await convexClient.mutation<any>(api.health.addRecord, {
      memberId: memberId as any,
      weight: typeof (body as any).weight === "number" ? (body as any).weight : undefined,
      bodyFat: typeof (body as any).bodyFat === "number" ? (body as any).bodyFat : undefined,
      muscleMass:
        typeof (body as any).muscleMass === "number" ? (body as any).muscleMass : undefined,
      bloodPressureSystolic:
        typeof (body as any).bloodPressureSystolic === "number"
          ? (body as any).bloodPressureSystolic
          : undefined,
      bloodPressureDiastolic:
        typeof (body as any).bloodPressureDiastolic === "number"
          ? (body as any).bloodPressureDiastolic
          : undefined,
      heartRate: typeof (body as any).heartRate === "number" ? (body as any).heartRate : undefined,
      source: typeof (body as any).source === "string" ? (body as any).source : "MANUAL",
      measuredAt: measuredAt.getTime(),
      notes: typeof (body as any).notes === "string" ? (body as any).notes : undefined,
    });

    return NextResponse.json(
      { data: result?.data ?? result ?? null, message: "健康数据录入成功", warnings: [] },
      { status: 201 }
    );
  } catch (error) {
    console.error("录入健康数据失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
