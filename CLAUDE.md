# CLAUDE.md

Next.js 15 / React 19 e-commerce storefront + admin panel ("Mascari Mart" — premium
leather goods, Germany, EUR). Package name is still `muscari-mart`; the codebase is
mid-rebrand from a Bangladesh saree/food store, so expect legacy BDT/Dhaka naming.

## Commands

```bash
yarn dev            # next dev
yarn build          # next build (+ next-sitemap postbuild)
yarn lint           # next lint (NOTE: eslint.ignoreDuringBuilds = true)
yarn db:test        # scripts/test-mongodb-connection.js
yarn db:seed-admin  # scripts/seed-admin-user.js
```

There is **no test suite** (no jest/vitest/playwright). Verification = build + manual.
TypeScript is `strict`, but `next build` does not gate on lint.

## Stack

- Next.js 15.5 App Router, React 19, TypeScript, Tailwind 3 + shadcn/ui (Radix)
- MongoDB via **Mongoose** (no Prisma, despite the `DATABASE_URL` name)
- NextAuth **v5 beta** (JWT sessions)
- Redux Toolkit for client state
- Upstash Redis as a job queue; Resend (email), Twilio + local BD SMS providers
- Bunny CDN for uploads (Cloudinary is legacy, still referenced in places)
- SSLCommerz payment gateway; jsPDF for invoices; Winston for logging
- Deck.gl / MapLibre (admin geospatial), amCharts5 + Recharts (admin analytics)

## Architecture

### Routing / rendering
- Single root `app/layout.tsx`. **No nested layouts** — not even for `/admin`.
  Every admin page imports and wraps itself in `components/admin/AdminLayout`;
  storefront pages each import `Header` / `Footer` / `MobileBottomNav` directly.
- ~52 of 57 pages are `'use client'`. The server-component pattern is used only where
  SEO needs it: a small server `page.tsx` does `generateMetadata` + JSON-LD `<Script>`
  and renders a `*PageClient.tsx` sibling (`products/[slug]`, `categories/[slug]`,
  `blogs/[slug]`, `events/[id]`). The client half refetches its own data via `/api/*`.
- Dynamic params are Next 15 promises: `{ params }: { params: Promise<{ slug: string }> }`,
  then `const { slug } = await params`.
- Almost no route segment config (`dynamic`/`revalidate`); only `app/api/upload` sets
  `runtime = 'nodejs'`.

### Data fetching
Client components fetch `/api/...` with plain `fetch` in `useEffect` — no SWR/React Query,
no server actions. Loading/error state is hand-rolled per component.

### API layer (`app/api/**/route.ts`)
Uniform shape: `await connectDB()` → parse `searchParams`/body → Mongoose query →
`NextResponse.json(...)`, everything in `try/catch` returning `{ error }` with a status.
- Public/customer routes: `app/api/<resource>`
- Admin routes: `app/api/admin/<resource>`, protected in-handler by
  `const session = await auth(); if (!session || !['admin','manager','staff'].includes(session.user?.role)) return 401`.
  There is **no shared `requireAdmin` helper** — the check is copy-pasted. Role sets vary
  per route (`staff` and `super-admin` appear inconsistently); match the neighbouring route.
- Mutating admin routes also write an audit entry via `createAuditLog` + `getClientIP`
  (`lib/audit.ts`); audit failures are swallowed by design.
- Bulk/export endpoints are their own subroutes (`bulk-delete`, `bulk-status`, `export`,
  `reorder`).
- Many `app/api/test-*`, `debug-*`, `seed`, `create-test-data` routes exist and are
  unauthenticated — legacy dev scaffolding, don't treat as reference patterns.

### Database (`lib/models/*.ts`)
Mongoose models with an exported `I<Name>` interface + `Schema`, guarded with the
`mongoose.models.X || mongoose.model(...)` pattern. `lib/mongodb.ts` caches the
connection on `global.mongoose`, imports models for side-effect registration, derives the
DB name from `DATABASE_URL` (default `myfood`), and falls back to local Mongo on DNS SRV
failure. Always `await connectDB()` before any model use.

