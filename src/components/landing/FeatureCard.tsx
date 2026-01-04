'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
      className='group'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card variant='elevated' className='h-full'>
        <CardContent className='p-8'>
          {/* Icon */}
          <motion.div
            className='w-14 h-14 mb-6 bg-primary/10 rounded-xl flex items-center justify-center'
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <Icon className='w-7 h-7 text-primary' />
          </motion.div>

          {/* Title */}
          <h3 className='font-display text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors'>
            {title}
          </h3>

          {/* Description */}
          <p className='text-muted-foreground leading-relaxed'>{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
