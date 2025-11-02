import { prisma } from '@/lib/db';

export interface ReminderConfig {
  type: 'MEAL_TIME' | 'MISSING_MEAL' | 'NUTRITION_DEFICIENCY' | 'STREAK_WARNING';
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  message?: string;
}

export interface NutritionReminder {
  id: string;
  memberId: string;
  type: 'MEAL_TIME' | 'MISSING_MEAL' | 'NUTRITION_DEFICIENCY' | 'STREAK_WARNING';
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  message?: string;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderTrigger {
  memberId: string;
  type: string;
  message: string;
  scheduledTime: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  metadata?: Record<string, any>;
}

class ReminderService {
  /**
   * 获取用户的营养提醒配置
   */
  async getReminderConfigs(memberId: string): Promise<NutritionReminder[]> {
    const reminders = await prisma.nutritionReminder.findMany({
      where: { memberId },
      orderBy: { createdAt: 'asc' },
    });

    return reminders.map(reminder => ({
      ...reminder,
      daysOfWeek: JSON.parse(reminder.daysOfWeek || '[]'),
    }));
  }

  /**
   * 创建或更新提醒配置
   */
  async upsertReminderConfig(
    memberId: string,
    config: Omit<ReminderConfig, 'enabled'> & { enabled?: boolean }
  ): Promise<NutritionReminder> {
    const { type, enabled = true, hour, minute, daysOfWeek, message } = config;

    const reminder = await prisma.nutritionReminder.upsert({
      where: {
        memberId_type: {
          memberId,
          type,
        },
      },
      create: {
        memberId,
        type,
        enabled,
        hour,
        minute,
        daysOfWeek: JSON.stringify(daysOfWeek),
        message,
      },
      update: {
        enabled,
        hour,
        minute,
        daysOfWeek: JSON.stringify(daysOfWeek),
        message,
      },
    });

    return {
      ...reminder,
      daysOfWeek: JSON.parse(reminder.daysOfWeek || '[]'),
    };
  }

  /**
   * 删除提醒配置
   */
  async deleteReminderConfig(memberId: string, type: string): Promise<void> {
    await prisma.nutritionReminder.deleteMany({
      where: { memberId, type },
    });
  }

  /**
   * 检查并生成待触发的提醒
   */
  async generatePendingReminders(): Promise<ReminderTrigger[]> {
    const triggers: ReminderTrigger[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...

    // 获取所有启用的提醒配置
    const activeReminders = await prisma.nutritionReminder.findMany({
      where: { enabled: true },
      include: {
        member: {
          include: {
            family: true,
          },
        },
      },
    });

    for (const reminder of activeReminders) {
      const daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');
      
      // 检查今天是否应该触发提醒
      if (!daysOfWeek.includes(currentDayOfWeek)) {
        continue;
      }

      // 检查时间是否匹配（允许5分钟的误差）
      const reminderTime = reminder.hour * 60 + reminder.minute;
      const currentTime = currentHour * 60 + currentMinute;
      
      if (Math.abs(currentTime - reminderTime) > 5) {
        continue;
      }

      // 检查是否已经触发过（避免重复触发）
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      if (reminder.lastTriggeredAt && reminder.lastTriggeredAt > oneHourAgo) {
        continue;
      }

      // 根据提醒类型生成具体的提醒内容
      const trigger = await this.generateReminderTrigger(reminder, now);
      if (trigger) {
        triggers.push(trigger);
        
        // 更新最后触发时间
        await prisma.nutritionReminder.update({
          where: { id: reminder.id },
          data: { lastTriggeredAt: now },
        });
      }
    }

    return triggers;
  }

  /**
   * 根据提醒配置生成具体的提醒内容
   */
  private async generateReminderTrigger(
    reminder: any,
    scheduledTime: Date
  ): Promise<ReminderTrigger | null> {
    const { memberId, type, message } = reminder;

    switch (type) {
    case 'MEAL_TIME':
      return await this.generateMealTimeReminder(memberId, scheduledTime, message);
      
    case 'MISSING_MEAL':
      return await this.generateMissingMealReminder(memberId, scheduledTime, message);
      
    case 'NUTRITION_DEFICIENCY':
      return await this.generateNutritionDeficiencyReminder(memberId, scheduledTime, message);
      
    case 'STREAK_WARNING':
      return await this.generateStreakWarningReminder(memberId, scheduledTime, message);
      
    default:
      return null;
    }
  }

  /**
   * 生成餐时提醒
   */
  private async generateMealTimeReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string
  ): Promise<ReminderTrigger> {
    const hour = scheduledTime.getHours();
    
    let mealType = '';
    let defaultMessage = '';
    
    if (hour >= 7 && hour < 10) {
      mealType = '早餐';
      defaultMessage = '该记录早餐啦！美好的一天从营养早餐开始～';
    } else if (hour >= 11 && hour < 14) {
      mealType = '午餐';
      defaultMessage = '午餐时间到！记得记录你的午餐，保持营养均衡～';
    } else if (hour >= 17 && hour < 20) {
      mealType = '晚餐';
      defaultMessage = '晚餐时间！记录今天的晚餐，完成营养打卡～';
    } else {
      mealType = '加餐';
      defaultMessage = '加餐时间！记得记录你的健康小食～';
    }

    return {
      memberId,
      type: 'MEAL_TIME',
      message: customMessage || defaultMessage,
      scheduledTime,
      priority: 'MEDIUM',
      metadata: { mealType },
    };
  }

