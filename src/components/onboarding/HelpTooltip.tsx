'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, X, ExternalLink, BookOpen } from 'lucide-react';

interface HelpTooltipProps {
  content: string
  title?: string
  type?: 'tip' | 'info' | 'warning' | 'tutorial'
  action?: {
    label: string
    onClick: () => void
  }
  link?: {
    label: string
    url: string
  }
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
}

export function HelpTooltip({
  content,
  title,
  type = 'info',
  action,
  link,
  position = 'top',
  size = 'md',
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current && tooltipRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = buttonRect.top;
      let left = buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2;
      
      switch (position) {
      case 'top':
        top = buttonRect.top - tooltipRect.height - 10;
        break;
      case 'bottom':
        top = buttonRect.bottom + 10;
        break;
      case 'left':
        top = buttonRect.top + buttonRect.height / 2 - tooltipRect.height / 2;
        left = buttonRect.left - tooltipRect.width - 10;
        break;
      case 'right':
        top = buttonRect.top + buttonRect.height / 2 - tooltipRect.height / 2;
        left = buttonRect.right + 10;
        break;
      }
      
      // Adjust if tooltip goes off screen
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top < 10) top = 10;
      if (top + tooltipRect.height > window.innerHeight - 10) {
        top = window.innerHeight - tooltipRect.height - 10;
      }
      
      setTooltipPosition({ top, left });
    }
  }, [isOpen, position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const getTypeStyles = () => {
    switch (type) {
    case 'tip':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'tutorial':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
    case 'tip':
      return <BookOpen className="h-4 w-4 text-green-600" />;
    case 'warning':
      return <HelpCircle className="h-4 w-4 text-yellow-600" />;
    case 'tutorial':
      return <BookOpen className="h-4 w-4 text-blue-600" />;
    default:
      return <HelpCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
    case 'sm':
      return 'w-64 max-w-xs';
    case 'lg':
      return 'w-96 max-w-md';
    default:
      return 'w-80 max-w-sm';
    }
  };

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-6 w-6 p-0 hover:bg-gray-100"
      >
        <HelpCircle className="h-4 w-4 text-gray-500" />
      </Button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 ${getSizeClasses()}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <Card className={`border-2 ${getTypeStyles()}`}>
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getIcon()}
                  {title && (
                    <h4 className="font-semibold text-sm">{title}</h4>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Content */}
              <p className="text-sm leading-relaxed mb-3">
                {content}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between">
                {action && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={action.onClick}
                    className="text-xs"
                  >
                    {action.label}
                  </Button>
                )}

                {link && (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// Context-sensitive help provider
interface HelpContext {
  page: string
  section?: string
  feature?: string
}

export function useContextualHelp(context: HelpContext) {
  const helpContent: Record<string, any> = {
    'health-data': {
      'add-data': {
        title: '添加健康数据',
        content: '在这里您可以记录体重、血压、血糖等健康指标。系统会自动验证数据合理性并保存历史记录。',
        type: 'tutorial' as const,
        action: {
          label: '查看教程',
          onClick: () => {
            // Navigate to tutorial
            window.location.href = '/onboarding/tutorial#health-data';
          },
        },
      },
      'view-history': {
        title: '查看历史数据',
        content: '您可以查看历史健康数据，包括趋势图表和统计分析。支持按时间范围和指标类型筛选。',
        type: 'info' as const,
      },
    },
    'meal-planning': {
      'recommendations': {
        title: 'AI食谱推荐',
        content: '基于您的健康目标和饮食偏好，AI会为您推荐个性化的食谱方案。',
        type: 'info' as const,
      },
      'customize': {
        title: '自定义食谱',
        content: '您可以修改推荐食谱或创建自己的食谱，系统会自动计算营养成分。',
        type: 'tip' as const,
      },
    },
    'shopping-list': {
      'generate': {
        title: '生成购物清单',
        content: '根据确认的食谱自动生成购物清单，包含所需食材和数量。',
        type: 'info' as const,
      },
    },
  };

  return helpContent[context.page]?.[context.section || ''] || {
    title: '帮助',
    content: '如需帮助，请查看帮助中心或联系客服。',
    type: 'info' as const,
    link: {
      label: '查看帮助中心',
      url: '/help',
    },
  };
}
