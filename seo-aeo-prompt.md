# Ramen Bhai — SEO + AEO Implementation Prompt

You are implementing a complete SEO and Answer-Engine-Optimization (AEO) layer for this
repository, together with a centralized branding system. Read this entire brief before
touching code. Work in the phases given in §8 and report at each boundary.

---

## 0. Context you must accept as given

This repo is named `muscari-mart` on disk. It was originally a Bangladesh saree/food store,
was half-rebranded into a Germany leather-goods store called "Mascari Mart", and is now
being rebranded to **Ramen Bhai**, a Bangladesh online food marketplace.

Do not trust any existing brand string. They are a five-way mix of `Mascari Mart`,
`Muscari Mart`, `muscarimart.com`, `www.muscarimart.com`, `nextecom`, `myfood`, and
`TSR Gallery`, and the spelling is not even consistent between two pages of the same site.

**The brand:**

> Ramen Bhai is an online food marketplace for Korean noodles, instant ramen, Bibigo
> products, sushi, Tang, Rooh Afza, coffee, tea, popcorn, and hundreds of daily essentials —
> affordable prices, fast doorstep delivery.

**Market (decided — do not revisit):** Bangladesh. Currency **BDT**, timezone
**Asia/Dhaka**, primary locales **English + Bangla**, `areaServed` Bangladesh with Dhaka as
the primary delivery zone.

**Category entities that matter for search and for answer engines.** Use these as the
canonical vocabulary everywhere — taxonomy, keyword seeds, FAQ copy, and schema `about`:

- Korean ramen / instant noodles — Samyang, Buldak, Shin Ramyun, Nongshim, Ottogi, Paldo
- Bibigo — mandu, dumplings, tteokbokki, gochujang
- Sushi ingredients — nori, sushi rice, wasabi, soy sauce
- Drink mixes — Tang, Rooh Afza
- Coffee, tea, popcorn and snacks
- Groceries and daily essentials

**What this task is really about.** Today, brand identity is hardcoded in roughly 30 places
across `app/`, `components/`, `lib/`, `public/`, `package.json`, and `next-sitemap.config.js`.
When you are finished, **changing the brand must mean editing exactly one file**
(`lib/seo/brand.ts`) plus swapping image assets. Every metadata export, every JSON-LD block,
robots, sitemap, manifest, OG image, header, footer, email template, and SMS sender name
must read from that one file. Treat any brand literal surviving outside it as a bug.

---

## 1. Non-negotiable constraints

These come from `CLAUDE.md` and several are enforced by the build or by existing tests.
Violating them makes the work unmergeable.

1. **Localization is a hard rule.** Every user-facing string must be an i18n key present in
   all three of `locales/en.json`, `locales/bn.json`, `locales/de.json`, with an identical
   key tree and identical `{{placeholders}}`. `yarn test` enforces both that and the fact
   that every `t('…')` in source resolves. This applies to metadata titles, metadata
   descriptions, and FAQ copy.
   - `de.json` must stay in key parity even though German is being dropped from the
     storefront's active locales. Parity is a test gate; do not delete the file.
   - Exceptions that stay literal: the brand **name**, the domain, email addresses, social
     handles, and schema.org enum values (`"InStock"`, `"OnlineStore"`).
2. **Currency.** Never hardcode a symbol or ISO code next to a dynamic amount, and never
   construct your own `Intl.NumberFormat` with `style: 'currency'`.
   `tests/currency-hardcoding.test.ts` fails the build on both. In React use
   `useCurrency().formatPrice`; outside it use `lib/currency/server.ts`
   (`getServerCurrency`, `formatServerCurrency`). JSON-LD `priceCurrency` takes the ISO code
   from `getServerCurrency()`.
3. **Server-first read path.** Any new cached reader uses `unstable_cache` with tags from
   `lib/cache/tags.ts` and a `revalidate` backstop. Never `no-store` on a public read; use
   the constants in `lib/cache/http.ts`. A response that varies by session must be
   `PRIVATE_CACHE_HEADER`, never a shared `s-maxage`.
