'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Testimonial {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: '张女士',
    role: '全职妈妈',
    content: '使用 Health Butler 3 个月，全家的饮食更科学了，孩子也更健康！AI 生成的食谱非常实用，购物清单功能节省了我很多时间。',
    rating: 5,
  },
  {
    id: '2',
    name: '李先生',
    role: '程序员',
    content: '作为加班族，很难保持健康饮食。Health Butler 帮我规划每日营养，血压和体重都有明显改善，强烈推荐！',
    rating: 5,
  },
  {
    id: '3',
    name: '王女士',
    role: '健身教练',
    content: '专业的营养分析和食谱推荐让我的健身效果事半功倍。数据可视化功能特别好用，能清楚看到身体变化趋势。',
    rating: 5,
  },
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (!isAutoPlaying || !inView) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, inView]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? testimonials.length - 1 : prev - 1
    );
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  return (
    <section 
      className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            用户的真实反馈
          </h2>
          <p className="text-lg text-gray-600">
            看看其他用户如何通过 Health Butler 改善健康
          </p>
        </motion.div>

        <div className="relative">
          {/* Testimonial card */}
          <div className="relative min-h-[300px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl p-8 md:p-12 shadow-xl">
                  {/* Rating stars */}
                  <div className="flex justify-center gap-1 mb-6">
                    {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-brand-orange text-brand-orange"
                      />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-lg md:text-xl text-gray-700 text-center mb-8 leading-relaxed">
                    &ldquo;{testimonials[currentIndex].content}&rdquo;
                  </p>

                  {/* User info */}
                  <div className="flex items-center justify-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={testimonials[currentIndex].avatar} />
                      <AvatarFallback className="bg-brand-blue text-white">
                        {testimonials[currentIndex].name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">
                        {testimonials[currentIndex].name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {testimonials[currentIndex].role}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 hover:scale-110 transition-all duration-300"
            aria-label="上一条评价"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 hover:scale-110 transition-all duration-300"
            aria-label="下一条评价"
          >
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-brand-blue'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`跳转到第 ${index + 1} 条评价`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
