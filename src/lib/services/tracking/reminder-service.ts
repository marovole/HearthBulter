import { convexTracking } from "@/lib/convex-tracking";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface MealLogDoc {
  _id: Id<"mealLogs">;
  memberId: Id<"familyMembers">;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ReminderConfig {
  type: string;
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  message?: string | null;
}

export interface NutritionReminder {
  id: string;
  memberId: string;
  type: string;
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  message?: string | null;
  lastTriggeredAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ReminderTrigger {
  memberId: string;
  type: string;
  message: string;
  scheduledTime: Date;
  priority: "LOW" | "MEDIUM" | "HIGH";
  metadata?: Record<string, any>;
}

class ReminderService {
  async getReminderConfigs(memberId: string): Promise<NutritionReminder[]> {
    const reminders = (await convexTracking.getReminderConfigs(
      memberId,
    )) as Doc<"healthReminders">[];
    return reminders.map((reminder) => ({
      ...reminder,
      id: reminder._id,
      type: reminder.reminderType,
      memberId: reminder.memberId,
      lastTriggeredAt: reminder.lastTriggeredAt ?? null,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    }));
  }

  async upsertReminderConfig(
    memberId: string,
    config: Omit<ReminderConfig, "enabled"> & { enabled?: boolean },
  ): Promise<NutritionReminder> {
    const { type, enabled = true, hour, minute, daysOfWeek, message } = config;
    await convexTracking.upsertReminderConfig({
      memberId,
      reminderType: type,
      enabled,
      hour,
      minute,
      daysOfWeek,
      message,
    });

    const updated = (await convexTracking.getReminderConfigs(
      memberId,
    )) as Doc<"healthReminders">[];
    const reminder = updated.find((r) => r.reminderType === type);
    if (!reminder) throw new Error("Failed to create reminder");

    return {
      ...reminder,
      id: reminder._id,
      type: reminder.reminderType,
      memberId: reminder.memberId,
      lastTriggeredAt: reminder.lastTriggeredAt ?? null,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  }

  async deleteReminderConfig(memberId: string, type: string): Promise<void> {
    await convexTracking.deleteReminderConfig(memberId, type);
  }

  async generatePendingReminders(): Promise<ReminderTrigger[]> {
    const triggers: ReminderTrigger[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayOfWeek = now.getDay();

    const activeReminders =
      (await convexTracking.getActiveReminders()) as Doc<"healthReminders">[];

    for (const reminder of activeReminders) {
      if (!reminder.enabled || reminder.deletedAt) continue;

      const daysOfWeek = reminder.daysOfWeek;

      if (!daysOfWeek.includes(currentDayOfWeek)) continue;

      const reminderTime = reminder.hour * 60 + reminder.minute;
      const currentTime = currentHour * 60 + currentMinute;

      if (Math.abs(currentTime - reminderTime) > 5) continue;

      const oneHourAgo = now.getTime() - 60 * 60 * 1000;
      if (reminder.lastTriggeredAt && reminder.lastTriggeredAt > oneHourAgo)
        continue;

      const trigger = await this.generateReminderTrigger(reminder, now);
      if (trigger) {
        triggers.push(trigger);
        await convexTracking.updateReminderLastTriggered(reminder._id);
      }
    }

    return triggers;
  }

  private async generateReminderTrigger(
    reminder: Doc<"healthReminders">,
    scheduledTime: Date,
  ): Promise<ReminderTrigger | null> {
    const { memberId, reminderType, message } = reminder;

    switch (reminderType) {
      case "WEIGHT":
        return this.generateWeightReminder(
          memberId,
          scheduledTime,
          message ?? undefined,
        );
      case "BLOOD_PRESSURE":
        return this.generateBloodPressureReminder(
          memberId,
          scheduledTime,
          message ?? undefined,
        );
      case "HEART_RATE":
        return this.generateHeartRateReminder(
          memberId,
          scheduledTime,
          message ?? undefined,
        );
      case "GENERAL":
        return this.generateGeneralReminder(
          memberId,
          scheduledTime,
          message ?? undefined,
        );
      default:
        return null;
    }
  }

  private generateWeightReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string,
  ): ReminderTrigger {
    return {
      memberId,
      type: "WEIGHT",
      message: customMessage || "记得记录体重，持续关注健康变化～",
      scheduledTime,
      priority: "MEDIUM",
    };
  }

  private generateBloodPressureReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string,
  ): ReminderTrigger {
    return {
      memberId,
      type: "BLOOD_PRESSURE",
      message: customMessage || "记得测量血压，关注心血管健康～",
      scheduledTime,
      priority: "MEDIUM",
    };
  }

  private generateHeartRateReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string,
  ): ReminderTrigger {
    return {
      memberId,
      type: "HEART_RATE",
      message: customMessage || "记录一下心率，保持健康节奏～",
      scheduledTime,
      priority: "MEDIUM",
    };
  }

  private generateGeneralReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string,
  ): ReminderTrigger {
    return {
      memberId,
      type: "GENERAL",
      message: customMessage || "记得关注健康状态，保持良好习惯～",
      scheduledTime,
      priority: "LOW",
    };
  }

  private generateMealTimeReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string,
  ): ReminderTrigger {
    const hour = scheduledTime.getHours();

    let mealType = "";
    let defaultMessage = "";

    if (hour >= 7 && hour < 10) {
      mealType = "早餐";
      defaultMessage = "该记录早餐啦！美好的一天从营养早餐开始～";
    } else if (hour >= 11 && hour < 14) {
      mealType = "午餐";
      defaultMessage = "午餐时间到！记得记录你的午餐，保持营养均衡～";
    } else if (hour >= 17 && hour < 20) {
      mealType = "晚餐";
      defaultMessage = "晚餐时间！记录今天的晚餐，完成营养打卡～";
    } else {
      mealType = "加餐";
      defaultMessage = "加餐时间！记得记录你的健康小食～";
    }

    return {
      memberId,
      type: "GENERAL",
      message: customMessage || defaultMessage,
      scheduledTime,
      priority: "MEDIUM",
      metadata: { mealType },
    };
  }

  private async generateMissingMealReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string,
  ): Promise<ReminderTrigger | null> {
    const hour = scheduledTime.getHours();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
    let mealName: string;

    if (hour >= 10 && hour < 13) {
      mealType = "BREAKFAST";
      mealName = "早餐";
    } else if (hour >= 14 && hour < 17) {
      mealType = "LUNCH";
      mealName = "午餐";
    } else if (hour >= 21 && hour <= 23) {
      mealType = "DINNER";
      mealName = "晚餐";
    } else {
      return null;
    }

    const existingMeal = await convexTracking.findMealLogByTypeAndDate(
      memberId,
      mealType,
      today,
    );

    if (existingMeal) return null;

    return {
      memberId,
      type: "GENERAL",
      message:
        customMessage || `还没记录${mealName}哦！点击记录，保持打卡连续性～`,
      scheduledTime,
      priority: "HIGH",
      metadata: { mealType, mealName },
    };
  }

  private async generateNutritionDeficiencyReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string,
  ): Promise<ReminderTrigger | null> {
    const hour = scheduledTime.getHours();

    if (hour < 16 || hour > 19) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMeals = (await convexTracking.getTodayMealLogs(
      memberId,
    )) as Array<Doc<"mealLogs"> & { foods: Doc<"mealLogFoods">[] }>;

    if (todayMeals.length === 0) return null;

    return null;
  }

  private async generateStreakWarningReminder(
    memberId: string,
    scheduledTime: Date,
    customMessage?: string,
  ): Promise<ReminderTrigger | null> {
    const hour = scheduledTime.getHours();

    if (hour < 21 || hour > 22) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMeals = (await convexTracking.getTodayMealLogs(
      memberId,
    )) as MealLogDoc[];
    if (todayMeals.length > 0) return null;

    const streakData = (await convexTracking.getTrackingStreak(
      memberId,
    )) as Doc<"trackingStreaks"> | null;
    if (!streakData || (streakData.currentStreak ?? 0) < 7) return null;

    const message =
      customMessage ||
      `别让连续打卡中断哦！你已经连续打卡${streakData.currentStreak}天了，今天还没有记录～`;

    return {
      memberId,
      type: "GENERAL",
      message,
      scheduledTime,
      priority: "HIGH",
      metadata: { currentStreak: streakData.currentStreak },
    };
  }

  async sendReminder(trigger: ReminderTrigger): Promise<boolean> {
    try {
      const { convexClient, api } = await import("@/lib/convex-client");
      await convexClient.mutation(api.notifications.create, {
        memberId: trigger.memberId,
        type: "NUTRITION_REMINDER",
        title: "营养提醒",
        content: trigger.message,
        priority: trigger.priority,
        channels: ["IN_APP"],
        metadata: trigger.metadata || {},
      });
      console.log(`提醒已发送给用户 ${trigger.memberId}: ${trigger.message}`);
      return true;
    } catch (error) {
      console.error("发送提醒失败:", error);
      return false;
    }
  }

  async sendReminders(
    triggers: ReminderTrigger[],
  ): Promise<{ success: number; failed: number }> {
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
