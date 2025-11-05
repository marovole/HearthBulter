'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';

interface Testimonial {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  content: string;
  rating: number;
  achievement?: string;
  duration?: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: '张女士',
    role: '全职妈妈',
    content: '使用 Health Butler 3 个月，全家的饮食更科学了，孩子也更健康！AI 生成的食谱非常实用，购物清单功能节省了我很多时间。',
    rating: 5,
    achievement: '减重 5kg，家人健康改善',
    duration: '3个月',
    avatar: '/avatars/user1.jpg',
  },
  {
    id: '2',
    name: '李先生',
    role: '程序员',
    content: '作为加班族，很难保持健康饮食。Health Butler 帮我规划每日营养，血压和体重都有明显改善，强烈推荐！',
    rating: 5,
    achievement: '血压正常，精力充沛',
    duration: '2个月',
    avatar: '/avatars/user2.jpg',
  },
  {
    id: '3',
    name: '王女士',
    role: '健身教练',
    content: '专业的营养分析和食谱推荐让我的健身效果事半功倍。数据可视化功能特别好用，能清楚看到身体变化趋势。',
    rating: 5,
    achievement: '健身效果提升 30%',
    duration: '4个月',
    avatar: '/avatars/user3.jpg',
  },
];

export default function TestimonialCarousel() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const [api, setApi] = useState<any>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    // 设置自动轮播
    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000); // 每5秒切换一次

    return () => clearInterval(interval);
  }, [api]);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex justify-center gap-1 mb-4">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < rating 
              ? 'fill-brand-orange text-brand-orange' 
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );

  return (
    <section 
      id="testimonials"
      className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            用户的真实反馈
          </h2>
          <p className="text-lg text-gray-600">
            看看其他用户如何通过 Health Butler 改善健康
          </p>
        </motion.div>

        {/* Testimonial Carousel using shadcn/ui */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <Carousel
            opts={{
              align: "center",
              loop: true,
              skipSnaps: false,
            }}
            setApi={setApi}
            className="w-full max-w-4xl mx-auto"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {testimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6 flex flex-col h-full">
                      {/* Quote icon */}
                      <div className="w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-blue/20 transition-colors">
                        <Quote className="w-5 h-5 text-brand-blue" />
                      </div>

                      {/* Star rating */}
                      <StarRating rating={testimonial.rating} />

                      {/* Content */}
                      <p className="text-gray-700 text-sm leading-relaxed mb-4 flex-grow line-clamp-4">
                        {testimonial.content}
                      </p>

                      {/* Achievement badge */}
                      {testimonial.achievement && (
                        <Badge variant="secondary" className="mb-4 bg-brand-green/10 text-brand-green border-brand-green/20">
                          {testimonial.achievement}
                        </Badge>
                      )}

                      {/* User info */}
                      <div className="flex items-center gap-3 mt-auto">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                          <AvatarFallback className="bg-brand-blue text-white">
                            {testimonial.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">
                            {testimonial.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {testimonial.role}
                          </div>
                        </div>
                        {testimonial.duration && (
                          <Badge variant="outline" className="text-xs border-brand-blue text-brand-blue">
                            {testimonial.duration}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </motion.div>

        {/* Enhanced pagination indicator */}
        <div className="flex justify-center mt-8 gap-2">
          {testimonials.map((_, index) => (
            <motion.button
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current
                  ? 'w-8 bg-brand-blue'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => api?.scrollTo(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`跳转到第 ${index + 1} 条评价`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
