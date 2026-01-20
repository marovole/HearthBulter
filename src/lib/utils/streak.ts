import { neonAdapter } from "@/lib/db/neon-adapter";

export async function updateStreakDays(memberId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayData = await neonAdapter.healthData.findFirst({
      where: {
        memberId,
        measuredAt: { gte: today },
      },
    });

    if (!todayData) {
      return;
    }

    const reminders = await neonAdapter.healthReminder.findMany({
      where: {
        memberId,
        enabled: true,
      },
    });

    if (!reminders || reminders.length === 0) {
      return;
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastData = await neonAdapter.healthData.findFirst({
      where: {
        memberId,
        measuredAt: { gte: yesterday, lt: today },
      },
      orderBy: { measuredAt: "desc" },
    });

    const now = new Date();

    for (const reminder of reminders) {
      const reminderRecord = reminder as { id: string; streakDays: number };
      if (lastData) {
        await neonAdapter.healthReminder.update({
          where: { id: reminderRecord.id },
          data: {
            streakDays: reminderRecord.streakDays + 1,
            lastTriggeredAt: now,
            updatedAt: now,
          },
        });
      } else if (reminderRecord.streakDays === 0) {
        await neonAdapter.healthReminder.update({
          where: { id: reminderRecord.id },
          data: {
            streakDays: 1,
            lastTriggeredAt: now,
            updatedAt: now,
          },
        });
      } else {
        await neonAdapter.healthReminder.update({
          where: { id: reminderRecord.id },
          data: {
            streakDays: 0,
            updatedAt: now,
          },
        });
      }
    }
  } catch (error) {
    console.error("更新连续打卡天数失败:", error);
  }
}
