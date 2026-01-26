import { NextRequest, NextResponse } from "next/server";
import { api, convexClient } from "@/lib/convex-client";

export const dynamic = "force-dynamic";

async function verifyMemberAccess(memberId: string, clerkId: string): Promise<boolean> {
  const result = await convexClient.query<any>(api.members.verifyAccess, {
    memberId: memberId as any,
    clerkId,
  });
  return Boolean(result?.hasAccess);
}

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

    const hasAccess = await verifyMemberAccess(memberId, clerkId);
    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的健康数据" }, { status: 403 });
    }

    const searchParams = new URL(request.url).searchParams;
    const days = parseInt(searchParams.get("days") || "30");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const healthData = await convexClient.query<any[]>(api.health.listByMemberDateRange, {
      memberId: memberId as any,
      startDate: start.getTime(),
      endDate: end.getTime(),
    });

    const sorted = (healthData || []).sort((a: any, b: any) => a.measuredAt - b.measuredAt);

    const trends: Record<string, unknown> = {
      weight: { data: [], average: null, min: null, max: null, change: null },
      bodyFat: { data: [], average: null, min: null, max: null, change: null },
      muscleMass: { data: [], average: null, min: null, max: null, change: null },
      bloodPressure: { data: [], average: null, min: null, max: null, change: null },
      heartRate: { data: [], average: null, min: null, max: null, change: null },
    };

    if (!sorted || sorted.length === 0) {
      return NextResponse.json({ trends, period: { start, end } }, { status: 200 });
    }

    const weightData = sorted
      .filter((d: any) => typeof d.weight === "number")
      .map((d: any) => ({ date: new Date(d.measuredAt).toISOString(), value: d.weight }));
    if (weightData.length > 0) {
      const values: number[] = weightData.map((d: any) => Number(d.value));
      const firstWeight = weightData[0];
      const lastWeight = weightData[weightData.length - 1];
      trends.weight = {
        data: weightData,
        average: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          weightData.length > 1 && firstWeight && lastWeight
            ? lastWeight.value - firstWeight.value
            : null,
      };
    }

    const bodyFatData = sorted
      .filter((d: any) => typeof d.bodyFat === "number")
      .map((d: any) => ({ date: new Date(d.measuredAt).toISOString(), value: d.bodyFat }));
    if (bodyFatData.length > 0) {
      const values: number[] = bodyFatData.map((d: any) => Number(d.value));
      const firstBodyFat = bodyFatData[0];
      const lastBodyFat = bodyFatData[bodyFatData.length - 1];
      trends.bodyFat = {
        data: bodyFatData,
        average: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          bodyFatData.length > 1 && firstBodyFat && lastBodyFat
            ? lastBodyFat.value - firstBodyFat.value
            : null,
      };
    }

    const muscleMassData = sorted
      .filter((d: any) => typeof d.muscleMass === "number")
      .map((d: any) => ({ date: new Date(d.measuredAt).toISOString(), value: d.muscleMass }));
    if (muscleMassData.length > 0) {
      const values: number[] = muscleMassData.map((d: any) => Number(d.value));
      const firstMuscleMass = muscleMassData[0];
      const lastMuscleMass = muscleMassData[muscleMassData.length - 1];
      trends.muscleMass = {
        data: muscleMassData,
        average: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          muscleMassData.length > 1 && firstMuscleMass && lastMuscleMass
            ? lastMuscleMass.value - firstMuscleMass.value
            : null,
      };
    }

    const bloodPressureData = sorted
      .filter(
        (d: any) =>
          typeof d.bloodPressureSystolic === "number" &&
          typeof d.bloodPressureDiastolic === "number"
      )
      .map((d: any) => ({
        date: new Date(d.measuredAt).toISOString(),
        systolic: d.bloodPressureSystolic,
        diastolic: d.bloodPressureDiastolic,
      }));
    if (bloodPressureData.length > 0) {
      const systolicValues: number[] = bloodPressureData.map((d: any) => Number(d.systolic));
      const diastolicValues: number[] = bloodPressureData.map((d: any) => Number(d.diastolic));
      const firstBloodPressure = bloodPressureData[0];
      const lastBloodPressure = bloodPressureData[bloodPressureData.length - 1];
      trends.bloodPressure = {
        data: bloodPressureData,
        average: {
          systolic:
            systolicValues.reduce((a: number, b: number) => a + b, 0) / systolicValues.length,
          diastolic:
            diastolicValues.reduce((a: number, b: number) => a + b, 0) / diastolicValues.length,
        },
        min: {
          systolic: Math.min(...systolicValues),
          diastolic: Math.min(...diastolicValues),
        },
        max: {
          systolic: Math.max(...systolicValues),
          diastolic: Math.max(...diastolicValues),
        },
        change:
          bloodPressureData.length > 1 && firstBloodPressure && lastBloodPressure
            ? {
                systolic: lastBloodPressure.systolic - firstBloodPressure.systolic,
                diastolic: lastBloodPressure.diastolic - firstBloodPressure.diastolic,
              }
            : null,
      };
    }

    const heartRateData = sorted
      .filter((d: any) => typeof d.heartRate === "number")
      .map((d: any) => ({ date: new Date(d.measuredAt).toISOString(), value: d.heartRate }));
    if (heartRateData.length > 0) {
      const values: number[] = heartRateData.map((d: any) => Number(d.value));
      const firstHeartRate = heartRateData[0];
      const lastHeartRate = heartRateData[heartRateData.length - 1];
      trends.heartRate = {
        data: heartRateData,
        average: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          heartRateData.length > 1 && firstHeartRate && lastHeartRate
            ? lastHeartRate.value - firstHeartRate.value
            : null,
      };
    }

    return NextResponse.json({ trends, period: { start, end } }, { status: 200 });
  } catch (error) {
    console.error("获取健康数据趋势失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