Key models: `Product`, `Category` (self-nesting), `Order`, `User`, `Coupon`/`CouponUsage`,
`Banner`, `Blog`, `Event`, `LandingSection`/`LandingSettings`, `ProductShowcaseSection`,
`Advertisement`, `ReturnRequest`/`ReturnExchangeRequest`, `AuditLog`, `Courier`, `Message`,
`OTP`, and settings singletons (`GeneralSettings`, `PaymentSettings`, `CourierSettings`,
`IntegrationSettings`, `AuthSettings`).

### Auth
`lib/auth.ts` exports NextAuth v5 `auth`, `handlers`, `signIn`, `signOut`.
Providers: Credentials (bcrypt), Google, Facebook (social sign-in auto-creates a `customer`).
Role rides on the JWT and is refreshed from the DB in the `jwt` callback.
Cookie names are environment-dependent (`__Secure-next-auth.session-token` in production).

Two ways to read the session server-side — **both are in use**:
- `await auth()` — the default, used by ~87 API routes.
- `await getSessionFromCookies()` — decodes the session JWT manually with `jsonwebtoken`;
  used where NextAuth's cookie access was problematic. Returns only `{ user: { id, role } }`.

`middleware.ts` guards `/admin/**` only (requires role `admin` or `manager`) and redirects
to `/auth/signin?callbackUrl=`. API routes are **not** covered by middleware — each route
authenticates itself.

### State management
`lib/store/store.ts` (RTK) with slices: `auth`, `cart`, `products`, `orders`, `ui`,
`wishlist`, `courier`. Mounted via `lib/providers/StoreProvider`.
- `cart` and `wishlist` persist to `localStorage`, hydrating through a
  `loadCartFromStorage()` initial state. UI-only fields (`isOpen`) are stripped before
  persisting to avoid hydration mismatches.
- Cart reducers validate that item ids are 24-char ObjectId hex and **fire toasts directly
  from inside the reducer** (`lib/utils/toast-notifications`).
- Server-derived config is *not* in Redux: `hooks/use-settings.ts` (`useSettings`,
  `useCourierSettings`) fetches `/api/settings/general` and `/api/settings/courier` with
  `cache: 'no-store'` on every mount.

### Catalog flow
`/api/products` supports page/limit/search/category/price/rating/color/featured/
isNewArrival/isLimitedEdition sorting. Category filtering resolves subcategories
recursively via `lib/utils/categoryUtils.getAllSubcategories`. The public route strips
`CONFIDENTIAL_FIELDS` (`cost`, `sku`, `barcode`, `dimensions`, `totalSales`) unless the
caller is admin/manager/super-admin.

Products support `variantMode: 'single' | 'multi'`. Media is migrating from flat
`images: string[]` to a reorderable `media: IMediaItem[]`; `lib/products/types.ts`
provides `mediaToLegacy` / `legacyToMedia` and both are kept in sync on write. Product
write payloads go through `lib/products/validate-payload.ts` (returns `string[]` of errors).

### Cart → checkout → order → payment
1. Cart lives in Redux/localStorage.
2. `app/checkout/page.tsx` (client, ~1000 lines, Formik) loads `/api/payment/settings`,
   optionally validates a coupon via `/api/coupons/validate`, then `POST /api/orders`.
3. `POST /api/orders` re-validates everything server-side: product existence, stock,
   subtotal, coupon discount. Tax is currently hardcoded to 0%; shipping defaults to 60.
   Guest checkout is supported (`customer` is optional on `Order`). Stock and `totalSales`
   are decremented/incremented inline. Order numbers: `ORD-<last 8 digits of Date.now()>`.
4. COD → redirect to `/orders/{id}?success=true`.
   SSLCommerz → `POST /api/payment/sslcommerz/initiate` → redirect to gateway →
   `success` / `fail` / `cancel` / `ipn` callbacks under `app/api/payment/sslcommerz/*`.
   Gateway credentials come from the `PaymentSettings` DB singleton, not env.
5. Order creation enqueues a `GENERATE_INVOICE` job (PDF → Bunny → DB → confirmation emails).

### Background jobs
`lib/queue.ts` — an Upstash Redis list (`nextecom_tasks`) with a `JobType` enum
(`SEND_EMAIL`, `GENERATE_INVOICE`, `LOW_STOCK_ALERT`, `NEW_ORDER_NOTIFICATION`, …),
3 retries. Consumed by `app/api/worker/route.ts`, driven by a Vercel cron every minute
(`vercel.json`, `maxDuration: 30`). `app/api/processQueue`, `consume-queue`,
`queue-status`, `clear-queue` are manual/debug counterparts. Order creation also kicks the
queue synchronously so invoices don't wait for the cron.

