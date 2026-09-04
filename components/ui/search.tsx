'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Grid, Search, Sparkles, Tag, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface SearchResult {
  _id: string;
  name: string;
  slug: string;
  price: number;
  thumbnailImage: string;
  category: {
    name: string;
    slug: string;
  };
  isNewArrival?: boolean;
  featured?: boolean;
}

interface CategoryResult {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  productCount?: number;
}

interface SearchResults {
  products: SearchResult[];
  categories: CategoryResult[];
}

interface SearchComponentProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export default function SearchComponent({ isOpen, onClose, isMobile = false }: SearchComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ products: [], categories: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }

    // Fetch categories for suggestions
    fetchCategories();
  }, []);

  // Cycle through category suggestions every second
  useEffect(() => {
    if (isOpen && !query && categorySuggestions.length > 0) {
      const interval = setInterval(() => {
        setCurrentSuggestionIndex((prev) => (prev + 1) % categorySuggestions.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isOpen, query, categorySuggestions.length]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults({ products: [], categories: [] });
      setIsLoading(false);
      setShowResults(false);
    }
  }, [debouncedQuery]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?limit=12');
      if (response.ok) {
        const data = await response.json();
        const categoryNames = data.categories?.map((cat: any) => cat.name) || [];
        setCategorySuggestions(categoryNames);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Fallback to static suggestions
      setCategorySuggestions([
        'Fashion & Apparel', 'Electronics & Gadgets', 'Home & Garden', 'Sports & Fitness',
        'Beauty & Health', 'Books & Media', 'Toys & Games', 'Automotive'
      ]);
    }
  };

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setShowResults(false);

    try {
      // Search both products and categories
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=6`),
        fetch(`/api/categories?search=${encodeURIComponent(searchQuery)}&limit=4`)
      ]);

      const productsData = await productsResponse.json();
      const categoriesData = categoriesResponse.ok ? await categoriesResponse.json() : { categories: [] };

      setResults({
        products: productsData.products || [],
        categories: categoriesData.categories || []
      });

      // Show results with 1-second delay
      setTimeout(() => {
        setShowResults(true);
      }, 1000);

    } catch (error) {
      console.error('Search error:', error);
      setResults({ products: [], categories: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      // Save to recent searches
      const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));

      // Navigate to search results
      router.push(`/products?search=${encodeURIComponent(searchTerm)}`);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults({ products: [], categories: [] });
  };

  const handleResultClick = (product: SearchResult) => {
    handleSearch(product.name);
    router.push(`/products/${product.slug}`);
  };

  const handleCategoryClick = (category: CategoryResult) => {
    handleSearch(category.name);
    router.push(`/categories/${category.slug}`);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgb(59 130 246) rgb(248 250 252);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(248 250 252);
          border-radius: 6px;
          margin: 4px 0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgb(59 130 246), rgb(37 99 235));
          border-radius: 6px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, rgb(37 99 235), rgb(29 78 216));
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          transform: scaleX(1.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(135deg, rgb(29 78 216), rgb(30 64 175));
        }
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: rgb(248 250 252);
        }
      `}</style>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-8 md:pt-20"
          onClick={onClose}
        >
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`bg-card rounded-3xl shadow-xl mx-4 overflow-hidden ${
            isMobile
              ? 'w-full max-w-md'
              : 'w-full max-w-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Clean Search Header */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-foreground">{t('search.searchByProductOrCategory')}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0 hover:bg-accent rounded-full"
              >
                <X size={20} />
              </Button>
            </div>

            {/* Clean Search Input */}
            <div className="relative">
              <Search className="absolute z-10 left-6 top-1/2 transform -translate-y-1/2 text-subtle-foreground" size={22} />
              <Input
                type="text"
                // placeholder="Type to search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-16 pr-6 h-16 text-lg border-2 border-border focus-visible:ring-0 focus-visible:border-[2px] focus-visible:border-primary-500 bg-muted focus:bg-card rounded-2xl font-medium transition-all duration-200"
                autoFocus
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent rounded-full"
                >
                  <X size={16} />
                </Button>
              )}

              {/* Dynamic Category Suggestion */}
              {!query && categorySuggestions.length > 0 && (
                <div className="absolute left-16 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentSuggestionIndex}
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 0.5 }}
                      exit={{ y: -30, opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="text-lg text-subtle-foreground font-medium"
                    >
                      {t('search.trySuggestion', { suggestion: categorySuggestions[currentSuggestionIndex] })}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Clean Search Results */}
          {isLoading && (
            <div className="px-8 pb-8">
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full"
                />
                <span className="ml-3 text-muted-foreground font-medium">{t('search.searching')}</span>
              </div>
            </div>
          )}

          {/* Animated Results */}
          <AnimatePresence>
            {showResults && (results.categories.length > 0 || results.products.length > 0) && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="px-8 pb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-6"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgb(59 130 246) rgb(243 244 246)',
                }}
              >

                                {/* Products */}
                                {results.products.length > 0 && (
                  <div className='mb-8'>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center">
                      <Grid className="mr-2" size={16} />
                      {t('search.products')}
                    </h3>
                    <div className="space-y-3">
                      {results.products.map((product, index) => (
                        <motion.div
                          key={product._id}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: (results.categories.length * 0.1) + (index * 0.1) }}
                          className="group flex items-center p-4 hover:bg-primary-50 rounded-2xl cursor-pointer transition-all duration-200"
                          onClick={() => handleResultClick(product)}
                        >
                          <img
                            src={product.thumbnailImage}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-xl mr-4"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground group-hover:text-primary-700 transition-colors line-clamp-1">
                              {product.name}
                            </h4>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm text-subtle-foreground">{product.category.name}</p>
                              <p className="font-bold text-success-600">${product.price}</p>
                            </div>
                          </div>
                          <ArrowRight className="text-subtle-foreground group-hover:text-primary-600 transition-colors ml-3" size={16} />
                        </motion.div>
                      ))}
                    </div>

                    {results.products.length >= 6 && (
                      <div className="mt-6">
                        <Button
                          onClick={() => handleSearch(query)}
                          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-5 rounded-2xl transition-all duration-200"
                        >
                          {t('search.viewAllResultsFor')}{query}"
                          <ArrowRight className="ml-2" size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}



                {/* Categories */}
                {results.categories.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center">
                      <Tag className="mr-2" size={16} />
                      {t('search.categories')}
                    </h3>
                    <div className="space-y-3">
                      {results.categories.map((category, index) => (
                        <motion.div
                          key={category._id}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="group flex items-center p-4 hover:bg-primary-50 rounded-2xl cursor-pointer transition-all duration-200"
                          onClick={() => handleCategoryClick(category)}
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground group-hover:text-primary-700 transition-colors">
                              {category.name}
                            </h4>
                            {category.description && (
                              <p className="text-sm text-subtle-foreground mt-1 line-clamp-1">{category.description}</p>
                            )}
                          </div>
                          <ArrowRight className="text-subtle-foreground group-hover:text-primary-600 transition-colors" size={16} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>

          {/* No Results */}
          {!isLoading && query.length >= 2 && results.products.length === 0 && results.categories.length === 0 && (
            <div className="px-8 pb-8">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-subtle-foreground" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('search.noResultsFound')}</h3>
                <p className="text-subtle-foreground">{t('search.trySearchingForSomethingElse')}</p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
      </AnimatePresence>
    </>
  );
}
