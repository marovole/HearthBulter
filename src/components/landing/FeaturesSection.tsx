'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Activity, UtensilsCrossed, ShoppingCart, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { staggerContainer } from '@/lib/design-tokens';

const features = [
  {
    icon: Activity,
    title: '健康数据管理',
    description: '记录和分析您和家人的健康数据，包括体重、体脂、血压等关键指标，通过科学的数据分析帮助您更好地了解身体状况',
    progress: 95,
    status: 'active',
    details: [
      '体重、体脂、血压全方位监测',
      '数据趋势分析和智能提醒',
      '家庭健康档案统一管理',
      '异常指标预警功能'
    ],
    badge: '核心功能',
  },
  {
    icon: UtensilsCrossed,
    title: '个性化食谱',
    description: '根据健康目标和营养需求，AI 为您生成科学的每日饮食计划，提供专业的营养搭配建议，让健康饮食变得简单',
    progress: 88,
    status: 'active',
    details: [
      'AI 智能营养配餐算法',
      '支持多种饮食偏好限制',
      '营养成分精准计算',
      '季节性食材推荐'
    ],
    badge: 'AI 驱动',
  },
  {
    icon: ShoppingCart,
    title: '智能购物',
    description: '根据食谱自动生成购物清单，智能匹配电商平台库存，一键下单所需食材，省时省力，让健康生活触手可及',
    progress: 72,
    status: 'beta',
    details: [
      '自动生成购物清单',
      '多平台价格对比',
      '库存实时同步',
      '一键下单配送'
    ],
    badge: '新功能',
  },
];

export default function FeaturesSection() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="features" className="py-24 md:py-32 bg-gradient-to-b from-white to-gray-50">
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

        {/* Feature cards using shadcn/ui */}
        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={staggerContainer.children}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group border-gray-200 hover:border-brand-blue/50">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-gradient-to-br from-brand-blue to-brand-purple rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <Badge 
                      variant={feature.status === 'beta' ? 'secondary' : 'default'}
                      className={`${feature.status === 'beta' ? 'bg-orange-100 text-orange-800' : 'bg-brand-blue text-white'}`}
                    >
                      {feature.badge}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold group-hover:text-brand-blue transition-colors">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="mt-2 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Progress indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">完成度</span>
                      <span className="font-semibold text-gray-900">{feature.progress}%</span>
                    </div>
                    <Progress value={feature.progress} className="h-2" />
                  </div>

                  <Separator />

                  {/* Expandable details */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value={`details-${index}`} className="border-0">
                      <AccordionTrigger className="py-2 text-sm font-medium text-brand-blue hover:no-underline">
                        查看功能详情
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <ul className="space-y-2">
                          {feature.details.map((detail, detailIndex) => (
                            <li key={detailIndex} className="flex items-start gap-2 text-sm text-gray-600">
                              <ChevronRight className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* CTA Button */}
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-brand-blue group-hover:text-white transition-colors mt-4"
                    size="sm"
                  >
                    了解更多
                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
