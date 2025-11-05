'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Menu, X } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

interface HeroProps {
  onCTAClick?: () => void;
}

export default function Hero({ onCTAClick }: HeroProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { label: '功能介绍', href: '#features' },
    { label: '用户评价', href: '#testimonials' },
    { label: '价格方案', href: '#pricing' },
    { label: '联系我们', href: '#contact' },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }} />
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

        {/* CTA Buttons using shadcn/ui */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          variants={staggerItem}
        >
          <Button 
            size="lg" 
            className="px-8 py-6 text-base font-semibold bg-gradient-to-r from-brand-blue to-brand-purple hover:from-brand-blue/90 hover:to-brand-purple/90 shadow-lg hover:shadow-xl group"
            onClick={onCTAClick}
            asChild
          >
            <a href="/auth/signup" className="inline-flex items-center gap-2">
              开始免费试用
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>

          <Button 
            variant="outline" 
            size="lg"
            className="px-8 py-6 text-base font-semibold border-2 hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-all duration-300 group"
            asChild
          >
            <a href="/auth/signin" className="inline-flex items-center gap-2">
              已有账号？登录
            </a>
          </Button>
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
