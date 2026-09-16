'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle,
    Clock,
    Info,
    MapPin,
    Package,
    Shield,
    Star,
    Truck
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function ShippingDeliveryPageClient() {
  const { t } = useTranslation();
  const shippingOptions = [
    {
      name: 'Standard Delivery',
      duration: '3-5 Business Days',
      price: '100 €',
      description: t('shippingDelivery.regularShippingForMostAreas'),
      icon: Package,
      popular: false
    },
    {
      name: 'Express Delivery',
      duration: '1-2 Business Days',
      price: '200 €',
      description: t('shippingDelivery.fastDeliveryForUrgentOrders'),
      icon: Truck,
      popular: true
    },
    {
      name: 'Same Day Delivery',
      duration: 'Same Day',
      price: '300 €',
      description: t('shippingDelivery.availableInSelectedAreasOnly'),
      icon: Clock,
      popular: false
    }
  ];

  const deliverySteps = [
    {
      step: 1,
      title: t('shippingDelivery.orderPlaced'),
      description: t('shippingDelivery.yourOrderIsConfirmedAndPayment'),
      icon: CheckCircle
    },
    {
      step: 2,
      title: t('shippingDelivery.processing'),
      description: t('shippingDelivery.wePrepareYourItemsWithCare'),
      icon: Package
    },
    {
      step: 3,
      title: t('shippingDelivery.shipped'),
      description: t('shippingDelivery.yourOrderIsDispatchedWithTracking'),
      icon: Truck
    },
    {
      step: 4,
      title: t('shippingDelivery.delivered'),
      description: t('shippingDelivery.yourOrderArrivesSafelyAtYour'),
      icon: MapPin
    }
  ];

  const coverageAreas = [
    { area: 'Dhaka', status: 'Available', delivery: '1-2 days' },
    { area: 'Chittagong', status: 'Available', delivery: '2-3 days' },
    { area: 'Sylhet', status: 'Available', delivery: '2-3 days' },
    { area: 'Rajshahi', status: 'Available', delivery: '3-4 days' },
    { area: 'Khulna', status: 'Available', delivery: '3-4 days' },
    { area: 'Barisal', status: 'Available', delivery: '3-4 days' },
    { area: 'Rangpur', status: 'Available', delivery: '4-5 days' },
    { area: 'Mymensingh', status: 'Available', delivery: '3-4 days' }
  ];

  const policies = [
    {
      title: t('shippingDelivery.freeShipping'),
      description: t('shippingDelivery.freeShippingOnOrdersAbove2000'),
      icon: Star,
      color: 'from-success-500 to-success-500'
    },
    {
      title: t('shippingDelivery.securePackaging'),
      description: t('shippingDelivery.allItemsAreCarefullyPackagedFor'),
      icon: Shield,
      color: 'from-info-500 to-info-500'
    },
    {
      title: t('shippingDelivery.realTimeTracking'),
      description: t('shippingDelivery.trackYourOrderFromDispatchTo'),
      icon: MapPin,
      color: 'from-primary-500 to-secondary-500'
    },
    {
      title: t('shippingDelivery.easyReturns'),
      description: '30-day return policy for all items',
      icon: CheckCircle,
      color: 'from-warning-500 to-destructive-500'
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
            <Badge className="mb-6 bg-gradient-to-r from-info-500 to-primary-500 text-white border-0 px-4 py-2">
              <Truck className="w-4 h-4 mr-2" />
              {t('shippingDelivery.fastReliableDelivery')}
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-info-100 to-primary-100 bg-clip-text text-transparent">
              {t('shippingDelivery.shippingDelivery')}
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              {t('shippingDelivery.getYourFashionItemsDeliveredQuickly')}
            </p>

            <p className="text-lg text-subtle-foreground mb-10 max-w-3xl mx-auto">
              {t('shippingDelivery.weUnderstandThatWaitingForYour')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Shipping Options */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('shippingDelivery.chooseYourDeliverySpeed')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('shippingDelivery.selectTheDeliveryOptionThatBest')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {shippingOptions.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {option.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-info-500 to-primary-500 text-white px-4 py-1">
                      {t('shippingDelivery.mostPopular')}
                    </Badge>
                  </div>
                )}
                <Card className={`h-full border-2 transition-all duration-300 hover:shadow-xl ${
                  option.popular
                    ? 'border-info-500 shadow-lg'
                    : 'border-border hover:border-info-300'
                }`}>
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                      option.popular
                        ? 'bg-gradient-to-r from-info-500 to-primary-500'
                        : 'bg-gradient-to-r from-muted-foreground to-foreground'
                    }`}>
                      <option.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{option.name}</CardTitle>
                    <div className="text-3xl font-bold bg-gradient-to-r from-info-500 to-primary-500 bg-clip-text text-transparent">
                      {option.price}
                    </div>
                    <p className="text-muted-foreground font-medium">{option.duration}</p>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-6">{option.description}</p>
                    <Button
                      className={`w-full ${
                        option.popular
                          ? 'bg-gradient-to-r from-info-500 to-primary-500 hover:from-info-600 hover:to-primary-600'
                          : 'bg-foreground hover:bg-foreground/90'
                      } text-white`}
                    >
                      {t('shippingDelivery.chooseThisOption')}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Process */}
      <section className="py-20 bg-gradient-to-br from-muted to-accent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('shippingDelivery.howItWorks')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('shippingDelivery.fromOrderPlacementToDeliveryHere')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {deliverySteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-info-500 to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  {index < deliverySteps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-info-500 to-primary-500 transform translate-x-10" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{t('shippingDelivery.step')} {step.step}</h3>
                <h4 className="text-lg font-semibold text-foreground mb-2">{step.title}</h4>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage Areas */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('shippingDelivery.deliveryCoverage')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('shippingDelivery.weDeliverToAllMajorCities')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coverageAreas.map((area, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-muted">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-success-500 to-success-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{area.area}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{area.status}</p>
                    <p className="text-sm font-medium text-info-600">{area.delivery}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="py-20 bg-gradient-to-br from-muted to-accent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('shippingDelivery.ourShippingPolicies')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('shippingDelivery.transparentPoliciesDesignedToGiveYou')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {policies.map((policy, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <div className={`w-16 h-16 bg-gradient-to-r ${policy.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                      <policy.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">{policy.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{policy.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notes */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-12 text-center">
              {t('shippingDelivery.importantInformation')}
            </h2>

            <div className="space-y-6">
              <Card className="border-l-4 border-l-info-500 bg-info-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Info className="w-6 h-6 text-info-500 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-foreground mb-2">{t('shippingDelivery.deliveryTimeframes')}</h3>
                      <p className="text-muted-foreground">
                        {t('shippingDelivery.deliveryTimesAreCalculatedFromThe')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-warning-500 bg-warning-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="w-6 h-6 text-warning-500 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-foreground mb-2">{t('shippingDelivery.deliveryAttempts')}</h3>
                      <p className="text-muted-foreground">
                        {t('shippingDelivery.weMakeUpTo3Delivery')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-success-500 bg-success-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <CheckCircle className="w-6 h-6 text-success-500 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-foreground mb-2">{t('shippingDelivery.contactInformation')}</h3>
                      <p className="text-muted-foreground">
                        {t('shippingDelivery.pleaseEnsureYourContactInformationIs')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
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
              {t('shippingDelivery.readyToPlaceYourOrder')}
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              {t('shippingDelivery.experienceFastReliableDeliveryWithOur')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="bg-gradient-to-r from-info-500 to-primary-500 hover:from-info-600 hover:to-primary-600 text-white px-8 py-4 text-lg">
                  {t('shippingDelivery.shopNow')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline-secondary" className="w-full">
                  {t('shippingDelivery.contactSupport')}
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