### Admin
`/admin/*` (25 pages): dashboard analytics, products (incl. `new` / `[id]/edit`),
categories, orders, customers, coupons, courier, returns, blogs, events, advertisements,
messaging (SMS/email campaigns), customer feedback/trends/targets, audit logs,
admin-manager (RBAC), landing-management (hero carousel, product showcase, landing
sections), and settings (general/payment/courier/auth/integrations, plus Bunny & SMS test
endpoints). Site branding, colors, shipping rates and gateway keys are DB-backed settings
editable from `/admin/settings` — prefer them over new env vars.

## Data fetching & caching (hard rule)

The storefront's read path is server-first and tag-invalidated. Follow it for any
new page or public endpoint; the pattern exists because the old one — every
section fetching `/api/*` with `cache: 'no-store'` from a `useEffect` — put ~14
uncached round trips behind hydration and showed skeletons for seconds.

**Server-render the critical path.** A page's own data is resolved in the server
component and passed down as `initial*` props. Client components accept those
props, start with `loading: false`, and only fetch when the prop is absent.
`hooks/use-section-data.ts` encapsulates that: `null` means "not supplied, go
fetch", `[]` means "resolved, and empty" — never conflate them, or an empty
section sits on a skeleton forever.

**One cached reader per collection.** `lib/home/storefront-content.ts` holds them;
each is an `unstable_cache` with tags from `lib/cache/tags.ts` and a `revalidate`
backstop (300s for admin-authored content, 60s for anything whose visibility
turns on a clock — deals, events, scheduled offers). Server renders *and* the
public API routes read through the same reader, so a page and its client-side
fallback share one cache entry.

**Fan out, never chain.** `lib/home/homepage-data.ts` dispatches every reader in
one `Promise.all` and skips the readers whose section the admin disabled. New
aggregate pages should do the same. Never `await` a query whose result the next
query does not need.

**Invalidate at the source.** `attachStorefrontInvalidation(schema, revalidateFn)`
in `lib/cache/model-invalidation.ts` puts the invalidation on the Mongoose schema,
so a new admin route, a script or the queue worker all invalidate correctly
without knowing a cache exists. Two exceptions:
- `Model.bulkWrite` bypasses Mongoose middleware — the reorder routes call
  `revalidate*()` by hand.
- `HomepageSection` and `CuratedSection` are seeded lazily *from inside* a cached
  read, so a schema hook there would invalidate the entry being computed. They
  are dropped explicitly by `revalidateDynamicSlots()`.

**Cache headers on public reads.** Use the constants in `lib/cache/http.ts`. Never
`no-store` on a public read endpoint. A response that varies by session (the
admin branch of `/api/products`) must be `PRIVATE_CACHE_HEADER`, never a shared
`s-maxage`.

**Query shape.** `.select()` every list query — state exclusions (`-reviews
-media -__v`) rather than a field list so new fields keep appearing. `.lean()`
always, then `toPlainJson()` (`lib/home/serialize.ts`) before anything crosses to
a Client Component: `lean()` still yields `ObjectId`/`Date` and React refuses
both. Answer `hasMore` by fetching `limit + 1`, not with a second
`countDocuments`. Any new query shape needs a matching compound index — the
leading key is `isActive` for every storefront query.

**Spacing.** Homepage bands render through `components/home/HomeSection.tsx` and
the scale in `lib/home/section-spacing.ts`. Do not add a bare `py-*` to a
homepage section.

**Framer Motion + SSR.** `initial={{ opacity: 0 }}` is honoured during SSR, so it
ships the element invisible until hydration. Above-the-fold content must render
at rest on first paint (see `hasTransitioned` in `HeroCarousel`). Never seed a
style with `Math.random()` in render — it is a guaranteed hydration mismatch.

## Notifications

Unified in-app inbox + OneSignal push. **In-app is free, push is not**, and that
asymmetry is the whole design.

