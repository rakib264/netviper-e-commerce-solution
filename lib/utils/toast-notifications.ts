import { toast } from '@/hooks/use-toast';
import { formatEuroCurrency } from '@/lib/utils';

export interface ToastNotificationProps {
  title: string;
  description?: string;
  duration?: number;
}

export const showCartAddedToast = ({ title, description, duration = 3000 }: ToastNotificationProps) => {
  return toast({
    variant: 'cart',
    title,
    description,
    duration,
  });
};

export const showCartRemovedToast = ({ title, description, duration = 3000 }: ToastNotificationProps) => {
  return toast({
    variant: 'error',
    title,
    description,
    duration,
  });
};

export const showWishlistAddedToast = ({ title, description, duration = 3000 }: ToastNotificationProps) => {
  return toast({
    variant: 'wishlist',
    title,
    description,
    duration,
  });
};

export const showWishlistRemovedToast = ({ title, description, duration = 3000 }: ToastNotificationProps) => {
  return toast({
    variant: 'error',
    title,
    description,
    duration,
  });
};

export const showSuccessToast = ({ title, description, duration = 3000 }: ToastNotificationProps) => {
  return toast({
    variant: 'success',
    title,
    description,
    duration,
  });
};

export const showErrorToast = ({ title, description, duration = 3000 }: ToastNotificationProps) => {
  return toast({
    variant: 'error',
    title,
    description,
    duration,
  });
};

export const showInfoToast = ({ title, description, duration = 3000 }: ToastNotificationProps) => {
  return toast({
    variant: 'info',
    title,
    description,
    duration,
  });
};

export const showWarningToast = ({ title, description, duration = 3000 }: ToastNotificationProps) => {
  return toast({
    variant: 'warning',
    title,
    description,
    duration,
  });
};

export const formatPrice = (price: number) => {
  return formatEuroCurrency(price);
};

// Cart-specific toast utilities
export const cartToasts = {
  added: (productName: string, price: number) => 
    showCartAddedToast({
      title: 'Added to Cart!',
      description: `${productName} (${formatPrice(price)}) has been added to your cart.`,
    }),
  
  removed: (productName: string) => 
    showCartRemovedToast({
      title: 'Removed from Cart',
      description: `${productName} has been removed from your cart.`,
    }),
  
  updated: (productName: string, quantity: number) => 
    showCartAddedToast({
      title: 'Cart Updated!',
      description: `${productName} quantity updated to ${quantity}.`,
    }),
  
  alreadyExists: (productName: string) => 
    showInfoToast({
      title: 'Already in Cart',
      description: `${productName} is already in your cart. Quantity has been updated.`,
    }),
  
  cleared: () => 
    showCartRemovedToast({
      title: 'Cart Cleared',
      description: 'All items have been removed from your cart.',
    }),
};

// Wishlist-specific toast utilities
export const wishlistToasts = {
  added: (productName: string, price: number) => 
    showWishlistAddedToast({
      title: 'Added to Wishlist!',
      description: `${productName} (${formatPrice(price)}) has been saved to your wishlist.`,
    }),
  
  removed: (productName: string) => 
    showWishlistRemovedToast({
      title: 'Removed from Wishlist',
      description: `${productName} has been removed from your wishlist.`,
    }),
  
  alreadyExists: (productName: string) => 
    showInfoToast({
      title: 'Already in Wishlist',
      description: `${productName} is already saved in your wishlist.`,
    }),
  
  cleared: () => 
    showWishlistRemovedToast({
      title: 'Wishlist Cleared',
      description: 'All items have been removed from your wishlist.',
    }),
};
