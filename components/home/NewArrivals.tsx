'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import ViewAllLink from '@/components/home/ViewAllLink';
import ProductCardDiscounted from '@/components/ui/product-card-discounted';
import ProductCardRegular from '@/components/ui/product-card-regular';
import { Display } from '@/components/ui/typography';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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

interface NewArrivalsProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
}

export default function NewArrivals({
  title = "New Arrivals",
  subtitle = "Fresh styles just landed! Be the first to discover our latest fashion collections",
  limit = 8,
  className = ""
}: NewArrivalsProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [limit]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products?limit=${limit}&isNewArrival=true&sortBy=createdAt&sortOrder=desc&active=true`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching new arrivals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className={`py-8 lg:py-16 bg-gradient-to-br from-sandy-50 via-beige-100 to-primary-50 relative overflow-hidden font-paragraph ${className}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="animate-pulse bg-border h-8 w-64 mx-auto rounded mb-4"></div>
            <div className="animate-pulse bg-border h-4 w-96 mx-auto rounded"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-4 lg:gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="animate-pulse bg-card/60 h-80 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-8 lg:py-16 bg-gradient-to-br from-sandy-50 via-beige-100 to-primary-50 relative overflow-hidden font-paragraph ${className}`}>
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-sandy/30 to-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-secondary/20 to-sandy/30 rounded-full blur-3xl"></div>

        {/* Floating elements */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => {
            // Use fixed positions to avoid hydration mismatch
            const positions = [
              { left: '8%', top: '15%' }, { left: '18%', top: '35%' }, { left: '28%', top: '55%' },
              { left: '38%', top: '75%' }, { left: '48%', top: '25%' }, { left: '58%', top: '85%' },
              { left: '68%', top: '45%' }, { left: '78%', top: '65%' }, { left: '88%', top: '20%' },
              { left: '12%', top: '70%' }, { left: '22%', top: '40%' }, { left: '32%', top: '90%' },
              { left: '42%', top: '30%' }, { left: '52%', top: '80%' }, { left: '62%', top: '50%' }
            ];
            const position = positions[i] || { left: '50%', top: '50%' };

            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-sandy/40 rounded-full"
                style={position}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 4 + (i % 3) * 2,
                  repeat: Infinity,
                  delay: (i % 4) * 0.8,
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
            <Display size="lg" weight="bold" className="font-navigation text-secondary-800">
              {title}
            </Display>
          </div>

          <ViewAllLink
            href="/products/new-arrivals"
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
          {products.map((product) => {
            // Determine if product has a discount
            const hasDiscount =
              product.comparePrice &&
              product.comparePrice > 0 &&
              product.comparePrice > product.price;

            // Use discounted card if product has discount, otherwise use regular card
            return hasDiscount ? (
              <ProductCardDiscounted
                key={product._id}
                product={product}
                className="h-full"
              />
            ) : (
              <ProductCardRegular
              key={product._id}
              product={product}
              className="h-full"
            />
            );
          })}
        </motion.div>

        {/* No Products */}
        {!loading && products.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center py-16"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles size={80} className="mx-auto text-gray-300 mb-6" />
            </motion.div>
            <h3 className="font-navigation text-2xl font-semibold text-muted-foreground mb-4">No New Arrivals Yet</h3>
            <p className="font-paragraph text-subtle-foreground text-lg">Stay tuned for exciting new products coming soon!</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