- `lib/notifications/catalog.ts` — the one table mapping each event to its
  audience, channels, locale keys and cooldown. Review push volume here, not at
  call sites.
- `lib/notifications/dispatch.ts` — `dispatchNotification()`, the only way a
  notification is created. Never throws: a notification must not roll back the
  order or payment that produced it.
- `lib/notifications/policy.ts` — the four gates: catalog → OneSignal configured
  → per-recipient preference → dedupe/cooldown.
- `lib/notifications/events.ts` — the call-site API. A call site describes what
  happened and passes ids; it never picks a channel or writes copy.

**Copy is stored as keys.** `InAppNotification` holds `titleKey`/`bodyKey` +
`params`, never rendered text — a notification outlives the request that created
it and the reader may be using a different language. Push copy is materialised at
send time by `localizeForPush()`, which renders the same keys into every locale.
Never inline notification copy in TypeScript.

**Idempotency.** `dedupeKey` carries a unique *partial* index (never `sparse`
alongside it — Mongo rejects the combination). Push follows the in-app insert: a
duplicate row means the event was already delivered, so no push is sent. Replayed
payment callbacks and retried queue jobs are therefore free.

**Cooldowns** are for threshold-driven events only (low stock, out of stock:
24h per product), scoped across all recipients via `cooldownScope` so one admin
cannot reset the window.

**Preferences** live on `User.notificationPreferences` but are never read
directly — always through `resolveNotificationPreferences()`, because accounts
predating the field have nothing stored and `lean()` does not apply schema
defaults. Marketing defaults to **off** on every channel.

## Localization (hard rule)

**All new/updated user-facing text must be i18n-key based and added in `en`, `bn`,
and `de` locale files in the same key path.** Never ship a bare English string in
JSX, an attribute (`placeholder`/`aria-label`/`alt`/`title`), a Yup message, or a
toast payload.

```tsx
const { t, tPlural } = useTranslation();
<button aria-label={t('nav.wishlist')}>{t('product.addToCart')}</button>
{tPlural('cart.itemCount', count)}                 // needs <key>_one and <key>_other
{t('common.pageOf', { page, pages })}              // {{page}} / {{pages}} placeholders
```

- Keys live in `locales/{en,bn,de}.json`, namespaced by route/component
  (`app/returns/page.tsx` → `returns.*`, `components/returns/ReturnTracker.tsx` →
  `returns.returnTracker.*`). Genuinely shared copy goes in `common.*`.
- All three files must have the **identical** key tree, and interpolation
  placeholders must match across them. `yarn test` enforces both, plus that every
  `t('…')` in the source resolves.
- Never split a sentence across `t()` calls and `{expressions}` — word order
  differs per language. Use one key with `{{placeholders}}`.
- Non-copy stays literal: brand names, email addresses, and any string compared
  against (`x === 'cod'`).
- Module-scope constants can't call `t`. Store the key and resolve at render:
  `{ labelKey: 'common.sort.newest' }` → `{t(option.labelKey)}`.
- Locale/currency come from `LocalizationProvider`; server code reads them via
  `getCachedLocalizationSettings()`. Missing keys fall back to English.

## Conventions

- Import alias `@/*` → repo root. Imports are auto-sorted alphabetically by specifier.
- Components: `PascalCase.tsx` under `components/<domain>/`; shadcn primitives are
  `kebab-case.tsx` under `components/ui/` (~75 files — check there before adding a
  primitive). Domain composites also live in `components/ui/` (`product-card*.tsx`,
  `shopping-cart.tsx`, `add-to-cart-button.tsx`, `image-uploader.tsx`).
- `lib/*.ts` is service/util code; `lib/<domain>/` holds per-feature helpers
  (`products/`, `landing/`, `product-showcase/`, `hero-carousel/`, `categories/`).
- Forms use **Formik + Yup**. `react-hook-form`/`zod` are installed but essentially unused —
  follow Formik unless there's a reason not to.
- Styling: `cn()` from `lib/utils`, Tailwind tokens from `tailwind.config.ts`
  (neutral `#1A1A1A` primary / `#F5F5F3` secondary, fluid `text-fluid-*` sizes,
  extra `xs: 480px` breakpoint). `lib/typography.ts` exports responsive class presets.
  `components/providers/ThemeProvider` additionally injects HSL color-scale CSS variables
  at runtime from the DB settings — so some colors are set in JS, not Tailwind.
