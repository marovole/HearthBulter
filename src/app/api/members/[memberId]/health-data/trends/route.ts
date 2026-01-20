import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";

export const dynamic = "force-dynamic";

interface FamilyMember {
  id: string;
  userId: string | null;
  familyId: string;
  role?: string;
}

interface Family {
  id: string;
  creatorId: string;
}

interface HealthData {
  id: string;
  memberId: string;
  measuredAt: string;
  weight: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
}

async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
  const member = await neonAdapter.familyMember.findFirst<FamilyMember>({
    where: { id: memberId, deletedAt: null },
  });

  if (!member) {
    return { hasAccess: false };
  }

  const family = await neonAdapter.family.findFirst<Family>({
    where: { id: member.familyId },
  });

  const isCreator = family?.creatorId === userId;

  let isAdmin = false;
  if (!isCreator) {
    const adminMember = await neonAdapter.familyMember.findFirst<FamilyMember>({
      where: {
        familyId: member.familyId,
        userId: userId,
        role: "ADMIN",
        deletedAt: null,
      },
    });

    isAdmin = !!adminMember;
  }

  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的健康数据" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const healthData = await neonAdapter.healthData.findMany<HealthData>({
      where: {
        memberId,
        measuredAt: { gte: start.toISOString(), lte: end.toISOString() },
      },
      orderBy: { measuredAt: "asc" },
    });

    const trends: Record<string, unknown> = {
      weight: { data: [], average: null, min: null, max: null, change: null },
      bodyFat: { data: [], average: null, min: null, max: null, change: null },
      muscleMass: { data: [], average: null, min: null, max: null, change: null },
      bloodPressure: { data: [], average: null, min: null, max: null, change: null },
      heartRate: { data: [], average: null, min: null, max: null, change: null },
    };

    if (!healthData || healthData.length === 0) {
      return NextResponse.json({ trends, period: { start, end } }, { status: 200 });
    }

    const weightData = healthData
      .filter((d) => d.weight !== null)
      .map((d) => ({ date: d.measuredAt, value: d.weight! }));
    if (weightData.length > 0) {
      const values = weightData.map((d) => d.value);
      const firstWeight = weightData[0];
      const lastWeight = weightData[weightData.length - 1];
      trends.weight = {
        data: weightData,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          weightData.length > 1 && firstWeight && lastWeight
            ? lastWeight.value - firstWeight.value
            : null,
      };
    }

    const bodyFatData = healthData
      .filter((d) => d.bodyFat !== null)
      .map((d) => ({ date: d.measuredAt, value: d.bodyFat! }));
    if (bodyFatData.length > 0) {
      const values = bodyFatData.map((d) => d.value);
      const firstBodyFat = bodyFatData[0];
      const lastBodyFat = bodyFatData[bodyFatData.length - 1];
      trends.bodyFat = {
        data: bodyFatData,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          bodyFatData.length > 1 && firstBodyFat && lastBodyFat
            ? lastBodyFat.value - firstBodyFat.value
            : null,
      };
    }

    const muscleMassData = healthData
      .filter((d) => d.muscleMass !== null)
      .map((d) => ({ date: d.measuredAt, value: d.muscleMass! }));
    if (muscleMassData.length > 0) {
      const values = muscleMassData.map((d) => d.value);
      const firstMuscleMass = muscleMassData[0];
      const lastMuscleMass = muscleMassData[muscleMassData.length - 1];
      trends.muscleMass = {
        data: muscleMassData,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        change:
          muscleMassData.length > 1 && firstMuscleMass && lastMuscleMass
            ? lastMuscleMass.value - firstMuscleMass.value
            : null,
      };
    }

    const bloodPressureData = healthData
      .filter((d) => d.bloodPressureSystolic !== null && d.bloodPressureDiastolic !== null)
      .map((d) => ({
        date: d.measuredAt,
        systolic: d.bloodPressureSystolic!,
        diastolic: d.bloodPressureDiastolic!,
      }));
    if (bloodPressureData.length > 0) {
      const systolicValues = bloodPressureData.map((d) => d.systolic);
      const diastolicValues = bloodPressureData.map((d) => d.diastolic);
      const firstBloodPressure = bloodPressureData[0];
      const lastBloodPressure = bloodPressureData[bloodPressureData.length - 1];
      trends.bloodPressure = {
        data: bloodPressureData,
        average: {
          systolic: systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length,
          diastolic: diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length,
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

    const heartRateData = healthData
      .filter((d) => d.heartRate !== null)
      .map((d) => ({ date: d.measuredAt, value: d.heartRate! }));
    if (heartRateData.length > 0) {
      const values = heartRateData.map((d) => d.value);
      const firstHeartRate = heartRateData[0];
      const lastHeartRate = heartRateData[heartRateData.length - 1];
      trends.heartRate = {
        data: heartRateData,
        average: values.reduce((a, b) => a + b, 0) / values.length,
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
