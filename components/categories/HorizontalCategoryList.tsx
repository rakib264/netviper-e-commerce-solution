'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/hooks/use-settings';
import { sortCategories } from '@/lib/categories/sort';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  productCount?: number;
  parent?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
}

interface HorizontalCategoryListProps {
  onCategorySelect: (category: Category) => void;
  selectedCategory?: Category | null;
  className?: string;
}

export default function HorizontalCategoryList({ 
  onCategorySelect, 
  selectedCategory,
  className = "" 
}: HorizontalCategoryListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const allCategories: Category[] = data.categories || [];
      const rootCategories = sortCategories<Category>(
        allCategories.filter((cat) => !cat.parent)
      );
      
      setCategories(rootCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryDisplay = (category: Category) => {
    // If category has image, show it
    if (category.image) {
      return (
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover"
        />
      );
    }

    // Fallback: brand surface + first character
    const firstChar = category.name.charAt(0).toUpperCase();

    return (
      <div
        className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-2xl"
      >
        {firstChar}
      </div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex-shrink-0">
          <Skeleton className="w-20 h-20 rounded-lg mb-2" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
  );

  if (loading) {
    return renderLoadingSkeleton();
  }

  return (
    <div className={`w-full ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Package className="mr-2" size={20} />
        Categories
      </h3>
      
      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* All Categories Option */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0"
        >
          <Card 
            className={`cursor-pointer transition-all duration-200 border-2 ${
              !selectedCategory 
                ? 'border-primary bg-primary/10 shadow-lg' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onCategorySelect(null as any)}
          >
            <CardContent className="p-0 w-20 h-20 flex items-center justify-center rounded-lg overflow-hidden">
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-info-600 text-white">
                <Package size={28} />
              </div>
            </CardContent>
          </Card>
          <p className={`text-xs text-center mt-2 font-medium truncate ${
            !selectedCategory ? 'text-primary' : 'text-muted-foreground'
          }`}>
            All
          </p>
        </motion.div>

        {/* Category Items */}
        {categories.map((category, index) => {
          const isSelected = selectedCategory?._id === category._id;
          
          return (
            <motion.div
              key={category._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0"
            >
              <Card 
                className={`cursor-pointer transition-all duration-200 border-2 ${
                  isSelected 
                    ? 'border-primary bg-primary/10 shadow-lg' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onCategorySelect(category)}
              >
                <CardContent className="p-0 w-20 h-20 rounded-lg overflow-hidden">
                  {getCategoryDisplay(category)}
                </CardContent>
              </Card>
              
              <div className="mt-2">
                <p className={`text-xs text-center font-medium truncate w-20 ${
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {category.name}
                </p>
                {category.productCount !== undefined && category.productCount > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    {category.productCount} items
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
