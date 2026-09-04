'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import ViewAllLink from '@/components/home/ViewAllLink';
import ProductCardDiscounted from '@/components/ui/product-card-discounted';
import ProductCardRegular from '@/components/ui/product-card-regular';
import { Display } from '@/components/ui/typography';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage: string;
  averageRating?: number;
  totalReviews?: number;
  totalSales?: number;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  isLimitedEdition?: boolean;
  quantity?: number;
  category?: {
    name: string;
    slug: string;
  };
  tags?: string[];
  shortDescription?: string;
  images?: string[];
  variants?: Array<{
    name: string;
    value: string;
    price?: number;
    sku?: string;
    quantity?: number;
    image?: string;
  }>;
  productSize?: string[];
}

interface LimitedEditionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
}

export default function LimitedEdition({
  title = "Limited Edition",
  subtitle = "Exclusive pieces in limited quantities. Don't miss out on these rare finds before they're gone forever",
  limit = 8,
  className = ""
}: LimitedEditionProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [limit]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products?limit=${limit}&isLimitedEdition=true&sortBy=quantity&sortOrder=asc&active=true`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching limited edition products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no products
  if (!loading && products.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className={`py-8 lg:py-16 bg-gradient-to-br from-primary-900 via-primary-800 to-info-900 text-white relative overflow-hidden font-paragraph ${className}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="animate-pulse bg-card/20 h-8 w-64 mx-auto rounded mb-4"></div>
            <div className="animate-pulse bg-card/20 h-4 w-96 mx-auto rounded"></div>
          </div>
          <div className="flex gap-6 overflow-hidden">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="animate-pulse bg-card/20 h-80 w-72 rounded-2xl flex-shrink-0" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-8 lg:py-16 bg-gradient-to-br from-primary-900 via-primary-800 to-info-900 text-white relative overflow-hidden scroll-reveal font-paragraph ${className}`}>
      {/* Enhanced Premium Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-48 h-48 bg-gradient-to-r from-warning-400/30 to-secondary-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-gradient-to-r from-secondary-400/30 to-primary-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-warning-400/15 to-secondary-400/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-r from-primary-400/20 to-info-400/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-r from-secondary-400/20 to-warning-400/20 rounded-full blur-2xl animate-pulse"></div>

        {/* Enhanced Animated particles */}
        <div className="absolute inset-0">
          {[...Array(25)].map((_, i) => {
            // Use fixed positions to avoid hydration mismatch
            const positions = [
              { left: '5%', top: '10%' }, { left: '15%', top: '30%' }, { left: '25%', top: '50%' },
              { left: '35%', top: '70%' }, { left: '45%', top: '20%' }, { left: '55%', top: '80%' },
              { left: '65%', top: '40%' }, { left: '75%', top: '60%' }, { left: '85%', top: '15%' },
              { left: '95%', top: '35%' }, { left: '10%', top: '60%' }, { left: '20%', top: '80%' },
              { left: '30%', top: '25%' }, { left: '40%', top: '75%' }, { left: '50%', top: '45%' },
              { left: '60%', top: '65%' }, { left: '70%', top: '5%' }, { left: '80%', top: '85%' },
              { left: '90%', top: '55%' }, { left: '12%', top: '90%' }, { left: '8%', top: '40%' },
              { left: '22%', top: '15%' }, { left: '38%', top: '85%' }, { left: '52%', top: '10%' },
              { left: '68%', top: '90%' }
            ];
            const position = positions[i] || { left: '50%', top: '50%' };

            return (
              <motion.div
                key={i}
                className={`absolute rounded-full ${
                  i % 3 === 0 ? 'w-1 h-1 bg-card/40' :
                  i % 3 === 1 ? 'w-1.5 h-1.5 bg-warning-300/30' :
                  'w-2 h-2 bg-secondary-300/20'
                }`}
                style={position}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 4 + (i % 4) * 2,
                  repeat: Infinity,
                  delay: (i % 5) * 0.8,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-row items-center justify-between mb-12"
        >
          {/* Left side - Title and Subtitle */}
          <div className="text-center lg:text-left">
            <Display size="lg" weight="bold" className="font-navigation text-white">
              {title}
            </Display>
          </div>

          <ViewAllLink
            href="/products/limited-edition"
            label={t('common.viewAll')}
            ariaLabel={t('common.viewAllOf', { section: title })}
          />
        </motion.div>

        {/* Products Grid - Responsive Layout */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-4 lg:gap-6 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {products.map((product, index) => {
            // Determine if product has a discount
            const hasDiscount =
              product.comparePrice &&
              product.comparePrice > 0 &&
              product.comparePrice > product.price;

            return (
            <div key={product._id} className="relative group h-full">
                {hasDiscount ? (
                  <ProductCardDiscounted
                    product={product}
                    className="h-full"
                  />
                ) : (
                  <ProductCardRegular
                product={product}
                className="h-full"
              />
                )}

              {/* Limited Edition Badge */}
              <motion.div
                className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-warning-400 to-secondary-400 text-white px-3 py-1 rounded-full font-label text-xs font-bold shadow-2xl"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.05 + 0.3 }}
              >
                LIMITED
              </motion.div>
            </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
