# PERF_AUDIT.md — Phase 0 backend audit

**Scope:** 168 API route files under `app/api/**`, 33 Mongoose models, the
`unstable_cache` reader layer, and the Upstash queue/worker.
**Baseline:** `yarn test` → 182/182 pass. Working tree: `M components/admin/AdminLayout.tsx`.
**Target platform:** Vercel serverless + MongoDB Atlas M0 (500-connection ceiling).

> **Read this first.** A meaningful slice of the storefront read path has *already*
> been optimized by earlier work — `lib/home/storefront-content.ts`, `lib/cache/*`,
> `app/api/admin/dashboard/analytics` and the returns routes are in good shape. The
> brief's premise that `dashboard/analytics` is an unoptimized 1261-line route is
> stale: it already fans out with `Promise.all`, pushes everything into aggregation
> pipelines, and reads through a keyed `unstable_cache`. This audit reports what is
> **actually** left, not what the brief assumed.

---

## 1. Headline numbers

| Measure | Value |
|---|---|
| API route files | 168 |
| Routes with **no** auth check | 56 |
| **Admin** routes with no auth check | **2** (`/api/admin/geospatial/*`) |
| Routes with route-segment config | **1** (`/api/upload`, `runtime` only) |
| Public GET routes with **no** `Cache-Control` | **23** |
| Public GET routes reading through a cached reader | 11 of 39 |
| `.find*()` chains missing `.lean()` | 80 routes affected |
| `.find()` chains missing `.select()` | 32 routes |
| `.populate()` without `.lean()` | 15 routes, 69 populate calls total |
| `countDocuments` used for pagination | 39 calls across 29 routes; 21 of those **not** in a `Promise.all` |
| DB call awaited inside a loop (N+1) | 21 routes |
| Audit-log **write** on a GET (read) path | 2 routes |
| Models with zero explicit indexes | 8 (6 are settings singletons — see §5) |
| `maxPoolSize` configured in `lib/mongodb.ts` | **no** (defaults to 100) |

---

## 2. Ranked top 15 slowest / riskiest endpoints

Ranked by *expected production impact* = (request frequency) × (round trips or blocking cost) × (risk).

| # | Endpoint | Why it is slow / risky |
|---|---|---|
| 1 | `POST /api/orders` | **N+1 on the checkout critical path.** `Product.findById` awaited once per cart line in the validation loop (`route.ts:69`), then **again** per line in the stock loop (`:286`) with a per-document `.save()`, then **again** per combo component (`:328`). A 4-line cart ≈ **12+ sequential round trips** on products alone, plus `PaymentSettings.findOne`, coupon lookup, `Order.create`, and a final `Order.findById().populate().populate()` **without `.lean()`**. Then it *synchronously* kicks the queue (`queueService.processJobs(1)`) before responding. |
| 2 | `GET /api/admin/orders` | `find()` + 2× `populate()` with **no `.select()`** (pulls full order docs incl. `statusHistory`), then a **sequential** `countDocuments`, then an **awaited `createAuditLog` write on a read path** (`:83`). 4 blocking round trips where 1–2 suffice. Also: `dateFrom`/`dateTo` are parsed but never applied to `query` — a latent correctness bug (flagged, not fixed without approval). |
| 3 | `GET /api/admin/products` | Same shape: `find().populate()` (`:114`) → **sequential** `countDocuments` (`:121`) → **awaited audit write on GET** (`:123`). Every admin product-list page view writes a row to `AuditLog`. |
| 4 | `POST /api/worker` (cron) | **The Vercel cron is a no-op.** `vercel.json` schedules `GET /api/worker` every minute, but the `GET` handler only returns a static JSON banner — only `POST` drains the queue. The queue is therefore drained *only* by the synchronous kick inside order creation. Additionally the route is **unauthenticated**, so anyone can drain/DoS the queue. |
| 5 | `GET /api/settings/general` (via `ThemeProvider` + `LocalizationProvider`) | Both providers fetch this endpoint independently on **every page load**, each with `cache: 'no-store'` *and* `Cache-Control: no-cache, no-store, must-revalidate` request headers. Two uncacheable round trips per visitor per navigation, for a document that changes when an admin edits settings. |
| 6 | `GET /api/products` | Correctly uses `Promise.all`, but pairs it with `Product.countDocuments(query)` (`:207`) on a collection-wide filter, plus a second `countDocuments` (`:220`) and a `Category.find` in the facet branch. `countDocuments` on a filtered query is an index scan of the whole match set — the `limit + 1` `hasMore` pattern mandated by CLAUDE.md is not used here. |
| 7 | `GET /api/admin/customers` | `find` → `countDocuments` sequentially, plus a DB call inside a loop, no `.select()`. Regex search on `firstName`/`lastName`/`email` is unindexable and unanchored. |
| 8 | `GET /api/categories` + `Header.tsx` | `Header` fetches `/api/categories` with `cache: 'no-store'` on **every page**, defeating both the browser and the CDN, even though the route already reads a shared `unstable_cache` entry and sends a `Cache-Control` header. The client discards it. |
| 9 | `GET /api/blogs`, `GET /api/blogs/[slug]` | Public reads, **no cached reader, no `Cache-Control`**, no `.select()`, `populate` without `.lean()`. Blog content is admin-authored — the textbook 300 s editorial-cache candidate. |
| 10 | `GET /api/events`, `GET /api/events/[id]` | Same as above. `/api/events/landing` *is* cached; the general list/detail siblings are not, so an event page hits Mongo on every view. |
| 11 | `GET /api/payment/settings` | Hit on every checkout page load. Uncached `findOne` with **no `Cache-Control`**, and it will `create()` a default document on a *GET* if none exists (a write on a read path). |
| 12 | `GET /api/admin/geospatial/analytics` + `GET,POST /api/admin/geospatial/orders` | **No authentication at all** on `/api/admin/*` routes that run multi-stage `Order` aggregations. Anyone can extract order geography and burn M0 CPU. Security issue first, perf issue second. |
| 13 | `PUT /api/auth-settings` | **Unauthenticated write to the auth-configuration singleton.** Not a perf item; it is the single worst finding in this audit and is listed here so it is not lost. |
| 14 | `queueService.processJobs()` | Sequential `rpop` → process, one job at a time, up to 10 per invocation, under a 30 s `maxDuration`. A `GENERATE_INVOICE` job (PDF render + Bunny upload + email) can exhaust the budget and strand the rest of the batch. Each job re-enters `connectDB()`. |
| 15 | `GET /api/admin/orders/[id]` and the `orders/[id]/*` family | 8 routes each doing `findById().populate().populate()` with no `.lean()`, so Mongoose hydrates full documents (and their virtuals/getters) purely to serialize them straight to JSON. |

