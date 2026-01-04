'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  memberId: string;
  onClose?: () => void;
}

interface NotificationPreferences {
  enableNotifications: boolean;
  globalQuietHoursStart: number | null;
  globalQuietHoursEnd: number | null;
  dailyMaxNotifications: number;
  dailyMaxSMS: number;
  dailyMaxEmail: number;
  channelPreferences: Record<string, string[]>;
  typeSettings: Record<string, boolean>;
  wechatOpenId: string | null;
  wechatSubscribed: boolean;
  pushToken: string | null;
  pushEnabled: boolean;
  emailEnabled: boolean;
  phoneEnabled: boolean;
  phoneNumber: string | null;
  enableSmartScheduling: boolean;
  enableDeduplication: boolean;
}

const NOTIFICATION_TYPES = [
  { key: 'CHECK_IN_REMINDER', label: '打卡提醒', icon: '📝' },
  { key: 'TASK_NOTIFICATION', label: '任务通知', icon: '📋' },
  { key: 'EXPIRY_ALERT', label: '过期提醒', icon: '⏰' },
  { key: 'BUDGET_WARNING', label: '预算预警', icon: '💰' },
  { key: 'HEALTH_ALERT', label: '健康异常', icon: '⚠️' },
  { key: 'GOAL_ACHIEVEMENT', label: '目标达成', icon: '🎉' },
  { key: 'FAMILY_ACTIVITY', label: '家庭活动', icon: '👨‍👩‍👧‍👦' },
  { key: 'SYSTEM_ANNOUNCEMENT', label: '系统公告', icon: '📢' },
  { key: 'MARKETING', label: '营销通知', icon: '🎯' },
  { key: 'OTHER', label: '其他', icon: '📄' },
];

const NOTIFICATION_CHANNELS = [
  { key: 'IN_APP', label: '应用内', icon: '📱' },
  { key: 'EMAIL', label: '邮件', icon: '📧' },
  { key: 'SMS', label: '短信', icon: '💬' },
  { key: 'WECHAT', label: '微信', icon: '💚' },
  { key: 'PUSH', label: '推送', icon: '🔔' },
];

