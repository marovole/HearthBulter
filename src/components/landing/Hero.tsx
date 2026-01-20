"use client";

import { motion } from "framer-motion";
import { ArrowRight, Heart, Activity, Utensils, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    color: "text-rose-500",
    bg: "bg-rose-50",
    x: "8%",
    y: "20%",
    delay: 0,
  },
  {
    icon: Activity,
    color: "text-primary",
    bg: "bg-primary/10",
    x: "85%",
    y: "15%",
    delay: 0.5,
  },
  {
    icon: Utensils,
    color: "text-amber-500",
    bg: "bg-amber-50",
    x: "12%",
    y: "65%",
    delay: 1,
  },
  {
    icon: TrendingUp,
    color: "text-info",
    bg: "bg-blue-50",
    x: "88%",
    y: "70%",
    delay: 1.5,
  },
];

export default function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-background">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-mesh-pattern opacity-60" />

      {/* Organic gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="bg-primary/8 absolute -right-24 -top-24 h-[500px] w-[500px] rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="bg-accent/8 absolute -left-32 top-1/2 h-[400px] w-[400px] rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="bg-success/8 absolute -bottom-32 left-1/3 h-[350px] w-[350px] rounded-full blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Floating icons */}
      {floatingElements.map((item, index) => (
        <motion.div
          key={index}
          className="absolute hidden md:block"
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: item.delay + 0.5,
            duration: 0.5,
            type: "spring",
          }}
        >
          <motion.div
            className={`${item.bg} rounded-2xl p-4 shadow-soft`}
            animate={{
              y: [0, -12, 0],
              rotate: [0, 5, 0, -5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay,
            }}
          >
            <item.icon className={`h-7 w-7 ${item.color}`} />
          </motion.div>
        </motion.div>
      ))}

      {/* Main content */}
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          {/* Eyebrow */}
          <motion.div variants={fadeUp} className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-primary" />
              已服务 10,000+ 健康家庭
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="mb-6 font-display text-5xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            让健康管理
            <br />
            <span className="text-gradient-primary">简单而科学</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className="mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            通过 AI 驱动的营养规划、智能健康监测和个性化食谱推荐，
            让您和家人轻松享受科学的健康生活。
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row">
            <Button asChild size="xl" variant="glow" className="group">
              <Link href="/auth/signup">
                免费开始使用
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/auth/signin">已有账号？登录</Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="mt-16 border-t border-border/50 pt-10">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="font-mono text-3xl font-bold text-foreground sm:text-4xl">10K+</div>
                <div className="mt-1 text-sm text-muted-foreground">活跃用户</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold text-foreground sm:text-4xl">100+</div>
                <div className="mt-1 text-sm text-muted-foreground">精选食谱</div>
              </div>
              <div>
                <div className="font-mono text-3xl font-bold text-foreground sm:text-4xl">95%</div>
                <div className="mt-1 text-sm text-muted-foreground">用户满意度</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative right visual */}
      <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[80%] w-[45%] -translate-y-1/2 lg:block">
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative h-full w-full"
        >
          {/* Abstract health visualization */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Central circle */}
              <motion.div
                className="flex h-64 w-64 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5"
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-transparent">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
                    <Heart className="h-12 w-12 text-primary" />
                  </div>
                </div>
              </motion.div>

              {/* Orbiting elements */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-4 w-4"
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
                    ease: "linear",
                  }}
                >
                  <motion.div
                    className={`h-4 w-4 rounded-full ${
                      i === 0 ? "bg-primary" : i === 1 ? "bg-accent" : "bg-success"
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
