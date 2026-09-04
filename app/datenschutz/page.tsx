"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function DatenschutzPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-card">
      <Header />
      <main className="luxury-container pb-20 pt-8 md:pt-12">
        <h1 className="text-4xl md:text-5xl">{t('datenschutz.datenschutz')}</h1>
        <div className="mt-8 max-w-3xl space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            {t('datenschutz.thisPrivacyPageIsAStarter')}
          </p>
          <h2 className="pt-4 text-2xl">{t('datenschutz.n1DataController')}</h2>
          <p>
            {t('datenschutz.mascariMartGmbhExampleStreet10')}
          </p>
          <h2 className="pt-4 text-2xl">{t('datenschutz.n2DataWeProcess')}</h2>
          <p>
            {t('datenschutz.weProcessAccountOrderPaymentAnd')}
          </p>
          <h2 className="pt-4 text-2xl">{t('datenschutz.n3YourRights')}</h2>
          <p>
            {t('datenschutz.youCanRequestAccessCorrectionDeletion')}
          </p>
          <h2 className="pt-4 text-2xl">{t('datenschutz.n4Contact')}</h2>
          <p>
            {t('datenschutz.pleaseContactUsAtClientcareMascarimart')}
          </p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