4. **Query shape.** `.select()` with exclusions rather than a field list, `.lean()` always,
   then `toPlainJson()` (`lib/home/serialize.ts`) before anything crosses into a Client
   Component — `lean()` still yields `ObjectId` and `Date`, and React rejects both. The
   leading key of every storefront index is `isActive`.
5. **No UI test suite.** Verification is `yarn build` + `yarn test` + manual. Both must pass.
6. **Framer Motion + SSR.** `initial={{ opacity: 0 }}` is honoured during SSR, so the
   element ships invisible until hydration. Anything that must be crawlable has to render at
   rest on first paint — see `hasTransitioned` in `HeroCarousel`. Never seed a style with
   `Math.random()` in render.
7. Imports are auto-sorted alphabetically by specifier. Import alias `@/*` → repo root.
   Forms are Formik + Yup. Styling uses `cn()` and the Tailwind tokens.

---

## 2. Bangladesh-specific repo state

The Germany rebrand left EUR/Berlin assumptions in places that now need to go back. Some of
the original Bangladesh shape is still there and is now correct again — leave those alone.

**Already correct, do not change:**
- `DEFAULT_CURRENCY` in `lib/currency/config.ts` is already `'BDT'`, with `৳` prefix and
  zero fraction digits.
- `lib/i18n/config.ts` already registers `bn` with `intlLocale: 'bn-BD'`.
- `Order.deliveryType` is `'Inside Dhaka' | 'Outside Dhaka'` and shipping defaults to 60.
  These were listed as rebrand debt under the Germany plan; under Bangladesh they are
  correct. Keep them.
- SSLCommerz is a Bangladesh payment gateway and is already wired. Reflect it plus Cash on
  Delivery in schema `paymentAccepted`.

**Must be reverted for Bangladesh:**
- `lib/theme/general-settings.ts` (~lines 188–191) **force-rewrites a stored `Asia/Dhaka`
  timezone into `Europe/Berlin`.** This silently overrides the admin's own setting. Remove
  the coercion and default to `Asia/Dhaka`.
- The same file coerces currency and locale through Germany-era defaults — audit the whole
  `buildPublicGeneralSettingsPayload` return block and make BDT / `en` / `Asia/Dhaka` the
  fallbacks.
- `app/layout.tsx` sets OG `locale: "de_DE"` with `alternateLocale: ["en_GB", "en_US"]` and
  `other: { "meta-country": "DE" }`. Replace with `en_US` primary, `bn_BD` alternate, and
  country `BD`.
- `/impressum` and `/datenschutz` are German legal requirements and are meaningless for a
  Bangladesh store. Ask the user whether to delete them, redirect them to
  `/privacy-policy` and `/terms-conditions`, or keep them `noindex`. Do not leave them
  indexed as-is.
- Locale allow-list should become `['en', 'bn']` via the admin setting. Keep `de` in
  `SUPPORTED_LOCALES` and keep `locales/de.json` for test parity.
- `next.config.js` has redirects for `/muscarimart` and `/well-rise`. Remove both unless the
  user confirms an old domain worth preserving.

---

## 3. Decisions to confirm before writing code

Ask the user these and wait. Each is baked into canonical URLs and structured data and is
expensive to undo.

| # | Decision | Why it's blocking |
|---|---|---|
| 1 | Production domain (e.g. `https://ramenbhai.com`) | `metadataBase`, every canonical, sitemap, robots, `sameAs` |
| 2 | Is there a physical store or pickup point in Dhaka? | Decides `GroceryStore` + `LocalBusiness` with a real address vs online-only `OnlineStore` |
| 3 | Real social profile URLs, support email, support phone (and WhatsApp, if used), opening hours | `sameAs` and `ContactPoint`. Fabricated values are worse than omitted ones |
| 4 | Legal/trading entity name and address | `Organization.legalName`, and the replacement for `/impressum` |
| 5 | Delivery promise, precisely: Dhaka same-day or next-day? Nationwide in how many days? Delivery charge and free-delivery threshold? | These are the single most-quoted facts in AI answers and they go into FAQ schema and `shippingDetails`. They must be true |
| 6 | Halal certification status of the imported Korean products | High-intent question in this market; goes into product and category FAQs. Only claim it if verified |
| 7 | Keep `/impressum` + `/datenschutz`, or replace with `/privacy-policy` + `/terms-conditions`? | See §2 |