---

## 3. Connection pooling — the highest-leverage single change (Workstream A)

`lib/mongodb.ts` calls `mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 5000 })`.
No `maxPoolSize`. The driver default is **100**.

On Vercel, each warm lambda instance holds its own pool against the cached
`global.mongoose` connection. With Atlas M0's hard **500-connection ceiling**, 100
connections per instance means the cluster refuses connections at roughly **5
concurrent warm instances** — well below the traffic a storefront sees during a
campaign, and the failure mode is `MongoServerSelectionError`, not slowness.

**Proposed:** `maxPoolSize` ≈ 8–10 (configurable via env, safe default), `minPoolSize: 0`,
`maxIdleTimeMS` ≈ 30 s to let idle connections be reclaimed, plus explicit
`socketTimeoutMS` / `connectTimeoutMS`.

**The trade-off, stated explicitly:** `maxPoolSize: 1` is a common serverless
recommendation and would be **wrong here**. `lib/home/homepage-data.ts` dispatches
~10 readers in one `Promise.all`, and `dashboard/analytics` fans out further; a
pool of 1 serializes those and makes the homepage *slower*. 8–10 keeps the fan-out
parallel while raising the concurrent-instance ceiling from ~5 to ~50–60.

The cached-global pattern itself is correct and stays: `cached.conn` short-circuits
on warm reuse, `cached.promise` de-duplicates concurrent cold-start connects.

---

## 4. Caching gaps (Workstream C)

The architecture is right and already in place — `lib/cache/tags.ts`,
`lib/cache/revalidate.ts`, `lib/cache/model-invalidation.ts`,
`lib/home/storefront-content.ts`. The gaps are **coverage**, not design.

**Public GETs with no `Cache-Control` (23).** The ones that matter:
`/api/blogs`, `/api/blogs/[slug]`, `/api/events`, `/api/events/[id]`,
`/api/homepage-sections` (already reads a cached reader — header is a one-line add),
`/api/payment/settings`, `/api/auth-settings`.

**Public GETs not reading through a cached reader (28 of 39).** The
highest-traffic candidates for new readers in `storefront-content.ts`:
blogs list/detail (editorial, 300 s), events list/detail (scheduled, 60 s),
payment settings (editorial, 300 s — it is a singleton).

**Client-side `cache: 'no-store'` on public reads (the mirror-image problem).**
The route may send a perfect header, but these callers forbid the browser from
using it:

| Caller | Endpoint | Frequency |
|---|---|---|
| `components/providers/ThemeProvider.tsx:186` | `/api/settings/general` | every page load |
| `components/providers/LocalizationProvider.tsx:158` | `/api/settings/general` | every page load |
| `components/layout/Header.tsx:202` | `/api/categories` | every page load |
| `app/categories/page.tsx:478` | `/api/categories` | category index |
| `app/categories/[slug]/CategoryPageClient.tsx:528` | `/api/products?...` | every category page |
| `components/products/ProductReviews.tsx:92` | `/api/products/[slug]/reviews` | every PDP |
| `app/combo-bundles/**` (2 files) | `/api/combo-bundles*` | bundle pages |

`no-store` inside `components/admin/**` and `hooks/use-admin-resource.ts` is
**correct** and stays.

---

## 5. Index gap table (Workstream B)

The honest finding: **Product, Order, Category, Blog, Event, Deal, Banner,
InAppNotification, ReturnRequest, Message and AuditLog are already well indexed**,
and the leading-`isActive` convention is followed. There is no large index deficit.
Adding indexes for their own sake on a RAM-limited M0 would be a regression.

