"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function ImpressumPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-card">
      <Header />
      <main className="luxury-container pb-20 pt-8 md:pt-12">
        <h1 className="text-4xl md:text-5xl">{t('impressum.impressum')}</h1>
        <div className="mt-8 max-w-3xl space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            {t('impressum.thisPageContainsMandatoryLegalInformation')}
          </p>
          <p>
            <strong className="text-foreground">{t('impressum.companyName')}</strong> {t('impressum.mascariMartGmbh')}
          </p>
          <p>
            <strong className="text-foreground">{t('impressum.registeredAddress')}</strong>{" "}
            {t('impressum.exampleStreet1010115BerlinGermany')}
          </p>
          <p>
            <strong className="text-foreground">{t('impressum.representedBy')}</strong> {t('impressum.managingDirectorName')}
          </p>
          <p>
            <strong className="text-foreground">{t('impressum.commercialRegister')}</strong>{" "}
            {t('impressum.amtsgerichtBerlinCharlottenburgHrbXxxxx')}
          </p>
          <p>
            <strong className="text-foreground">{t('impressum.vatId')}</strong> {t('impressum.dexxxxxxxxx')}
          </p>
          <p>
            <strong className="text-foreground">{t('impressum.contact')}</strong>{" "}
            {t('impressum.clientcareMascarimartCom')}
          </p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
