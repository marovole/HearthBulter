import { SupabaseClientManager } from "@/lib/db/supabase-adapter";

/**
 * 计算连续打卡天数
 * 当用户录入健康数据时调用此函数更新提醒的连续打卡天数
 *
 * Migrated from Prisma to Supabase
 */
export async function updateStreakDays(memberId: string) {
  try {
    const supabase = SupabaseClientManager.getInstance();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否已经录入数据
    const { data: todayData } = await supabase
      .from("health_data")
      .select("id")
      .eq("memberId", memberId)
      .gte("measuredAt", today.toISOString())
      .limit(1)
      .maybeSingle();

    if (!todayData) {
      return; // 今天还没有数据，不更新
    }

    // 获取所有启用的提醒配置
    const { data: reminders } = await supabase
      .from("health_reminders")
      .select("*")
      .eq("memberId", memberId)
      .eq("enabled", true);

    if (!reminders || reminders.length === 0) {
      return;
    }

    // 查找最近一次录入数据（不包括今天）
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: lastData } = await supabase
      .from("health_data")
      .select("id, measuredAt")
      .eq("memberId", memberId)
      .gte("measuredAt", yesterday.toISOString())
      .lt("measuredAt", today.toISOString())
      .order("measuredAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();

    // 更新所有提醒的连续打卡天数
    for (const reminder of reminders) {
      if (lastData) {
        // 如果昨天有数据，连续天数+1
        await supabase
          .from("health_reminders")
          .update({
            streakDays: reminder.streakDays + 1,
            lastTriggeredAt: now,
            updatedAt: now,
          })
          .eq("id", reminder.id);
      } else if (reminder.streakDays === 0) {
        // 如果昨天没有数据但连续天数为0，则设置为1（今天第一次）
        await supabase
          .from("health_reminders")
          .update({
            streakDays: 1,
            lastTriggeredAt: now,
            updatedAt: now,
          })
          .eq("id", reminder.id);
      } else {
        // 如果昨天没有数据且连续天数>0，重置为0
        await supabase
          .from("health_reminders")
          .update({
            streakDays: 0,
            updatedAt: now,
          })
          .eq("id", reminder.id);
      }
    }
  } catch (error) {
    console.error("更新连续打卡天数失败:", error);
    // 不影响主流程，只记录错误
  }
}
