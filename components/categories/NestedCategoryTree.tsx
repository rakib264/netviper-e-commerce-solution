'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { sortCategories } from '@/lib/categories/sort';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Grid, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  parent?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
  image?: string;
  productCount?: number;
  children?: Category[];
}

interface NestedCategoryTreeProps {
  onCategorySelect: (category: Category | null) => void;
  selectedCategory: Category | null;
  onProductsLoad?: (products: any[]) => void;
  className?: string;
}

export default function NestedCategoryTree({ 
  onCategorySelect, 
  selectedCategory, 
  onProductsLoad,
  className = "" 
}: NestedCategoryTreeProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      // Handle both direct array and nested object response
      const categoriesArray = data.categories || [];
      const nestedCategories = buildCategoryTree(categoriesArray);
      setCategories(nestedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const buildCategoryTree = (flatCategories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: create a map of all categories
    flatCategories.forEach(category => {
      categoryMap.set(category._id, { ...category, children: [] });
    });

    // Second pass: build the tree structure
    flatCategories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category._id)!;
      
      if (category.parent) {
        const parentCategory = categoryMap.get(category.parent._id);
        if (parentCategory) {
          parentCategory.children!.push(categoryWithChildren);
        } else {
          rootCategories.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return sortCategories<Category>(rootCategories).map((root) => ({
      ...root,
      children: sortCategories<Category>(root.children || []),
    }));
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCategoryClick = async (category: Category) => {
    onCategorySelect(category);
    
    // Fetch products for this category
    if (onProductsLoad) {
      try {
        const response = await fetch(`/api/products?category=${category.slug}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          onProductsLoad(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    }
  };

  const renderCategoryItem = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category._id);
    const isSelected = selectedCategory?._id === category._id;
    const isHovered = hoveredCategory === category._id;

    return (
      <motion.div
        key={category._id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: level * 0.1 }}
        className="w-full"
      >
        <div
          className={`
            relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200
            ${isSelected 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : isHovered 
                ? 'bg-accent hover:bg-accent/80' 
                : 'hover:bg-accent/50'
            }
            ${level > 0 ? `ml-${Math.min(level * 4, 12)} border-l-2 border-border` : ''}
          `}
          style={{ marginLeft: level > 0 ? `${level * 1.5}rem` : '0' }}
          onClick={() => handleCategoryClick(category)}
          onMouseEnter={() => setHoveredCategory(category._id)}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mr-2 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(category._id);
                }}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={14} />
                </motion.div>
              </Button>
            )}
            
            <div className="flex items-center flex-1 min-w-0">
              <Package 
                size={16} 
                className={`mr-2 flex-shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} 
              />
              <span className="font-medium truncate flex-1">{category.name}</span>
              
              {category.productCount !== undefined && category.productCount > 0 && (
                <Badge 
                  variant={isSelected ? "secondary" : "outline"} 
                  className="ml-2 text-xs px-2 py-0.5"
                >
                  {category.productCount}
                </Badge>
              )}
            </div>
          </div>

          {(isHovered || isSelected) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-1"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryClick(category);
                }}
              >
                <Grid size={12} />
              </Button>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-1">
                {category.children!.map(child => renderCategoryItem(child, level + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center">
            <Grid className="mr-2" size={18} />
            {t('categories.nestedCategoryTree.categories')}
          </h3>
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCategorySelect(null)}
              className="text-xs"
            >
              {t('categories.nestedCategoryTree.clear')}
            </Button>
          )}
        </div>

        {loading ? renderLoadingSkeleton() : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {/* All Categories Option */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`
                flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200
                ${!selectedCategory 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-accent/50'
                }
              `}
              onClick={() => onCategorySelect(null)}
            >
              <div className="flex items-center">
                <Grid size={16} className="mr-2" />
                <span className="font-medium">{t('categories.nestedCategoryTree.allCategories')}</span>
              </div>
            </motion.div>
            
            {categories.map(category => renderCategoryItem(category))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