export function NotificationSettings({
  memberId,
  onClose,
}: NotificationSettingsProps) {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 加载偏好设置
  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/notifications/preferences?memberId=${memberId}`,
      );
      const data = await response.json();

      if (data.success) {
        setPreferences(data.data);
      } else {
        throw new Error(data.error || 'Failed to load preferences');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load preferences',
      );
    } finally {
      setLoading(false);
    }
  };

  // 保存偏好设置
  const savePreferences = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          ...preferences,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(data.error || 'Failed to save preferences');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save preferences',
      );
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认设置
  const resetToDefaults = () => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      enableNotifications: true,
      globalQuietHoursStart: null,
      globalQuietHoursEnd: null,
      dailyMaxNotifications: 50,
      dailyMaxSMS: 5,
      dailyMaxEmail: 20,
      channelPreferences: {
        CHECK_IN_REMINDER: ['IN_APP', 'EMAIL'],
        TASK_NOTIFICATION: ['IN_APP'],
        EXPIRY_ALERT: ['IN_APP', 'EMAIL', 'SMS'],
        BUDGET_WARNING: ['IN_APP', 'EMAIL'],
        HEALTH_ALERT: ['IN_APP', 'EMAIL', 'SMS'],
        GOAL_ACHIEVEMENT: ['IN_APP', 'EMAIL'],
        FAMILY_ACTIVITY: ['IN_APP'],
        SYSTEM_ANNOUNCEMENT: ['IN_APP'],
        MARKETING: ['IN_APP'],
        OTHER: ['IN_APP'],
      },
      typeSettings: {
        CHECK_IN_REMINDER: true,
        TASK_NOTIFICATION: true,
        EXPIRY_ALERT: true,
        BUDGET_WARNING: true,
        HEALTH_ALERT: true,
        GOAL_ACHIEVEMENT: true,
        FAMILY_ACTIVITY: true,
        SYSTEM_ANNOUNCEMENT: true,
        MARKETING: false,
        OTHER: true,
      },
      enableSmartScheduling: true,
      enableDeduplication: true,
    });
  };

  // 更新偏好设置
  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  // 更新类型设置
  const updateTypeSetting = (type: string, enabled: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      typeSettings: {
        ...preferences.typeSettings,
        [type]: enabled,
      },
    });
  };

  // 更新渠道偏好
  const updateChannelPreference = (
    type: string,
    channel: string,
    enabled: boolean,
  ) => {
    if (!preferences) return;

    const currentChannels = preferences.channelPreferences[type] || [];
    const newChannels = enabled
      ? [...currentChannels, channel]
      : currentChannels.filter((c) => c !== channel);

    setPreferences({
      ...preferences,
      channelPreferences: {
        ...preferences.channelPreferences,
        [type]: newChannels,
      },
    });
  };

  useEffect(() => {
    if (memberId) {
      loadPreferences();
    }
  }, [memberId]);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500'></div>
        <span className='ml-2 text-sm text-gray-500'>加载设置中...</span>
      </div>
    );
  }

  if (error || !preferences) {
    return (
      <div className='text-center py-8'>
        <p className='text-red-500 text-sm mb-3'>{error || '设置加载失败'}</p>
        <button
          onClick={loadPreferences}
          className='px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100'
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 头部 */}
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-gray-900'>通知设置</h3>
        <div className='flex items-center space-x-2'>
          {success && <span className='text-sm text-green-600'>保存成功</span>}
          <button
            onClick={resetToDefaults}
            className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded'
            title='重置为默认设置'
          >
            <RotateCcw className='h-4 w-4' />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>
      </div>

      {/* 全局设置 */}
      <div className='space-y-4'>
        <h4 className='text-sm font-medium text-gray-700'>全局设置</h4>

        <div className='flex items-center justify-between'>
          <label className='text-sm text-gray-600'>启用通知</label>
          <input
            type='checkbox'
            checked={preferences.enableNotifications}
            onChange={(e) =>
              updatePreference('enableNotifications', e.target.checked)
            }
            className='h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
          />
        </div>

        {/* 勿扰时间 */}
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm text-gray-600 mb-1'>
              勿扰开始时间
            </label>
            <select
              value={preferences.globalQuietHoursStart || ''}
              onChange={(e) =>
                updatePreference(
                  'globalQuietHoursStart',
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>关闭</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm text-gray-600 mb-1'>
              勿扰结束时间
            </label>
            <select
              value={preferences.globalQuietHoursEnd || ''}
              onChange={(e) =>
                updatePreference(
                  'globalQuietHoursEnd',
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>关闭</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 每日限额 */}
        <div className='grid grid-cols-3 gap-4'>
          <div>
            <label className='block text-sm text-gray-600 mb-1'>
              每日最大通知数
            </label>
            <input
              type='number'
              min='0'
              max='100'
              value={preferences.dailyMaxNotifications}
              onChange={(e) =>
                updatePreference(
                  'dailyMaxNotifications',
                  parseInt(e.target.value) || 0,
                )
              }
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm text-gray-600 mb-1'>
              每日最大短信数
            </label>
            <input
              type='number'
              min='0'
              max='50'
              value={preferences.dailyMaxSMS}
              onChange={(e) =>
                updatePreference('dailyMaxSMS', parseInt(e.target.value) || 0)
              }
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm text-gray-600 mb-1'>
              每日最大邮件数
            </label>
            <input
              type='number'
              min='0'
              max='100'
              value={preferences.dailyMaxEmail}
              onChange={(e) =>
                updatePreference('dailyMaxEmail', parseInt(e.target.value) || 0)
              }
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
        </div>

        {/* 智能设置 */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <label className='text-sm text-gray-600'>智能调度</label>
            <input
              type='checkbox'
              checked={preferences.enableSmartScheduling}
              onChange={(e) =>
                updatePreference('enableSmartScheduling', e.target.checked)
              }
              className='h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
            />
          </div>

          <div className='flex items-center justify-between'>
            <label className='text-sm text-gray-600'>去重合并</label>
            <input
              type='checkbox'
              checked={preferences.enableDeduplication}
              onChange={(e) =>
                updatePreference('enableDeduplication', e.target.checked)
              }
              className='h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
            />
          </div>
        </div>
      </div>

      {/* 通知类型开关 */}
      <div className='space-y-4'>
        <h4 className='text-sm font-medium text-gray-700'>通知类型</h4>

        <div className='space-y-2'>
          {NOTIFICATION_TYPES.map((type) => (
            <div
              key={type.key}
              className='flex items-center justify-between p-2 hover:bg-gray-50 rounded'
            >
              <div className='flex items-center space-x-2'>
                <span className='text-lg'>{type.icon}</span>
                <span className='text-sm text-gray-700'>{type.label}</span>
              </div>
              <input
                type='checkbox'
                checked={preferences.typeSettings[type.key] || false}
                onChange={(e) => updateTypeSetting(type.key, e.target.checked)}
                className='h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
              />
            </div>
          ))}
        </div>
      </div>

      {/* 渠道偏好 */}
      <div className='space-y-4'>
        <h4 className='text-sm font-medium text-gray-700'>渠道偏好</h4>

        <div className='space-y-3'>
          {NOTIFICATION_TYPES.map((type) => {
            if (!preferences.typeSettings[type.key]) return null;

            return (
              <div key={type.key} className='border rounded-lg p-3'>
                <div className='flex items-center space-x-2 mb-2'>
                  <span className='text-lg'>{type.icon}</span>
                  <span className='text-sm font-medium text-gray-700'>
                    {type.label}
                  </span>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <label
                      key={channel.key}
                      className='flex items-center space-x-2 text-sm text-gray-600 cursor-pointer'
                    >
                      <input
                        type='checkbox'
                        checked={(
                          preferences.channelPreferences[type.key] || []
                        ).includes(channel.key)}
                        onChange={(e) =>
                          updateChannelPreference(
                            type.key,
                            channel.key,
                            e.target.checked,
                          )
                        }
                        className='h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                      />
                      <span>
                        {channel.icon} {channel.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 保存按钮 */}
      <div className='flex justify-end space-x-3 pt-4 border-t'>
        <button
          onClick={onClose}
          className='px-4 py-2 text-sm text-gray-600 hover:text-gray-800'
        >
          取消
        </button>
        <button
          onClick={savePreferences}
          disabled={saving}
          className='flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50'
        >
          <Save className='h-4 w-4' />
          <span>{saving ? '保存中...' : '保存设置'}</span>
        </button>
      </div>
    </div>
  );
}
