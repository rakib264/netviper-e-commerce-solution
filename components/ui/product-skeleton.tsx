'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

interface ProductSkeletonProps {
  count?: number;
  variant?: 'grid' | 'list';
  className?: string;
}

export default function ProductSkeleton({ 
  count = 8, 
  variant = 'grid',
  className = '' 
}: ProductSkeletonProps) {
  const skeletonItems = Array.from({ length: count }, (_, i) => i);

  if (variant === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {skeletonItems.map((index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="overflow-hidden border-0 shadow-lg bg-card rounded-2xl">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Image Skeleton */}
                  <div className="relative w-full md:w-48 h-48 md:h-32 bg-border animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-border via-border to-border animate-pulse" />
                  </div>
                  
                  {/* Content Skeleton */}
                  <div className="flex-1 p-4 md:p-6">
                    <div className="space-y-3">
                      {/* Title */}
                      <div className="h-4 bg-border rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-border rounded animate-pulse w-1/2" />
                      
                      {/* Rating */}
                      <div className="flex items-center space-x-1">
                        <div className="h-3 w-3 bg-border rounded animate-pulse" />
                        <div className="h-3 w-3 bg-border rounded animate-pulse" />
                        <div className="h-3 w-3 bg-border rounded animate-pulse" />
                        <div className="h-3 w-3 bg-border rounded animate-pulse" />
                        <div className="h-3 w-3 bg-border rounded animate-pulse" />
                        <div className="h-3 w-8 bg-border rounded animate-pulse ml-2" />
                      </div>
                      
                      {/* Price and Button */}
                      <div className="flex items-center justify-between">
                        <div className="h-6 w-20 bg-border rounded animate-pulse" />
                        <div className="h-8 w-20 bg-border rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 ${className}`}>
      {skeletonItems.map((index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg bg-card rounded-2xl">
            <CardContent className="p-0">
              {/* Image Skeleton */}
              <div className="relative h-40 md:h-64 bg-border animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-border via-border to-border animate-pulse" />
              </div>
              
              {/* Content Skeleton */}
              <div className="p-3 space-y-3">
                {/* Rating */}
                <div className="flex items-center space-x-1">
                  <div className="h-3 w-3 bg-border rounded animate-pulse" />
                  <div className="h-3 w-3 bg-border rounded animate-pulse" />
                  <div className="h-3 w-3 bg-border rounded animate-pulse" />
                  <div className="h-3 w-3 bg-border rounded animate-pulse" />
                  <div className="h-3 w-3 bg-border rounded animate-pulse" />
                  <div className="h-3 w-8 bg-border rounded animate-pulse ml-1" />
                </div>
                
                {/* Title */}
                <div className="space-y-2">
                  <div className="h-4 bg-border rounded animate-pulse w-full" />
                  <div className="h-4 bg-border rounded animate-pulse w-3/4" />
                </div>
                
                {/* Price and Button */}
                <div className="flex items-center justify-between pt-1.5">
                  <div className="h-5 w-16 bg-border rounded animate-pulse" />
                  <div className="h-7 w-16 bg-border rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
