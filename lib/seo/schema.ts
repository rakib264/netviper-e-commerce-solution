import type { CurrencyCode } from '@/lib/currency/config';
import { BRAND } from '@/lib/seo/brand';
import type { SeoConfig } from '@/lib/seo/config';

/**
 * JSON-LD builders.
 *
 * Every page emits **one** `@graph` rather than a handful of separate scripts,
 * and the nodes inside it cross-reference by `@id`. That is the whole point:
 * given five pages each declaring their own free-standing `Organization`,
 * Google has to guess whether they describe one company or five, and the
 * knowledge-graph entity splits. Given five pages that all reference
 * `https://ramenbhai.com/#organization`, there is exactly one entity and every
 * page contributes to it.
 *
 * Builders are pure and synchronous. Anything requiring a lookup — the store's
 * currency, the returns policy — is passed in by the caller, so a builder can
 * never accidentally hold a request open or read a stale cache of its own.
 */

/* ── Types ───────────────────────────────────────────────────────────────── */

export type SchemaNode = Record<string, unknown>;

export interface SchemaGraph {
  '@context': 'https://schema.org';
  '@graph': SchemaNode[];
}

/** Drop `undefined` values so the emitted JSON has no empty keys. */
function compact<T extends SchemaNode>(node: T): T {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  ) as T;
}

/**
 * Wrap nodes into the single graph a page emits.
 *
 * Falsy entries are filtered out so a caller can write
 * `graph(org, website, product && productSchema(...))` without guarding each
 * one.
 */
export function buildGraph(...nodes: Array<SchemaNode | null | undefined | false>): SchemaGraph {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean) as SchemaNode[],
  };
}

/* ── Stable @ids ─────────────────────────────────────────────────────────── */

export const schemaId = {
  organization: (seo: SeoConfig) => `${seo.url}/#organization`,
  logo: (seo: SeoConfig) => `${seo.url}/#logo`,
  website: (seo: SeoConfig) => `${seo.url}/#website`,
  store: (seo: SeoConfig) => `${seo.url}/#store`,
  webPage: (canonical: string) => `${canonical}#webpage`,
  breadcrumb: (canonical: string) => `${canonical}#breadcrumb`,
  product: (canonical: string) => `${canonical}#product`,
  itemList: (canonical: string) => `${canonical}#itemlist`,
  faq: (canonical: string) => `${canonical}#faq`,
};

/* ── Organization ────────────────────────────────────────────────────────── */

/**
 * The brand logo as its own graph node.
 *
 * Hoisted to the top level rather than nested inside `Organization.logo`, so
 * the `{'@id': '…/#logo'}` references from Organization and Store resolve
 * against a sibling node. JSON-LD resolves an inline definition too, but a
 * standalone node is unambiguous to every parser and to anyone reading the
 * emitted graph.
 */
export function logoSchema(seo: SeoConfig): SchemaNode {
  return {
    '@type': 'ImageObject',
    '@id': schemaId.logo(seo),
    url: seo.logo,
    contentUrl: seo.logo,
    width: seo.logoWidth,
    height: seo.logoHeight,
    caption: seo.name,
  };
}

export function organizationSchema(seo: SeoConfig, description: string): SchemaNode {
  return compact({
    '@type': 'Organization',
    '@id': schemaId.organization(seo),
    name: seo.name,
    // An unfilled placeholder is worse than an absent field: it publishes a
    // legal name that matches no registration anywhere.
    legalName: seo.legalName === seo.name ? undefined : seo.legalName,
    alternateName: seo.shortName !== seo.name ? seo.shortName : undefined,
    url: seo.url,
    description,
    logo: { '@id': schemaId.logo(seo) },
    image: { '@id': schemaId.logo(seo) },
    foundingDate: BRAND.foundingDate,
    sameAs: seo.sameAs,
    areaServed: compact({
      '@type': 'Country',
      name: BRAND.areaServed.country,
      identifier: BRAND.areaServed.countryCode,
    }),
    contactPoint: contactPointSchema(seo),
  });
}

/**
 * `ContactPoint`, or nothing.
 *
 * A placeholder email or phone is stripped upstream by `config.ts`, so an
 * unconfigured store emits no `contactPoint` rather than one pointing at
 * `TODO_SUPPORT_EMAIL`. Omission costs a minor completeness signal; a wrong
 * contact detail splits the entity against every other source about the brand.
 */