If the user says "pick sensible defaults", use values that are **obviously** placeholders
(`https://ramenbhai.example`, `TODO_SUPPORT_EMAIL`) and list every one of them in your final
summary. Never invent a plausible-looking phone number, address, delivery time, or halal
claim — fake `LocalBusiness` and fake FAQ data are active ranking liabilities and, for halal
claims, a trust problem.

---

## 4. Target architecture

Create a new `lib/seo/` module — five files, one of which is the only brand-specific one.

```
lib/seo/
  brand.ts       ← THE ONLY FILE YOU EDIT TO REBRAND. Pure data, no app imports.
  config.ts      ← Merges brand.ts with DB GeneralSettings + env. Cached server reader.
  metadata.ts    ← buildMetadata(): the single Next.js Metadata factory.
  schema.ts      ← JSON-LD builders, typed, all reading from config.
  JsonLd.tsx     ← One server component that renders a schema graph.
```

### 4.1 `lib/seo/brand.ts`

A plain exported const object. No `server-only`, no DB access, no imports from app code, so
it stays importable from anywhere. Open it with a header comment stating the rule: *this
file contains no logic, and every other file in the app reads brand identity through it.*

It must carry at minimum:

- `name`, `legalName`, `shortName` (header wordmark and manifest)
- `domain` / `url`, plus a `urlFor(path)` helper so no file ever string-concatenates a URL
- `defaultLocale: 'en'`, `supportedLocales: ['en', 'bn']`, `ogLocale: 'en_US'`,
  `ogAlternateLocales: ['bn_BD']`, `currency: 'BDT'`, `country: 'BD'`,
  `timezone: 'Asia/Dhaka'`, `areaServed`
- `taglineKey` and `descriptionKey` — **i18n key names, not English strings**
- `titleTemplate: '%s | Ramen Bhai'` and `defaultTitle`
- `logo`, `ogImage`, `favicon`, `appleIcon`, `maskIcon` paths
- `social: { facebook, instagram, tiktok, youtube, x }` — omit keys you don't have rather
  than emitting empty strings
- `contact: { email, phone, whatsapp, address, openingHours }`
- `organizationType: 'OnlineStore' | 'GroceryStore'` (per §3.2)
- `keywordSeeds: string[]` — the category vocabulary from §0
- `verification: { google, bing, yandex, pinterest, facebook }` — all optional
- `sitemap: { excludePaths, priorities, changefreq }`
- `delivery: { dhakaEta, nationwideEta, charge, freeThreshold }` — consumed by FAQ copy and
  by `shippingDetails`, so the promise is stated in exactly one place

### 4.2 `lib/seo/config.ts`

`'server-only'`. Exports `getSeoConfig()`, an `unstable_cache` reader layering:

```
brand.ts defaults  →  env overrides  →  DB GeneralSettings (highest priority)
```

The DB wins because `/admin/settings` already edits `siteName`, `siteUrl`, `logo1`,
`favicon`, `socialLinks`, `contactEmail`, `contactPhone`, `address`, and `location`.

Read it through the existing `getCachedPublicGeneralSettings()` in
`lib/theme/general-settings-server.ts` rather than querying Mongoose again, and reuse its
cache tag `PUBLIC_GENERAL_SETTINGS_CACHE_TAG`. An admin save then already invalidates your
reader and you add no new invalidation plumbing.

Strip legacy values the way `buildPublicGeneralSettingsPayload` already strips
`OLD_HARDCODED_SITE_NAMES`. Extend that array to include `'Mascari Mart'`, `'Muscari Mart'`,
`'muscari-mart'`, `'TSR Gallery'`, and `'NextEcom'`, so a stale DB row can never resurrect
the old brand in `<head>`.

### 4.3 `lib/seo/metadata.ts`

