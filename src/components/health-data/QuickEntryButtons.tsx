'use client';

import React, { useState } from 'react';
import {
  Weight,
  Heart,
  Activity,
  Moon,
  Zap,
  Plus,
  CheckCircle,
} from 'lucide-react';

interface QuickEntryButtonsProps {
  memberId: string;
  onDataAdded?: () => void;
}

interface QuickEntryItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  placeholder: string;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}

export function QuickEntryButtons({
  memberId,
  onDataAdded,
}: QuickEntryButtonsProps) {
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const quickEntryItems: QuickEntryItem[] = [
    {
      id: 'weight',
      name: '体重',
      icon: Weight,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      placeholder: '75.5',
      unit: 'kg',
      min: 20,
      max: 300,
      step: 0.1,
    },
    {
      id: 'bloodPressure',
      name: '血压',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      placeholder: '120/80',
      unit: 'mmHg',
      min: 60,
      max: 200,
    },
    {
      id: 'heartRate',
      name: '心率',
      icon: Activity,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      placeholder: '72',
      unit: 'bpm',
      min: 40,
      max: 220,
    },
    {
      id: 'sleep',
      name: '睡眠',
      icon: Moon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      placeholder: '8',
      unit: '小时',
      min: 0,
      max: 24,
      step: 0.5,
    },
    {
      id: 'exercise',
      name: '运动',
      icon: Zap,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      placeholder: '30',
      unit: '分钟',
      min: 0,
      max: 300,
    },
  ];

  const handleQuickEntry = (itemId: string) => {
    setActiveEntry(itemId === activeEntry ? null : itemId);
    setErrors([]);
  };

  const handleValueChange = (itemId: string, value: string) => {
    setEntryValues((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSubmit = async (itemId: string) => {
    const value = entryValues[itemId];
    if (!value) {
      setErrors(['请输入数值']);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const payload: any = {
        measuredAt: new Date().toISOString(),
        source: 'MANUAL',
      };

      // 根据不同的快速录入类型设置相应的字段
      const item = quickEntryItems.find((i) => i.id === itemId);
      switch (itemId) {
        case 'weight':
          payload.weight = parseFloat(value);
          break;
        case 'bloodPressure':
          const [systolic, diastolic] = value
            .split('/')
            .map((v) => parseInt(v.trim()));
          if (systolic && diastolic) {
            payload.bloodPressureSystolic = systolic;
            payload.bloodPressureDiastolic = diastolic;
          } else {
            throw new Error('血压格式不正确，请使用 120/80 格式');
          }
          break;
        case 'heartRate':
          payload.heartRate = parseInt(value);
          break;
        case 'sleep':
          // 睡眠数据可能需要扩展数据库schema，暂时放在notes中
          payload.notes = `睡眠时长: ${value}小时`;
          break;
        case 'exercise':
          // 运动数据也暂时放在notes中
          payload.notes = `运动时长: ${value}分钟`;
          break;
      }

      const response = await fetch(`/api/members/${memberId}/health-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data.details || [data.error || '录入失败']);
        return;
      }

      // 成功
      setEntryValues((prev) => ({
        ...prev,
        [itemId]: '',
      }));
      setActiveEntry(null);

      if (onDataAdded) {
        onDataAdded();
      }

      // 显示成功提示
      setTimeout(() => {
        alert('数据录入成功！');
      }, 100);
    } catch (error) {
      console.error('快速录入失败:', error);
      setErrors([error instanceof Error ? error.message : '录入失败']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-white p-6 rounded-lg shadow'>
      <h2 className='text-lg font-semibold text-gray-900 mb-4'>快速录入</h2>

      {errors.length > 0 && (
        <div className='mb-4 bg-red-50 border border-red-200 rounded-md p-3'>
          <div className='text-sm text-red-800'>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        </div>
      )}

      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'>
        {quickEntryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeEntry === item.id;
          const value = entryValues[item.id] || '';

          return (
            <div key={item.id} className='relative'>
              {/* 快速录入按钮 */}
              {!isActive ? (
                <button
                  onClick={() => handleQuickEntry(item.id)}
                  className='w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group'
                >
                  <div className='flex flex-col items-center space-y-2'>
                    <div
                      className={`p-3 rounded-lg ${item.bgColor} group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <span className='text-sm font-medium text-gray-700'>
                      {item.name}
                    </span>
                  </div>
                </button>
              ) : (
                /* 输入框 */
                <div className='w-full p-4 border-2 border-blue-400 bg-blue-50 rounded-lg'>
                  <div className='flex flex-col space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <div className={`p-2 rounded-lg ${item.bgColor}`}>
                          <Icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                        <span className='text-sm font-medium text-gray-700'>
                          {item.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveEntry(null)}
                        className='text-gray-400 hover:text-gray-600'
                      >
                        ×
                      </button>
                    </div>

                    <div className='flex space-x-2'>
                      <input
                        type='number'
                        value={value}
                        onChange={(e) =>
                          handleValueChange(item.id, e.target.value)
                        }
                        placeholder={item.placeholder}
                        min={item.min}
                        max={item.max}
                        step={item.step}
                        className='flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm'
                        autoFocus
                      />
                      <span className='flex items-center text-sm text-gray-500'>
                        {item.unit}
                      </span>
                    </div>

                    <div className='flex space-x-2'>
                      <button
                        onClick={() => handleSubmit(item.id)}
                        disabled={loading || !value}
                        className='flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                      >
                        {loading ? (
                          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                        ) : (
                          <CheckCircle className='h-4 w-4' />
                        )}
                        <span>保存</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className='mt-4 text-sm text-gray-500'>
        点击任意指标进行快速录入，支持体重、血压、心率等常用健康数据
      </div>
    </div>
  );
}