### Models with zero explicit indexes

| Model | Verdict | Reason |
|---|---|---|
| `AuthSettings`, `CourierSettings`, `GeneralSettings`, `IntegrationSettings`, `PaymentSettings`, `ReturnPolicySettings` | **KEEP as-is** | Singletons read with a bare `findOne()`. A collection scan of one document is optimal; an index would cost RAM for nothing. |
| `Coupon` | **1 index worth adding** | `code` is `unique` (auto-indexed), which covers `/api/coupons/validate` and the order path. Not covered: `Coupon.find({ isActive, startDate: {$lte}, expiryDate: {$gte} })` (`dashboard/analytics:821`) and the admin list sorted by `createdAt`. → `{ isActive: 1, expiryDate: 1 }`. |
| `CouponUsage` | **DELETE the model** | Zero references anywhere in the codebase (§6). No index needed for a collection nothing writes or reads. |

### Genuinely uncovered hot queries

| Query | Location | Missing index | Justification |
|---|---|---|---|
| `Order.find({ orderStatus, paymentStatus, paymentMethod, customer })` + sort `createdAt` | `admin/orders:61` | `{ orderStatus: 1, paymentStatus: 1, createdAt: -1 }` | Existing `{orderStatus,createdAt}` and `{paymentStatus,createdAt}` each cover only one leg; the admin list commonly filters on both. **One** compound index replaces the need, and does not duplicate either existing one (different prefix breadth). |
| `Coupon.find({ isActive, expiryDate })` | `dashboard/analytics:821` | `{ isActive: 1, expiryDate: 1 }` | Currently a full collection scan. |
| `User.find({ role: {$in: ['admin','manager']} })` | `notifications/policy.ts:65`, `admin/blogs:72` | none needed | Covered by existing `{ role: 1, createdAt: -1 }`. |

**Explicitly not proposed:** any index on `Product` (9 already, all justified),
any text index beyond `Blog`'s, and any index backing an unanchored `$regex`
search — regex-with-leading-wildcard cannot use one.

---

## 6. Dead code / unused features

Evidence method: exact import-path grep (`@/path` and `'…/Name'`) across
`app/`, `components/`, `lib/`, `hooks/`, `scripts/`, plus `vercel.json`.

### 6a. Dev-scaffolding API routes — 21 found (the brief estimated ~30)

| Route | Auth | UI refs | Verdict |
|---|---|---|---|
| `/api/seed` | **none** | 0 | **DELETE** |
| `/api/send-test-emails` | **none** | 0 | **DELETE** |
| `/api/test-invoice-system` | **none** | 0 | **DELETE** |
| `/api/test-order-emails` | **none** | 0 | **DELETE** |
| `/api/test-order-queue` | **none** | 0 | **DELETE** |
| `/api/test-queue` | **none** | 0 | **DELETE** |
| `/api/test-resend` | **none** | 0 | **DELETE** |
| `/api/queue-status` | **none** | 0 | **DELETE** |
| `/api/consume-queue` (305 lines) | **none** | 0 | **DELETE** |
| `/api/debug/auth` | **none** | 1 → `components/debug/AuthTest.tsx`, which is itself **unreferenced** | **DELETE** both |
| `/api/admin/test-auth` | role | 0 | **DELETE** |
| `/api/admin/test-email` | role | 0 | **DELETE** |
| `/api/admin/debug-system` | role | 0 | **DELETE** |
| `/api/admin/start-consumers` | role | 0 | **DELETE** (only caller of `/api/processQueue`) |
| `/api/admin/messaging/test` | role | 0 | **DELETE** |
| `/api/startup` | **none** | `AutoStartup.tsx` — already gated to non-production | **GATE**: keep, add auth/env gate on the route itself |
| `/api/processQueue` (182 lines) | **none** | `vercel.json` `functions` entry only; no cron, no UI | **GATE** — it is the manual queue drain and duplicates `/api/worker`. Recommend consolidating into `/api/worker` and deleting. **Ask before deleting.** |
| `/api/worker` | **none** | `vercel.json` cron | **GATE** — add `CRON_SECRET` bearer check. Keep. |
| `/api/admin/settings/test/bunny` | role | 0 direct | **KEEP** — real ops feature reachable from `/admin/settings` |
| `/api/admin/settings/test/sms` | role | 1 → `app/admin/settings/page.tsx:626` | **KEEP** |
| `/api/admin/settings/payment/test` | role | 0 direct | **KEEP** — same settings page family |
| `/api/admin/products/check-sku` | role | 1 → `components/admin/products/SkuField.tsx:86` | **KEEP** — live feature |

### 6b. Unused models

| File | Evidence | Verdict |
|---|---|---|
| `lib/models/CouponUsage.ts` | Zero references outside itself | **DELETE** |
| `lib/models/ReturnExchangeRequest.ts` | Only reference is a *comment* in `admin/returns/bulk-delete/route.ts:9` describing it as "a separate, unused" model | **DELETE** |

### 6c. Unused components