One factory, used by **every** page:

```ts
export async function buildMetadata(input: {
  titleKey?: string;            // i18n key
  title?: string;               // only for DB-authored content (product/category names)
  descriptionKey?: string;
  description?: string;
  path: string;                 // '/products/foo' — canonical is derived, never passed in
  images?: OgImageInput[];
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  keywords?: string[];
  publishedTime?: string; modifiedTime?: string; authors?: string[];
  locale?: Locale;
}): Promise<Metadata>
```

It resolves i18n keys server-side through `createTranslator()` from `lib/i18n/dictionary.ts`
— already exported, currently unused; this is its first real consumer. It fills
`metadataBase`, `alternates.canonical`, `alternates.languages`, `openGraph`, `twitter`,
`robots`, `icons`, `verification`, and `appleWebApp`.

Guardrails to build into the factory rather than into call sites:

- Truncate descriptions to ~155 characters and titles to ~60 at word boundaries, so
  DB-authored product copy cannot produce a truncated SERP snippet.
- Fall back to the brand OG image when a page supplies none, and assert that no OG URL is
  relative.
- Automatically set `robots: { index: false, follow: false }` for any path in the private
  set — cart, checkout, profile, orders, wishlist, returns, auth — instead of relying on
  each page to remember.
- **Emit `alternates.languages` only for routes that actually exist.** The current root
  layout emits `de-DE`, `en-GB`, and `en-US` hreflangs pointing at `/en-gb` and `/en-us`,
  which are 404s. See §7 for the hreflang decision; until locale-prefixed routes exist,
  emit none.

### 4.4 `lib/seo/schema.ts`

Typed builders returning plain objects, composed into a single `@graph` per page so entities
cross-reference by `@id`. That is what makes Google resolve one Organization entity instead
of N duplicates.

- `organizationSchema()` — `@id: '{url}/#organization'`, with `name`, `legalName`, `url`,
  `logo` as a full `ImageObject` with dimensions, `sameAs`, `contactPoint`, `areaServed`,
  `foundingDate`, `description`.
- `websiteSchema()` — `@id: '{url}/#website'`, `publisher: { '@id': '…/#organization' }`,
  `potentialAction: SearchAction` targeting `/products?search={search_term_string}`,
  `inLanguage`.
- `storeSchema()` — `OnlineStore`, or `GroceryStore` + `LocalBusiness` if §3.2 confirms a
  physical location. Include `priceRange`, `paymentAccepted` (Cash on Delivery, SSLCommerz,
  plus whatever mobile wallets are live), `currenciesAccepted: 'BDT'`,
  `openingHoursSpecification`, and `hasOfferCatalog` listing top-level categories.
- `productSchema(product)` — `Offer` with `price`, `priceCurrency` from
  `getServerCurrency()`, `availability`, `itemCondition`, `priceValidUntil`,
  `hasMerchantReturnPolicy` wired to the real returns policy content, and
  `shippingDetails` as `OfferShippingDetails` with `deliveryTime` from `brand.delivery`.
  Emit `gtin`/`sku`/`brand` **only when present**. Emit `aggregateRating` and `review`
  **only when real reviews exist** — never synthesize a rating; it is a manual-action risk.
- `breadcrumbSchema(items)`
- `itemListSchema(products)` — for every listing surface: `/products`,
  `/categories/[slug]`, `/deals`, `/combo-bundles`, and the four `/products/*` rails.
- `faqSchema(qas)` — the AEO workhorse, see §6.
- `articleSchema(post)` — replaces the current ad-hoc `BlogPosting`.
- `collectionPageSchema(category)`
- `eventSchema(event)` and `comboProductSchema(bundle)` — port the existing inline ones.

### 4.5 `lib/seo/JsonLd.tsx`

A server component, `<JsonLd graph={[...]} />`, rendering one
`<script type="application/ld+json">` via `dangerouslySetInnerHTML`, with JSON escaped for
`<`, `>`, and `&`.

