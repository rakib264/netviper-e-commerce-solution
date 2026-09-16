import { BRAND } from '@/lib/seo/brand';

/**
 * The FAQ registry.
 *
 * Answer engines — ChatGPT, Perplexity, AI Overviews, Gemini, Copilot — extract
 * short, self-contained, attributable answers. They do not summarise a page;
 * they lift a passage out of it. So an answer here has to survive being quoted
 * with no surrounding context: "it ships in 2 days" is useless once lifted,
 * where "Ramen Bhai delivers across Dhaka in 1–2 days and nationwide in 3–5
 * days, with free delivery over ৳2,000" still says something true on its own.
 *
 * Stored as i18n **key pairs**, never English strings, because these feed two
 * consumers that must not drift apart:
 *
 *   1. `faqSchema()` — the `FAQPage` JSON-LD
 *   2. `components/seo/FaqSection.tsx` — the same Q&As as visible text
 *
 * Both are required. Google treats FAQ schema with no visible counterpart as a
 * spam signal, so the two read one registry rather than each holding a copy.
 *
 * Answers that quote a number — a delivery window, a charge, a threshold —
 * interpolate it from `BRAND.delivery` rather than spelling it out, so the
 * promise is stated in exactly one place and the FAQ cannot contradict the
 * `shippingDetails` in the product schema.
 */

export interface FaqEntry {
  /** Stable id, used as the DOM id an anchor link can target. */
  id: string;
  questionKey: string;
  answerKey: string;
  /** Values interpolated into the answer. */
  params?: Record<string, string | number>;
}

/** Numbers every delivery answer shares, so none can drift from the others. */
export const DELIVERY_PARAMS = {
  city: BRAND.areaServed.primaryCity,
  country: BRAND.areaServed.country,
  dhakaMin: BRAND.delivery.dhaka.minDays,
  dhakaMax: BRAND.delivery.dhaka.maxDays,
  natMin: BRAND.delivery.nationwide.minDays,
  natMax: BRAND.delivery.nationwide.maxDays,
} as const;

function entry(id: string, params?: FaqEntry['params']): FaqEntry {
  return {
    id,
    questionKey: `faq.${id}.question`,
    answerKey: `faq.${id}.answer`,
    params,
  };
}

/**
 * The store-wide set, shown on `/faqs` and reused wherever a page has no more
 * specific list. These are the questions a first-time customer actually asks,
 * and the ones an answer engine is most likely to be asked on their behalf.
 */
export const GENERAL_FAQS: FaqEntry[] = [
  entry('whatIsRamenBhai'),
  entry('deliveryAreas', { ...DELIVERY_PARAMS }),
  entry('deliveryCharge'),
  entry('freeDelivery'),
  entry('minimumOrder'),
  entry('paymentMethods'),
  entry('returns'),
  entry('halal'),
  entry('authenticity'),
  entry('supportHours'),
];

/** Shipping-specific, for `/shipping-delivery`. */
export const SHIPPING_FAQS: FaqEntry[] = [
  entry('deliveryAreas', { ...DELIVERY_PARAMS }),
  entry('deliveryCharge'),
  entry('freeDelivery'),
  entry('trackOrder'),
  entry('missedDelivery'),
];

/** Returns-specific, for the returns policy surface. */
export const RETURNS_FAQS: FaqEntry[] = [
  entry('returns'),
  entry('damagedItem'),
  entry('refundTime'),
];

/**
 * Category-page FAQs, keyed by the vocabulary in `BRAND.keywordSeeds`.
 *
 * Matched against a category's slug and name, so a store can rename a category
 * without losing its FAQs — and a category with no match simply falls back to
 * the general set rather than showing answers about something it does not sell.
 */
const CATEGORY_FAQ_MATCHERS: Array<{ test: RegExp; faqs: FaqEntry[] }> = [
  {
    test: /ramen|ramyun|noodle|samyang|buldak|shin|nongshim|ottogi|paldo/i,
    faqs: [
      entry('whatIsKoreanRamen'),
      entry('leastSpicyRamen'),
      entry('ramenVsRamyun'),
      entry('cookRamen'),
      entry('halal'),
    ],
  },
  {
    test: /bibigo|mandu|dumpling|tteokbokki|gochujang/i,
    faqs: [entry('bibigoHalal'), entry('storeMandu'), entry('cookMandu'), entry('authenticity')],
  },
  {
    test: /sushi|nori|wasabi|soy ?sauce/i,
    faqs: [entry('sushiAtHome'), entry('sushiRice'), entry('storeNori')],
  },
  {
    test: /drink|tang|rooh|juice|beverage|coffee|tea/i,
    faqs: [entry('drinkMixes'), entry('authenticity'), entry('deliveryCharge')],
  },
  {
    test: /snack|popcorn|chips|biscuit|candy/i,
    faqs: [entry('snacksShelfLife'), entry('halal'), entry('authenticity')],
  },
];

/**
 * FAQs for one category.
 *
 * Deliberately returns a real, topical set or the general one — never an
 * invented per-category fact. A template that made up answers about a category
 * it knows nothing about would be worse than showing none.
 */
export function faqsForCategory(category: { name?: string; slug?: string }): FaqEntry[] {
  const haystack = `${category.slug || ''} ${category.name || ''}`;
  const match = CATEGORY_FAQ_MATCHERS.find((candidate) => candidate.test.test(haystack));
  return match ? match.faqs : GENERAL_FAQS.slice(0, 5);
}

/**
 * FAQs for one product.
 *
 * Only questions this codebase can answer truthfully from `brand.ts` or from
 * the product row itself. Per-product facts that are genuinely per-product —
 * spice level, cooking time, allergens, weight — are deliberately absent: they
 * belong in product fields, and inventing them in a template is how a catalogue
 * ends up asserting a cooking time for a bottle of soy sauce.
 */
export function faqsForProduct(product: {
  name?: string;
  categoryName?: string;
}): FaqEntry[] {
  const topical = faqsForCategory({ name: product.categoryName });
  const shared = [entry('deliveryAreas', { ...DELIVERY_PARAMS }), entry('returns')];

  // De-duplicate by id: a category set may already include `returns`.
  const seen = new Set<string>();
  return [...topical, ...shared].filter((faq) => {
    if (seen.has(faq.id)) return false;
    seen.add(faq.id);
    return true;
  });
}

/** Resolve a registry entry into the rendered strings both consumers need. */
export function resolveFaqs(
  faqs: FaqEntry[],
  t: (key: string, values?: Record<string, string | number>) => string,
  extraParams: Record<string, string | number> = {},
): Array<{ id: string; question: string; answer: string }> {
  return faqs.map((faq) => ({
    id: faq.id,
    question: t(faq.questionKey, { ...extraParams, ...faq.params }),
    answer: t(faq.answerKey, { ...extraParams, ...faq.params }),
  }));
}
