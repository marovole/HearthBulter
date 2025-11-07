'use client';

import { useState } from 'react';
import { PlusCircle, Target, Activity, TrendingUp } from 'lucide-react';

interface EmptyStateGuideProps {
  memberId: string;
  onInitialize?: () => void;
  type: 'overview' | 'weight' | 'nutrition' | 'health-score';
}

export function EmptyStateGuide({ memberId, onInitialize, type }: EmptyStateGuideProps) {
  const [isInitializing, setIsInitializing] = useState(false);

  const handleAutoInitialize = async () => {
    setIsInitializing(true);
    try {
      const response = await fetch(`/api/members/${memberId}/initialize`, {
        method: 'POST',
      });

      if (response.ok) {
        // 初始化成功，刷新页面或通知父组件
        if (onInitialize) {
          onInitialize();
        } else {
          window.location.reload();
        }
      } else {
        alert('自动初始化失败，请手动添加数据');
      }
    } catch (error) {
      console.error('初始化失败:', error);
      alert('初始化失败，请稍后重试');
    } finally {
      setIsInitializing(false);
    }
  };

  const configs = {
    overview: {
      icon: TrendingUp,
      title: '开始您的健康之旅',
      description: '让我们为您创建基础的健康档案，记录您的第一条健康数据',
      actions: [
        {
          label: '自动初始化',
          primary: true,
          action: handleAutoInitialize,
        },
        {
          label: '手动添加数据',
          primary: false,
          href: '/health-data/add',
        },
      ],
    },
    weight: {
      icon: Activity,
      title: '暂无体重数据',
      description: '开始记录您的体重变化，追踪健康目标的进度',
      actions: [
        {
          label: '添加体重记录',
          primary: true,
          href: '/health-data/add',
        },
      ],
    },
    nutrition: {
      icon: Target,
      title: '暂无营养数据',
      description: '设置您的营养目标，让我们帮您规划健康饮食',
      actions: [
        {
          label: '设置营养目标',
          primary: true,
          action: handleAutoInitialize,
        },
      ],
    },
    'health-score': {
      icon: PlusCircle,
      title: '健康评分计算中',
      description: '添加更多健康数据以获得准确的健康评分',
      actions: [
        {
          label: '添加健康数据',
          primary: true,
          href: '/health-data/add',
        },
      ],
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-blue-50 rounded-full p-6 mb-6">
        <Icon className="h-12 w-12 text-blue-600" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {config.title}
      </h3>
      
      <p className="text-gray-600 mb-8 text-center max-w-md">
        {config.description}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {config.actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            disabled={isInitializing}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${action.primary
            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }
              ${isInitializing ? 'cursor-not-allowed opacity-50' : ''}
            `}
          >
            {isInitializing && action.action ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                初始化中...
              </span>
            ) : (
              action.label
            )}
          </button>
        ))}
      </div>

      {type === 'overview' && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            💡 提示：自动初始化将为您创建默认的健康目标和营养计划
          </p>
        </div>
      )}
    </div>
  );
}
