import type { Metadata } from 'next';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';

/**
 * Privacy policy — the Bangladesh replacement for `/datenschutz`.
 *
 * A server component with no client half. The page is static prose with no
 * interactivity, and policy text is exactly the kind of content that has to be
 * in the initial HTML: a crawler or an answer engine that gives up before
 * hydration would otherwise see an empty shell where the policy should be.
 *
 * The copy is a plain-language description of what this codebase actually does
 * — SSLCommerz holds the card details, couriers get the address, marketing
 * defaults to off — rather than boilerplate. It still wants a legal review
 * before launch; it is accurate, not authoritative.
 */

/** Bumped by hand when the policy text changes. */
const LAST_UPDATED = '2026-09-16';

const SECTION_KEYS = [
  'controller',
  'collect',
  'payment',
  'sharing',
  'cookies',
  'retention',
  'rights',
  'contact',
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.privacyPolicy.title',
    descriptionKey: 'seo.privacyPolicy.description',
    descriptionValues: { brand: seo.name },
    path: '/privacy-policy',
  });
}

export default async function PrivacyPolicyPage() {
  const context = await getSeoContext();
  const { seo, t, locale } = context;

  const values = { brand: seo.name, email: seo.contact.email };

  const { graph } = await buildPageGraph(
    {
      path: '/privacy-policy',
      name: t('privacyPolicy.title'),
      description: t('seo.privacyPolicy.description', { brand: seo.name }),
      breadcrumbs: [{ name: t('privacyPolicy.title'), path: '/privacy-policy' }],
    },
    context,
  );

  // Formatted on the server against the active locale, and deterministic, so it
  // cannot differ between the server render and hydration.
  const lastUpdated = new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${LAST_UPDATED}T00:00:00Z`));

  return (
    <div className="min-h-screen bg-card">
      <JsonLd graph={graph} />
      <Header />

      <main className="luxury-container pb-20 pt-8 md:pt-12">
        <h1 className="text-4xl md:text-5xl">{t('privacyPolicy.title')}</h1>

        <p className="mt-3 font-caption text-xs uppercase tracking-[0.12em] text-subtle-foreground">
          {t('privacyPolicy.lastUpdated', { date: lastUpdated })}
        </p>

        {/*
          The extractable answer: self-contained, and true when lifted out of
          the page with no surrounding context. Sits above every heading so it
          is the first prose a crawler or an answer engine reaches.
        */}
        <p className="mt-8 max-w-3xl text-base leading-relaxed text-foreground">
          {t('privacyPolicy.lead', values)}
        </p>

        <div className="mt-10 max-w-3xl space-y-8">
          {SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="text-2xl">{t(`privacyPolicy.sections.${key}.title`)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(`privacyPolicy.sections.${key}.body`, values)}
              </p>
            </section>
          ))}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
