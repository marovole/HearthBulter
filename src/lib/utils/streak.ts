import { convexClient, api } from "@/lib/convex-client";

type Id<TableName extends string> = string & { __tableName: TableName };

function isSameDay(timestamp: number, target: Date): boolean {
  const date = new Date(timestamp);
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

function isWithinDay(timestamp: number, start: Date, end: Date): boolean {
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

export async function updateStreakDays(memberId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metricCandidates = (await convexClient.query(api.health.getMetrics, {
      memberId: memberId as Id<"familyMembers">,
      limit: 30,
    })) as any[];

    const todayData = metricCandidates.find((item) => isSameDay(item.measuredAt, today));

    if (!todayData) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reminders = (await convexClient.query(api.health.listHealthRemindersByMember, {
      memberId: memberId as Id<"familyMembers">,
    })) as any[];

    const enabledReminders = reminders.filter((reminder) => reminder.enabled === true);

    if (!enabledReminders || enabledReminders.length === 0) {
      return;
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastData = metricCandidates.find((item) =>
      isWithinDay(item.measuredAt, yesterday, today)
    );

    const now = new Date();

    for (const reminder of enabledReminders) {
      const reminderRecord = reminder as {
        id: string;
        streakDays: number;
        reminderType: string;
        enabled: boolean;
        hour: number;
        minute: number;
        daysOfWeek: number[];
        message?: string;
      };
      const nextStreakDays = lastData
        ? reminderRecord.streakDays + 1
        : reminderRecord.streakDays === 0
          ? 1
          : 0;

      await convexClient.mutation(api.health.upsertHealthReminder, {
        memberId: memberId as Id<"familyMembers">,
        reminderType: reminderRecord.reminderType,
        enabled: reminderRecord.enabled,
        hour: reminderRecord.hour,
        minute: reminderRecord.minute,
        daysOfWeek: reminderRecord.daysOfWeek,
        message: reminderRecord.message,
        streakDays: nextStreakDays,
        lastTriggeredAt: now.getTime(),
      });
    }
  } catch (error) {
    console.error("更新连续打卡天数失败:", error);
  }
}
