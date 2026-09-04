'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  Crown,
  Gift,
  Star,
  Truck,
  Users,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function PrivilegeMembersPage() {
  const { t } = useTranslation();
  const membershipTiers = [
    {
      name: 'Silver Member',
      price: 'Free',
      description: t('privilegeMembers.perfectForOccasionalShoppers'),
      icon: Star,
      color: 'from-muted-foreground to-foreground',
      features: [
        '5% discount on all purchases',
        'Free shipping on orders above 1500 €',
        'Early access to sales',
        'Birthday surprise gift',
        'Priority customer support'
      ],
      popular: false
    },
    {
      name: 'Gold Member',
      price: '500 €/year',
      description: t('privilegeMembers.forRegularFashionEnthusiasts'),
      icon: Crown,
      color: 'from-warning-500 to-warning-500',
      features: [
        '10% discount on all purchases',
        'Free shipping on all orders',
        'Exclusive early access to new collections',
        'Personal style consultation',
        'VIP customer support',
        'Monthly exclusive offers',
        'Free returns and exchanges'
      ],
      popular: true
    },
    {
      name: 'Platinum Member',
      price: '1000 €/year',
      description: t('privilegeMembers.ultimateLuxuryExperience'),
      icon: Zap,
      color: 'from-primary-500 to-secondary-500',
      features: [
        '15% discount on all purchases',
        'Free express shipping on all orders',
        'First access to limited edition items',
        'Personal shopper service',
        '24/7 dedicated support',
        'Exclusive member-only events',
        'Free alterations and customization',
        'Quarterly luxury gift box'
      ],
      popular: false
    }
  ];

  const benefits = [
    {
      title: t('privilegeMembers.exclusiveDiscounts'),
      description: t('privilegeMembers.enjoySpecialMemberOnlyPricingOn'),
      icon: Gift,
      color: 'from-success-500 to-success-500'
    },
    {
      title: t('privilegeMembers.earlyAccess'),
      description: t('privilegeMembers.beTheFirstToShopNew'),
      icon: Zap,
      color: 'from-info-500 to-info-500'
    },
    {
      title: t('privilegeMembers.freeShipping'),
      description: t('privilegeMembers.complimentaryShippingOnAllOrdersNo'),
      icon: Truck,
      color: 'from-primary-500 to-secondary-500'
    },
    {
      title: t('privilegeMembers.vipSupport'),
      description: t('privilegeMembers.priorityCustomerServiceWithDedicatedSupport'),
      icon: Users,
      color: 'from-warning-500 to-destructive-500'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Ahmed',
      tier: 'Gold Member',
      comment: 'The exclusive early access to new collections is amazing! I always get the best pieces before they sell out.',
      rating: 5
    },
    {
      name: 'Rahim Khan',
      tier: 'Platinum Member',
      comment: 'The personal shopper service has completely transformed my wardrobe. Highly recommended!',
      rating: 5
    },
    {
      name: 'Fatima Begum',
      tier: 'Silver Member',
      comment: 'Great value for money. The discounts and free shipping make shopping so much better.',
      rating: 5
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
            <Badge className="mb-6 bg-gradient-to-r from-warning-500 to-warning-500 text-white border-0 px-4 py-2">
              <Crown className="w-4 h-4 mr-2" />
              {t('privilegeMembers.exclusiveMembership')}
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-warning-100 to-warning-100 bg-clip-text text-transparent">
              {t('privilegeMembers.privilegeMembers')}
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              {t('privilegeMembers.unlockExclusiveBenefitsAndElevateYour')}
            </p>

            <p className="text-lg text-subtle-foreground mb-10 max-w-3xl mx-auto">
              {t('privilegeMembers.joinOurExclusiveMembershipProgramAnd')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-warning-500 to-warning-500 hover:from-warning-600 hover:to-warning-600 text-white px-8 py-4 text-lg">
                {t('privilegeMembers.joinNow')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Link href="/about">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-card/10 px-8 py-4 text-lg">
                  {t('privilegeMembers.learnMore')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('privilegeMembers.exclusiveBenefits')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('privilegeMembers.discoverThePremiumAdvantagesThatCome')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <div className={`w-16 h-16 bg-gradient-to-r ${benefit.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                      <benefit.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">{benefit.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Tiers */}
      <section className="py-20 bg-gradient-to-br from-muted to-accent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('privilegeMembers.chooseYourMembership')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('privilegeMembers.selectTheMembershipTierThatBest')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {membershipTiers.map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-warning-500 to-warning-500 text-white px-4 py-1">
                      {t('privilegeMembers.mostPopular')}
                    </Badge>
                  </div>
                )}
                <Card className={`h-full border-2 transition-all duration-300 hover:shadow-xl ${
                  tier.popular
                    ? 'border-warning-500 shadow-lg'
                    : 'border-border hover:border-warning-300'
                }`}>
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-gradient-to-r ${tier.color}`}>
                      <tier.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{tier.name}</CardTitle>
                    <div className="text-3xl font-bold bg-gradient-to-r from-warning-500 to-warning-500 bg-clip-text text-transparent">
                      {tier.price}
                    </div>
                    <p className="text-muted-foreground font-medium">{tier.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full mt-6 ${
                        tier.popular
                          ? 'bg-gradient-to-r from-warning-500 to-warning-500 hover:from-warning-600 hover:to-warning-600'
                          : 'bg-foreground hover:bg-foreground/90'
                      } text-white`}
                    >
                      {tier.price === 'Free' ? t('privilegeMembers.joinFree') : t('privilegeMembers.subscribeNow')}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('privilegeMembers.whatOurMembersSay')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('privilegeMembers.hearFromOurSatisfiedPrivilegeMembers')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-muted">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-warning-500 fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic">"{testimonial.comment}"</p>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-warning-500 to-warning-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground">{testimonial.tier}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-muted to-accent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('privilegeMembers.frequentlyAskedQuestions')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('privilegeMembers.everythingYouNeedToKnowAbout')}
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-6">
            {[
              {
                question: t('privilegeMembers.howDoIBecomeAPrivilege'),
                answer: t('privilegeMembers.simplySignUpForAnyMembership')
              },
              {
                question: t('privilegeMembers.canIUpgradeOrDowngradeMy'),
                answer: t('privilegeMembers.yesYouCanUpgradeOrDowngrade')
              },
              {
                question: t('privilegeMembers.areTheDiscountsStackableWithOther'),
                answer: t('privilegeMembers.memberDiscountsCanBeCombinedWith')
              },
              {
                question: t('privilegeMembers.whatHappensIfICancelMy'),
                answer: t('privilegeMembers.youLlRetainYourMembershipBenefits')
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-foreground mb-3">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
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
              {t('privilegeMembers.readyToJoinTheElite')}
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              {t('privilegeMembers.startYourJourneyToExclusiveFashion')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-warning-500 to-warning-500 hover:from-warning-600 hover:to-warning-600 text-white px-8 py-4 text-lg">
                {t('privilegeMembers.joinPrivilegeMembers')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-card/10 px-8 py-4 text-lg">
                  {t('privilegeMembers.contactUs')}
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
