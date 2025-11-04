'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Activity, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import FeatureCard from './FeatureCard';
import { staggerContainer } from '@/lib/design-tokens';

const features = [
  {
    icon: Activity,
    title: '健康数据管理',
    description: '记录和分析您和家人的健康数据，包括体重、体脂、血压等关键指标，通过科学的数据分析帮助您更好地了解身体状况',
  },
  {
    icon: UtensilsCrossed,
    title: '个性化食谱',
    description: '根据健康目标和营养需求，AI 为您生成科学的每日饮食计划，提供专业的营养搭配建议，让健康饮食变得简单',
  },
  {
    icon: ShoppingCart,
    title: '智能购物',
    description: '根据食谱自动生成购物清单，智能匹配电商平台库存，一键下单所需食材，省时省力，让健康生活触手可及',
  },
];

export default function FeaturesSection() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            为什么选择 <span className="text-brand-blue">Health Butler</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            全方位的健康管理解决方案，让科学健康触手可及
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
