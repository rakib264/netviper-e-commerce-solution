'use client';

import { addToCart } from '@/lib/store/slices/cartSlice';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

interface BuyNowButtonProps {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  variant?: string;
  quantity?: number;
  availableStock?: number;
  disabled?: boolean;
  className?: string;
  text?: string;
}

/**
 * Express checkout: puts the selected item in the bag and sends the shopper
 * straight to /checkout. Checkout bounces empty carts, so the item has to land
 * in the store before we navigate.
 */
export default function BuyNowButton({
  productId,
  productName,
  productPrice,
  productImage,
  // Matches the string AddToCartButton builds so both paths hit the same line item
  variant = '',
  quantity = 1,
  availableStock = 999,
  disabled = false,
  className = '',
  text = 'Buy Now',
}: BuyNowButtonProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleBuyNow = () => {
    if (disabled || pending || availableStock <= 0) return;
    setPending(true);

    dispatch(
      addToCart({
        id: productId,
        name: productName,
        price: productPrice,
        image: productImage || '/placeholder-product.jpg',
        quantity: Math.min(quantity, availableStock),
        variant,
        maxQuantity: availableStock,
      }),
    );

    router.push('/checkout');
  };

  const isDisabled = disabled || availableStock <= 0;

  return (
    <button
      type="button"
      onClick={handleBuyNow}
      disabled={isDisabled || pending}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 bg-success text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-muted ${className}`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {isDisabled ? 'Out of Stock' : text}
    </button>
  );
}
