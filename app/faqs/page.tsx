'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  Phone,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function FAQsPage() {
  const { t, tPlural } = useTranslation();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const faqCategories = [
    {
      title: t('faqs.generalQuestions'),
      icon: HelpCircle,
      color: 'from-info-500 to-info-500',
      faqs: [
        {
          question: t('faqs.whatIsYourReturnPolicy'),
          answer: t('faqs.weOfferA30DayReturn')
        },
        {
          question: t('faqs.howDoITrackMyOrder'),
          answer: t('faqs.onceYourOrderIsShippedYou')
        },
        {
          question: t('faqs.doYouShipInternationally'),
          answer: t('faqs.currentlyWeOnlyShipWithinBangladesh')
        },
        {
          question: t('faqs.whatPaymentMethodsDoYouAccept'),
          answer: t('faqs.weAcceptAllMajorCreditCards')
        }
      ]
    },
    {
      title: t('faqs.shippingDelivery'),
      icon: MessageCircle,
      color: 'from-success-500 to-success-500',
      faqs: [
        {
          question: t('faqs.howLongDoesShippingTake'),
          answer: t('faqs.standardDeliveryTakes35Business')
        },
        {
          question: t('faqs.isShippingFree'),
          answer: t('faqs.freeShippingIsAvailableOnOrders')
        },
        {
          question: t('faqs.canIChangeMyDeliveryAddress'),
          answer: t('faqs.youCanChangeYourDeliveryAddress')
        },
        {
          question: t('faqs.whatIfIMNotAvailable'),
          answer: t('faqs.ourDeliveryTeamWillAttemptDelivery')
        }
      ]
    },
    {
      title: t('faqs.accountOrders'),
      icon: Phone,
      color: 'from-primary-500 to-secondary-500',
      faqs: [
        {
          question: t('faqs.howDoICreateAnAccount'),
          answer: t('faqs.clickOnSignUpInThe')
        },
        {
          question: t('faqs.canICancelMyOrder'),
          answer: t('faqs.youCanCancelYourOrderWithin')
        },
        {
          question: t('faqs.howDoIUpdateMyAccount'),
          answer: t('faqs.logIntoYourAccountGoTo')
        },
        {
          question: t('faqs.iForgotMyPasswordHowDo'),
          answer: t('faqs.clickOnForgotPasswordOnThe')
        }
      ]
    }
  ];

  const allFAQs = faqCategories.flatMap(category =>
    category.faqs.map(faq => ({ ...faq, category: category.title }))
  );

  const filteredFAQs = searchTerm
    ? allFAQs.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allFAQs;

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

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
              <HelpCircle className="w-4 h-4 mr-2" />
              {t('faqs.helpCenter')}
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-info-100 to-primary-100 bg-clip-text text-transparent">
              {t('faqs.frequentlyAskedQuestions')}
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              {t('faqs.findAnswersToCommonQuestionsAbout')}
            </p>

            <p className="text-lg text-subtle-foreground mb-10 max-w-3xl mx-auto">
              {t('faqs.canTFindWhatYouRe')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-subtle-foreground w-5 h-5" />
              <input
                type="text"
                placeholder={t('faqs.searchFaqs')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-border rounded-xl focus:ring-2 focus:ring-info-500 focus:border-transparent text-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Categories */}
      {!searchTerm && (
        <section className="py-20 bg-gradient-to-br from-muted to-accent">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                {t('faqs.browseByCategory')}
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {t('faqs.findAnswersOrganizedByTopicFor')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {faqCategories.map((category, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm cursor-pointer group">
                    <CardContent className="p-8 text-center">
                      <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <category.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-4">{category.title}</h3>
                      <p className="text-muted-foreground mb-6">{tPlural('faqs.questionCount', category.faqs.length)}</p>
                      <Button
                        variant="outline"
                        className="border-info-500 text-info-500 hover:bg-info-500 hover:text-white"
                        onClick={() => setSearchTerm(category.title)}
                      >
                        {t('faqs.browseQuestions')}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ List */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {searchTerm ? t('faqs.searchResultsCount', { count: filteredFAQs.length }) : t('faqs.allQuestions')}
            </h2>
            {searchTerm && (
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {t('faqs.showingResultsForQuery', { query: searchTerm })}
              </p>
            )}
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-4">
            {filteredFAQs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full p-6 text-left flex items-center justify-between hover:bg-muted/50 transition-colors duration-200"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground mb-2">{faq.question}</h3>
                        {!searchTerm && (
                          <Badge variant="outline" className="text-xs">
                            {faq.category}
                          </Badge>
                        )}
                      </div>
                      <motion.div
                        animate={{ rotate: openFAQ === index ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="w-5 h-5 text-subtle-foreground" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {openFAQ === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-0">
                            <div className="border-t border-border pt-4">
                              <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredFAQs.length === 0 && searchTerm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-foreground mb-4">{t('faqs.noResultsFound')}</h3>
              <p className="text-muted-foreground mb-6">{t('faqs.trySearchingWithDifferentKeywordsOr')}</p>
              <Button
                onClick={() => setSearchTerm('')}
                variant="outline"
                className="border-info-500 text-info-500 hover:bg-info-500 hover:text-white"
              >
                {t('faqs.clearSearch')}
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-20 bg-gradient-to-br from-muted to-accent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {t('faqs.stillNeedHelp')}
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              {t('faqs.ourCustomerSupportTeamIsAvailable')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-info-500 to-info-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('faqs.liveChat')}</h3>
                  <p className="text-muted-foreground mb-6">{t('faqs.getInstantHelpFromOurSupport')}</p>
                  <Button className="w-full bg-gradient-to-r from-info-500 to-info-500 hover:from-info-600 hover:to-info-600 text-white">
                    {t('faqs.startChat')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-success-500 to-success-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('faqs.phoneSupport')}</h3>
                  <p className="text-muted-foreground mb-6">{t('faqs.callUsForImmediateAssistance')}</p>
                  <Button className="w-full bg-gradient-to-r from-success-500 to-success-500 hover:from-success-600 hover:to-success-600 text-white">
                    {t('faqs.callNow')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{t('faqs.emailSupport')}</h3>
                  <p className="text-muted-foreground mb-6">{t('faqs.sendUsADetailedMessage')}</p>
                  <Link href="/contact">
                    <Button className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white">
                      {t('faqs.sendEmail')}
                    </Button>
                  </Link>
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
              {t('faqs.readyToShop')}
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              {t('faqs.nowThatYouHaveAllThe')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="bg-gradient-to-r from-info-500 to-primary-500 hover:from-info-600 hover:to-primary-600 text-white px-8 py-4 text-lg">
                  {t('faqs.browseProducts')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/privilege-members">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-card/10 px-8 py-4 text-lg">
                  {t('faqs.joinPrivilegeMembers')}
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