function contactPointSchema(seo: SeoConfig): SchemaNode | undefined {
  const email = seo.contact.email.startsWith('TODO_') ? undefined : seo.contact.email;
  const phone = seo.contact.phone.startsWith('TODO_') ? undefined : seo.contact.phone;
  if (!email && !phone) return undefined;

  return compact({
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email,
    telephone: phone,
    areaServed: BRAND.areaServed.countryCode,
    availableLanguage: BRAND.supportedLocales.map((locale) =>
      locale === 'bn' ? 'Bengali' : 'English',
    ),
  });
}

/* ── WebSite ─────────────────────────────────────────────────────────────── */

export function websiteSchema(seo: SeoConfig, description: string): SchemaNode {
  return compact({
    '@type': 'WebSite',
    '@id': schemaId.website(seo),
    name: seo.name,
    url: seo.url,
    description,
    publisher: { '@id': schemaId.organization(seo) },
    inLanguage: BRAND.supportedLocales.map((locale) =>
      locale === 'bn' ? 'bn-BD' : 'en-US',
    ),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${seo.url}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  });
}

/* ── Store ───────────────────────────────────────────────────────────────── */

/**
 * The commercial entity.
 *
 * `OnlineStore` unless `config.ts` confirmed a complete postal address *and*
 * opening hours, in which case the richer `GroceryStore` type applies. The
 * check lives there rather than here so no caller can opt into a
 * `LocalBusiness` claim the data does not support.
 */
export function storeSchema(
  seo: SeoConfig,
  description: string,
  categories: Array<{ name: string; slug: string }> = [],
): SchemaNode {
  const physical = seo.hasPhysicalLocation && seo.organizationType === 'GroceryStore';

  return compact({
    '@type': physical ? ['GroceryStore', 'LocalBusiness', 'OnlineStore'] : 'OnlineStore',
    '@id': schemaId.store(seo),
    name: seo.name,
    url: seo.url,
    description,
    image: { '@id': schemaId.logo(seo) },
    parentOrganization: { '@id': schemaId.organization(seo) },
    priceRange: BRAND.priceRange,
    paymentAccepted: [...BRAND.paymentAccepted],
    currenciesAccepted: seo.currency,
    areaServed: compact({
      '@type': 'Country',
      name: BRAND.areaServed.country,
      identifier: BRAND.areaServed.countryCode,
    }),
    telephone: seo.contact.phone.startsWith('TODO_') ? undefined : seo.contact.phone,
    email: seo.contact.email.startsWith('TODO_') ? undefined : seo.contact.email,
    address: physical
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: seo.contact.address,
          addressLocality: BRAND.areaServed.primaryCity,
          addressCountry: BRAND.areaServed.countryCode,
        })
      : undefined,
    openingHoursSpecification: physical ? seo.contact.openingHours : undefined,
    hasOfferCatalog: categories.length
      ? {
          '@type': 'OfferCatalog',
          name: seo.name,
          itemListElement: categories.map((category, index) => ({
            '@type': 'OfferCatalog',
            position: index + 1,
            name: category.name,
            url: seo.absolute(`/categories/${category.slug}`),
          })),
        }
      : undefined,
  });
}

/* ── WebPage ─────────────────────────────────────────────────────────────── */

export function webPageSchema(
  seo: SeoConfig,
  input: {
    canonical: string;
    name: string;
    description: string;
    breadcrumbId?: string;
    /** Entities the page is about, for answer-engine disambiguation. */
    about?: Array<{ name: string; sameAs?: string }>;
    primaryImage?: string;
  },
): SchemaNode {
  return compact({
    '@type': 'WebPage',
    '@id': schemaId.webPage(input.canonical),
    url: input.canonical,
    name: input.name,
    description: input.description,
    isPartOf: { '@id': schemaId.website(seo) },
    about: input.about?.map((entity) =>
      compact({ '@type': 'Thing', name: entity.name, sameAs: entity.sameAs }),
    ),
    primaryImageOfPage: input.primaryImage ? { url: input.primaryImage } : undefined,
    breadcrumb: input.breadcrumbId ? { '@id': input.breadcrumbId } : undefined,
  });
}

/* ── Breadcrumbs ─────────────────────────────────────────────────────────── */

export function breadcrumbSchema(
  canonical: string,
  items: Array<{ name: string; url: string }>,
): SchemaNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': schemaId.breadcrumb(canonical),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/* ── Product ─────────────────────────────────────────────────────────────── */

export interface ProductSchemaInput {
  name: string;
  description?: string;
  images?: string[];
  slug: string;
  price: number;
  comparePrice?: number;
  quantity?: number;
  sku?: string;
  barcode?: string;
  gtin?: string;
  brandName?: string;
  categoryName?: string;
  averageRating?: number;
  totalReviews?: number;
  reviews?: Array<{
    author?: string;
    rating?: number;
    comment?: string;
    createdAt?: string;
  }>;
}

