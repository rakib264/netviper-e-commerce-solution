import 'server-only';

import { BRAND } from '@/lib/seo/brand';
import { getSeoConfig, type SeoConfig } from '@/lib/seo/config';
import { resolveRequestLocale } from '@/lib/seo/metadata';
import {
  breadcrumbSchema,
  buildGraph,
  logoSchema,
  organizationSchema,
  schemaId,
  storeSchema,
  webPageSchema,
  websiteSchema,
  type SchemaGraph,
  type SchemaNode,
} from '@/lib/seo/schema';
import { createTranslator } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Composition layer between the pure builders in `schema.ts` and a page.
 *
 * Every page needs the same three entity nodes — Organization, WebSite, Store —
 * and differs only in the page-type node it adds. Leaving that to each page
 * guarantees the set drifts; one page forgets `WebSite`, another inlines a
 * second `Organization` with a slightly different name, and the knowledge-graph
 * entity splits. So the base is built once here and pages contribute only what
 * is actually theirs.
 */

export interface SeoContext {
  seo: SeoConfig;
  locale: Locale;
  t: ReturnType<typeof createTranslator>['t'];
  /** The brand description, resolved in the active locale. */
  description: string;
}

export async function getSeoContext(localeOverride?: Locale): Promise<SeoContext> {
  const [seo, locale] = await Promise.all([
    getSeoConfig(),
    resolveRequestLocale(localeOverride),
  ]);
  const { t } = createTranslator(locale);

  return {
    seo,
    locale,
    t,
    // An admin-authored site description wins; otherwise the localized key.
    description: seo.description || t(BRAND.descriptionKey),
  };
}

export interface PageGraphInput {
  /** App path. The canonical, and every `@id` on the page, derive from it. */
  path: string;
  /** Page title for the `WebPage` node. Defaults to the brand name. */
  name?: string;
  /** Page description. Defaults to the brand description. */
  description?: string;
  /** Breadcrumb trail, excluding Home — which is prepended automatically. */
  breadcrumbs?: Array<{ name: string; path: string }>;
  /** Entities the page is about, for answer-engine disambiguation. */
  about?: Array<{ name: string; sameAs?: string }>;
  primaryImage?: string;
  /** Top-level categories for the store's `hasOfferCatalog`. Home page only. */
  categories?: Array<{ name: string; slug: string }>;
  /**
   * Page-type nodes: `Product`, `FAQPage`, `ItemList`, `BlogPosting`… Anything
   * falsy is dropped, so a caller can pass a conditional straight through.
   */
  nodes?: Array<SchemaNode | null | undefined | false>;
  /**
   * Replace the default `WebPage` node — used by pages emitting a
   * `CollectionPage` instead, which occupies the same `@id`.
   */
  webPageNode?: SchemaNode;
}

/**
 * The full `@graph` for one page.
 *
 * Returns the context alongside the graph because a caller that needed the
 * graph almost always needs the resolved config too (for absolute URLs in its
 * own nodes), and resolving it twice would mean two cache reads.
 */
export async function buildPageGraph(
  input: PageGraphInput,
  context?: SeoContext,
): Promise<{ graph: SchemaGraph; context: SeoContext }> {
  const ctx = context || (await getSeoContext());
  const { seo, t, description: brandDescription } = ctx;

  const canonical = seo.absolute(input.path);
  const description = input.description || brandDescription;
  const name = input.name || seo.name;

  // Home is always the first crumb, so no page has to remember to add it and
  // no two pages can spell it differently.
  const trail = [
    { name: t('nav.home'), url: seo.url },
    ...(input.breadcrumbs || []).map((crumb) => ({
      name: crumb.name,
      url: seo.absolute(crumb.path),
    })),
  ];
  // A single-crumb trail is just "Home" and carries no information; Google
  // ignores it and validators warn about it.
  const breadcrumb = trail.length > 1 ? breadcrumbSchema(canonical, trail) : undefined;

  const webPage =
    input.webPageNode ||
    webPageSchema(seo, {
      canonical,
      name,
      description,
      breadcrumbId: breadcrumb ? schemaId.breadcrumb(canonical) : undefined,
      about: input.about,
      primaryImage: input.primaryImage,
    });

  const graph = buildGraph(
    logoSchema(seo),
    organizationSchema(seo, brandDescription),
    websiteSchema(seo, brandDescription),
    storeSchema(seo, brandDescription, input.categories),
    webPage,
    breadcrumb,
    ...(input.nodes || []),
  );

  return { graph, context: ctx };
}
