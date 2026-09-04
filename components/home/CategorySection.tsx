'use client';

import { Button } from '@/components/ui/button';
import { Display, Heading, Text, Caption } from '@/components/ui/typography';
import { useSettings } from '@/hooks/use-settings';
import { sortCategories } from '@/lib/categories/sort';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, ChevronRight, Grid, Minus, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  parent?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
  productCount?: number;
  children?: Category[];
}

export default function CategorySection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { settings } = useSettings();

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/categories');
      const data = await response.json();
      const categoriesArray: Category[] = data.categories || [];
      
      // Store all categories for mobile
      setAllCategories(categoriesArray);
      
      // Build category tree for desktop (admin sortOrder)
      const rootCategories = sortCategories<Category>(
        categoriesArray.filter((cat) => !cat.parent)
      );
      const categoriesWithChildren = rootCategories.map((parent) => ({
        ...parent,
        children: sortCategories<Category>(
          categoriesArray.filter(
            (cat) => cat.parent && cat.parent._id === parent._id
          )
        ),
      }));
      
      setCategories(categoriesWithChildren);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
      setAllCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const getCategoryDisplay = (category: Category, variant: 'desktop' | 'mobile' | 'dropdown' = 'desktop') => {
    const sizeClasses = {
      desktop: 'w-14 h-14',
      mobile: 'w-16 h-16',
      dropdown: 'w-10 h-10'
    };
    
    const textSizeClasses = {
      desktop: 'text-base',
      mobile: 'text-lg',
      dropdown: 'text-sm'
    };

    const sizeClass = sizeClasses[variant];
    const textSizeClass = textSizeClasses[variant];
    const borderRadius = variant === 'mobile' ? 'rounded-2xl' : 'rounded-xl';

    if (category.image) {
      return (
        <div className={`${sizeClass} ${borderRadius} overflow-hidden shadow-lg ring-2 ring-white/20`}>
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // Premium gradient background + first character
    const firstChar = category.name.charAt(0).toUpperCase();
    
    return (
      <div className={`${sizeClass} flex items-center justify-center font-label text-white font-bold ${textSizeClass} ${borderRadius} bg-gradient-to-br from-info-600 to-primary-600 shadow-lg ring-2 ring-white/20 hover:shadow-xl transition-all duration-300`}>
        {firstChar}
      </div>
    );
  };

  if (loadingCategories) {
    return (
      <section className="py-16 bg-gradient-to-br from-muted via-white to-info-50/30 font-paragraph">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <Sparkles className="w-8 h-8 text-info-600" />
            </motion.div>
            <Heading level={2} gradient="primary" className="mb-4 font-navigation">
              Discover Categories
            </Heading>
            <Text size="lg" className="text-muted-foreground">Loading amazing categories for you...</Text>
          </div>
          
          {/* Desktop Loading */}
          <div className="hidden lg:block mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-info-200 to-primary-200 rounded-xl mb-3 mx-auto animate-pulse"></div>
                  <div className="w-20 h-4 bg-border rounded mx-auto animate-pulse"></div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Mobile Loading */}
          <div className="block lg:hidden">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl p-4 shadow-sm border border-border"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-info-200 to-primary-200 rounded-2xl animate-pulse"></div>
                    <div className="flex-1">
                      <div className="w-24 h-5 bg-border rounded mb-2 animate-pulse"></div>
                      <div className="w-32 h-3 bg-accent rounded animate-pulse"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-muted via-white to-info-50/30 relative overflow-hidden font-paragraph">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.05),transparent_50%)]"></div>
      
      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-info-100 to-primary-100 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <Caption weight="medium" className="text-info-700">Curated Collections</Caption>
          </div>
          <Display size="lg" gradient="primary" className="mb-6 font-navigation">
            Discover Categories
          </Display>
          <Text size="xl" className="text-muted-foreground max-w-3xl mx-auto">
            Explore our carefully curated categories, each designed to bring you the finest products 
            from trusted brands and emerging designers.
          </Text>
        </motion.div>

        {/* Desktop & Tablet: Premium Grid Layout */}
        <div className="hidden lg:block mb-12 relative">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category, index) => (
              <div
                key={category._id}
                className="relative group"
                onMouseEnter={() => setHoveredCategory(category._id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <Link href={`/categories/${category.slug}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center cursor-pointer group"
                  >
                    <div className="relative mb-4">
                      <div className="transform group-hover:scale-110 transition-all duration-300 ease-out">
                        {getCategoryDisplay(category, 'desktop')}
                      </div>
                      {category.children && category.children.length > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-info-600 rounded-full flex items-center justify-center shadow-lg">
                          <ChevronDown size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <Heading level={6} weight="semibold" className="font-navigation text-foreground group-hover:text-info-600 transition-colors duration-200">
                      {category.name}
                    </Heading>
                    {category.productCount && (
                      <Caption className="text-subtle-foreground mt-1">
                        {category.productCount} items
                      </Caption>
                    )}
                  </motion.div>
                </Link>
              </div>
            ))}
          </div>

          {/* Full-Width Mega Menu Dropdown - Positioned relative to the grid container */}
          <AnimatePresence>
            {(() => {
              const category = categories.find(cat => cat._id === hoveredCategory);
              return hoveredCategory && category?.children && category.children.length > 0;
            })() && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 mt-4 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 p-8"
                onMouseEnter={() => setHoveredCategory(hoveredCategory)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                {(() => {
                  const category = categories.find(cat => cat._id === hoveredCategory);
                  if (!category || !category.children) return null;
                  
                  return (
                    <>
                      <div className="text-center mb-6">
                        <Heading level={4} weight="bold" className="font-navigation text-foreground mb-2">{category.name}</Heading>
                        <Caption className="text-subtle-foreground">Explore subcategories</Caption>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-6">
                        {category.children.map((child) => (
                          <Link
                            key={child._id}
                            href={`/categories/${child.slug}`}
                            className="flex flex-col items-center space-y-3 p-4 rounded-xl hover:bg-gradient-to-r hover:from-info-50 hover:to-primary-50 transition-all duration-200 group"
                          >
                            <div className="flex-shrink-0">
                              {getCategoryDisplay(child, 'dropdown')}
                            </div>
                            <div className="text-center">
                              <Text size="sm" weight="medium" className="text-foreground group-hover:text-info-600 transition-colors break-words">
                                {child.name}
                              </Text>
                              {child.productCount && (
                                <Caption className="text-subtle-foreground mt-1">
                                  {child.productCount} items
                                </Caption>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                      
                      <div className="pt-6 border-t border-border">
                        <Link
                          href={`/categories/${category.slug}`}
                          className="flex items-center justify-center space-x-2 w-full py-3 px-4 bg-gradient-to-r from-info-600 to-primary-600 font-button text-white rounded-xl hover:shadow-lg transition-all duration-200 group"
                        >
                          <Text size="sm" weight="medium" color="white">View All {category.name}</Text>
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile & Tablet: Expandable Vertical List */}
        <div className="block lg:hidden mb-8">
          <div className="space-y-3">
            {categories.map((category, index) => (
              <motion.div
                key={category._id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between p-4">
                  <Link
                    href={`/categories/${category.slug}`}
                    className="flex items-center space-x-4 flex-1"
                  >
                    <div className="flex-shrink-0">
                      {getCategoryDisplay(category, 'mobile')}
                    </div>
                    <div className="flex-1">
                      <Heading level={5} weight="semibold" className="font-navigation text-foreground">
                        {category.name}
                      </Heading>
                      {category.productCount && (
                        <Text size="sm" className="text-subtle-foreground">
                          {category.productCount} items available
                        </Text>
                      )}
                    </div>
                  </Link>
                  
                  {category.children && category.children.length > 0 && (
                    <button
                      onClick={() => toggleCategoryExpansion(category._id)}
                      className="p-2 rounded-full hover:bg-accent transition-colors"
                    >
                      {expandedCategories.has(category._id) ? (
                        <Minus size={20} className="text-info-600" />
                      ) : (
                        <Plus size={20} className="text-subtle-foreground" />
                      )}
                    </button>
                  )}
                </div>

                {/* Expandable Subcategories */}
                <AnimatePresence>
                  {expandedCategories.has(category._id) && category.children && category.children.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="border-t border-border bg-gradient-to-r from-info-50/50 to-primary-50/50"
                    >
                      <div className="p-4 space-y-2">
                        {category.children.map((child) => (
                          <Link
                            key={child._id}
                            href={`/categories/${child.slug}`}
                            className="flex items-center space-x-3 p-3 rounded-xl hover:bg-card/80 transition-all duration-200 group"
                          >
                            <div className="flex-shrink-0">
                              {getCategoryDisplay(child, 'dropdown')}
                            </div>
                            <div className="flex-1">
                              <Text size="md" weight="medium" className="text-foreground group-hover:text-info-600 transition-colors">
                                {child.name}
                              </Text>
                              {child.description && (
                                <Text size="sm" className="text-subtle-foreground line-clamp-1">
                                  {child.description}
                                </Text>
                              )}
                              {child.productCount && (
                                <Caption className="text-subtle-foreground">
                                  {child.productCount} items
                                </Caption>
                              )}
                            </div>
                            <ChevronRight size={16} className="text-subtle-foreground group-hover:text-info-600 group-hover:translate-x-1 transition-all" />
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-info-600 to-primary-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]"></div>
            
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block mb-4"
              >
                <Sparkles className="w-8 h-8 text-warning-300" />
              </motion.div>
              
              <Heading level={3} weight="bold" color="white" className="mb-4 font-navigation">
                Explore All Categories
              </Heading>
              <Text size="lg" className="text-white/90 mb-8 max-w-2xl mx-auto">
                Discover thousands of products across all our categories. From trending items to timeless classics.
              </Text>
              
              <Link href="/categories">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="bg-card font-button text-info-600 hover:bg-card/90 hover:scale-105 transition-all duration-200 group shadow-xl"
                >
                  <Grid className="mr-2" size={20} />
                  Browse All Categories
                  <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
