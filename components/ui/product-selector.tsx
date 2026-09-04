'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { formatEuroCurrency } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Image as ImageIcon, Package, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage?: string;
  sku: string;
  category?: {
    name: string;
    slug: string;
  };
  isActive: boolean;
}

interface ProductSelectorProps {
  selectedProducts: string[];
  onProductsChange: (productIds: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxSelection?: number;
}

export default function ProductSelector({
  selectedProducts,
  onProductsChange,
  placeholder = "Select products...",
  className = "",
  disabled = false,
  maxSelection
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product[]>([]);
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return formatEuroCurrency(price);
  };

  const fetchProducts = useCallback(async (search: string = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '50');
      params.set('active', 'true'); // Only fetch active products

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchSelectedProductDetails = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setSelectedProductDetails([]);
      return;
    }

    try {
      const promises = selectedProducts.map(async (productId) => {
        const response = await fetch(`/api/admin/products/${productId}`);
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        return null;
      });

      const results = await Promise.all(promises);
      setSelectedProductDetails(results.filter(Boolean));
    } catch (error) {
      console.error('Error fetching selected product details:', error);
    }
  }, [selectedProducts]);

  useEffect(() => {
    if (open) {
      fetchProducts(searchQuery);
    }
  }, [open, searchQuery, fetchProducts]);

  useEffect(() => {
    fetchSelectedProductDetails();
  }, [fetchSelectedProductDetails]);

  const handleProductToggle = (productId: string) => {
    if (disabled) return;

    const isSelected = selectedProducts.includes(productId);
    let newSelection: string[];

    if (isSelected) {
      newSelection = selectedProducts.filter(id => id !== productId);
    } else {
      if (maxSelection && selectedProducts.length >= maxSelection) {
        toast({
          title: "Selection Limit",
          description: `You can only select up to ${maxSelection} products.`,
          variant: "error",
        });
        return;
      }
      newSelection = [...selectedProducts, productId];
    }

    onProductsChange(newSelection);
  };

  const handleRemoveProduct = (productId: string) => {
    if (disabled) return;
    const newSelection = selectedProducts.filter(id => id !== productId);
    onProductsChange(newSelection);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label>Products</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-auto min-h-[40px] p-3 text-muted-foreground hover:text-white"
              disabled={disabled}
            >
              <div className="flex items-center gap-2 flex-1">
                <Package size={16} className="text-subtle-foreground" />
                <span className="text-left flex-1">
                  {selectedProducts.length > 0
                    ? `${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} selected`
                    : placeholder}
                </span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-0" align="start">
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="flex h-11 w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-subtle-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <CommandEmpty>
                {loading ? (
                  <div className="py-6 text-center text-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Loading products...</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm">No products found.</div>
                )}
              </CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[300px]">
                  {products.map((product) => {
                    const isSelected = selectedProducts.includes(product._id);
                    return (
                      <CommandItem
                        key={product._id}
                        value={product._id}
                        onSelect={() => handleProductToggle(product._id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 w-full">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleProductToggle(product._id)}
                          />
                          <div className="w-12 h-12 bg-accent rounded-lg overflow-hidden flex-shrink-0">
                            {product.thumbnailImage ? (
                              <img
                                src={product.thumbnailImage}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon size={16} className="text-subtle-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-subtle-foreground">SKU: {product.sku}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm font-price font-medium text-success-600">
                                {formatPrice(product.price)}
                              </span>
                              {product.comparePrice && (
                                <span className="text-xs font-caption text-subtle-foreground line-through">
                                  {formatPrice(product.comparePrice)}
                                </span>
                              )}
                            </div>
                            {product.category && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {product.category.name}
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </ScrollArea>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected Products Display */}
      {selectedProductDetails.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Selected Products ({selectedProductDetails.length})</Label>
            {maxSelection && (
              <span className="text-xs font-caption text-subtle-foreground">
                {selectedProductDetails.length}/{maxSelection}
              </span>
            )}
          </div>
          <div className="grid gap-3">
            <AnimatePresence>
              {selectedProductDetails.map((product) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-accent rounded-lg overflow-hidden flex-shrink-0">
                          {product.thumbnailImage ? (
                            <img
                              src={product.thumbnailImage}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={16} className="text-subtle-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-subtle-foreground">SKU: {product.sku}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm font-price font-medium text-success-600">
                              {formatPrice(product.price)}
                            </span>
                            {product.comparePrice && (
                              <span className="text-xs font-caption text-subtle-foreground line-through">
                                {formatPrice(product.comparePrice)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(product._id)}
                          disabled={disabled}
                          className="h-8 w-8 p-0 hover:bg-destructive-50 hover:text-destructive-600"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {selectedProductDetails.length === 0 && (
            <div className="text-center py-8 text-subtle-foreground">
              <Package size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No products selected</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
