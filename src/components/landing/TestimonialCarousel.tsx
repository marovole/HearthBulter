'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface Testimonial {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  content: string;
  rating: number;
  achievement?: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: '张女士',
    role: '全职妈妈',
    content: '使用 Health Butler 3 个月，全家的饮食更科学了，孩子也更健康！AI 生成的食谱非常实用，购物清单功能节省了我很多时间。',
    rating: 5,
    achievement: '全家健康改善',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: '2',
    name: '李先生',
    role: '程序员',
    content: '作为加班族，很难保持健康饮食。Health Butler 帮我规划每日营养，血压和体重都有明显改善，强烈推荐！',
    rating: 5,
    achievement: '血压恢复正常',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  },
  {
    id: '3',
    name: '王女士',
    role: '健身教练',
    content: '专业的营养分析和食谱推荐让我的健身效果事半功倍。数据可视化功能特别好用，能清楚看到身体变化趋势。',
    rating: 5,
    achievement: '健身效果提升',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
  },
];

export default function TestimonialCarousel() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [api, setApi] = useState<any>();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!api || isPaused) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api, isPaused]);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    const handleSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on('select', handleSelect);
    return () => api.off('select', handleSelect);
  }, [api]);

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? 'fill-accent text-accent' : 'text-muted'
          }`}
        />
      ))}
    </div>
  );

  return (
    <section id="testimonials" className="py-24 md:py-32 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            用户评价
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            他们的故事
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            看看其他用户如何通过 Health Butler 改善健康生活
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Carousel
            opts={{ align: 'center', loop: true }}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card variant="elevated" className="h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      {/* Quote icon */}
                      <div className="inline-flex self-start p-2.5 rounded-xl bg-primary/10 mb-4">
                        <Quote className="w-5 h-5 text-primary" />
                      </div>

                      <StarRating rating={testimonial.rating} />

                      <p className="text-foreground/80 text-sm leading-relaxed mb-6 flex-grow">
                        &ldquo;{testimonial.content}&rdquo;
                      </p>

                      {testimonial.achievement && (
                        <div className="inline-flex self-start px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium mb-4">
                          {testimonial.achievement}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {testimonial.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground text-sm">
                            {testimonial.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {testimonial.role}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </motion.div>

        {/* Pagination dots */}
        <div className="flex justify-center mt-8 gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              onClick={() => api?.scrollTo(index)}
              aria-label={`跳转到第 ${index + 1} 条评价`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