This replaces today's mix of `next/script` with `strategy="beforeInteractive"` and
`"afterInteractive"`. Structured data must be present in the initial HTML, and
`afterInteractive` — currently used on `/combo-bundles/[slug]` — does not guarantee that.

---

## 5. Migration work

### 5.1 Rewrite every existing metadata export onto `buildMetadata`

Nine files currently hold hand-rolled metadata with inconsistent brand spelling and two
different base URLs. Convert all nine and delete their local `BASE_URL` constants:

`app/layout.tsx`, `app/page.tsx`, `app/products/page.tsx`, `app/products/[slug]/page.tsx`,
`app/categories/[slug]/page.tsx`, `app/blogs/[slug]/page.tsx`, `app/events/[id]/page.tsx`,
`app/combo-bundles/page.tsx`, `app/combo-bundles/[slug]/page.tsx`.

### 5.2 Close the 17-page metadata gap

These public routes are pure `'use client'` with **no page metadata at all**. They inherit
only the root defaults, so 17 URLs currently share one title and one description. This alone
caps an SEO audit well below 90.

`/about`, `/blogs`, `/categories`, `/contact`, `/deals`, `/events`, `/explore`, `/faqs`,
`/impressum`, `/datenschutz`, `/privilege-members`, `/shipping-delivery`,
`/terms-conditions`, `/products/featured`, `/products/new-arrivals`,
`/products/best-selling`, `/products/limited-edition`.

Apply the pattern the repo already uses: rename the existing file to `*PageClient.tsx`, add
a thin server `page.tsx` that exports `generateMetadata` via `buildMetadata` and renders the
client sibling.

Where the page has data — `/deals`, `/categories`, `/blogs`, `/events`, and the four product
rails — also resolve it on the server and pass `initial*` props using the readers in
`lib/home/storefront-content.ts`. The caching hard rule requires this, and it is also what
makes the content crawlable instead of appearing only after a client fetch. Respect the
`use-section-data` contract: `null` means "not supplied, go fetch", `[]` means "resolved and
empty". Conflating them leaves an empty section on a skeleton forever.

### 5.3 Fix the duplicated robots and sitemap

Two systems currently produce conflicting output. `app/robots.ts` and `app/sitemap.ts` run
at runtime against `muscarimart.com` with no `www`. Separately, `next-sitemap` runs as a
`postbuild` step writing `public/robots.txt` and `public/sitemap.xml` against
`www.muscarimart.com` with a different disallow list — and that static sitemap contains only
15 URLs, no products at all, while absurdly listing `/robots.txt` and `/sitemap.xml` as
pages.

**Keep the App Router versions and remove `next-sitemap` entirely:** delete
`next-sitemap.config.js`, the `postbuild` script, the dependency, and the stale
`public/robots.txt` and `public/sitemap.xml`. Then:

- `app/robots.ts` reads host and disallow list from `lib/seo/brand.ts`, and additionally
  disallows the legacy dev scaffolding: `/api/test-*`, `/api/debug*`, `/api/seed`,
  `/api/create-test-data`, `/api/processQueue`, `/api/consume-queue`, `/api/clear-queue`.
- `app/sitemap.ts` becomes a sitemap index with child sitemaps via `generateSitemaps()` —
  `products`, `categories`, `blogs`, `static` — with real `lastModified` from `updatedAt`,
  plus `changeFrequency` and `priority`. Chunk at 5,000 URLs. Every query `.lean()`,
  `.select()`, and filtered on `isActive`.

### 5.4 Assets

- **`/logo.png` is referenced by the metadata OG/Twitter images and by the Organization
  JSON-LD, and does not exist in `public/`.** Every social preview and the logo entity are
  currently broken. Fix this first; it is a one-file, high-impact win.
- Add `app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`, and
  `app/twitter-image.tsx` using `next/og` `ImageResponse`, driven by `brand.ts`, so OG
  images regenerate on rebrand instead of needing a designer.
- Replace `public/manifest.json` with `app/manifest.ts` built from `brand.ts`. The current
  file still reads *"Muscari Mart - Premium Women's Sarees"* and is not even linked from the
  document.
