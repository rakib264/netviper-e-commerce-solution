import 'server-only';

import { formatServerCurrency } from '@/lib/currency/server';
import { getCachedReturnPolicy } from '@/lib/returns/policy-settings-server';
import { BRAND } from '@/lib/seo/brand';
import { DELIVERY_PARAMS, resolveFaqs, type FaqEntry } from '@/lib/seo/faq';
import type { SeoContext } from '@/lib/seo/graph';

/**
 * Resolve FAQ entries into rendered question/answer pairs.
 *
 * The one place that turns the registry's keys into strings, so the visible
 * `FaqSection` and the `FAQPage` JSON-LD are rendered from a single call and
 * cannot say different things.
 *
 * Money is formatted through `lib/currency/server`, never concatenated with a
 * symbol: the answers quote a delivery charge and a free-delivery threshold, and
 * `tests/currency-hardcoding` fails the build on a symbol next to a dynamic
 * amount. It also means these figures follow the configured currency like every
 * other price on the site.
 *
 * The return window comes from the admin-authored returns policy rather than
 * from a constant, so the FAQ cannot promise a different window from the one
 * `hasMerchantReturnPolicy` publishes or the returns screen enforces.
 */
export async function resolveFaqsForPage(
  faqs: FaqEntry[],
  context: SeoContext,
): Promise<Array<{ id: string; question: string; answer: string }>> {
  const [dhakaCharge, nationwideCharge, freeThreshold, policy] = await Promise.all([
    formatServerCurrency(BRAND.delivery.dhaka.charge),
    formatServerCurrency(BRAND.delivery.nationwide.charge),
    formatServerCurrency(BRAND.delivery.freeThreshold),
    getCachedReturnPolicy().catch(() => null),
  ]);

  return resolveFaqs(faqs, context.t, {
    brand: context.seo.name,
    ...DELIVERY_PARAMS,
    dhakaCharge,
    nationwideCharge,
    freeThreshold,
    returnDays: policy?.returnWindowDays ?? 14,
  });
}

/**
 * Values every answer block interpolates.
 *
 * The same delivery numbers and formatted amounts the FAQs use, so the sentence
 * at the top of a page and the FAQ further down cannot quote different figures.
 */
export async function answerParams(
  context: SeoContext,
): Promise<Record<string, string | number>> {
  const [dhakaCharge, nationwideCharge, freeThreshold] = await Promise.all([
    formatServerCurrency(BRAND.delivery.dhaka.charge),
    formatServerCurrency(BRAND.delivery.nationwide.charge),
    formatServerCurrency(BRAND.delivery.freeThreshold),
  ]);

  return {
    brand: context.seo.name,
    founded: BRAND.foundingDate,
    ...DELIVERY_PARAMS,
    dhakaCharge,
    nationwideCharge,
    freeThreshold,
  };
}
