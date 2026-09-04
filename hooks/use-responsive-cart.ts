import { toggleCart } from '@/lib/store/slices/cartSlice';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

export function useResponsiveCart() {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleCartClick = () => {
    if (isMobile) {
      router.push('/cart');
    } else {
      dispatch(toggleCart());
    }
  };

  return { isMobile, handleCartClick };
}
