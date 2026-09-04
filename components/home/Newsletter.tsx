'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import HomeSection from '@/components/home/HomeSection';
import SectionHeading from '@/components/home/SectionHeading';
import {
  settingString,
  type HomepageSectionProps,
} from '@/components/home/section-props';
import { Text, Caption } from '@/components/ui/typography';
import { useSettings } from '@/hooks/use-settings';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function Newsletter({
  eyebrow = 'Newsletter',
  title,
  subtitle,
  // Renamed locally: `settings` already refers to the site settings hook below.
  settings: sectionSettings,
}: HomepageSectionProps = {}) {
  const { t } = useTranslation();
  const placeholder = settingString(
    sectionSettings,
    'placeholder',
    'Enter your email',
  );
  const buttonText = settingString(sectionSettings, 'buttonText', 'Subscribe');
  const disclaimer = settingString(sectionSettings, 'disclaimer');
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const settings = useSettings();
  const siteName = settings?.settings?.siteName || process.env.NEXT_PUBLIC_SITE_NAME;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubscribed(true);
      setIsLoading(false);
      setEmail('');
    }, 1500);
  };

  return (
    <HomeSection rhythm="filled" className="bg-gradient-to-br from-primary to-warning-400 text-white">
      <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-card/20 rounded-full mb-6">
              <Mail size={32} />
            </div>

            <SectionHeading
              eyebrow={eyebrow}
              title={title || t('home.newsletter.stayUpdatedWith', { brand: siteName ?? '' })}
              subtitle={subtitle}
              align="center"
              className="mb-4"
            />

            <Text size="xl" className="text-info-100 mb-8 max-w-2xl mx-auto">
              {t('home.newsletter.subscribeToOurNewsletterAndBe')}
            </Text>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-md mx-auto"
          >
            {!isSubscribed ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder={placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 h-12 border-white/20 bg-card/10 font-paragraph text-white placeholder:text-white/70 focus:bg-card/20"
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 bg-card px-6 font-button text-primary hover:bg-card/90"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      {t('home.newsletter.subscribe')}
                      <Send className="ml-2" size={16} />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="flex items-center justify-center space-x-3 text-success-200"
              >
                <CheckCircle size={24} />
                <Text size="lg" weight="medium">
                  {t('home.newsletter.thankYouForSubscribing')}
                </Text>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-wrap justify-center gap-6"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-400 rounded-full" />
              <Caption className="text-info-200">{t('home.newsletter.weeklyDealsOffers')}</Caption>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-warning-400 rounded-full" />
              <Caption className="text-info-200">{t('home.newsletter.newProductLaunches')}</Caption>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary-400 rounded-full" />
              <Caption className="text-info-200">{t('home.newsletter.exclusiveMemberBenefits')}</Caption>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6"
          >
            <Caption className="text-info-200">
              {t('home.newsletter.weRespectYourPrivacyUnsubscribeAt')}
            </Caption>
          </motion.div>
      </div>
    </HomeSection>
  );
}
