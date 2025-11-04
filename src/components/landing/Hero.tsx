'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/design-tokens';

interface HeroProps {
  onCTAClick?: () => void;
}

export default function Hero({ onCTAClick }: HeroProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-brand-blue/20 rounded-full mb-8"
          variants={staggerItem}
        >
          <Sparkles className="w-4 h-4 text-brand-orange" />
          <span className="text-sm font-medium text-gray-700">
            已有 1000+ 家庭使用
          </span>
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

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          variants={staggerItem}
        >
          <a
            href="/auth/signup"
            className="group relative inline-flex items-center gap-2 px-8 py-4 bg-brand-blue text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            onClick={onCTAClick}
          >
            <span>开始免费试用</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-purple opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300 -z-10" />
          </a>

          <a
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-blue font-semibold rounded-xl border-2 border-brand-blue/20 hover:border-brand-blue hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            <span>已有账号？登录</span>
          </a>
        </motion.div>

        {/* Social proof stats - preview */}
        <motion.div
          className="mt-16 flex flex-wrap justify-center gap-8 md:gap-12"
          variants={staggerItem}
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-gray-900">10,000+</div>
            <div className="text-sm text-gray-600 mt-1">活跃用户</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-gray-900">100+</div>
            <div className="text-sm text-gray-600 mt-1">精选食谱</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-gray-900">95%</div>
            <div className="text-sm text-gray-600 mt-1">用户满意度</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
