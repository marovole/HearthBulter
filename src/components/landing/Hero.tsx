'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Heart,
  Activity,
  Utensils,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const floatingElements = [
  {
    icon: Heart,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    x: '8%',
    y: '20%',
    delay: 0,
  },
  {
    icon: Activity,
    color: 'text-primary',
    bg: 'bg-primary/10',
    x: '85%',
    y: '15%',
    delay: 0.5,
  },
  {
    icon: Utensils,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    x: '12%',
    y: '65%',
    delay: 1,
  },
  {
    icon: TrendingUp,
    color: 'text-info',
    bg: 'bg-blue-50',
    x: '88%',
    y: '70%',
    delay: 1.5,
  },
];

export default function Hero() {
  return (
    <section className='relative min-h-[92vh] flex items-center overflow-hidden bg-background'>
      {/* Subtle background pattern */}
      <div className='absolute inset-0 bg-mesh-pattern opacity-60' />

      {/* Organic gradient blobs */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <motion.div
          className='absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl'
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className='absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-accent/8 blur-3xl'
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
        <motion.div
          className='absolute -bottom-32 left-1/3 w-[350px] h-[350px] rounded-full bg-success/8 blur-3xl'
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
      </div>

      {/* Floating icons */}
      {floatingElements.map((item, index) => (
        <motion.div
          key={index}
          className='absolute hidden md:block'
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: item.delay + 0.5,
            duration: 0.5,
            type: 'spring',
          }}
        >
          <motion.div
            className={`${item.bg} p-4 rounded-2xl shadow-soft`}
            animate={{
              y: [0, -12, 0],
              rotate: [0, 5, 0, -5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: item.delay,
            }}
          >
            <item.icon className={`w-7 h-7 ${item.color}`} />
          </motion.div>
        </motion.div>
      ))}

      {/* Main content */}
      <div className='relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
        <motion.div
          variants={staggerContainer}
          initial='hidden'
          animate='visible'
          className='max-w-3xl'
        >
          {/* Eyebrow */}
          <motion.div variants={fadeUp} className='mb-6'>
            <span className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium'>
              <span className='w-2 h-2 rounded-full bg-primary animate-pulse-soft' />
              已服务 10,000+ 健康家庭
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className='font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight mb-6'
          >
            让健康管理
            <br />
            <span className='text-gradient-primary'>简单而科学</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className='text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl'
          >
            通过 AI 驱动的营养规划、智能健康监测和个性化食谱推荐，
            让您和家人轻松享受科学的健康生活。
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            className='flex flex-col sm:flex-row gap-4'
          >
            <Button asChild size='xl' variant='glow' className='group'>
              <Link href='/auth/signup'>
                免费开始使用
                <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
              </Link>
            </Button>
            <Button asChild size='xl' variant='outline'>
              <Link href='/auth/signin'>已有账号？登录</Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            className='mt-16 pt-10 border-t border-border/50'
          >
            <div className='grid grid-cols-3 gap-8'>
              <div>
                <div className='font-mono text-3xl sm:text-4xl font-bold text-foreground'>
                  10K+
                </div>
                <div className='text-sm text-muted-foreground mt-1'>
                  活跃用户
                </div>
              </div>
              <div>
                <div className='font-mono text-3xl sm:text-4xl font-bold text-foreground'>
                  100+
                </div>
                <div className='text-sm text-muted-foreground mt-1'>
                  精选食谱
                </div>
              </div>
              <div>
                <div className='font-mono text-3xl sm:text-4xl font-bold text-foreground'>
                  95%
                </div>
                <div className='text-sm text-muted-foreground mt-1'>
                  用户满意度
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative right visual */}
      <div className='hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[45%] h-[80%] pointer-events-none'>
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className='relative w-full h-full'
        >
          {/* Abstract health visualization */}
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='relative'>
              {/* Central circle */}
              <motion.div
                className='w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center'
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              >
                <div className='w-48 h-48 rounded-full bg-gradient-to-br from-primary/30 to-transparent flex items-center justify-center'>
                  <div className='w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center'>
                    <Heart className='w-12 h-12 text-primary' />
                  </div>
                </div>
              </motion.div>

              {/* Orbiting elements */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className='absolute top-1/2 left-1/2 w-4 h-4'
                  style={{
                    marginTop: -8,
                    marginLeft: -8,
                  }}
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 8 + i * 4,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <motion.div
                    className={`w-4 h-4 rounded-full ${
                      i === 0
                        ? 'bg-primary'
                        : i === 1
                          ? 'bg-accent'
                          : 'bg-success'
                    }`}
                    style={{
                      transform: `translateX(${100 + i * 40}px)`,
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
