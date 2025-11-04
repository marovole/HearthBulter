'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { fadeInUp } from '@/lib/design-tokens';

interface StatItemProps {
  end: number;
  label: string;
  suffix?: string;
  duration?: number;
}

function StatItem({ end, label, suffix = '', duration = 2000 }: StatItemProps) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  useEffect(() => {
    if (!inView) return;

    const steps = 60;
    const increment = end / steps;
    const stepTime = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [end, duration, inView]);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('zh-CN');
  };

  return (
    <motion.div
      ref={ref}
      className="text-center"
      variants={fadeInUp}
    >
      <div className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green bg-clip-text mb-2">
        {formatNumber(count)}{suffix}
      </div>
      <div className="text-base md:text-lg text-gray-600 font-medium">
        {label}
      </div>
    </motion.div>
  );
}

const stats = [
  { end: 10000, label: '活跃用户', suffix: '+' },
  { end: 100, label: '精选食谱', suffix: '+' },
  { end: 95, label: '用户满意度', suffix: '%' },
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
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