- Currency: **never hardcode a symbol or an ISO code next to a dynamic amount, and
  never build your own `Intl.NumberFormat` with `style: 'currency'`.**
  `tests/currency-hardcoding.test.ts` fails the build on both.
  - Client/React: `useCurrency().formatPrice`, or `formatCurrency()` from
    `lib/currency/format` — `LocalizationProvider` sets the active currency during
    render, so the singleton is correct in SSR too.
  - Outside the React tree (queue jobs, API routes, PDFs, JSON-LD):
    `lib/currency/server.ts` — `getServerCurrency()`, `getServerCurrencyFormatter()`,
    `formatServerCurrency()`. The module singleton is *not* settings-driven there.
  - `formatEuroCurrency()` / `formatBDTCurrency()` in `lib/utils` are retained aliases
    that both render the **configured** currency; don't "fix" them by changing behaviour.
    `formatDhakaDate()` is likewise legacy-named.
  - Notification copy takes an already-formatted `{{total}}`; the template must carry
    no symbol. `lib/notifications/money-params.ts` back-fills rows stored before that.
- Toasts: `hooks/use-toast` + `lib/utils/toast-notifications` helpers (variants include
  `cart`, `wishlist`, `success`, `error`). `sonner` is also present.
- Logging: `createLogger('service-name')` from `lib/logger` in server services (file
  transports disabled on Vercel); route handlers mostly use bare `console.log/error`.
- Hydration safety is a recurring concern: `suppressHydrationWarning` on `<html>`/`<body>`,
  `ClientOnly` / `NoSSR` / `HydrationWrapper` wrappers, `dynamic(..., { ssr: false })` in
  `ClientProviders`, and deterministic `Intl` formatters.

## Active UX directives (homepage / showcase)

- Product showcase UI must feel premium and minimal (top-tier ecommerce quality), not flashy.
- Homepage and showcase typography should remain consistent with the system-font semantic roles.
- Add-to-cart buttons in showcase/product cards must be rectangular (no pill/capsule styling).
- Color swatches/variant selectors must be clearly visible and tappable (not tiny dot-like points).
- Carousels and horizontal rails should feel smooth and clean on all devices:
  - predictable spacing
  - no jumpy transitions
  - touch-friendly drag/swipe behavior
  - accessible controls
- Prioritize performance for interactive homepage sections:
  - avoid heavy unnecessary animations
  - use efficient image/video handling
  - keep scroll interactions smooth on low/mid devices.

## Environment

Required: `DATABASE_URL` (Mongo URI), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.
Also used: `GOOGLE_/FACEBOOK_CLIENT_ID|SECRET`, `UPSTASH_REDIS_REST_URL|TOKEN`,
`RESEND_API_KEY` + `FROM_EMAIL`/`FROM_NAME`, `BUNNY_STORAGE_ZONE_NAME`,
`BUNNY_STORAGE_ACCESS_KEY`, `BUNNY_STORAGE_HOSTNAME`, `NEXT_PUBLIC_BUNNY_CDN_URL`
(required for uploads and for `next.config.js` image hosts), `TWILIO_*`,
`NEXT_PUBLIC_SMS_*`, `NEXT_PUBLIC_SITE_*` / `NEXT_PUBLIC_CONTACT_*`, `CLOUDINARY_*` (legacy).
`check-environment.js` / `verify-env.js` at the root sanity-check these.
SSLCommerz credentials live in the `PaymentSettings` collection.

Adding a new remote image host requires updating `next.config.js` (`images.domains` **and**
`remotePatterns`).

## Gotchas

- Mid-rebrand: BDT/Dhaka/saree/`muscarimart`/`myfood`/`nextecom` naming survives in models,
  helpers, and defaults while the UI is EUR/Germany. `rebranding.md` is the design brief.
- `Order.deliveryType` is still `'Inside Dhaka' | 'Outside Dhaka'`, and shipping defaults
  are BD-shaped.
- `lib/resend.ts` contains a hardcoded fallback API key; several routes have hardcoded
  fallback URLs. Don't propagate these.
- The working tree usually has a large number of modified files from the rebrand — check
  `git status` before assuming a change is yours.
