'use client';

import AddToCartButton from '@/components/ui/add-to-cart-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatBDTCurrency } from '@/lib/utils';
import { Eye, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface ProductDetails {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage: string;
  images?: string[];
  shortDescription?: string;
  description?: string;
  quantity: number;
  variants?: Array<{
    name: string;
    value: string;
    price?: number;
    sku?: string;
    quantity?: number;
    image?: string;
  }>;
  averageRating?: number;
  totalReviews?: number;
  category?: {
    name: string;
    slug: string;
  };
  productSize?: string[];
}

interface ProductDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  productSlug?: string;
  product?: ProductDetails;
}

export default function ProductDetailsModal({
  open,
  onOpenChange,
  productId,
  productSlug,
  product: initialProduct,
}: ProductDetailsModalProps) {
  const [product, setProduct] = useState<ProductDetails | null>(initialProduct || null);
  const [loading, setLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Fetch product details if only ID/slug provided
  useEffect(() => {
    if (open && !product && (productId || productSlug)) {
      fetchProductDetails();
    } else if (open && initialProduct) {
      setProduct(initialProduct);
    }
  }, [open, productId, productSlug]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const endpoint = productSlug
        ? `/api/products/${productSlug}`
        : productId
          ? `/api/products/${productId}`
          : null;

      if (!endpoint) {
        console.error('No product ID or slug provided');
        return;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (response.ok && data.product) {
        setProduct(data.product);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedVariants({});
      setSelectedSize('');
      setQuantity(1);
      setSelectedImageIndex(0);
    }
  }, [open]);

  // Group variants by name (Color, Size, etc.)
  const groupedVariants = product?.variants?.reduce((acc, variant) => {
    if (!acc[variant.name]) {
      acc[variant.name] = [];
    }
    // Avoid duplicates
    if (!acc[variant.name].some(v => v.value === variant.value)) {
      acc[variant.name].push(variant);
    }
    return acc;
  }, {} as Record<string, Array<{ name: string; value: string; price?: number; sku?: string; quantity?: number; image?: string }>>) || {};

  // Get available variant options
  const getVariantOptions = (variantName: string) => {
    return groupedVariants[variantName] || [];
  };

  // Handle variant selection
  const handleVariantSelect = (variantName: string, value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variantName]: value,
    }));
  };

  // Calculate final price with variant pricing
  const getFinalPrice = () => {
    if (!product) return 0;

    let basePrice = product.price;

    // Check if selected variants have price overrides
    Object.entries(selectedVariants).forEach(([name, value]) => {
      const variant = product.variants?.find(
        v => v.name.toLowerCase() === name.toLowerCase() && v.value === value
      );
      if (variant?.price) {
        basePrice = variant.price;
      }
    });

    return basePrice;
  };

  // Get available stock for selected variants
  const getAvailableStock = () => {
    if (!product) return 0;

    // If variants are selected, check variant-specific stock
    if (Object.keys(selectedVariants).length > 0) {
      const variant = product.variants?.find(v => {
        return Object.entries(selectedVariants).every(
          ([name, value]) => v.name.toLowerCase() === name.toLowerCase() && v.value === value
        );
      });

      if (variant?.quantity !== undefined) {
        return variant.quantity;
      }
    }

    return product.quantity;
  };

  const availableStock = getAvailableStock();
  const finalPrice = getFinalPrice();
  const isOutOfStock = availableStock <= 0;
  const images = product?.images && product.images.length > 0
    ? product.images
    : product?.thumbnailImage
      ? [product.thumbnailImage]
      : [];

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Product Image Section */}
          <div className="relative bg-card p-4 md:p-6">
            <div className="relative aspect-square w-full max-w-md mx-auto">
              <Image
                src={images[selectedImageIndex] || product.thumbnailImage}
                alt={product.name}
                fill
                className="object-contain rounded-lg"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary-600'
                        : 'border-transparent hover:border-ring'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="bg-card p-4 md:p-6 flex flex-col">
            <DialogHeader className="text-left mb-4">
              {/* Category */}
              {product.category && (
                <p className="text-sm text-subtle-foreground mb-2 font-medium uppercase tracking-wide">
                  {product.category.name}
                </p>
              )}

              <DialogTitle className="text-2xl font-bold text-foreground mb-2">
                {product.name}
              </DialogTitle>

              {/* Stock Status */}
              <div className="flex items-center gap-2 mb-4">
                {isOutOfStock ? (
                  <Badge variant="destructive" className="text-xs">
                    Out of Stock
                  </Badge>
                ) : (
                  <Badge className="bg-success-500 text-white text-xs">
                    In Stock
                  </Badge>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-price font-bold text-foreground">
                  {formatBDTCurrency(finalPrice)}
                </span>
                {product.comparePrice && product.comparePrice > finalPrice && (
                  <span className="text-lg font-caption text-subtle-foreground line-through">
                    {formatBDTCurrency(product.comparePrice)}
                  </span>
                )}
              </div>

              {/* Rating */}
              {product.averageRating !== undefined && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-lg ${
                          i < Math.floor(product.averageRating || 0)
                            ? 'text-warning-400'
                            : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.averageRating?.toFixed(1) || '0.0'} ({product.totalReviews || 0} reviews)
                  </span>
                </div>
              )}
            </DialogHeader>

            {/* Short Description */}
            {product.shortDescription && (
              <div className="mb-6">
                <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Description:
                </Label>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {product.shortDescription}
                </p>
              </div>
            )}

            {/* Size Selector (if productSize exists) */}
            {product.productSize && product.productSize.length > 0 && (
              <div className="mb-6">
                <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Size:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {product.productSize.map((size, index) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'bg-accent text-muted-foreground hover:bg-border'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant Selectors (Color, etc.) */}
            {Object.keys(groupedVariants).length > 0 && (
              <div className="space-y-4 mb-6">
                {Object.entries(groupedVariants).map(([variantName, variants]) => (
                  <div key={variantName}>
                    <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
                      {variantName}:
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((variant, index) => {
                        const isSelected = selectedVariants[variantName] === variant.value;
                        return (
                          <button
                            key={index}
                            onClick={() => handleVariantSelect(variantName, variant.value)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-primary-600 text-white shadow-md'
                                : 'bg-accent text-muted-foreground hover:bg-border'
                            }`}
                          >
                            {variant.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
                Quantity:
              </Label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-md border border-border flex items-center justify-center hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-semibold w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(prev => Math.min(availableStock, prev + 1))}
                  disabled={quantity >= availableStock}
                  className="w-10 h-10 rounded-md border border-border flex items-center justify-center hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <div className="flex-1">
                <AddToCartButton
                  productId={product._id}
                  productName={product.name}
                  productPrice={finalPrice}
                  productImage={product.thumbnailImage}
                  productSlug={product.slug}
                  selectedVariants={{
                    ...selectedVariants,
                    ...(selectedSize ? { Size: selectedSize } : {}),
                  }}
                  quantity={quantity}
                  variant="full"
                  size="lg"
                  availableStock={availableStock}
                  isOutOfStock={isOutOfStock}
                  className="w-full h-12"
                />
              </div>
              <Link href={`/products/${product.slug}`} className="flex-1">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 bg-sandy-500 text-white hover:bg-sandy-600 hover:text-white border-sandy-600"
                  onClick={() => onOpenChange(false)}
                >
                  <Eye className="h-4 w-4 mr-2 text-white" />
                  View Full Details
                </Button>
              </Link>
            </div>

            {/* Call Us for Order */}
            <div className="mt-6 p-4 bg-muted rounded-lg border">
              <div className="flex items-center justify-center gap-2 text-center">
                <span className="text-sm text-muted-foreground">📞 Call Us for Order:</span>
                <a
                  href="tel:+8809949343"
                  className="text-lg font-navigation font-bold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  +880 994 9343
                </a>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