export interface ReturnPolicyInput {
  returnWindowDays: number;
  freeReturnShipping: boolean;
}

export function productSchema(
  seo: SeoConfig,
  product: ProductSchemaInput,
  options: { currency: CurrencyCode; returnPolicy?: ReturnPolicyInput },
): SchemaNode {
  const canonical = seo.absolute(`/products/${product.slug}`);
  const inStock = (product.quantity ?? 0) > 0;

  return compact({
    '@type': 'Product',
    '@id': schemaId.product(canonical),
    name: product.name,
    description: product.description,
    image: product.images?.filter(Boolean),
    url: canonical,
    // Emitted only when real. An invented GTIN is a Merchant Center rejection,
    // and an invented SKU is a duplicate-product signal.
    sku: product.sku,
    gtin: product.gtin || product.barcode,
    category: product.categoryName,
    brand: product.brandName
      ? { '@type': 'Brand', name: product.brandName }
      : { '@id': schemaId.organization(seo) },
    offers: offerSchema(seo, product, canonical, inStock, options),
    // Never synthesised. A rating with no reviews behind it is a manual-action
    // risk, and the rich result it buys is removed along with the penalty.
    aggregateRating: aggregateRatingSchema(product),
    review: reviewSchema(product),
  });
}

function offerSchema(
  seo: SeoConfig,
  product: ProductSchemaInput,
  canonical: string,
  inStock: boolean,
  options: { currency: CurrencyCode; returnPolicy?: ReturnPolicyInput },
): SchemaNode {
  return compact({
    '@type': 'Offer',
    url: canonical,
    price: product.price,
    priceCurrency: options.currency,
    availability: inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    // A year out: long enough not to churn, short enough that Google does not
    // treat the price as indefinitely valid.
    priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    seller: { '@id': schemaId.organization(seo) },
    hasMerchantReturnPolicy: options.returnPolicy
      ? merchantReturnPolicySchema(options.returnPolicy)
      : undefined,
    shippingDetails: shippingDetailsSchema(options.currency),
  });
}

function merchantReturnPolicySchema(policy: ReturnPolicyInput): SchemaNode {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: BRAND.areaServed.countryCode,
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: policy.returnWindowDays,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: policy.freeReturnShipping
      ? 'https://schema.org/FreeReturn'
      : 'https://schema.org/ReturnShippingFees',
  };
}

/**
 * Shipping, stated from `brand.delivery` — the same numbers the FAQ copy
 * quotes, so the promise a customer reads and the promise Google indexes
 * cannot drift apart.
 */
function shippingDetailsSchema(currency: CurrencyCode): SchemaNode[] {
  const { dhaka, nationwide, handlingDays } = BRAND.delivery;

  const entry = (
    zone: { minDays: number; maxDays: number; charge: number },
    region?: string,
  ): SchemaNode =>
    compact({
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: zone.charge,
        currency,
      },
      shippingDestination: compact({
        '@type': 'DefinedRegion',
        addressCountry: BRAND.areaServed.countryCode,
        addressRegion: region,
      }),
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: handlingDays.min,
          maxValue: handlingDays.max,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: zone.minDays,
          maxValue: zone.maxDays,
          unitCode: 'DAY',
        },
      },
    });

  return [entry(dhaka, BRAND.areaServed.primaryCity), entry(nationwide)];
}

function aggregateRatingSchema(product: ProductSchemaInput): SchemaNode | undefined {
  const count = product.totalReviews ?? 0;
  const value = product.averageRating ?? 0;
  if (count < 1 || value <= 0) return undefined;

  return {
    '@type': 'AggregateRating',
    ratingValue: Number(value.toFixed(1)),
    reviewCount: count,
    bestRating: 5,
    worstRating: 1,
  };
}

function reviewSchema(product: ProductSchemaInput): SchemaNode[] | undefined {
  const reviews = (product.reviews || []).filter(
    (review) => review.comment && review.rating,
  );
  if (!reviews.length) return undefined;

  return reviews.slice(0, 5).map((review) =>
    compact({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.author || 'Customer' },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.comment,
      datePublished: review.createdAt?.split('T')[0],
    }),
  );
}

/* ── Listings ────────────────────────────────────────────────────────────── */

export function itemListSchema(
  seo: SeoConfig,
  canonical: string,
  products: Array<{ name: string; slug: string; thumbnailImage?: string }>,
): SchemaNode | undefined {
  if (!products.length) return undefined;

  return {
    '@type': 'ItemList',
    '@id': schemaId.itemList(canonical),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: product.name,
        url: seo.absolute(`/products/${product.slug}`),
        image: product.thumbnailImage,
      }),
    ),
  };
}

