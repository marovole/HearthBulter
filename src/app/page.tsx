'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Hero from '@/components/landing/Hero';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StatsCounter from '@/components/landing/StatsCounter';
import TestimonialCarousel from '@/components/landing/TestimonialCarousel';
import ScrollEnhancements from '@/components/landing/ScrollEnhancements';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * Landing Page Component
 *
 * Displays marketing content for unauthenticated users.
 * Automatically redirects authenticated users to the dashboard.
 *
 * IMPORTANT: This is a client component to support useSession hook
 * for Cloudflare Pages static export compatibility.
 */
export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  return (
    <main className="min-h-screen">
      {/* 全局滚动增强 */}
      <ScrollEnhancements />

      {/* Hero Section with animated headline and CTA */}
      <Hero />

      {/* Features Section with glassmorphism cards */}
      <FeaturesSection />

      {/* Stats Counter with scroll animation */}
      <StatsCounter />

      {/* Testimonials Carousel */}
      <TestimonialCarousel />

      {/* Final CTA Section with shadcn/ui */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-brand-blue via-brand-purple to-brand-green">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <Badge className="mb-6 bg-white/20 text-white border-white/30 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            免费开始
          </Badge>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            准备好开始您的健康之旅了吗？
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            加入 10,000+ 用户，让 Health Butler 成为您的专属健康管家
          </p>

          {/* CTA Buttons using shadcn/ui */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold bg-white text-brand-blue hover:bg-gray-100 shadow-lg hover:shadow-2xl group"
              asChild
            >
              <a href="/auth/signup" className="inline-flex items-center gap-2">
                立即开始免费试用
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>

            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-4 text-lg font-semibold bg-transparent text-white border-white hover:bg-white hover:text-brand-blue transition-all duration-300 group"
              asChild
            >
              <a href="/auth/signin" className="inline-flex items-center gap-2">
                已有账号？登录
              </a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>无需信用卡</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>5分钟快速开始</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>24/7 客服支持</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
