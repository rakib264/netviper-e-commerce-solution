'use client';

import { motion } from 'framer-motion';

interface CarouselSkeletonProps {
  variant?: 'mobile' | 'desktop';
}

// Simple, elegant shimmer effect
const ShimmerBox = ({ className, delay = 0 }: { 
  className: string; 
  delay?: number; 
}) => (
  <motion.div
    className={`relative overflow-hidden ${className}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.6, ease: "easeOut" }}
  >
    <div className="h-full w-full bg-card/10 rounded" />
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
  </motion.div>
);

export default function CarouselSkeleton({ variant = 'desktop' }: CarouselSkeletonProps) {
  if (variant === 'mobile') {
    return (
      <motion.div 
        className="text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Mobile Subtitle */}
        <div className="flex items-center justify-center space-x-3">
          <div className="h-px w-8 bg-card/30" />
          <ShimmerBox className="h-4 w-24 rounded-full" delay={0.1} />
          <div className="h-px w-8 bg-card/30" />
        </div>
        
        {/* Mobile Title */}
        <div className="space-y-3">
          <ShimmerBox className="h-10 w-64 mx-auto rounded-lg" delay={0.2} />
          <ShimmerBox className="h-10 w-48 mx-auto rounded-lg" delay={0.3} />
        </div>

        {/* Mobile Accent Line */}
        <div className="flex justify-center">
          <div className="h-0.5 w-16 bg-card/40 rounded-full" />
        </div>

        {/* Mobile CTA Button */}
        <div className="pt-4">
          <ShimmerBox className="h-12 w-32 mx-auto rounded-full" delay={0.4} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Desktop Subtitle */}
      <div className="flex items-center space-x-4">
        <div className="w-6 h-6 bg-card/20 rounded-full" />
        <ShimmerBox className="h-5 w-40 rounded-full" delay={0.1} />
      </div>
      
      {/* Desktop Title */}
      <div className="space-y-6">
        <ShimmerBox className="h-16 w-[500px] rounded-xl" delay={0.2} />
        <ShimmerBox className="h-16 w-[420px] rounded-xl" delay={0.3} />
      </div>

      {/* Desktop Description */}
      <div className="space-y-3">
        <ShimmerBox className="h-6 w-[400px] rounded-lg" delay={0.4} />
        <ShimmerBox className="h-6 w-[320px] rounded-lg" delay={0.5} />
      </div>

      {/* Desktop CTAs */}
      <div className="flex items-center space-x-6">
        <ShimmerBox className="h-12 w-36 rounded-full" delay={0.6} />
        <ShimmerBox className="h-8 w-28 rounded-full" delay={0.7} />
      </div>

      {/* Desktop Quality Badge */}
      <div className="flex items-center space-x-4 pt-4">
        <div className="flex items-center space-x-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-4 h-4 bg-card/20 rounded-full" />
          ))}
        </div>
        <ShimmerBox className="h-4 w-48 rounded-full" delay={0.8} />
      </div>
    </motion.div>
  );
}

// Clean, minimal background skeleton
export function CarouselBackgroundSkeleton() {
  return (
    <div className="absolute inset-0">
      {/* Simple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-black" />
      
      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />
    </div>
  );
}
