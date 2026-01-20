"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect, useState, useRef } from "react";
import { Users, BookOpen, Heart } from "lucide-react";

interface StatItemProps {
  end: number;
  label: string;
  suffix?: string;
  duration?: number;
  icon: React.ElementType;
}

function StatItem({ end, label, suffix = "", duration = 2000, icon: Icon }: StatItemProps) {
  const [count, setCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  useEffect(() => {
    if (!inView) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
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
  }, [end, duration, inView]);

  const formatNumber = (num: number): string => {
    return num.toLocaleString("zh-CN");
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      className="text-center"
    >
      <div className="mb-6 inline-flex rounded-2xl bg-primary/10 p-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <div className="mb-2 font-mono text-5xl font-bold text-foreground sm:text-6xl">
        {formatNumber(count)}
        {suffix}
      </div>
      <div className="font-medium text-muted-foreground">{label}</div>
    </motion.div>
  );
}

const stats = [
  { end: 10000, label: "活跃用户", suffix: "+", icon: Users },
  { end: 100, label: "精选食谱", suffix: "+", icon: BookOpen },
  { end: 95, label: "用户满意度", suffix: "%", icon: Heart },
];

export default function StatsCounter() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8"
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.15 },
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
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
