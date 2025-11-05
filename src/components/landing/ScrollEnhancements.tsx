'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ScrollEnhancements() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <>
      {/* 滚动进度条 */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green z-50 origin-left"
        style={{ scaleX }}
      />

      {/* 返回顶部按钮 */}
      <motion.div
        className="fixed bottom-8 right-8 z-40"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: showScrollTop ? 1 : 0,
          y: showScrollTop ? 0 : 20,
        }}
        transition={{ duration: 0.3 }}
      >
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-brand-blue hover:bg-brand-purple shadow-lg hover:shadow-2xl transition-all duration-300 group"
          onClick={scrollToTop}
          aria-label="返回顶部"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </Button>
      </motion.div>
    </>
  );
}
