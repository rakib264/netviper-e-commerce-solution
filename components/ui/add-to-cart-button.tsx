'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/typography';
import { toast } from '@/hooks/use-toast';
import { addToCart } from '@/lib/store/slices/cartSlice';
import { cn } from '@/lib/utils';
import { Check, Plus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

export interface AddToCartButtonProps {
  // Product information
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  productSlug?: string;

  // Variants and options
  selectedVariants?: { [key: string]: string };
  quantity?: number;

  // Button appearance
  variant?: 'default' | 'compact' | 'full' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';

  // Stock and availability
  availableStock?: number;
  isOutOfStock?: boolean;

  // Custom styling
  className?: string;

  // Callbacks
  onAddToCart?: (success: boolean) => void;
  onStockError?: () => void;

  // Loading state (external)
  isLoading?: boolean;

  // Custom text
  text?: string;
  outOfStockText?: string;

  // Hide the leading icon (e.g. minimalist PDP buttons)
  showIcon?: boolean;
}

export default function AddToCartButton({
  productId,
  productName,
  productPrice,
  productImage,
  productSlug,
  selectedVariants = {},
  quantity = 1,
  variant = 'default',
  size = 'md',
  availableStock,
  isOutOfStock = false,
  className,
  onAddToCart,
  onStockError,
  isLoading: externalLoading = false,
  text,
  outOfStockText,
  showIcon = true
}: AddToCartButtonProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [internalLoading, setInternalLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const isLoading = externalLoading || internalLoading;
  const isDisabled = isLoading || isOutOfStock || (availableStock !== undefined && availableStock <= 0);

  const handleAddToCart = async () => {
    if (isDisabled) {
      if (isOutOfStock || (availableStock !== undefined && availableStock <= 0)) {
        onStockError?.();
      toast({
        title: t('addToCartButton.outOfStock'),
        description: `${productName} is currently out of stock.`,
        variant: "error",
      });
      }
      return;
    }

    try {
      setInternalLoading(true);

      // Create variant string for display
      const variantString = Object.entries(selectedVariants)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      // Add to cart
      dispatch(addToCart({
        id: productId,
        name: productName,
        price: productPrice,
        image: productImage || '/placeholder-product.jpg',
        quantity,
        variant: variantString,
        maxQuantity: availableStock || 999
      }));

      // Show success state
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);

      // Success callback
      onAddToCart?.(true);

      // Success toast
      toast({
        title: t('addToCartButton.addedToCart'),
        description: `${productName} has been added to your cart.`,
        variant: "default",
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      onAddToCart?.(false);

      toast({
        title: t('addToCartButton.error'),
        description: t('addToCartButton.failedToAddItemToCart'),
        variant: "error",
      });
    } finally {
      setInternalLoading(false);
    }
  };

  // Get button text based on state and variant
  const getButtonText = () => {
    if (isOutOfStock || (availableStock !== undefined && availableStock <= 0)) {
      // An explicit `outOfStockText` still wins — some callers pass copy of their own.
      return outOfStockText ?? t('product.outOfStock');
    }
    if (justAdded) {
      return variant === 'icon-only' ? '' : t('product.added');
    }
    if (text) {
      return text;
    }

    switch (variant) {
      case 'icon-only':
        return '';
      case 'full':
        return t('product.addToCart');
      case 'compact':
      default:
        return t('product.addShort');
    }
  };

  // Get icon based on state and size
  const getIcon = () => {
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

    if (justAdded) {
      return <Check className="transition-all duration-200" size={iconSize} />;
    }
    if (variant === 'icon-only') {
      return <Plus className="transition-all duration-200" size={iconSize} />;
    }
    return <ShoppingBag className="transition-all duration-200" size={iconSize} />;
  };

  // Size-based styling
  const sizeStyles = {
    sm: {
      button: 'px-3 py-1.5',
      text: 'text-xs'
    },
    md: {
      button: 'px-4 py-2',
      text: 'text-sm'
    },
    lg: {
      button: 'px-6 py-3',
      text: 'text-base'
    }
  };

  const currentSize = sizeStyles[size];

  // Variant-based styling for quiet luxury palette
  const variantStyles = {
    'default': 'bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md',
    'compact': 'bg-primary hover:bg-primary/90 text-white shadow-sm',
    'full': 'bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg',
    'icon-only': 'bg-primary hover:bg-primary/90 text-white shadow-sm rounded-full aspect-square p-0'
  };

  // Success state styling
  const successStyles = justAdded
    ? 'bg-success hover:bg-success/90'
    : '';

  // Disabled state styling
  const disabledStyles = isDisabled
    ? 'opacity-50 cursor-not-allowed bg-muted hover:bg-muted'
    : '';

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isDisabled}
      className={cn(
        // Base styles
        'font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden',

        // Size styles
        currentSize.button,

        // Variant styles
        variantStyles[variant],

        // State styles
        successStyles,
        disabledStyles,

        // Custom className (applied last to allow overrides)
        className
      )}
    >
      {/* Loading spinner overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Button content */}
      <div className={cn(
        'flex items-center justify-center gap-2',
        isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'
      )}>
        {variant === 'icon-only' ? (
          getIcon()
        ) : (
          <>
            {showIcon && (
              <span className="flex-shrink-0">
                {getIcon()}
              </span>
            )}
            <Text
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'md' : 'sm'}
              weight="semibold"
              className="text-current whitespace-nowrap"
              as="span"
            >
              {getButtonText()}
            </Text>
          </>
        )}
      </div>
    </Button>
  );
}
