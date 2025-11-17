/**
 * 社交分享API - 生成分享图片
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shareImageGenerator } from '@/lib/services/social/image-generator';
import { ShareTemplate } from '@/types/social-sharing';


// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { template, data, config } = body;

    // 验证模板类型
    if (!template || !Object.values(ShareTemplate).includes(template)) {
      return NextResponse.json(
        { error: '无效的模板类型' },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '缺少数据参数' },
        { status: 400 }
      );
    }

    // 验证数据格式（根据模板类型）
    const validationResult = validateTemplateData(template, data);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: `数据验证失败: ${validationResult.error}` },
        { status: 400 }
      );
    }

    // 生成图片
    const imageUrl = await shareImageGenerator.generateShareImage(template, data, config);

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        template,
        generatedAt: new Date().toISOString(),
      },
      message: '图片生成成功',
    });

  } catch (error) {
    console.error('生成分享图片失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 验证模板数据
 */
function validateTemplateData(template: ShareTemplate, data: any): { isValid: boolean; error?: string } {
  try {
    switch (template) {
    case ShareTemplate.HEALTH_REPORT:
      return validateHealthReportData(data);

    case ShareTemplate.GOAL_ACHIEVED:
      return validateGoalAchievedData(data);

    case ShareTemplate.ACHIEVEMENT_UNLOCKED:
      return validateAchievementUnlockedData(data);

    case ShareTemplate.WEIGHT_LOSS:
      return validateWeightLossData(data);

    case ShareTemplate.STREAK_CELEBRATION:
      return validateStreakCelebrationData(data);

    case ShareTemplate.RECIPE_CARD:
      return validateRecipeCardData(data);

    case ShareTemplate.PERSONAL_RECORD:
      return validatePersonalRecordData(data);

    case ShareTemplate.COMMUNITY_POST:
      return validateCommunityPostData(data);

    default:
      return { isValid: false, error: '不支持的模板类型' };
    }
  } catch (error) {
    return { isValid: false, error: error instanceof Error ? error.message : '验证失败' };
  }
}

/**
 * 验证健康报告数据
 */
function validateHealthReportData(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['memberName', 'healthScore'];

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `缺少必需字段: ${field}` };
    }
  }

  if (typeof data.healthScore !== 'number' || data.healthScore < 0 || data.healthScore > 100) {
    return { isValid: false, error: 'healthScore必须是0-100之间的数字' };
  }

  return { isValid: true };
}

/**
 * 验证目标达成数据
 */
function validateGoalAchievedData(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['memberName', 'goalTitle', 'progress'];

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `缺少必需字段: ${field}` };
    }
  }

  if (typeof data.progress !== 'number' || data.progress < 0 || data.progress > 100) {
    return { isValid: false, error: 'progress必须是0-100之间的数字' };
  }

  return { isValid: true };
}

/**
 * 验证成就解锁数据
 */
function validateAchievementUnlockedData(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['memberName', 'achievementType', 'achievementTitle', 'points'];

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `缺少必需字段: ${field}` };
    }
  }

  if (typeof data.points !== 'number' || data.points < 0) {
    return { isValid: false, error: 'points必须是大于等于0的数字' };
  }

  return { isValid: true };
}

/**
 * 验证减重数据
 */
function validateWeightLossData(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['memberName', 'initialWeight', 'currentWeight'];

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `缺少必需字段: ${field}` };
    }
  }

  if (typeof data.initialWeight !== 'number' || data.initialWeight <= 0 || data.initialWeight > 300) {
    return { isValid: false, error: 'initialWeight必须是有效的体重值' };
  }

  if (typeof data.currentWeight !== 'number' || data.currentWeight <= 0 || data.currentWeight > 300) {
    return { isValid: false, error: 'currentWeight必须是有效的体重值' };
  }

  return { isValid: true };
}

/**
 * 验证连续打卡数据
 */
function validateStreakCelebrationData(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['memberName', 'streakDays'];

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `缺少必需字段: ${field}` };
    }
  }

  if (typeof data.streakDays !== 'number' || data.streakDays < 1 || data.streakDays > 365) {
    return { isValid: false, error: 'streakDays必须是1-365之间的整数' };
  }

  return { isValid: true };
}

/**
 * 验证食谱卡片数据
 */
function validateRecipeCardData(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['memberName', 'recipeName'];

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `缺少必需字段: ${field}` };
    }
  }

  if (data.calories && (typeof data.calories !== 'number' || data.calories < 0)) {
    return { isValid: false, error: 'calories必须是大于等于0的数字' };
  }

  if (data.ingredients && !Array.isArray(data.ingredients)) {
    return { isValid: false, error: 'ingredients必须是数组' };
  }

  return { isValid: true };
}

/**
 * 验证个人记录数据
 */
function validatePersonalRecordData(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['memberName', 'title', 'description'];

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `缺少必需字段: ${field}` };
    }
  }

  if (typeof data.description !== 'string' || data.description.length > 500) {
    return { isValid: false, error: 'description必须是500字符以内的字符串' };
  }

  return { isValid: true };
}

/**
 * 验证社区帖子数据
 */
