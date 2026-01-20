"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  Activity,
  UtensilsCrossed,
  ShoppingCart,
  Brain,
  Users,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    icon: Activity,
    title: "健康数据追踪",
    description: "全面记录体重、血压、血糖等关键指标，AI 智能分析趋势，提前预警异常。",
    color: "text-primary",
    bgColor: "bg-primary/10",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: UtensilsCrossed,
    title: "智能营养规划",
    description: "根据您的健康目标和身体数据，AI 为您量身定制每日营养方案。",
    color: "text-accent",
    bgColor: "bg-accent/10",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: Brain,
    title: "AI 健康顾问",
    description: "24/7 智能问答，基于您的健康档案提供个性化建议和专业解读。",
    color: "text-info",
    bgColor: "bg-info/10",
    gradient: "from-info/20 to-info/5",
  },
  {
    icon: Users,
    title: "家庭健康档案",
    description: "一站式管理全家人的健康数据，关爱父母、照顾孩子，健康不落下。",
    color: "text-success",
    bgColor: "bg-success/10",
    gradient: "from-success/20 to-success/5",
  },
  {
    icon: ShoppingCart,
    title: "智能购物清单",
    description: "根据食谱自动生成购物清单，对接主流电商，一键下单配送到家。",
    color: "text-warning",
    bgColor: "bg-warning/10",
    gradient: "from-warning/20 to-warning/5",
  },
  {
    icon: Shield,
    title: "数据安全保障",
    description: "银行级加密存储，严格隐私保护，您的健康数据只属于您。",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    gradient: "from-muted to-muted/50",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemEase: [number, number, number, number] = [0.19, 1, 0.22, 1];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: itemEase },
  },
};

function FeatureCard({ feature, index }: { feature: (typeof features)[0]; index: number }) {
  return (
    <motion.div variants={itemVariants}>
      <Card variant="elevated" className="group h-full cursor-pointer overflow-hidden">
        <CardContent className="relative p-6">
          {/* Gradient background on hover */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
          />

          <div className="relative z-10">
            {/* Icon */}
            <div
              className={`inline-flex rounded-xl p-3 ${feature.bgColor} mb-4 transition-transform duration-300 group-hover:scale-110`}
            >
              <feature.icon className={`h-6 w-6 ${feature.color}`} />
            </div>

            {/* Title */}
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
              {feature.title}
            </h3>

            {/* Description */}
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>

            {/* Learn more link */}
            <div className="mt-4 flex translate-y-2 items-center text-sm font-medium text-primary opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              了解更多
              <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function FeaturesSection() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="features" className="relative overflow-hidden bg-muted/30 py-24 md:py-32">
      {/* Background decoration */}
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            核心功能
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            全方位健康管理
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            从数据追踪到智能分析，从营养规划到家庭管理， Health Butler 为您提供一站式健康解决方案。
          </p>
        </motion.div>

        {/* Features grid - Bento style */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <Button asChild size="lg" variant="default">
            <Link href="/auth/signup" className="group">
              立即开始体验
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