- Delete `public/wellrise.png` and the `/well-rise` and `/muscarimart` redirects in
  `next.config.js`.

### 5.5 Kill the brand leaks

- `components/providers/FaviconProvider.tsx` **overwrites `document.title` with
  `settings.siteName` after hydration**, flattening every page-specific title you are about
  to write. Remove the title assignment and keep only the favicon swap. This is a real
  ranking bug, not a cosmetic one.
- `components/seo/SeoOptimizer.tsx` injects Product, Breadcrumb, and `FAQPage` JSON-LD from
  a `useEffect`, with hardcoded Bangladesh saree FAQ copy. It is imported nowhere. Delete it.
- `package.json` `name` → `ramen-bhai`.
- `components/layout/Header.tsx:190` and `components/layout/Footer.tsx:165` fall back to
  `"Mascari Mart"` → fall back to `brand.name`.
- `lib/utils/email-settings.ts:43` (`"Muscari Mart"` plus a hardcoded Dhaka address),
  `lib/twilio.ts:16` (SMS sender), `lib/bunny.ts:85` (upload path prefix `'muscari-mart'`),
  `app/auth/signin/page.tsx` and `signup` logo `alt` text, and `locales/*.json`
  (`mascariMartGmbh`, `"Welcome to Mascari Mart"`) → all through `brand.ts`, or an i18n key
  carrying a `{{brand}}` placeholder.
- Then run `rg -i 'muscari|mascari|myfood|nextecom|tsr ?gallery|wellrise|well-rise'` and
  confirm the only remaining hits are in `OLD_HARDCODED_SITE_NAMES`, `rebranding.md`, and
  `CLAUDE.md`.

---

## 6. AEO — the answer-engine layer

SEO gets you ranked; AEO gets you **quoted** by ChatGPT, Perplexity, Google AI Overviews,
Gemini, and Copilot. These systems extract short, self-contained, attributable answers.
Optimize for extraction, not for prose.

### 6.1 Content shape

Every page that can answer a question must carry a **40–60 word self-contained answer**
immediately under the H1, or under the relevant H2, written so it still makes sense when
lifted out of the page with no surrounding context.

"It ships in 2 days" is useless when quoted. "Ramen Bhai delivers across Dhaka within 24
hours and nationwide in 2–3 days, with free delivery over ৳1,500" survives extraction.

- One H1 per page. Question-shaped H2s and H3s where natural: *"How spicy is Buldak 2x
  Spicy?"*, *"What's the difference between Shin Ramyun and Shin Black?"*, *"Is Bibigo
  mandu halal?"*
- Put facts in `<table>` or `<dl>`, not in comma-separated prose. Extraction models parse
  tables far more reliably than sentences.
- Put the answer before the marketing. Never bury a spec below a carousel.
- Answer content must be server-rendered. Anything that appears only after a client fetch,
  or only after a Framer Motion transition, is invisible to most crawlers (see §1.6).

### 6.2 FAQ system

Build `lib/seo/faq.ts` as a typed registry keyed by route, storing **i18n key pairs**
(`questionKey` / `answerKey`), never English strings. Feed it into two consumers:

1. `faqSchema()` JSON-LD, and
2. an accessible `components/seo/FaqSection.tsx` rendering the same Q&As as visible text.

Both are required. Google expects FAQ content to be visible on the page; FAQ schema with no
visible counterpart is a spam signal.

Seed FAQs per surface, and make them genuinely useful — these are the strings that get
quoted back to users:

- **Global and `/faqs`:** what Ramen Bhai is; delivery areas and times inside vs outside
  Dhaka; delivery charge and free-delivery threshold; minimum order; payment methods
  (Cash on Delivery, cards, mobile wallets); returns and refunds; halal status; where the
  imported products are sourced from and how authenticity is guaranteed; support hours.
- **Product pages:** spice level, cooking instructions, weight and pack count,
  halal/vegetarian status, shelf life, storage, allergens, country of origin. Wire these to
  real product fields where they exist. Do not invent per-product facts in a template.