function validateCommunityPostData(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['title', 'content'];

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `缺少必需字段: ${field}` };
    }
  }

  if (typeof data.content !== 'string' || data.content.length > 2000) {
    return { isValid: false, error: 'content必须是2000字符以内的字符串' };
  }

  if (data.tags && !Array.isArray(data.tags)) {
    return { isValid: false, error: 'tags必须是数组' };
  }

  return { isValid: true };
}

/**
 * GET: 获取可用的模板列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let templates = Object.values(ShareTemplate);

    if (category) {
      // 根据分类过滤模板
      const healthTemplates = [
        ShareTemplate.HEALTH_REPORT,
        ShareTemplate.WEIGHT_LOSS,
        ShareTemplate.STREAK_CELEBRATION,
        ShareTemplate.PERSONAL_RECORD,
      ];

      const achievementTemplates = [
        ShareTemplate.GOAL_ACHIEVED,
        ShareTemplate.ACHIEVEMENT_UNLOCKED,
      ];

      const socialTemplates = [
        ShareTemplate.RECIPE_CARD,
        ShareTemplate.COMMUNITY_POST,
      ];

      switch (category) {
      case 'health':
        templates = healthTemplates;
        break;
      case 'achievement':
        templates = achievementTemplates;
        break;
      case 'social':
        templates = socialTemplates;
        break;
      default:
        templates = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        templates: templates.map(template => ({
          id: template,
          name: getTemplateName(template),
          description: getTemplateDescription(template),
          category: getTemplateCategory(template),
          requiredFields: getTemplateRequiredFields(template),
        })),
      },
    });

  } catch (error) {
    console.error('获取模板列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取模板名称
 */
function getTemplateName(template: ShareTemplate): string {
  const names: Record<ShareTemplate, string> = {
    [ShareTemplate.HEALTH_REPORT]: '健康报告',
    [ShareTemplate.GOAL_ACHIEVED]: '目标达成',
    [ShareTemplate.ACHIEVEMENT_UNLOCKED]: '成就解锁',
    [ShareTemplate.WEIGHT_LOSS]: '减重里程碑',
    [ShareTemplate.STREAK_CELEBRATION]: '连续打卡庆祝',
    [ShareTemplate.RECIPE_CARD]: '食谱卡片',
    [ShareTemplate.PERSONAL_RECORD]: '个人记录',
    [ShareTemplate.COMMUNITY_POST]: '社区帖子',
  };

  return names[template] || template;
}

/**
 * 获取模板描述
 */
function getTemplateDescription(template: ShareTemplate): string {
  const descriptions: Record<ShareTemplate, string> = {
    [ShareTemplate.HEALTH_REPORT]: '展示个人健康评分和指标',
    [ShareTemplate.GOAL_ACHIEVED]: '庆祝健康目标达成',
    [ShareTemplate.ACHIEVEMENT_UNLOCKED]: '展示解锁的成就徽章',
    [ShareTemplate.WEIGHT_LOSS]: '记录减重里程碑',
    [ShareTemplate.STREAK_CELEBRATION]: '庆祝连续打卡成就',
    [ShareTemplate.RECIPE_CARD]: '分享健康食谱',
    [ShareTemplate.PERSONAL_RECORD]: '展示个人最佳记录',
    [ShareTemplate.COMMUNITY_POST]: '分享社区帖子内容',
  };

  return descriptions[template] || '';
}

/**
 * 获取模板分类
 */
function getTemplateCategory(template: ShareTemplate): string {
  const categories: Record<ShareTemplate, string> = {
    [ShareTemplate.HEALTH_REPORT]: 'health',
    [ShareTemplate.GOAL_ACHIEVED]: 'achievement',
    [ShareTemplate.ACHIEVEMENT_UNLOCKED]: 'achievement',
    [ShareTemplate.WEIGHT_LOSS]: 'health',
    [ShareTemplate.STREAK_CELEBRATION]: 'achievement',
    [ShareTemplate.RECIPE_CARD]: 'social',
    [ShareTemplate.PERSONAL_RECORD]: 'health',
    [ShareTemplate.COMMUNITY_POST]: 'social',
  };

  return categories[template] || 'other';
}

/**
 * 获取模板必需字段
 */
function getTemplateRequiredFields(template: ShareTemplate): string[] {
  const fields: Record<ShareTemplate, string[]> = {
    [ShareTemplate.HEALTH_REPORT]: ['memberName', 'healthScore'],
    [ShareTemplate.GOAL_ACHIEVED]: ['memberName', 'goalTitle', 'progress'],
    [ShareTemplate.ACHIEVEMENT_UNLOCKED]: ['memberName', 'achievementType', 'achievementTitle', 'points'],
    [ShareTemplate.WEIGHT_LOSS]: ['memberName', 'initialWeight', 'currentWeight'],
    [ShareTemplate.STREAK_CELEBRATION]: ['memberName', 'streakDays'],
    [ShareTemplate.RECIPE_CARD]: ['memberName', 'recipeName'],
    [ShareTemplate.PERSONAL_RECORD]: ['memberName', 'title', 'description'],
    [ShareTemplate.COMMUNITY_POST]: ['title', 'content'],
  };

  return fields[template] || [];
}