export function collectionPageSchema(
  seo: SeoConfig,
  input: {
    canonical: string;
    name: string;
    description: string;
    breadcrumbId?: string;
    itemListId?: string;
    about?: Array<{ name: string; sameAs?: string }>;
  },
): SchemaNode {
  return compact({
    '@type': 'CollectionPage',
    '@id': schemaId.webPage(input.canonical),
    url: input.canonical,
    name: input.name,
    description: input.description,
    isPartOf: { '@id': schemaId.website(seo) },
    about: input.about?.map((entity) =>
      compact({ '@type': 'Thing', name: entity.name, sameAs: entity.sameAs }),
    ),
    breadcrumb: input.breadcrumbId ? { '@id': input.breadcrumbId } : undefined,
    mainEntity: input.itemListId ? { '@id': input.itemListId } : undefined,
  });
}

/* ── FAQ ─────────────────────────────────────────────────────────────────── */

/**
 * `FAQPage`, the answer-engine workhorse.
 *
 * Only ever built from the same resolved Q&As that `FaqSection` renders as
 * visible text. FAQ schema with no visible counterpart is a spam signal, so the
 * two consumers share one source in `lib/seo/faq.ts` rather than each holding
 * their own copy.
 */
export function faqSchema(
  canonical: string,
  qas: Array<{ question: string; answer: string }>,
): SchemaNode | undefined {
  if (!qas.length) return undefined;

  return {
    '@type': 'FAQPage',
    '@id': schemaId.faq(canonical),
    mainEntity: qas.map((qa) => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer,
      },
    })),
  };
}

/* ── Article ─────────────────────────────────────────────────────────────── */

export function articleSchema(
  seo: SeoConfig,
  post: {
    canonical: string;
    title: string;
    description?: string;
    image?: string;
    author?: string;
    publishedAt?: string;
    updatedAt?: string;
    tags?: string[];
  },
): SchemaNode {
  return compact({
    '@type': 'BlogPosting',
    '@id': `${post.canonical}#article`,
    headline: post.title,
    description: post.description,
    image: post.image,
    url: post.canonical,
    mainEntityOfPage: { '@id': schemaId.webPage(post.canonical) },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@id': schemaId.organization(seo) },
    publisher: { '@id': schemaId.organization(seo) },
    keywords: post.tags?.length ? post.tags.join(', ') : undefined,
    isPartOf: { '@id': schemaId.website(seo) },
  });
}

/* ── Event ───────────────────────────────────────────────────────────────── */

export function eventSchema(
  seo: SeoConfig,
  event: {
    canonical: string;
    name: string;
    description?: string;
    image?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
  },
): SchemaNode {
  return compact({
    '@type': 'Event',
    '@id': `${event.canonical}#event`,
    name: event.name,
    description: event.description,
    image: event.image,
    url: event.canonical,
    startDate: event.startDate,
    endDate: event.endDate,
    eventAttendanceMode: event.location
      ? 'https://schema.org/OfflineEventAttendanceMode'
      : 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: event.location
      ? compact({
          '@type': 'Place',
          name: event.location,
          address: {
            '@type': 'PostalAddress',
            addressCountry: BRAND.areaServed.countryCode,
          },
        })
      : { '@type': 'VirtualLocation', url: seo.url },
    organizer: { '@id': schemaId.organization(seo) },
  });
}

/* ── Combo bundle ────────────────────────────────────────────────────────── */

export function comboProductSchema(
  seo: SeoConfig,
  bundle: {
    canonical: string;
    name: string;
    description?: string;
    image?: string;
    price: number;
    comparePrice?: number;
    inStock?: boolean;
    items?: Array<{ name: string; slug?: string }>;
  },
  currency: CurrencyCode,
): SchemaNode {
  return compact({
    '@type': 'ProductCollection',
    '@id': schemaId.product(bundle.canonical),
    name: bundle.name,
    description: bundle.description,
    image: bundle.image,
    url: bundle.canonical,
    brand: { '@id': schemaId.organization(seo) },
    includesObject: bundle.items?.map((item) =>
      compact({
        '@type': 'TypeAndQuantityNode',
        typeOfGood: compact({
          '@type': 'Product',
          name: item.name,
          url: item.slug ? seo.absolute(`/products/${item.slug}`) : undefined,
        }),
      }),
    ),
    offers: compact({
      '@type': 'Offer',
      url: bundle.canonical,
      price: bundle.price,
      priceCurrency: currency,
      availability:
        bundle.inStock === false
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': schemaId.organization(seo) },
      shippingDetails: shippingDetailsSchema(currency),
    }),
  });
}
