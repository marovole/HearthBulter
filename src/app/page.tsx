"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Hero from "@/components/landing/Hero";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StatsCounter from "@/components/landing/StatsCounter";
import TestimonialCarousel from "@/components/landing/TestimonialCarousel";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Home() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <FeaturesSection />
      <StatsCounter />
      <TestimonialCarousel />

      {/* Final CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-primary py-24 md:py-32">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            永久免费开始
          </div>

          <h2 className="mb-6 font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            准备好开始您的健康之旅了吗？
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/80 sm:text-xl">
            加入超过 10,000 个家庭，让 Health Butler 成为您的专属健康管家。
          </p>

          {/* CTA Buttons */}
          <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="xl"
              className="group bg-white text-primary shadow-soft-xl hover:bg-white/90"
            >
              <Link href="/auth/signup">
                立即开始免费试用
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-white/30 text-white hover:border-white/50 hover:bg-white/10"
            >
              <Link href="/auth/signin">已有账号？登录</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-white/80" />
              无需信用卡
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-white/80" />
              5分钟快速开始
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-white/80" />
              数据安全加密
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-sm text-muted-foreground">
              © 2024 Health Butler. 让健康管理更简单。
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="transition-colors hover:text-foreground">
                隐私政策
              </Link>
              <Link href="#" className="transition-colors hover:text-foreground">
                服务条款
              </Link>
              <Link href="#" className="transition-colors hover:text-foreground">
                联系我们
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
