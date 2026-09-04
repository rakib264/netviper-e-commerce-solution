'use client';

import HomeSection from '@/components/home/HomeSection';
import SectionHeading from '@/components/home/SectionHeading';
import {
  settingNumber,
  type HomepageSectionProps,
} from '@/components/home/section-props';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { useSectionData } from '@/hooks/use-section-data';

interface CustomerFeedback {
  _id: string;
  platform: string;
  platformName: string;
  customer: {
    name: string;
    avatar: string;
    location: string;
    verified: boolean;
  };
  message: string;
  rating: number;
  productImage?: string;
  timeAgo?: string;
}

// Helper function to get platform styling
const getPlatformStyling = (platform: string) => {
  const platformMap: Record<string, { color: string; icon: string }> = {
    facebook: { color: 'bg-info-600', icon: '📘' },
    messenger: { color: 'bg-info-500', icon: '💬' },
    instagram: { color: 'bg-gradient-to-r from-primary-500 to-secondary-500', icon: '📷' },
    whatsapp: { color: 'bg-success-500', icon: '💬' },
    email: { color: 'bg-foreground', icon: '✉️' },
  };
  return platformMap[platform] || { color: 'bg-foreground', icon: '💬' };
};

interface SocialProofProps extends HomepageSectionProps {
  /** Active customer feedback, resolved on the server. */
  initialFeedback?: CustomerFeedback[] | null;
}

export default function SocialProof({
  eyebrow = 'Loved by our customers',
  title = 'Customer Reviews',
  subtitle,
  settings,
  initialFeedback,
}: SocialProofProps = {}) {
  const { t } = useTranslation();
  const limit = settingNumber(settings, 'limit', 3);
  const minRating = settingNumber(settings, 'minRating', 4);

  const { data, loading } = useSectionData<CustomerFeedback[]>(
    initialFeedback,
    async (signal) => {
      const response = await fetch(
        `/api/customer-feedback?limit=${Math.max(limit, 8)}`,
        { signal },
      );
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.feedbacks || [];
    },
    [limit],
  );

  const socialReviews = data || [];

  if (loading) {
    return (
      <HomeSection rhythm="filled" className="bg-gradient-to-br from-warning-50 via-warning-50/50 to-white" aria-busy>
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 h-8 w-64 animate-pulse rounded bg-muted"></div>
          <div className="mx-auto h-4 w-96 max-w-full animate-pulse rounded bg-muted"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-card p-6">
              <div className="mb-4 h-32 rounded bg-border"></div>
              <div className="mb-2 h-3 rounded bg-border"></div>
              <div className="h-3 w-2/3 rounded bg-border"></div>
            </div>
          ))}
        </div>
      </HomeSection>
    );
  }

  // Rating floor and count are admin-configurable; filter before rendering so an
  // empty result still short-circuits to `null` below.
  const visibleReviews = socialReviews
    .filter((review) => (review.rating ?? 0) >= minRating)
    .slice(0, limit);

  if (visibleReviews.length === 0) {
    return null;
  }

  return (
    <HomeSection rhythm="filled" className="bg-gradient-to-br from-warning-50 via-warning-50/50 to-white">
      <>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            align="center"
            className="mb-4"
          />
          <p className="max-w-2xl mx-auto font-paragraph text-lg text-muted-foreground">
            {t('home.socialProof.realFeedbackFromRealCustomersAcross')}
          </p>
        </motion.div>

        {/* Reviews Grid - 2 columns on mobile, 4 columns on md+ */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {visibleReviews.map((review, index) => {
            const platformStyling = getPlatformStyling(review.platform);
            return (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.05,
              }}
              whileHover={{ y: -4 }}
              className="bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-border h-full flex flex-col"
            >
              {/* Platform Badge */}
              <div className={`${platformStyling.color} px-3 py-2 flex items-center gap-2`}>
                <span className="text-base">{platformStyling.icon}</span>
                <span className="font-label text-white font-semibold text-xs">{review.platformName}</span>
              </div>

              {/* Customer & Review */}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative">
                    <img
                      src={review.customer.avatar}
                      alt={review.customer.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-warning-100 shadow-sm"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.customer.name)}&background=6366f1&color=fff&size=100`;
                      }}
                    />
                    {review.customer.verified && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-info-500 rounded-full flex items-center justify-center border-2 border-white">
                        <span className="font-label text-white text-[10px] font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="font-paragraph text-sm font-semibold text-foreground truncate">{review.customer.name}</p>
                    </div>
                    <div className="flex items-center gap-1 mb-1.5">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="text-warning-400 fill-current" size={13} />
                      ))}
                      <span className="ml-0.5 font-label text-xs font-semibold text-muted-foreground">{review.rating}.0</span>
                    </div>
                    <div className="flex items-center gap-1 font-caption text-xs text-subtle-foreground">
                      <span>📍</span>
                      <span className="truncate font-caption">{review.customer.location}</span>
                    </div>
                  </div>
                </div>

                <p className="mb-3 flex-1 font-paragraph text-sm leading-relaxed line-clamp-3 text-muted-foreground">
                  {review.message}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="font-caption text-subtle-foreground text-xs">{review.timeAgo || 'Recent'}</p>
                  <span className="font-caption text-xs text-subtle-foreground">{review.platformName}</span>
                </div>
              </div>

            </motion.div>
            );
          })}
        </motion.div>

        {/* Trust Badges - Minimal & Elegant */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 pt-8 border-t border-warning-100"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {[
              { icon: "🚚", text: t('home.socialProof.fastestDelivery') },
              { icon: "💬", text: t('home.socialProof.support247') },
              { icon: "↩️", text: t('home.socialProof.easyReturns') },
              { icon: "🔒", text: t('home.socialProof.securePayment') }
            ].map((badge, index) => (
              <motion.div
                key={badge.text}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-xl">{badge.icon}</span>
                <span className="font-label text-sm font-semibold">{badge.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </>
    </HomeSection>
  );
}
