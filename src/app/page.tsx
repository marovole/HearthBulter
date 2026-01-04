'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Hero from '@/components/landing/Hero';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StatsCounter from '@/components/landing/StatsCounter';
import TestimonialCarousel from '@/components/landing/TestimonialCarousel';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  return (
    <main className='min-h-screen bg-background'>
      <Hero />
      <FeaturesSection />
      <StatsCounter />
      <TestimonialCarousel />

      {/* Final CTA Section */}
      <section className='py-24 md:py-32 bg-gradient-to-br from-primary via-primary-dark to-primary relative overflow-hidden'>
        {/* Decorative elements */}
        <div className='absolute inset-0 overflow-hidden'>
          <div className='absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl' />
          <div className='absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl' />
        </div>

        <div className='relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          {/* Badge */}
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white text-sm font-medium mb-8 backdrop-blur-sm'>
            <Sparkles className='w-4 h-4' />
            永久免费开始
          </div>

          <h2 className='font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6'>
            准备好开始您的健康之旅了吗？
          </h2>
          <p className='text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto'>
            加入超过 10,000 个家庭，让 Health Butler 成为您的专属健康管家。
          </p>

          {/* CTA Buttons */}
          <div className='flex flex-col sm:flex-row gap-4 justify-center mb-12'>
            <Button
              asChild
              size='xl'
              className='bg-white text-primary hover:bg-white/90 shadow-soft-xl group'
            >
              <Link href='/auth/signup'>
                立即开始免费试用
                <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
              </Link>
            </Button>

            <Button
              asChild
              size='xl'
              variant='outline'
              className='border-white/30 text-white hover:bg-white/10 hover:border-white/50'
            >
              <Link href='/auth/signin'>已有账号？登录</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className='flex flex-wrap justify-center gap-8 text-white/70 text-sm'>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 rounded-full bg-white/80' />
              无需信用卡
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 rounded-full bg-white/80' />
              5分钟快速开始
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 rounded-full bg-white/80' />
              数据安全加密
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='py-12 bg-background border-t border-border'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
            <div className='text-sm text-muted-foreground'>
              © 2024 Health Butler. 让健康管理更简单。
            </div>
            <div className='flex gap-6 text-sm text-muted-foreground'>
              <Link
                href='#'
                className='hover:text-foreground transition-colors'
              >
                隐私政策
              </Link>
              <Link
                href='#'
                className='hover:text-foreground transition-colors'
              >
                服务条款
              </Link>
              <Link
                href='#'
                className='hover:text-foreground transition-colors'
              >
                联系我们
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