  /**
   * 生成漏餐提醒
   */
  private async generateMissingMealReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string
  ): Promise<ReminderTrigger | null> {
    const hour = scheduledTime.getHours();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否已经记录了相应的餐食
    let mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    let mealName: string;
    
    if (hour >= 10 && hour < 13) {
      mealType = 'BREAKFAST';
      mealName = '早餐';
    } else if (hour >= 14 && hour < 17) {
      mealType = 'LUNCH';
      mealName = '午餐';
    } else if (hour >= 21 && hour <= 23) {
      mealType = 'DINNER';
      mealName = '晚餐';
    } else {
      return null; // 不在漏餐提醒时间段
    }

    const existingMeal = await prisma.mealLog.findFirst({
      where: {
        memberId,
        mealType,
        createdAt: {
          gte: today,
        },
      },
    });

    if (existingMeal) {
      return null; // 已经记录过，不需要提醒
    }

    return {
      memberId,
      type: 'MISSING_MEAL',
      message: customMessage || `还没记录${mealName}哦！点击记录，保持打卡连续性～`,
      scheduledTime,
      priority: 'HIGH',
      metadata: { mealType, mealName },
    };
  }

  /**
   * 生成营养不足提醒
   */
  private async generateNutritionDeficiencyReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string
  ): Promise<ReminderTrigger | null> {
    const hour = scheduledTime.getHours();
    
    // 只在晚餐前生成营养不足提醒
    if (hour < 16 || hour > 19) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 获取今天的营养摄入数据
    const todayMeals = await prisma.mealLog.findMany({
      where: {
        memberId,
        createdAt: {
          gte: today,
        },
      },
      include: {
        foods: {
          include: {
            food: true,
          },
        },
      },
    });

    // 计算今日营养摄入
    const totalNutrition = todayMeals.reduce((total, meal) => {
      return meal.foods.reduce((mealTotal, mealFood) => {
        const ratio = mealFood.amount / 100;
        return {
          calories: mealTotal.calories + mealFood.food.calories * ratio,
          protein: mealTotal.protein + mealFood.food.protein * ratio,
          carbs: mealTotal.carbs + mealFood.food.carbs * ratio,
          fat: mealTotal.fat + mealFood.food.fat * ratio,
        };
      }, total);
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // 获取用户的营养目标
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        nutritionGoals: {
          where: {
            validFrom: { lte: today },
            validTo: { gte: today },
          },
        },
      },
    });

    if (!member?.nutritionGoals[0]) {
      return null; // 没有营养目标，无法判断是否不足
    }

    const goals = member.nutritionGoals[0];
    const deficiencies: string[] = [];

    // 检查各种营养素是否严重不足（低于目标值的60%）
    if (totalNutrition.protein < goals.protein * 0.6) {
      deficiencies.push(`蛋白质还差${Math.round(goals.protein - totalNutrition.protein)}g`);
    }
    if (totalNutrition.carbs < goals.carbs * 0.6) {
      deficiencies.push(`碳水还差${Math.round(goals.carbs - totalNutrition.carbs)}g`);
    }
    if (totalNutrition.calories < goals.calories * 0.6) {
      deficiencies.push(`热量还差${Math.round(goals.calories - totalNutrition.calories)}kcal`);
    }

    if (deficiencies.length === 0) {
      return null; // 没有明显不足
    }

    const message = customMessage || 
      `今日营养摄入不足：${deficiencies.join('，')}。晚餐建议多吃一些富含这些营养的食物～`;

    return {
      memberId,
      type: 'NUTRITION_DEFICIENCY',
      message,
      scheduledTime,
      priority: 'MEDIUM',
      metadata: { deficiencies, totalNutrition, goals },
    };
  }

  /**
   * 生成连续打卡即将中断提醒
   */
  private async generateStreakWarningReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string
  ): Promise<ReminderTrigger | null> {
    const hour = scheduledTime.getHours();
    
    // 只在晚上9点到10点之间生成连续打卡提醒
    if (hour < 21 || hour > 22) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否已经打卡
    const todayMeals = await prisma.mealLog.findFirst({
      where: {
        memberId,
        createdAt: {
          gte: today,
        },
      },
    });

    if (todayMeals) {
      return null; // 今天已经打卡，不需要提醒
    }

    // 获取连续打卡天数
    const streakData = await prisma.trackingStreak.findUnique({
      where: { memberId },
    });

    if (!streakData || streakData.currentStreak < 7) {
      return null; // 连续天数不足7天，不需要特殊提醒
    }

    const message = customMessage || 
      `别让连续打卡中断哦！你已经连续打卡${streakData.currentStreak}天了，今天还没有记录～`;

    return {
      memberId,
      type: 'STREAK_WARNING',
      message,
      scheduledTime,
      priority: 'HIGH',
      metadata: { currentStreak: streakData.currentStreak },
    };
  }

  /**
   * 发送提醒（可以集成推送服务）
   */
  async sendReminder(trigger: ReminderTrigger): Promise<boolean> {
    try {
      // 这里可以集成各种推送服务：
      // 1. 数据库存储（用于应用内通知）
      // 2. 邮件推送
      // 3. 短信推送
      // 4. WebSocket实时推送
      // 5. 第三方推送服务（如极光推送、个推等）

      // 示例：存储到数据库作为应用内通知
      await prisma.notification.create({
        data: {
          memberId: trigger.memberId,
          type: 'NUTRITION_REMINDER',
          title: '营养提醒',
          message: trigger.message,
          priority: trigger.priority,
          metadata: trigger.metadata || {},
          isRead: false,
          createdAt: new Date(),
        },
      });

      console.log(`提醒已发送给用户 ${trigger.memberId}: ${trigger.message}`);
      return true;
    } catch (error) {
      console.error('发送提醒失败:', error);
      return false;
    }
  }

  /**
   * 批量发送提醒
   */
  async sendReminders(triggers: ReminderTrigger[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const trigger of triggers) {
      const result = await this.sendReminder(trigger);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }
}

export const reminderService = new ReminderService();
