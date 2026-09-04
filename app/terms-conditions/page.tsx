'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CreditCard,
  FileText,
  Shield,
  Truck,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function TermsConditionsPage() {
  const { t } = useTranslation();
  const sections = [
    {
      title: t('termsConditions.acceptanceOfTerms'),
      icon: CheckCircle,
      color: 'from-success-500 to-success-500',
      content: `By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.`
    },
    {
      title: t('termsConditions.useLicense'),
      icon: FileText,
      color: 'from-info-500 to-info-500',
      content: `Permission is granted to temporarily download one copy of the materials on our website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not modify or copy the materials.`
    },
    {
      title: t('termsConditions.userAccounts'),
      icon: Users,
      color: 'from-primary-500 to-secondary-500',
      content: `When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.`
    },
    {
      title: t('termsConditions.paymentTerms'),
      icon: CreditCard,
      color: 'from-warning-500 to-destructive-500',
      content: `All payments are processed securely through our payment partners. By making a purchase, you agree to pay all charges incurred by you or any users of your account and credit card at the price(s) in effect when such charges are incurred.`
    },
    {
      title: t('termsConditions.shippingDelivery'),
      icon: Truck,
      color: 'from-info-500 to-primary-500',
      content: `We will make every effort to deliver your order within the estimated timeframe. However, delivery times may vary due to factors beyond our control. Risk of loss and title for products purchased pass to you upon delivery to the carrier.`
    },
    {
      title: t('termsConditions.returnsRefunds'),
      icon: Shield,
      color: 'from-info-500 to-success-500',
      content: `We offer a 30-day return policy for items in original condition. Refunds will be processed within 5-7 business days after we receive and inspect the returned item. Return shipping costs are the responsibility of the customer unless the item was defective.`
    }
  ];

  const importantPoints = [
    {
      title: t('termsConditions.privacyPolicy'),
      description: t('termsConditions.yourPrivacyIsImportantToUs'),
      icon: Shield
    },
    {
      title: t('termsConditions.prohibitedUses'),
      description: t('termsConditions.youMayNotUseOurWebsite'),
      icon: AlertTriangle
    },
    {
      title: t('termsConditions.intellectualProperty'),
      description: t('termsConditions.theContentOrganizationGraphicsDesignAnd'),
      icon: FileText
    },
    {
      title: t('termsConditions.limitationOfLiability'),
      description: t('termsConditions.inNoEventShallOurCompany'),
      icon: AlertTriangle
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
              <FileText className="w-4 h-4 mr-2" />
              {t('termsConditions.legalInformation')}
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-info-100 to-primary-100 bg-clip-text text-transparent">
              {t('termsConditions.termsConditions')}
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              {t('termsConditions.pleaseReadTheseTermsCarefullyBefore')}
            </p>

            <p className="text-lg text-subtle-foreground mb-10 max-w-3xl mx-auto">
              {t('termsConditions.theseTermsAndConditionsOutlineThe')}
            </p>

            <div className="text-sm text-subtle-foreground">
              {t('termsConditions.lastUpdated')} {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Terms Sections */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('termsConditions.termsConditions')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('termsConditions.comprehensiveTermsCoveringAllAspectsOf')}
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-6">
                      <div className={`w-16 h-16 bg-gradient-to-r ${section.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                        <section.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-foreground mb-4">{section.title}</h3>
                        <p className="text-muted-foreground leading-relaxed text-lg">{section.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Points */}
      <section className="py-20 bg-gradient-to-br from-muted to-accent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('termsConditions.importantInformation')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('termsConditions.keyPointsYouShouldBeAware')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {importantPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-muted-foreground to-foreground rounded-xl flex items-center justify-center flex-shrink-0">
                        <point.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-3">{point.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{point.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Terms */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-12 text-center">
              {t('termsConditions.additionalTerms')}
            </h2>

            <div className="space-y-8">
              <Card className="border-l-4 border-l-info-500 bg-info-50/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-foreground mb-4">{t('termsConditions.modifications')}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('termsConditions.weReserveTheRightToRevise')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-success-500 bg-success-50/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-foreground mb-4">{t('termsConditions.governingLaw')}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('termsConditions.theseTermsAndConditionsAreGoverned')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-primary-500 bg-primary-50/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-foreground mb-4">{t('termsConditions.contactInformation')}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('termsConditions.ifYouHaveAnyQuestionsAbout')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-warning-500 bg-warning-50/50">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-foreground mb-4">{t('termsConditions.severability')}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('termsConditions.ifAnyProvisionOfTheseTerms')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Agreement Section */}
      <section className="py-20 bg-gradient-to-br from-muted to-accent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <Card className="border-0 shadow-xl bg-card/90 backdrop-blur-sm">
              <CardContent className="p-12">
                <div className="w-20 h-20 bg-gradient-to-r from-info-500 to-primary-500 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  {t('termsConditions.agreementToTerms')}
                </h2>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  {t('termsConditions.byUsingOurWebsiteAndServices')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/products">
                    <Button size="lg" variant="outline">
                      {t('termsConditions.continueShopping')}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button size="lg" variant="outline" className="border-info-500 text-info-500 hover:bg-info-500 hover:text-white px-8 py-4 text-lg">
                      {t('termsConditions.contactUs')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
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
              {t('termsConditions.questionsAboutOurTerms')}
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              {t('termsConditions.ourLegalTeamIsHereTo')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-gradient-to-r from-info-500 to-primary-500 hover:from-info-600 hover:to-primary-600 text-white px-8 py-4 text-lg">
                  {t('termsConditions.contactLegalTeam')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/faqs">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-card/10 px-8 py-4 text-lg">
                  {t('termsConditions.viewFaqs')}
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
