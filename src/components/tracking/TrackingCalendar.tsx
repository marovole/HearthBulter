"use client";

import { useState } from "react";

interface CalendarDay {
  date: Date;
  isChecked: boolean;
  isCompleted: boolean;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface TrackingCalendarProps {
  year: number;
  month: number;
  calendar: CalendarDay[];
  onDateClick?: (date: Date) => void;
}

export function TrackingCalendar({ year, month, calendar, onDateClick }: TrackingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  const monthName = new Date(year, month - 1).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });

  const getDayClassName = (day: CalendarDay) => {
    const baseClass =
      "aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all";

    if (!day.isChecked) {
      return `${baseClass} bg-gray-50 hover:bg-gray-100`;
    }

    if (day.isCompleted) {
      return `${baseClass} bg-green-100 border-2 border-green-500 hover:bg-green-200`;
    }

    return `${baseClass} bg-yellow-100 border-2 border-yellow-500 hover:bg-yellow-200`;
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{monthName}</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-green-500"></div>
            <span>已完成</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-yellow-500"></div>
            <span>部分完成</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-gray-200"></div>
            <span>未打卡</span>
          </div>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="mb-2 grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-2">
        {calendar.map((day, index) => (
          <div
            key={index}
            className={getDayClassName(day)}
            onClick={() => onDateClick && onDateClick(day.date)}
          >
            <div className="text-sm font-medium">{day.date.getDate()}</div>
            {day.isChecked && <div className="mt-1 text-xs">{day.isCompleted ? "✓" : "◐"}</div>}
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">
            {calendar.filter((d) => d.isCompleted).length}
          </div>
          <div className="text-sm text-gray-600">已完成</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-600">
            {calendar.filter((d) => d.isChecked && !d.isCompleted).length}
          </div>
          <div className="text-sm text-gray-600">部分完成</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-400">
            {calendar.filter((d) => !d.isChecked).length}
          </div>
          <div className="text-sm text-gray-600">未打卡</div>
        </div>
      </div>
    </div>
  );
}
