'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Heart, Shield, Star, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function AboutUsPage() {
  const { t } = useTranslation();
  const features = [
    {
      icon: Heart,
      title: t('about.passionForOrganic'),
      description: t('about.weBelieveOrganicFoodIsEssential')
    },
    {
      icon: Award,
      title: t('about.farmFreshQuality'),
      description: t('about.everyProductIsSourcedDirectlyFrom')
    },
    {
      icon: Users,
      title: t('about.healthFirst'),
      description: t('about.yourFamilySHealthAndNutrition')
    },
    {
      icon: Shield,
      title: t('about.trustedSource'),
      description: t('about.buildingTrustThroughTransparencyTraceability')
    }
  ];

  const stats = [
    { number: '50K+', label: t('about.happyFamilies') },
    { number: '100+', label: t('about.partnerFarms') },
    { number: '99%', label: t('about.organicCertified') },
    { number: '24/7', label: t('about.freshDelivery') }
  ];

  const values = [
    {
      title: t('about.organicPurity'),
      description: t('about.weSourceOnlyCertifiedOrganicProducts'),
      color: 'from-success-500 to-success-500'
    },
    {
      title: t('about.farmFreshQuality'),
      description: t('about.directPartnershipsWithLocalFarmersEnsure'),
      color: 'from-primary-500 to-secondary-500'
    },
    {
      title: t('about.healthNutrition'),
      description: t('about.nutritiousFoodForEveryoneSupportingHealthy'),
      color: 'from-success-600 to-success-500'
    },
    {
      title: t('about.sustainability'),
      description: t('about.committedToEcoFriendlyFarmingPractices'),
      color: 'from-success-500 to-info-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-white to-accent">
      <Header />
      {/* Hero Section */}
      <section className="pt-16 relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-foreground text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-info-500/10 via-primary-500/10 to-secondary-500/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-info-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge className="mb-6 bg-gradient-to-r from-success-500 to-success-500 text-white border-0 px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              {t('about.certifiedOrganicExperience')}
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-success-100 to-success-100 bg-clip-text text-transparent">
              {t('about.aboutOurFarm')}
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              {t('about.weProvideFreshOrganicAndNaturally')}
            </p>

            <p className="text-lg text-subtle-foreground mb-10 max-w-3xl mx-auto">
              {t('about.inspiredBySustainableFarmingPracticesAnd')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="bg-gradient-to-r from-success-500 to-success-500 hover:from-success-600 hover:to-success-600 text-white px-8 py-4 text-lg">
                  {t('about.shopFreshFood')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-card/10 px-8 py-4 text-lg">
                  {t('about.contactOurFarm')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-info-500 to-primary-500 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-muted to-accent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('about.whyChooseOurOrganicFood')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('about.weReMoreThanJustA')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-info-500 to-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('about.ourFarmValues')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('about.thesePrinciplesGuideOurFarmingPractices')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-muted">
                  <CardContent className="p-8">
                    <div className={`w-12 h-12 bg-gradient-to-r ${value.color} rounded-xl flex items-center justify-center mb-6`}>
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-4">{value.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-foreground via-foreground to-foreground text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t('about.readyToEatHealthy')}
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              {t('about.joinThousandsOfFamiliesWhoTrust')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="bg-gradient-to-r from-success-500 to-success-500 hover:from-success-600 hover:to-success-600 text-white px-8 py-4 text-lg">
                  {t('about.shopFreshFood')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/privilege-members">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-card/10 px-8 py-4 text-lg">
                  {t('about.joinFreshClub')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
