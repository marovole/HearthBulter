// ============================================================================
// 日历事件因子 (30%)
// 检测即将到来的节日、聚会、特殊日期
// ============================================================================

import { TriggerFactor, CalendarEvent } from "../types";

const US_HOLIDAYS_2024: CalendarEvent[] = [
  { date: new Date("2024-01-01"), type: "holiday" },
  { date: new Date("2024-01-15"), type: "holiday" },
  { date: new Date("2024-02-14"), type: "holiday" },
  { date: new Date("2024-02-19"), type: "holiday" },
  { date: new Date("2024-03-17"), type: "holiday" },
  { date: new Date("2024-04-21"), type: "holiday" },
  { date: new Date("2024-05-12"), type: "holiday" },
  { date: new Date("2024-05-27"), type: "holiday" },
  { date: new Date("2024-06-16"), type: "holiday" },
  { date: new Date("2024-07-04"), type: "holiday" },
  { date: new Date("2024-09-02"), type: "holiday" },
  { date: new Date("2024-10-14"), type: "holiday" },
  { date: new Date("2024-10-31"), type: "holiday" },
  { date: new Date("2024-11-11"), type: "holiday" },
  { date: new Date("2024-11-28"), type: "holiday" },
  { date: new Date("2024-12-25"), type: "holiday" },
  { date: new Date("2024-12-31"), type: "holiday" },
];

export function calculateCalendarFactor(
  userEvents: CalendarEvent[] = [],
  lookAheadDays: number = 7
): TriggerFactor {
  const now = new Date();
  const lookAheadDate = new Date(now.getTime() + lookAheadDays * 24 * 60 * 60 * 1000);

  const allEvents = [...US_HOLIDAYS_2024, ...userEvents];

  const upcomingEvents = allEvents.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= now && eventDate <= lookAheadDate;
  });

  if (upcomingEvents.length === 0) {
    return {
      name: "calendar",
      weight: 0.3,
      score: 0,
      reason: "No upcoming events in the next week",
    };
  }

  const closestEvent = upcomingEvents.reduce((closest, event) => {
    const eventDate = new Date(event.date);
    const closestDate = new Date(closest.date);
    return eventDate < closestDate ? event : closest;
  });

  const daysUntilEvent = Math.ceil(
    (new Date(closestEvent.date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  let score = 0;
  let reason = "";

  if (daysUntilEvent <= 2) {
    score = 1.0;
    reason = `Event in ${daysUntilEvent} day(s) - urgent planning needed`;
  } else if (daysUntilEvent <= 4) {
    score = 0.8;
    reason = `Event in ${daysUntilEvent} days - good time to plan`;
  } else if (daysUntilEvent <= 7) {
    score = 0.5;
    reason = `Event in ${daysUntilEvent} days - consider planning ahead`;
  }

  if (closestEvent.guestCount && closestEvent.guestCount > 4) {
    score = Math.min(score + 0.2, 1.0);
    reason += ` (${closestEvent.guestCount} guests expected)`;
  }

  return {
    name: "calendar",
    weight: 0.3,
    score,
    reason,
  };
}
