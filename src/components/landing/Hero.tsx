'use client';

import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, Menu, Heart, Zap, Shield, TrendingUp } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

interface HeroProps {
  onCTAClick?: () => void;
}

export default function Hero({ onCTAClick }: HeroProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Mouse parallax motion values
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, {
    stiffness: 110,
    damping: 24,
    mass: 0.9,
  });
  const smoothPointerY = useSpring(pointerY, {
    stiffness: 110,
    damping: 24,
    mass: 0.9,
  });

  // Scroll parallax
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -50]);

  // Transform pointer motion to pixel movement (different coefficients for depth)
  const primaryPointerX = useTransform(smoothPointerX, (value) => value * 12);
  const primaryPointerY = useTransform(smoothPointerY, (value) => value * 8);
  const secondaryPointerX = useTransform(smoothPointerX, (value) => value * 9);
  const secondaryPointerY = useTransform(smoothPointerY, (value) => value * 6);
  const tertiaryPointerX = useTransform(smoothPointerX, (value) => value * 7);
  const tertiaryPointerY = useTransform(smoothPointerY, (value) => value * 5);

  // Combine scroll and pointer y transforms
  const combinedY1 = useTransform(
    [y1, primaryPointerY],
    ([scrollVal, pointerVal]: [number, number]) => scrollVal + pointerVal
  );
  const combinedY2 = useTransform(
    [y2, secondaryPointerY],
    ([scrollVal, pointerVal]: [number, number]) => scrollVal + pointerVal
  );
  const combinedY3 = useTransform(
    [y1, tertiaryPointerY],
    ([scrollVal, pointerVal]: [number, number]) => scrollVal + pointerVal
  );

  const navigationItems = [
    { label: '功能介绍', href: '#features' },
    { label: '用户评价', href: '#testimonials' },
    { label: '价格方案', href: '#pricing' },
    { label: '联系我们', href: '#contact' },
  ];

  // 浮动图标
  const floatingIcons = [
    { Icon: Heart, color: 'text-pink-500', delay: 0, x: '10%', y: '20%' },
    { Icon: Zap, color: 'text-yellow-500', delay: 1, x: '85%', y: '30%' },
    { Icon: Shield, color: 'text-green-500', delay: 2, x: '15%', y: '70%' },
    { Icon: TrendingUp, color: 'text-blue-500', delay: 1.5, x: '80%', y: '75%' },
  ];

  // Mouse parallax effect (desktop only, respects reduced motion)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize to center
    pointerX.set(0);
    pointerY.set(0);

    // Skip if user prefers reduced motion
    if (prefersReducedMotion) {
      return;
    }

    // Only enable on devices with fine pointer (mouse/trackpad, not touch)
    const mediaQuery = window.matchMedia('(pointer: fine)');
    let frame: number | null = null;

    // Normalize mouse position to [-1, 1] range
    const normalize = (clientValue: number, max: number) => {
      if (max === 0) return 0;
      return ((clientValue / max) - 0.5) * 2;
    };

    const updatePointer = (event: MouseEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      pointerX.set(normalize(event.clientX, width));
      pointerY.set(normalize(event.clientY, height));
    };

    // Throttle with requestAnimationFrame
    const handleMouseMove = (event: MouseEvent) => {
      if (frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        updatePointer(event);
        frame = null;
      });
    };

    const addMouseListener = () => {
      window.addEventListener('mousemove', handleMouseMove);
    };

    const removeMouseListener = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    };

    // Add listener if fine pointer is available
    if (mediaQuery.matches) {
      addMouseListener();
    }

    // Listen for pointer type changes (e.g., docking/undocking laptop)
    const handlePointerChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        addMouseListener();
      } else {
        removeMouseListener();
        pointerX.set(0);
        pointerY.set(0);
      }
    };

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', handlePointerChange);
    } else {
      // @ts-expect-error - addListener is deprecated but needed for Safari < 14
      mediaQuery.addListener(handlePointerChange);
    }

    return () => {
      removeMouseListener();

      if ('removeEventListener' in mediaQuery) {
        mediaQuery.removeEventListener('change', handlePointerChange);
      } else {
        // @ts-expect-error - removeListener is deprecated but needed for Safari < 14
        mediaQuery.removeListener(handlePointerChange);
      }
    };
  }, [pointerX, pointerY, prefersReducedMotion]);

  return (
    <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* 增强的背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 主要渐变球 - 带鼠标视差效果 */}
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"
          style={{
            x: primaryPointerX,
            y: combinedY1,
          }}
        />
        <motion.div
          className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"
          style={{
            animationDelay: '1s',
            x: secondaryPointerX,
            y: combinedY2,
          }}
        />
        <motion.div
          className="absolute -bottom-8 left-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"
          style={{
            animationDelay: '2s',
            x: tertiaryPointerX,
            y: combinedY3,
          }}
        />

        {/* 网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        {/* 浮动图标 */}
        {floatingIcons.map((item, index) => (
          <motion.div
            key={index}
            className="absolute"
            style={{
              left: item.x,
              top: item.y,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 4,
              delay: item.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className={`w-12 h-12 ${item.color} opacity-30`}>
              <item.Icon className="w-full h-full" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile Navigation */}
      <div className="fixed top-4 right-4 z-50 lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle>导航菜单</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 mt-6">
              {navigationItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    const element = document.querySelector(item.href);
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <div className="pt-4 border-t">
                <Button className="w-full mb-2" asChild>
                  <a href="/auth/signup">免费试用</a>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/auth/signin">登录</a>
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <motion.div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Badge using shadcn/ui */}
        <motion.div 
          variants={staggerItem}
        >
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-white/80 backdrop-blur-sm border border-brand-blue/20">
            <Sparkles className="w-4 h-4 mr-2 text-brand-orange" />
            已有 1000+ 家庭使用
          </Badge>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6"
          variants={staggerItem}
        >
          <span className="block">让健康管理</span>
          <span className="block bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green bg-clip-text text-transparent">
            变得简单而科学
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
          variants={staggerItem}
        >
          通过 AI 驱动的营养规划、智能健康监测和个性化食谱推荐，
          让您和家人享受科学的健康生活方式
        </motion.p>

        {/* CTA Buttons using shadcn/ui - 增强版 */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          variants={staggerItem}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              className="relative px-10 py-7 text-lg font-bold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-blue bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-2xl hover:shadow-brand-blue/50 group overflow-hidden transition-all duration-500"
              onClick={onCTAClick}
              asChild
            >
              <a href="/auth/signup" className="inline-flex items-center gap-2 relative z-10">
                {/* 闪光效果 */}
                <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                开始免费试用
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </a>
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              size="lg"
              className="px-10 py-7 text-lg font-bold border-2 border-gray-900 bg-white/50 backdrop-blur-sm hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all duration-300 shadow-lg group"
              asChild
            >
              <a href="/auth/signin" className="inline-flex items-center gap-2">
                已有账号？登录
              </a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Social proof stats - preview with shadcn/ui */}
        <motion.div
          className="mt-16 flex flex-wrap justify-center gap-8 md:gap-12"
          variants={staggerItem}
        >
          <div className="text-center">
            <Badge variant="default" className="mb-2 px-3 py-1 text-sm bg-brand-blue">
              用户数
            </Badge>
            <div className="text-3xl md:text-4xl font-bold text-gray-900">10,000+</div>
            <div className="text-sm text-gray-600 mt-1">活跃用户</div>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="mb-2 px-3 py-1 text-sm bg-brand-green text-white">
              食谱库
            </Badge>
            <div className="text-3xl md:text-4xl font-bold text-gray-900">100+</div>
            <div className="text-sm text-gray-600 mt-1">精选食谱</div>
          </div>
          <div className="text-center">
            <Badge variant="outline" className="mb-2 px-3 py-1 text-sm border-brand-orange text-brand-orange">
              满意度
            </Badge>
            <div className="text-3xl md:text-4xl font-bold text-gray-900">95%</div>
            <div className="text-sm text-gray-600 mt-1">用户满意度</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
