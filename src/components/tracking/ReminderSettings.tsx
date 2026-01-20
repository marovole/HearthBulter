"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, AlertTriangle, Save, RotateCcw } from "lucide-react";

interface ReminderConfig {
  type:
    | "MEAL_TIME"
    | "MISSING_MEAL"
    | "NUTRITION_DEFICIENCY"
    | "STREAK_WARNING";
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  message?: string;
}

interface ReminderSettingsProps {
  memberId: string;
  onSave?: (configs: ReminderConfig[]) => void;
}

const DEFAULT_CONFIGS: Omit<ReminderConfig, "type">[] = [
  {
    enabled: true,
    hour: 8,
    minute: 0,
    daysOfWeek: [1, 2, 3, 4, 5], // 周一到周五
    message: "",
  },
  {
    enabled: true,
    hour: 12,
    minute: 30,
    daysOfWeek: [1, 2, 3, 4, 5],
    message: "",
  },
  {
    enabled: true,
    hour: 18,
    minute: 30,
    daysOfWeek: [1, 2, 3, 4, 5],
    message: "",
  },
  {
    enabled: true,
    hour: 14,
    minute: 0,
    daysOfWeek: [1, 2, 3, 4, 5],
    message: "",
  },
  {
    enabled: true,
    hour: 19,
    minute: 0,
    daysOfWeek: [1, 2, 3, 4, 5],
    message: "",
  },
  {
    enabled: true,
    hour: 21,
    minute: 30,
    daysOfWeek: [1, 2, 3, 4, 5],
    message: "",
  },
];

const FALLBACK_CONFIG: Omit<ReminderConfig, "type"> = {
  enabled: true,
  hour: 8,
  minute: 0,
  daysOfWeek: [1, 2, 3, 4, 5],
  message: "",
};

const getDefaultConfig = (index: number): Omit<ReminderConfig, "type"> =>
  DEFAULT_CONFIGS[index] ?? FALLBACK_CONFIG;

const buildDefaultConfigs = (): ReminderConfig[] =>
  REMINDER_TYPES.map((type, index) => ({
    type: type.value,
    ...getDefaultConfig(index),
  }));

const REMINDER_TYPES = [
  {
    value: "MEAL_TIME",
    label: "餐时提醒",
    icon: "🍽️",
    description: "按时提醒记录三餐",
  },
  {
    value: "MISSING_MEAL",
    label: "漏餐提醒",
    icon: "⚠️",
    description: "忘记记录餐食时提醒",
  },
  {
    value: "NUTRITION_DEFICIENCY",
    label: "营养不足提醒",
    icon: "📊",
    description: "晚餐前提醒营养摄入不足",
  },
  {
    value: "STREAK_WARNING",
    label: "连续打卡提醒",
    icon: "🔥",
    description: "连续打卡即将中断时提醒",
  },
] as const;