- **Category pages:** "What is Korean ramen?", "Which Korean noodles are least spicy?",
  "What do I need to make sushi at home?", "Is Bibigo halal?", "What's the difference
  between ramen and ramyun?"

All of this depends on §3.5 and §3.6 being answered truthfully first.

### 6.3 Entity clarity

Answer engines need to know *what Ramen Bhai is*, unambiguously and consistently.

- Identical `name`, `logo`, `description`, `sameAs`, address, and phone across every schema
  emission, the footer, `/about`, `/contact`, and every social profile. Any inconsistency
  splits the entity across the knowledge graph.
- `/about` must state in plain prose, in the first paragraph, what the store sells, where it
  delivers, and since when.
- Use schema `about` and `mentions` for the product-brand entities — Samyang, Nongshim,
  Bibigo, Ottogi, Paldo — and where a Wikipedia or Wikidata URL exists, attach it via
  `sameAs` on the `Brand` node. That is the cheapest available entity-disambiguation signal.

### 6.4 `llms.txt`

Add `app/llms.txt/route.ts` returning `text/plain`, generated from `brand.ts` plus the
cached category reader: a one-paragraph description of the store, the category list with
URLs, key policy URLs (shipping, returns, contact), and a pointer to the sitemap. Cache it
using `lib/cache/http.ts` constants and the `categories` cache tag. Do **not** hand-maintain
it.

### 6.5 Crawler access

In `app/robots.ts`, explicitly allow `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`,
`PerplexityBot`, `ClaudeBot`, `Claude-Web`, `Google-Extended`, `Applebot-Extended`, `CCBot`,
`Bingbot`, and `Amazonbot`.

Flag to the user that `Google-Extended` and `Applebot-Extended` govern AI-training use and
are a business decision rather than a technical one — but that blocking them also removes
the store from those answer surfaces.

---

## 7. Technical SEO checklist

**Crawl and index**
- One canonical per URL, self-referencing, absolute, trailing-slash-consistent.
  `next.config.js` sets no trailing slash today; keep that and make canonicals match.
- `noindex` on cart, checkout, profile, orders, wishlist, returns, auth, and on filter
  permutations. Better still, canonicalize filtered listing URLs to the unfiltered category
  while keeping pagination itself indexable.
- Ensure `notFound()` is actually called for missing products, blogs, and events, rather
  than rendering an empty shell with a 200. `app/not-found.tsx` and
  `app/categories/[slug]/not-found.tsx` already exist.

**Performance — Core Web Vitals are a ranking factor and this repo has known issues**
- LCP: the hero must be `priority` with explicit `sizes`, and must not start at
  `opacity: 0`. `HeroCarousel`'s `hasTransitioned` is the reference pattern.
- CLS: explicit `width`/`height` or `aspect-ratio` on every product image; reserve space for
  the header and any banner.
- The root layout loads a **runtime-generated font stylesheet from the DB** rather than
  `next/font`. Add `preconnect` to the font host and `font-display: swap`. If the font set
  is stable, evaluate moving to `next/font` to remove the render-blocking round trip.
- The Bunny CDN `preconnect` already exists — keep it, and drop the dead Cloudinary
  `dns-prefetch`.

**Semantics and accessibility — audits score these under SEO**
- `<main>`, `<nav>`, `<header>`, `<footer>` landmarks; a single H1; no heading-level skips.
- Descriptive `alt` on every product image (`{name} — {category} | {brand}`), empty `alt` on
  decorative images.
- `aria-label` on every icon-only control, all resolved through `t()`.
- Visible focus rings and 4.5:1 contrast against the DB-driven palette.

**Internationalization**
- Locale is currently cookie-based with no per-locale URL, so there is nothing legitimate to
  point `hreflang` at. Either ship locale-prefixed routes (`/bn/...`) and then emit
  reciprocal `hreflang` for `en`, `bn`, and `x-default`, or emit no `hreflang` at all.
  **Do not emit hreflang pointing at URLs that don't exist** — that is the current bug, and
  it is worse than emitting nothing. Recommend one option to the user with a cost estimate.
