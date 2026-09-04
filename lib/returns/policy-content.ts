import { DEFAULT_RETURN_WINDOW_DAYS } from '@/lib/returns/policy';

/**
 * Admin-editable returns policy copy.
 *
 * The customer-facing policy is *content*, not UI: a brand rewords it, adds a
 * clause, or changes a window without a deploy. So it lives in settings rather
 * than in the locale files — but it still has to be translatable, hence a text
 * map per locale rather than a single string.
 *
 * Shipped with sensible defaults so a fresh store has a complete, accurate
 * policy page before anyone opens the admin screen.
 */

export type PolicyLocale = 'en' | 'bn' | 'de';

export type LocalizedPolicyText = Record<PolicyLocale, string>;

export interface ReturnPolicySection {
  /** Stable id, so reordering or retitling never breaks a link or a test. */
  key: string;
  title: LocalizedPolicyText;
  body: LocalizedPolicyText;
  order: number;
}

export interface ReturnPolicyContent {
  /** Quoted in the summary. The enforced window is per product; this is the headline. */
  returnWindowDays: number;
  exchangeWindowDays: number;
  freeReturnShipping: boolean;
  sections: ReturnPolicySection[];
}

/**
 * Read one locale out of a policy text map.
 *
 * Falls back to English and then to the first non-empty value, so a section an
 * admin only filled in for one language still renders rather than showing a
 * blank card.
 */
export function readPolicyText(
  text: Partial<LocalizedPolicyText> | undefined,
  locale: string,
): string {
  if (!text) return '';
  const preferred = text[locale as PolicyLocale];
  if (preferred && preferred.trim()) return preferred;
  if (text.en && text.en.trim()) return text.en;
  return Object.values(text).find((value) => value && value.trim()) || '';
}

export const DEFAULT_RETURN_POLICY: ReturnPolicyContent = {
  returnWindowDays: DEFAULT_RETURN_WINDOW_DAYS,
  exchangeWindowDays: DEFAULT_RETURN_WINDOW_DAYS,
  freeReturnShipping: true,
  sections: [
    {
      key: 'window',
      order: 0,
      title: {
        en: 'Return window',
        bn: 'রিটার্নের সময়সীমা',
        de: 'Rückgabefrist',
      },
      body: {
        en: 'You can request a return within 14 days of delivery. Some items carry a shorter window, which is shown on the product page.',
        bn: 'ডেলিভারির ১৪ দিনের মধ্যে রিটার্নের অনুরোধ করতে পারেন। কিছু পণ্যের সময়সীমা কম, যা প্রোডাক্ট পেজে দেখানো হয়।',
        de: 'Sie können innerhalb von 14 Tagen nach Zustellung eine Rücksendung beantragen. Für einige Artikel gilt eine kürzere Frist, die auf der Produktseite angegeben ist.',
      },
    },
    {
      key: 'condition',
      order: 1,
      title: {
        en: 'Item condition',
        bn: 'পণ্যের অবস্থা',
        de: 'Zustand des Artikels',
      },
      body: {
        en: 'Items must be unused and in their original condition, with tags and packaging intact.',
        bn: 'পণ্য অব্যবহৃত ও আসল অবস্থায় থাকতে হবে, ট্যাগ ও প্যাকেজিং অক্ষত অবস্থায়।',
        de: 'Artikel müssen unbenutzt und im Originalzustand sein, mit unbeschädigten Etiketten und Verpackung.',
      },
    },
    {
      key: 'exclusions',
      order: 2,
      title: {
        en: 'What cannot be returned',
        bn: 'যা ফেরত নেওয়া যায় না',
        de: 'Was nicht zurückgegeben werden kann',
      },
      body: {
        en: 'Personalised and made-to-order pieces, hygiene items, and final-sale purchases cannot be returned. Any such item is marked on its product page.',
        bn: 'পার্সোনালাইজড ও অর্ডারমাফিক তৈরি পণ্য, স্বাস্থ্যবিধি সংক্রান্ত পণ্য এবং ফাইনাল সেলের কেনাকাটা ফেরত নেওয়া যায় না। এমন পণ্য তার প্রোডাক্ট পেজে চিহ্নিত থাকে।',
        de: 'Personalisierte und auf Bestellung gefertigte Stücke, Hygieneartikel und Endverkäufe können nicht zurückgegeben werden. Solche Artikel sind auf ihrer Produktseite gekennzeichnet.',
      },
    },
    {
      key: 'exchange',
      order: 3,
      title: {
        en: 'Exchanges',
        bn: 'এক্সচেঞ্জ',
        de: 'Umtausch',
      },
      body: {
        en: 'Exchanges follow the same window and conditions as returns. Choose "Exchange" when you open a request and tell us the size or colour you would prefer.',
        bn: 'এক্সচেঞ্জে রিটার্নের মতোই সময়সীমা ও শর্ত প্রযোজ্য। অনুরোধ করার সময় "এক্সচেঞ্জ" বাছুন এবং পছন্দের সাইজ বা রঙ জানান।',
        de: 'Für den Umtausch gelten dieselbe Frist und dieselben Bedingungen wie für Rücksendungen. Wählen Sie beim Anlegen einer Anfrage „Umtausch" und nennen Sie uns die gewünschte Größe oder Farbe.',
      },
    },
    {
      key: 'refund',
      order: 4,
      title: {
        en: 'Refunds',
        bn: 'রিফান্ড',
        de: 'Rückerstattungen',
      },
      body: {
        en: 'Once we receive and check the item, your refund is issued to the original payment method. Bank processing can add a few working days.',
        bn: 'পণ্য পাওয়ার ও যাচাইয়ের পর আসল পেমেন্ট মাধ্যমে রিফান্ড দেওয়া হয়। ব্যাংক প্রসেসিংয়ে আরও কয়েক কর্মদিবস লাগতে পারে।',
        de: 'Sobald wir den Artikel erhalten und geprüft haben, erfolgt die Rückerstattung auf das ursprüngliche Zahlungsmittel. Die Bankverarbeitung kann einige Werktage dauern.',
      },
    },
  ],
};
