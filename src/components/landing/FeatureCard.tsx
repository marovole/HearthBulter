"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export default function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card variant="elevated" className="h-full">
        <CardContent className="p-8">
          {/* Icon */}
          <motion.div
            className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <Icon className="h-7 w-7 text-primary" />
          </motion.div>

          {/* Title */}
          <h3 className="mb-3 font-display text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>

          {/* Description */}
          <p className="leading-relaxed text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
