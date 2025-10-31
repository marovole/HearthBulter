import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ShareContentType } from '@prisma/client';
import { 
  generateHealthReportCard,
  generateAchievementCard,
  generateMealLogCard,
  generateGoalAchievementCard,
  generateRecipeCard,
  generateCheckInStreakCard,
  generateWeightMilestoneCard
} from '@/lib/services/social/image-generator';

/**
 * POST /api/social/generate-image
 * 生成分享图片
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const {
      contentType,
      contentId,
      customMessage,
      options = {}
    } = body;

    // 验证必要参数
    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: '缺少必要参数：contentType 和 contentId' },
        { status: 400 }
      );
    }

    // 验证内容类型
    if (!Object.values(ShareContentType).includes(contentType)) {
      return NextResponse.json(
        { error: '不支持的内容类型' },
        { status: 400 }
      );
    }

    const memberId = session.user?.id;
    if (!memberId) {
      return NextResponse.json({ error: '用户ID不存在' }, { status: 400 });
    }

    // 获取内容数据
    const contentData = await getContentData(memberId, contentType, contentId);
    if (!contentData) {
      return NextResponse.json(
        { error: '内容不存在或无权访问' },
        { status: 404 }
      );
    }

    // 生成图片
    let imageUrl: string;
    
    try {
      switch (contentType) {
        case 'HEALTH_REPORT':
          imageUrl = await generateHealthReportCard({
            ...contentData,
            customMessage
          });
          break;
        
        case 'ACHIEVEMENT':
          imageUrl = await generateAchievementCard({
            ...contentData,
            customMessage
          });
          break;
        
        case 'MEAL_LOG':
          imageUrl = await generateMealLogCard({
            ...contentData,
            customMessage
          });
          break;
        
        case 'GOAL_ACHIEVEMENT':
          imageUrl = await generateGoalAchievementCard({
            ...contentData,
            customMessage
          });
          break;
        
        case 'RECIPE':
          imageUrl = await generateRecipeCard({
            ...contentData,
            customMessage
          });
          break;
        
        case 'CHECK_IN_STREAK':
          imageUrl = await generateCheckInStreakCard({
            ...contentData,
            customMessage
          });
          break;
        
        case 'WEIGHT_MILESTONE':
          imageUrl = await generateWeightMilestoneCard({
            ...contentData,
            customMessage
          });
          break;
        
        default:
          throw new Error(`不支持的图片生成类型: ${contentType}`);
      }
    } catch (imageError) {
      console.error('图片生成失败:', imageError);
      return NextResponse.json(
        { error: '图片生成失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        contentType,
        contentId
      },
      message: '图片生成成功'
    });
  } catch (error) {
    console.error('生成分享图片失败:', error);
    return NextResponse.json(
      { error: '生成分享图片失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取内容数据
 */
async function getContentData(memberId: string, contentType: ShareContentType, contentId: string) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    switch (contentType) {
      case 'HEALTH_REPORT':
        const report = await prisma.healthReport.findFirst({
          where: { id: contentId, memberId },
          include: { member: true }
        });
        
        if (!report) return null;
        
        return {
          memberName: report.member?.name || '健康达人',
          reportType: report.reportType,
          period: `${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}`,
          overallScore: report.overallScore || 0,
          summary: report.summary || ''
        };
      
      case 'ACHIEVEMENT':
        const achievement = await prisma.achievement.findFirst({
          where: { id: contentId, memberId },
          include: { member: true }
        });
        
        if (!achievement) return null;
        
        return {
          memberName: achievement.member?.name || '成就达人',
          achievementTitle: achievement.title,
          achievementDescription: achievement.description,
          rarity: achievement.rarity,
          points: achievement.points,
          unlockedAt: achievement.unlockedAt
        };
      
      case 'MEAL_LOG':
        const mealLog = await prisma.mealLog.findFirst({
          where: { id: contentId, memberId },
          include: {
            member: true,
            foods: { include: { food: true } }
          }
        });
        
        if (!mealLog) return null;
        
        return {
          memberName: mealLog.member?.name || '美食家',
          mealType: mealLog.mealType,
          date: mealLog.date,
          foods: mealLog.foods.map(f => ({
            name: f.food.name,
            amount: f.amount
          })),
          calories: mealLog.calories,
          protein: mealLog.protein,
          carbs: mealLog.carbs,
          fat: mealLog.fat
        };
      
      case 'GOAL_ACHIEVEMENT':
        const goal = await prisma.healthGoal.findFirst({
          where: { id: contentId, memberId },
          include: { member: true }
        });
        
        if (!goal) return null;
        
        return {
          memberName: goal.member?.name || '健康达人',
          goalType: goal.goalType,
          targetWeight: goal.targetWeight,
          currentWeight: goal.currentWeight,
          progress: goal.progress || 0,
          startDate: goal.startDate,
          targetDate: goal.targetDate
        };
      
      case 'CHECK_IN_STREAK':
        const streak = await prisma.trackingStreak.findUnique({
          where: { memberId },
          include: { member: true }
        });
        
        if (!streak) return null;
        
        return {
          memberName: streak.member?.name || '打卡达人',
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          totalDays: streak.totalDays,
          lastCheckIn: streak.lastCheckIn
        };
      
      case 'WEIGHT_MILESTONE':
        const weightData = await prisma.healthData.findFirst({
          where: { id: contentId, memberId },
          include: { member: true }
        });
        
        if (!weightData || !weightData.weight) return null;
        
        return {
          memberName: weightData.member?.name || '减重达人',
          currentWeight: weightData.weight,
          measuredAt: weightData.measuredAt
        };
      
      case 'RECIPE':
        // 这里需要根据实际的食谱模型来实现
        // 暂时返回模拟数据
        return {
          memberName: '美食家',
          recipeName: '健康营养餐',
          description: '营养均衡，美味可口',
          calories: 450,
          protein: 25,
          carbs: 50,
          fat: 15
        };
      
      default:
        return null;
    }
  } catch (error) {
    console.error('获取内容数据失败:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}