**Dead rebrand leftovers — `components/home/` (0 import-path references each):**
`BestSellingProducts.tsx`, `BrandStory.tsx`, `Categories.tsx`, `CategorySection.tsx`,
`DealsSection.tsx`, `HeroPromo.tsx`, `LimitedEdition.tsx`, `NewArrivals.tsx`
→ **DELETE** (superseded by the `HomeSection` band architecture).

**Other unreferenced components:**
`components/debug/AuthTest.tsx`, `components/admin/CustomerMapHeatmap.tsx`,
`components/categories/HorizontalCategoryList.tsx`, `components/layout/MobileTabbedMenu.tsx`,
`components/seo/SeoOptimizer.tsx`, `components/providers/NoSSR.tsx`,
`components/ui/FloatingButtons.tsx`, `components/ui/address-autocomplete.tsx`,
`components/ui/product-details-modal.tsx`, `components/ui/multi-image-upload.tsx`,
`components/ui/typography-test.tsx`, `components/ui/carousel-skeleton.tsx`,
`components/ui/product-skeleton.tsx`, `hooks/use-responsive-cart.ts`
→ **DELETE**, except `NoSSR.tsx` which CLAUDE.md documents as a hydration-safety
wrapper — **KEEP** that one, it is a documented escape hatch.

