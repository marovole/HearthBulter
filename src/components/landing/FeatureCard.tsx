'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { fadeInUp } from '@/lib/design-tokens';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export default function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  index, 
}: FeatureCardProps) {
  return (
    <motion.div
      className="group relative"
      variants={fadeInUp}
      transition={{ delay: index * 0.1 }}
    >
      {/* Glassmorphism card */}
      <div className="relative h-full p-8 rounded-2xl bg-white/80 backdrop-blur-lg border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
        {/* Icon container */}
        <motion.div
          className="w-16 h-16 mb-6 bg-gradient-to-br from-brand-blue to-brand-purple rounded-2xl flex items-center justify-center text-white shadow-lg"
          whileHover={{ 
            rotate: [0, -5, 5, -5, 0],
            scale: 1.1,
          }}
          transition={{ duration: 0.5 }}
        >
          <Icon className="w-8 h-8" />
        </motion.div>

        {/* Content */}
        <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-brand-blue transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {description}
        </p>

        {/* Hover glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-blue/0 via-brand-purple/0 to-brand-green/0 group-hover:from-brand-blue/5 group-hover:via-brand-purple/5 group-hover:to-brand-green/5 transition-all duration-300 pointer-events-none" />
      </div>

      {/* Gradient border effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
    </motion.div>
  );
}