- `<html lang>` must reflect the active locale; it already does via `localeMeta.intlLocale`.

**Monitoring**
- Put verification codes in `brand.ts`, submit the sitemap to Google Search Console and Bing
  Webmaster Tools, and note both in the handover.

---

## 8. Execution order

Work in these phases. Report at each boundary and commit with a scoped message. Do not
bundle phases.

1. **Foundation** — `lib/seo/{brand,config,metadata,schema,JsonLd}`, brand assets,
   `app/icon.tsx`, `app/opengraph-image.tsx`, `app/manifest.ts`. Nothing else changes yet.
2. **Bangladesh reversion** — the §2 list: timezone coercion, OG locale, country meta,
   locale allow-list, legacy redirects.
3. **Migrate existing pages** — the nine files in §5.1 onto `buildMetadata` + `JsonLd`,
   deleting their local `BASE_URL` constants.
4. **Cleanup** — remove `next-sitemap`, rewrite `app/robots.ts` and `app/sitemap.ts`, delete
   `SeoOptimizer.tsx`, fix `FaviconProvider`, purge the brand leaks in §5.5.
5. **Close the gap** — server metadata shells for the 17 client-only pages (§5.2).
6. **AEO** — FAQ registry and `FaqSection`, answer blocks, `llms.txt`, and the entity
   consistency pass across `/about`, `/contact`, the footer, and schema.
7. **Polish and verify** — CWV items, accessibility, the hreflang decision, then the full §9
   checklist reported line by line.

---

## 9. Acceptance criteria — the ≥90 bar

Do not report done until every line here is true.

**Centralization — the primary requirement**
- [ ] Changing `name`, `domain`, `ogImage`, `social`, and `contact` in `lib/seo/brand.ts`
      and replacing the files in `public/brand/` rebrands the entire site: head tags,
      JSON-LD, robots, sitemap, manifest, OG images, header, footer, emails, SMS sender.
- [ ] `rg -i 'muscari|mascari|myfood|nextecom|tsr ?gallery'` returns hits only in
      `OLD_HARDCODED_SITE_NAMES`, `rebranding.md`, and `CLAUDE.md`.
- [ ] No file outside `lib/seo/` contains a hardcoded site URL or brand name.
- [ ] No page constructs a `Metadata` object by hand; all route through `buildMetadata`.

**Coverage**
- [ ] Every public route has a unique title (≤60 chars) and unique description (≤155 chars),
      both i18n-resolved.
- [ ] Every public route has a self-referencing canonical.
- [ ] Every public route emits a valid JSON-LD `@graph` with at minimum Organization +
      WebSite + a page-type entity + BreadcrumbList.
- [ ] Zero errors in Google Rich Results Test and the schema.org validator for: home, a
      product, a category, a blog post, `/faqs`, and `/combo-bundles/[slug]`.

**AEO**
- [ ] `/faqs` and every category and product template render visible FAQs backed by matching
      `FAQPage` schema.
- [ ] Every key page opens with an extractable 40–60 word answer block, server-rendered.
- [ ] `/llms.txt` responds 200 with generated, non-stale content.
- [ ] AI crawler policy explicitly stated in `robots.txt`.

**Quality gates**
- [ ] `yarn build` passes.
- [ ] `yarn test` passes — this covers i18n key-tree parity *and*
      `tests/currency-hardcoding.test.ts`.
- [ ] `locales/en.json`, `bn.json`, and `de.json` have identical key trees with matching
      placeholders, including every new SEO and FAQ key.
- [ ] Lighthouse SEO **100** and Best Practices **≥95** on `/`, a product page, and a
      category page.
- [ ] No hydration warnings in the console on those three pages.

---

## 10. Reporting

When you are done, give the user:

1. The one-file rebrand instruction, literally: *edit `lib/seo/brand.ts`, replace
   `public/brand/*`, done.*
2. The §9 checklist with each box's real status and the evidence behind it.
3. Lighthouse SEO scores for the three pages.
4. Every placeholder value still needing real data (§3), listed explicitly.
5. Anything you deliberately did not do, and why.
