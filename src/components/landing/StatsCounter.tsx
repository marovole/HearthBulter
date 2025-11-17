'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState, useRef } from 'react';
import { fadeInUp } from '@/lib/design-tokens';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, BookOpen, Heart } from 'lucide-react';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

interface StatItemProps {
  end: number;
  label: string;
  suffix?: string;
  duration?: number;
  icon?: React.ElementType;
  color?: string;
  targetValue?: number;
  unit?: string;
}

function StatItem({ end, label, suffix = '', duration = 2000, icon: Icon, color = '', targetValue, unit }: StatItemProps) {
  const [count, setCount] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  useEffect(() => {
    if (!inView) return;

    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    // Use requestAnimationFrame for smooth animation
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(easedProgress * end);

      setCount(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startTimeRef.current = null;
    };
  }, [end, duration, inView, prefersReducedMotion]);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('zh-CN');
  };

  const progressPercentage = targetValue ? (end / targetValue) * 100 : 100;

  return (
    <motion.div
      ref={ref}
      variants={fadeInUp}
    >
      <Card className="text-center p-6 bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:shadow-lg transition-all duration-300 group">
        <CardContent className="pt-6">
          {/* Icon */}
          {Icon && (
            <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Icon className={`w-8 h-8 ${color}`} />
            </div>
          )}

          {/* Main number */}
          <div className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green bg-clip-text mb-2">
            {formatNumber(count)}{suffix}
          </div>

          {/* Label */}
          <div className="text-base md:text-lg text-gray-700 font-semibold mb-4">
            {label}
          </div>

          {/* Progress bar */}
          {targetValue && (
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>完成度</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {/* Unit/Target badge */}
          {unit && (
            <Badge variant="outline" className="mb-4 border-gray-300 text-gray-700">
              <TrendingUp className="w-3 h-3 mr-1" />
              {unit}
            </Badge>
          )}

          {/* Additional info */}
          {targetValue && (
            <p className="text-xs text-gray-500">
              目标: {formatNumber(targetValue)}{suffix}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

const stats = [
  { 
    end: 10000, 
    label: '活跃用户', 
    suffix: '+', 
    icon: Users,
    color: 'text-blue-600',
    targetValue: 15000,
    unit: '月增长 20%',
  },
  { 
    end: 100, 
    label: '精选食谱', 
    suffix: '+', 
    icon: BookOpen,
    color: 'text-green-600',
    targetValue: 200,
    unit: '持续增长',
  },
  { 
    end: 95, 
    label: '用户满意度', 
    suffix: '%', 
    icon: Heart,
    color: 'text-orange-600',
    targetValue: 98,
    unit: '目标 98%',
  },
];

export default function StatsCounter() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          {stats.map((stat) => (
            <StatItem
              key={stat.label}
              end={stat.end}
              label={stat.label}
              suffix={stat.suffix}
              icon={stat.icon}
              color={stat.color}
              targetValue={stat.targetValue}
              unit={stat.unit}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
