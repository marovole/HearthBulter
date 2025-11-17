/**
 * 辅助追踪 API
 *
 * Note: 使用 auxiliary-tracker 服务层
 * 涉及水分、运动、睡眠、体重等健康数据追踪，超出 MealTrackingRepository 职责范围
 * 未来可考虑创建专门的 HealthDataRepository
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {

  trackWater,
  trackExercise,
  trackSleep,
  trackWeight,
  setWaterTarget,
  getOrCreateTodayTracking,
} from '@/lib/services/tracking/auxiliary-tracker';
import { z } from 'zod';

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';

const waterSchema = z.object({
  memberId: z.string(),
  amount: z.number().positive(),
});

const exerciseSchema = z.object({
  memberId: z.string(),
  minutes: z.number().positive(),
  caloriesBurned: z.number().positive(),
  exerciseType: z.array(z.string()),
});

const sleepSchema = z.object({
  memberId: z.string(),
  hours: z.number().positive(),
  quality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
});

const weightSchema = z.object({
  memberId: z.string(),
  weight: z.number().positive(),
  bodyFat: z.number().positive().optional(),
});

/**
 * POST /api/tracking/auxiliary
 * 创建辅助打卡记录
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type } = body;

    let result;

    switch (type) {
    case 'water':
      {
        const data = waterSchema.parse(body);
        result = await trackWater(data.memberId, data.amount);
      }
      break;

    case 'exercise':
      {
        const data = exerciseSchema.parse(body);
        result = await trackExercise(data.memberId, {
          minutes: data.minutes,
          caloriesBurned: data.caloriesBurned,
          exerciseType: data.exerciseType,
        });
      }
      break;

    case 'sleep':
      {
        const data = sleepSchema.parse(body);
        result = await trackSleep(data.memberId, {
          hours: data.hours,
          quality: data.quality,
        });
      }
      break;

    case 'weight':
      {
        const data = weightSchema.parse(body);
        result = await trackWeight(data.memberId, {
          weight: data.weight,
          bodyFat: data.bodyFat,
        });
      }
      break;

    case 'water_target':
      {
        const { memberId, target } = body;
        result = await setWaterTarget(memberId, target);
      }
      break;

    default:
      return NextResponse.json(
        { error: '无效的打卡类型' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating auxiliary tracking:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的请求数据', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '创建辅助打卡失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking/auxiliary?memberId=xxx
 * 获取今日辅助打卡数据
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    const tracking = await getOrCreateTodayTracking(memberId);

    return NextResponse.json(tracking);
  } catch (error) {
    console.error('Error fetching auxiliary tracking:', error);

    return NextResponse.json(
      { error: '获取辅助打卡数据失败' },
      { status: 500 }
    );
  }
}