**Unreferenced shadcn primitives (16):** `breadcrumb`, `chart`, `collapsible`,
`context-menu`, `drawer`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`,
`resizable`, `sonner`, `toggle-group` → **KEEP**. They are never imported, so they
cost **zero** bundle bytes (tree-shaken at the module-graph level, not the bundler
level — an unimported file is simply not in the graph). Deleting them only removes
future convenience. Listed for completeness; recommend no action.

**Unused lib files:**
`lib/utils/categoryUtils.ts` — 0 references. Note CLAUDE.md still documents it as
the subcategory resolver; it was superseded by `getCachedCategoryScopeIds`.
→ **DELETE + fix CLAUDE.md.**
`lib/templates/email-templates.ts`, `lib/notifications/courierNotifications.ts`,
`lib/seed.ts`, `lib/sms/examples/zamanit-usage.ts` — 0 references → **DELETE**.

### 6d. Flagged, not proposed for deletion

Nothing in this codebase is reached purely via a dynamic string that I could find,
but `lib/models/*` are registered by side-effect import in `lib/mongodb.ts` — any
model deletion must also drop its import line there. `CouponUsage` and
`ReturnExchangeRequest` are **not** in that import list, which corroborates them
being dead.

---

## 7. Security findings surfaced by the audit (not perf, but blocking)

1. `PUT /api/auth-settings` — unauthenticated write to the auth-config singleton.
2. `GET /api/admin/geospatial/analytics`, `GET,POST /api/admin/geospatial/orders` — `/api/admin/*` with no auth check.
3. `POST /api/worker` — unauthenticated queue drain.
4. Nine unauthenticated `test-*`/`seed`/`debug`/queue routes shipped to production (§6a).

I have not touched any of these yet. Items 1–3 are auth-semantics changes and fall
under your guardrail — **I need your go-ahead**, since fixing them changes who gets
a 401.

---

## 8. Proposed execution order

| Phase | Workstream | Destructive? | Needs approval? |
|---|---|---|---|
| 1 | **A** — pool config in `lib/mongodb.ts` | no | no — starting now |
| 2 | **B** — 2 indexes (`Order`, `Coupon`) | no | no — starting now |
| 3 | **D** — `.lean()`/`.select()`/`limit+1`, populate cleanup | no (shape-preserving) | no |
| 4 | **C** — route-segment config + `Cache-Control` + new cached readers | no | no |
| 5 | **F** — `POST /api/orders` N+1, admin orders/products list | no | no |
| 6 | **G** — shared `requireRole` helper (preserving each route's exact role set) | no | no |
| 7 | **H** — queue/worker: cron GET bug, pool-aware job processing | **cron behavior** | **yes** |
| 8 | **E** — deletions per §6 | **yes** | **yes** |
| 9 | Security fixes §7 | **auth semantics** | **yes** |

---

## 9. Questions I need answered before proceeding past phase 6

1. **§7 security fixes** — add auth to `/api/auth-settings` PUT, the geospatial
   routes, and `/api/worker`? These return 401 where they previously returned 200.
2. **§6a deletions** — approve the DELETE column? Specifically `/api/processQueue`,
   which is the only one with a `vercel.json` reference.
3. **Worker cron** — the scheduled `GET /api/worker` currently does nothing. Fixing
   it means the queue starts draining every minute, which is presumably the intent
   but *is* a behavior change (more function invocations, jobs that have been
   stranded will suddenly process). Confirm.
4. **`/api/admin/orders` date filter** — `dateFrom`/`dateTo` are accepted and
   ignored. Wiring them up changes results for any caller passing them. Fix or
   leave?

---

## Appendix A — full 168-route inventory

Legend: `lean/find` = `.lean()` count vs `.find*()` count on that route.
Flags: `seq-countDocuments` (count not parallelised), `await-db-in-loop` (N+1),
`find-no-lean`, `find-no-select`, `populate-no-lean`, `audit-write-on-GET`.

| Route | Methods | Auth | Seg cfg | DB calls | lean/find | select | populate | count | Promise.all | Cache hdr | Flags |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/api/address/details` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/address/geocode` | GET,OPTIONS | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/address/reverse` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/address/search` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 1 | — | — |
| `/api/admin/admin-manager` | GET,POST | 'admin','manager' | — | 4 | 1/2 | 1 | 0 | 1 | 0 | — | seq-countDocuments |
| `/api/admin/admin-manager/[id]` | GET,PUT,DELETE | 'admin','manager' | — | 5 | 0/3 | 2 | 0 | 0 | 0 | — | — |
| `/api/admin/admin-manager/bulk-actions` | POST | 'admin','manager' | — | 3 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/admin-manager/export` | POST | 'admin','manager' | — | 2 | 2/2 | 2 | 0 | 0 | 0 | — | — |
| `/api/admin/advertisements` | GET,POST,DELETE | 'admin','manager' | 'admin' | — | 11 | 3/5 | 2 | 0 | 1 | 0 | — | find-no-select, seq-countDocuments |
| `/api/admin/advertisements/[id]` | GET,PUT | 'admin','manager' | — | 6 | 1/3 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/advertisements/reorder` | POST | 'admin','manager' | — | 2 | 0/0 | 0 | 0 | 0 | 0 | — | await-db-in-loop |
| `/api/admin/analytics/product-demand` | GET | 'admin','manager','staff' | — | 3 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/audit-logs` | GET,DELETE | 'admin' | — | 4 | 1/1 | 0 | 1 | 1 | 0 | — | find-no-select, seq-countDocuments |
| `/api/admin/banners` | GET,POST | 'admin','manager','super_admin' | — | 4 | 2/2 | 1 | 0 | 1 | 0 | — | find-no-select, seq-countDocuments |
| `/api/admin/banners/[id]` | GET,PUT,DELETE | 'admin','manager','super_admin' | — | 4 | 0/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/banners/bulk-actions` | POST | 'admin','super_admin' | — | 4 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/blogs` | GET,POST,PATCH,DELETE | 'admin','manager' | — | 12 | 3/7 | 3 | 2 | 1 | 0 | — | find-no-select, seq-countDocuments |
| `/api/admin/blogs/[id]` | GET,PUT,DELETE | 'admin','manager' | — | 5 | 1/3 | 0 | 2 | 0 | 0 | — | populate-no-lean |
| `/api/admin/blogs/export` | GET,POST | 'admin','manager' | — | 3 | 1/2 | 0 | 1 | 0 | 0 | — | await-db-in-loop, find-no-select |
| `/api/admin/categories` | GET,POST,DELETE | 'admin','manager','staff' | 'admin','manager' | 'admin' | — | 10 | 1/3 | 1 | 1 | 3 | 1 | — | await-db-in-loop, find-no-select |
| `/api/admin/categories/[id]` | GET,PUT,DELETE | 'admin','manager','staff' | 'admin','manager' | 'admin' | — | 9 | 0/3 | 0 | 2 | 2 | 0 | — | await-db-in-loop, populate-no-lean, seq-countDocuments |
| `/api/admin/categories/reorder` | POST | 'admin','manager' | — | 3 | 1/1 | 1 | 0 | 0 | 0 | — | — |
| `/api/admin/combo-bundles` | GET,POST | 'admin','manager' | — | 4 | 1/3 | 2 | 0 | 0 | 0 | — | find-no-lean, find-no-select |
| `/api/admin/combo-bundles/[id]` | GET,PATCH,DELETE | 'admin','manager' | — | 6 | 1/3 | 1 | 0 | 0 | 0 | — | find-no-lean |
| `/api/admin/combo-bundles/reorder` | POST | 'admin','manager' | — | 1 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/coupons` | GET,POST,PATCH,DELETE | 'admin','manager' | 'admin' | — | 10 | 2/3 | 0 | 1 | 1 | 0 | — | await-db-in-loop, find-no-select, seq-countDocuments |
| `/api/admin/coupons/[id]` | GET,PUT,DELETE | 'admin','manager' | 'admin' | — | 8 | 0/4 | 0 | 3 | 0 | 0 | — | await-db-in-loop, populate-no-lean |
| `/api/admin/courier` | GET,POST | 'admin','manager','staff' | — | 6 | 1/2 | 0 | 1 | 1 | 0 | — | find-no-select, seq-countDocuments |
| `/api/admin/courier/[id]` | GET,PUT,DELETE | 'admin','manager','staff' | 'admin','manager' | — | 6 | 1/2 | 0 | 2 | 0 | 0 | — | populate-no-lean |
| `/api/admin/courier/[id]/status` | PUT | 'admin','manager','staff' | — | 3 | 0/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/courier/bulk-delete` | POST | 'admin','manager' | — | 3 | 1/1 | 0 | 0 | 0 | 1 | — | find-no-select |
| `/api/admin/courier/bulk-status` | POST | 'admin','manager','staff' | — | 3 | 0/1 | 0 | 0 | 0 | 1 | — | find-no-lean, find-no-select |
| `/api/admin/curated-sections` | GET,POST | 'admin','manager' | — | 3 | 1/2 | 1 | 0 | 0 | 0 | — | find-no-select |
| `/api/admin/curated-sections/[id]` | PUT,DELETE | 'admin','manager' | — | 3 | 1/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/curated-sections/[id]/preview` | POST | 'admin','manager' | — | 1 | 1/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/curated-sections/reorder` | POST | 'admin','manager' | — | 1 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/customer-feedback` | GET,POST | 'admin','manager' | — | 5 | 1/3 | 0 | 0 | 1 | 1 | — | — |
| `/api/admin/customer-feedback/[id]` | GET,PUT,DELETE | 'admin','manager' | — | 5 | 0/3 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/customer-trends/targeting` | GET | 'admin','manager','staff' | — | 5 | 1/2 | 1 | 0 | 0 | 1 | yes | — |
| `/api/admin/customers` | GET | 'admin','manager' | — | 3 | 1/2 | 1 | 0 | 1 | 1 | — | await-db-in-loop, find-no-lean, find-no-select, seq-countDocuments |
| `/api/admin/customers/[id]` | GET,PUT,DELETE | 'admin','manager','staff' | 'admin','manager' | — | 10 | 1/4 | 2 | 0 | 1 | 0 | — | await-db-in-loop, find-no-lean, find-no-select, seq-countDocuments |
| `/api/admin/customers/[id]/stats` | GET | 'admin','manager','staff' | — | 1 | 0/1 | 0 | 0 | 0 | 0 | — | find-no-lean, find-no-select |
| `/api/admin/customers/[id]/status` | PUT | 'admin','manager' | — | 3 | 0/1 | 1 | 0 | 0 | 0 | — | — |
| `/api/admin/customers/bulk-delete` | POST | role-check | — | 5 | 0/1 | 0 | 0 | 1 | 0 | — | await-db-in-loop, seq-countDocuments |
| `/api/admin/customers/bulk-status` | POST | 'admin','manager' | — | 3 | 0/1 | 0 | 0 | 0 | 0 | — | await-db-in-loop |
| `/api/admin/customers/export` | POST | 'admin','manager','staff' | — | 4 | 2/3 | 2 | 0 | 0 | 1 | — | await-db-in-loop, find-no-lean, find-no-select |
| `/api/admin/dashboard/analytics` | GET | 'admin','manager' | — | 21 | 7/7 | 7 | 1 | 5 | 2 | yes | await-db-in-loop |
| `/api/admin/deals` | GET,POST | 'admin','manager' | — | 3 | 1/1 | 0 | 0 | 0 | 0 | — | find-no-select |
| `/api/admin/deals/[id]` | GET,PUT,DELETE | 'admin','manager' | — | 7 | 1/3 | 0 | 0 | 1 | 0 | — | seq-countDocuments |
| `/api/admin/deals/customer-groups` | GET | 'admin','manager' | — | 1 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/deals/reorder` | PUT | 'admin','manager' | — | 1 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/debug-system` | GET | 'admin','manager' | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/events` | GET,POST,PATCH,DELETE | 'admin','manager','staff' | 'admin','manager' | 'admin' | — | 11 | 2/4 | 0 | 2 | 1 | 0 | — | await-db-in-loop, find-no-select, find-no-lean, seq-countDocuments |
| `/api/admin/events/[id]` | GET,PUT,DELETE | 'admin','manager','staff' | 'admin','manager' | 'admin' | — | 8 | 1/4 | 0 | 2 | 0 | 0 | — | find-no-lean, find-no-select, populate-no-lean |
| `/api/admin/geospatial/analytics` | GET | **NONE** | — | 6 | 0/0 | 0 | 0 | 0 | 1 | — | — |
| `/api/admin/geospatial/orders` | GET,POST | **NONE** | — | 8 | 2/2 | 2 | 1 | 2 | 1 | — | seq-countDocuments |
| `/api/admin/heatmap/districts` | GET | 'admin','manager','staff' | — | 2 | 0/1 | 0 | 0 | 0 | 0 | yes | — |
| `/api/admin/homepage-sections` | GET | 'admin','manager' | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/homepage-sections/[key]` | PATCH | 'admin','manager' | — | 3 | 0/2 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/homepage-sections/reorder` | POST | 'admin','manager' | — | 2 | 0/1 | 1 | 0 | 0 | 0 | — | find-no-lean |
| `/api/admin/messaging` | GET,DELETE | 'admin','manager' | — | 5 | 1/2 | 0 | 1 | 1 | 0 | — | find-no-select, seq-countDocuments |
| `/api/admin/messaging/[id]` | GET,DELETE | 'admin','manager' | — | 3 | 1/2 | 0 | 1 | 0 | 0 | — | — |
| `/api/admin/messaging/customers` | GET | 'admin','manager' | — | 9 | 4/5 | 4 | 0 | 1 | 1 | — | await-db-in-loop, find-no-lean, find-no-select, seq-countDocuments |
| `/api/admin/messaging/send` | POST | 'admin','manager' | — | 12 | 5/5 | 5 | 0 | 1 | 0 | — | seq-countDocuments |
| `/api/admin/messaging/test` | POST | 'admin' | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/orders` | GET | 'admin','manager','staff' | — | 2 | 1/1 | 0 | 2 | 1 | 0 | — | find-no-select, seq-countDocuments, audit-write-on-GET |
| `/api/admin/orders/[id]` | GET,PATCH,DELETE | 'admin','manager','staff' | 'admin','manager' | — | 12 | 0/5 | 0 | 4 | 0 | 0 | — | populate-no-lean |
| `/api/admin/orders/[id]/download-pdf` | GET | "admin","manager","staff" | — | 3 | 0/2 | 0 | 2 | 0 | 0 | — | populate-no-lean |
| `/api/admin/orders/[id]/resend-confirmation` | POST | 'admin','manager','staff' | — | 1 | 0/1 | 0 | 2 | 0 | 0 | — | populate-no-lean |
| `/api/admin/orders/[id]/send-invoice` | POST | 'admin','manager','staff' | — | 1 | 0/1 | 0 | 2 | 0 | 0 | — | populate-no-lean |
| `/api/admin/orders/[id]/status` | PUT | 'admin','manager','staff' | — | 8 | 0/3 | 0 | 2 | 0 | 0 | — | await-db-in-loop, populate-no-lean |
| `/api/admin/orders/bulk-delete` | POST | 'admin','manager' | — | 3 | 0/1 | 0 | 0 | 0 | 0 | — | find-no-lean, find-no-select |
| `/api/admin/orders/bulk-status` | POST | 'admin','manager','staff' | — | 3 | 0/1 | 0 | 0 | 0 | 0 | — | find-no-lean, find-no-select |
| `/api/admin/orders/by-number` | GET | 'admin','manager','staff' | — | 1 | 1/1 | 0 | 2 | 0 | 0 | — | — |
| `/api/admin/orders/export` | POST | 'admin','manager','staff' | — | 2 | 0/2 | 0 | 4 | 0 | 0 | — | populate-no-lean, find-no-lean, find-no-select |
| `/api/admin/orders/sms-confirmation` | POST | 'admin','manager','staff' | — | 1 | 0/1 | 0 | 1 | 0 | 0 | — | populate-no-lean, find-no-lean, find-no-select |
| `/api/admin/product-showcase` | GET,POST | 'admin','manager','super_admin' | — | 3 | 2/2 | 1 | 0 | 0 | 0 | — | find-no-select |
| `/api/admin/product-showcase/[id]` | GET,PUT,DELETE | 'admin','manager','super_admin' | — | 5 | 3/2 | 1 | 0 | 0 | 0 | — | — |
| `/api/admin/product-showcase/reorder` | POST | 'admin','manager','super_admin' | — | 1 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/products` | GET,POST,PATCH,DELETE | 'admin','manager','staff' | 'admin','manager' | 'admin' | — | 14 | 1/7 | 1 | 1 | 1 | 0 | — | await-db-in-loop, find-no-select, seq-countDocuments, audit-write-on-GET |
| `/api/admin/products/[id]` | GET,PUT,DELETE | 'admin','manager','staff' | 'admin','manager' | 'admin' | — | 8 | 0/4 | 1 | 2 | 0 | 0 | — | await-db-in-loop, populate-no-lean |
| `/api/admin/products/check-sku` | GET | 'admin','manager','staff' | — | 5 | 3/5 | 3 | 0 | 0 | 0 | — | — |
| `/api/admin/returns` | GET | role-check | — | 3 | 1/1 | 0 | 0 | 1 | 1 | — | — |
| `/api/admin/returns/[id]` | GET,PATCH,DELETE | role-check | — | 1 | 1/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/returns/bulk-delete` | DELETE | role-check | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/returns/override` | POST | role-check | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/settings/auth` | GET,PUT | 'admin' | — | 6 | 0/3 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/settings/auth-simple` | PUT | role-check | — | 3 | 0/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/settings/courier` | GET,PUT | 'admin','manager','staff' | 'admin' | — | 7 | 0/3 | 0 | 0 | 0 | 0 | — | await-db-in-loop |
| `/api/admin/settings/general` | GET,PUT | role-check | — | 4 | 0/2 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/settings/integrations` | GET,PUT | role-check | — | 5 | 0/2 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/settings/payment` | GET,PUT | 'admin' | — | 7 | 0/3 | 0 | 0 | 0 | 0 | — | await-db-in-loop |
| `/api/admin/settings/payment/test` | POST | 'admin' | — | 1 | 0/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/settings/returns` | GET,PUT | role-check | — | 1 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/settings/test/bunny` | POST,GET | 'admin','manager' | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/settings/test/sms` | POST | 'admin' | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/start-consumers` | POST,GET | 'admin','manager' | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/test-auth` | GET | role-check | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/admin/test-email` | POST | 'admin','manager' | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/advertisements` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/auth-settings` | GET,PUT | public | — | 5 | 0/2 | 0 | 0 | 0 | 0 | — | — |
| `/api/auth/[...nextauth]` | — | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/auth/register` | POST | public | — | 2 | 0/1 | 0 | 0 | 0 | 1 | — | — |
| `/api/auth/reset-password` | POST | public | — | 5 | 0/3 | 0 | 0 | 0 | 0 | — | — |
| `/api/auth/send-otp` | POST | public | — | 6 | 0/3 | 0 | 0 | 0 | 0 | — | — |
| `/api/auth/verify-otp` | POST | public | — | 4 | 0/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/banners` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/blogs` | GET | public | — | 4 | 1/1 | 1 | 1 | 1 | 0 | — | seq-countDocuments |
| `/api/blogs/[slug]` | GET,POST,PATCH | public | — | 7 | 2/4 | 2 | 3 | 0 | 0 | — | — |
| `/api/cart/deals` | POST | session | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/categories` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/combo-bundles` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/combo-bundles/[slug]` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/combo-bundles/validate` | POST | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/consume-queue` | POST,GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/contact` | GET,POST,OPTIONS | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/coupons/validate` | POST | public | — | 1 | 0/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/curated-sections` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/customer-feedback` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/deals/active` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/debug/auth` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/events` | GET | public | — | 1 | 1/1 | 0 | 1 | 0 | 0 | — | find-no-lean, find-no-select |
| `/api/events/[id]` | GET | public | — | 1 | 1/1 | 0 | 1 | 0 | 0 | — | — |
| `/api/events/landing` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/geonames/proxy` | GET,OPTIONS | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/homepage-sections` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/notifications` | GET | session | — | 3 | 1/1 | 0 | 0 | 2 | 1 | yes | — |
| `/api/notifications/[id]/read` | PATCH | session | — | 2 | 0/0 | 1 | 0 | 1 | 0 | — | seq-countDocuments |
| `/api/notifications/read-all` | POST | session | — | 1 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/openstreetmap/proxy` | GET,OPTIONS | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/orders` | POST,GET,OPTIONS,PUT,DELETE,PATCH | session | — | 12 | 0/7 | 0 | 3 | 0 | 1 | — | await-db-in-loop, populate-no-lean, find-no-lean, find-no-select |
| `/api/orders/[id]` | GET,PUT | session | — | 3 | 1/2 | 0 | 2 | 0 | 0 | — | — |
| `/api/orders/[id]/invoice` | GET,POST | session | — | 2 | 2/2 | 0 | 2 | 0 | 0 | — | — |
| `/api/payment/settings` | GET | public | — | 2 | 0/1 | 0 | 0 | 0 | 0 | — | — |
| `/api/payment/sslcommerz/cancel` | POST,GET | public | — | 2 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/payment/sslcommerz/fail` | POST,GET | public | — | 2 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/payment/sslcommerz/initiate` | POST | public | — | 3 | 0/2 | 0 | 1 | 0 | 0 | — | populate-no-lean |
| `/api/payment/sslcommerz/ipn` | POST | public | — | 3 | 0/2 | 0 | 0 | 0 | 0 | — | — |
| `/api/payment/sslcommerz/success` | POST,GET | public | — | 3 | 0/2 | 0 | 0 | 0 | 0 | — | — |
| `/api/processQueue` | POST,GET,OPTIONS | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/product-showcase` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/products` | GET,POST | session | — | 10 | 3/6 | 3 | 1 | 2 | 1 | — | await-db-in-loop |
| `/api/products/[slug]` | GET | session | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/products/[slug]/reviews` | POST,GET | session | — | 5 | 1/4 | 1 | 1 | 0 | 0 | — | — |
| `/api/products/[slug]/reviews/helpful` | POST | public | — | 1 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/products/list` | GET | public | — | 3 | 1/2 | 2 | 1 | 1 | 1 | yes | — |
| `/api/profile` | GET,PUT | session | — | 3 | 0/2 | 1 | 0 | 0 | 0 | — | — |
| `/api/profile/notification-preferences` | GET,PUT | session | — | 3 | 0/2 | 2 | 0 | 0 | 0 | — | — |
| `/api/profile/rewards` | GET | session | — | 5 | 5/5 | 1 | 4 | 0 | 1 | — | find-no-select |
| `/api/profile/rewards/claim` | POST | session | — | 1 | 1/1 | 1 | 0 | 0 | 0 | — | — |
| `/api/profile/rewards/reveal` | POST | session | — | 4 | 2/3 | 2 | 0 | 0 | 0 | — | — |
| `/api/queue-status` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/returns` | GET,POST | session | — | 3 | 2/3 | 0 | 0 | 0 | 0 | yes | find-no-select |
| `/api/returns/lookup` | POST,GET | session | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/returns/policy` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/seed` | POST | public | — | 9 | 0/3 | 0 | 0 | 0 | 0 | — | — |
| `/api/send-test-emails` | POST | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/settings/courier` | GET | public | — | 2 | 0/1 | 0 | 0 | 0 | 0 | yes | — |
| `/api/settings/general` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | yes | — |
| `/api/startup` | GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/test-invoice-system` | POST | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/test-order-emails` | POST | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/test-order-queue` | POST | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/test-queue` | POST,GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/test-resend` | POST,GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/upload` | POST | session | runtime | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |
| `/api/user/returns` | GET,POST | session | — | 4 | 1/2 | 0 | 0 | 1 | 1 | — | — |
| `/api/worker` | POST,GET | public | — | 0 | 0/0 | 0 | 0 | 0 | 0 | — | — |