const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function ReminderSettings({ memberId, onSave }: ReminderSettingsProps) {
  const [configs, setConfigs] = useState<ReminderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadReminderConfigs();
  }, [memberId]);

  const loadReminderConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tracking/reminders?memberId=${memberId}`,
      );
      if (response.ok) {
        const data = await response.json();
        const reminders = Array.isArray(data.reminders)
          ? (data.reminders as Partial<ReminderConfig>[])
          : [];
        const normalized = reminders.map(
          (
            reminder: Partial<ReminderConfig>,
            index: number,
          ): ReminderConfig => {
            const defaults = getDefaultConfig(index);
            return {
              type:
                reminder.type ?? REMINDER_TYPES[index]?.value ?? "MEAL_TIME",
              enabled: reminder.enabled ?? defaults.enabled,
              hour: reminder.hour ?? defaults.hour,
              minute: reminder.minute ?? defaults.minute,
              daysOfWeek: reminder.daysOfWeek ?? defaults.daysOfWeek,
              message: reminder.message ?? defaults.message,
            };
          },
        );

        setConfigs(normalized.length > 0 ? normalized : buildDefaultConfigs());
      } else {
        setConfigs(buildDefaultConfigs());
      }
    } catch (error) {
      console.error("加载提醒配置失败:", error);
      setConfigs(buildDefaultConfigs());
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (index: number, updates: Partial<ReminderConfig>) => {
    const newConfigs = [...configs];
    const currentConfig = newConfigs[index];
    if (!currentConfig) return;
    newConfigs[index] = { ...currentConfig, ...updates };
    setConfigs(newConfigs);
    setHasChanges(true);
  };

  const toggleDay = (configIndex: number, dayIndex: number) => {
    const config = configs[configIndex];
    if (!config) return;
    const newDaysOfWeek = config.daysOfWeek.includes(dayIndex)
      ? config.daysOfWeek.filter((d) => d !== dayIndex)
      : [...config.daysOfWeek, dayIndex];

    updateConfig(configIndex, { daysOfWeek: newDaysOfWeek });
  };

  const toggleConfig = (index: number) => {
    const config = configs[index];
    if (!config) return;
    updateConfig(index, { enabled: !config.enabled });
  };

  const resetToDefaults = () => {
    setConfigs(buildDefaultConfigs());
    setHasChanges(true);
  };

  const saveConfigs = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/tracking/reminders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          configs,
        }),
      });

      if (response.ok) {
        setHasChanges(false);
        onSave?.(configs);
        alert("提醒配置保存成功！");
      } else {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("保存提醒配置失败:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  };

  const getReminderTypeInfo = (type: string) => {
    return REMINDER_TYPES.find((t) => t.value === type) || REMINDER_TYPES[0];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">提醒设置</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">提醒设置</h3>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置默认</span>
          </button>

          {hasChanges && (
            <button
              onClick={saveConfigs}
              disabled={isSaving}
              className="flex items-center space-x-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "保存中..." : "保存设置"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Reminder Configs */}
      <div className="space-y-4">
        {configs.map((config, index) => {
          const typeInfo = getReminderTypeInfo(config.type);

          return (
            <div
              key={config.type}
              className={`border rounded-lg p-4 ${
                config.enabled ? "bg-white" : "bg-gray-50 opacity-60"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {typeInfo.label}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {typeInfo.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleConfig(index)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Settings */}
              {config.enabled && (
                <div className="space-y-4">
                  {/* Time Setting */}
                  <div className="flex items-center space-x-4">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <label className="text-sm font-medium text-gray-700">
                      提醒时间:
                    </label>
                    <input
                      type="time"
                      value={formatTime(config.hour, config.minute)}
                      onChange={(e) => {
                        const [hour, minute] = e.target.value
                          .split(":")
                          .map(Number);
                        updateConfig(index, { hour, minute });
                      }}
                      className="px-3 py-1 border rounded text-sm"
                    />
                  </div>

                  {/* Days of Week */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      重复日期:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAY_NAMES.map((day, dayIndex) => (
                        <button
                          key={dayIndex}
                          onClick={() => toggleDay(index, dayIndex)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                            config.daysOfWeek.includes(dayIndex)
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-100 text-gray-600 border border-gray-300"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Message */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      自定义消息:
                    </label>
                    <input
                      type="text"
                      value={config.message || ""}
                      onChange={(e) =>
                        updateConfig(index, { message: e.target.value })
                      }
                      placeholder="留空使用默认消息"
                      className="w-full px-3 py-2 border rounded text-sm"
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500">
                      {config.message?.length || 0}/200 字符
                    </p>
                  </div>
                </div>
              )}

              {/* Warning for disabled critical reminders */}
              {!config.enabled &&
                ["MEAL_TIME", "MISSING_MEAL"].includes(config.type) && (
                <div className="flex items-center space-x-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                  <AlertTriangle className="w-4 h-4" />
                  <span>关闭此提醒可能影响您的营养追踪连续性</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
        <p className="mb-2">💡 提醒设置说明:</p>
        <ul className="space-y-1 text-xs">
          <li>• 餐时提醒：在设定时间提醒记录三餐</li>
          <li>• 漏餐提醒：餐时2小时后仍未记录时提醒</li>
          <li>• 营养不足提醒：晚餐前检查当日营养摄入</li>
          <li>• 连续打卡提醒：连续打卡7天以上时，当天未记录会在晚上提醒</li>
        </ul>
      </div>
    </div>
  );
}
