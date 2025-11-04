import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Hero from '@/components/landing/Hero';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StatsCounter from '@/components/landing/StatsCounter';
import TestimonialCarousel from '@/components/landing/TestimonialCarousel';

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section with animated headline and CTA */}
      <Hero />

      {/* Features Section with glassmorphism cards */}
      <FeaturesSection />

      {/* Stats Counter with scroll animation */}
      <StatsCounter />

      {/* Testimonials Carousel */}
      <TestimonialCarousel />

      {/* Final CTA Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-brand-blue via-brand-purple to-brand-green">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            准备好开始您的健康之旅了吗？
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            加入 10,000+ 用户，让 Health Butler 成为您的专属健康管家
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-brand-blue font-semibold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              立即开始免费试用
            </a>
            <a
              href="/auth/signin"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-white hover:bg-white/10 hover:scale-105 transition-all duration-300"
            >
              已有账号？登录
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
