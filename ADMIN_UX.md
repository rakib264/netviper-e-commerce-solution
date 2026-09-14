# Admin loading, speed and dead code — audit

Scope: every `app/admin/**/page.tsx` (30 routes, 4 of them redirect stubs).
Measured by reading the code; no live data was available in this session, so the
"needs live verification" list at the bottom is real.

---

## 1. What the first paint actually looks like today

Every admin page is `'use client'`, mounts `AdminLayout`, and fetches its own
data from `useEffect` with `loading: true`. So a cold load is **two sequential
full-screen waits**, not one:

| Stage | What is on screen | Gated by |
| --- | --- | --- |
| 1 | Centred spinner on an empty grey page — **no sidebar, no header, no page title** | `AdminLayout`: `if (status === 'loading') return <Loader/>` (`components/admin/AdminLayout.tsx:172`) |
| 2 | Generic skeleton, or a second spinner | the page's own `if (loading) return …` |
| 3 | Real page, fading/sliding in | framer-motion `initial` + (sometimes) GSAP |

Stage 1 is the worst offender and nobody has noticed it because it is short on a
warm session — but on a cold load `useSession()` has to round-trip
`/api/auth/session` before the shell renders at all. The sidebar, the logo and
the page chrome are **fully renderable without the session**; only the role-filtered
nav items and the avatar need it.

### Loading UI per route

| Route | First-load UI | Matches the loaded page? |
| --- | --- | --- |
| `/admin` (dashboard) | `DashboardSkeleton` — 8 stat cards, 4 charts, 6 widgets | **Partly.** Card/chart geometry is right. But the header placeholder replaces a header that needs *no data at all* (greeting, clock, role chip, 3 filter selects, Refresh), and the real page has a geo heatmap card, an operations band, a deals showcase and a high-value-customers row that the skeleton does not show — so the page grows ~3 screens taller when data lands. |
| `/admin/products` | `AdminListPageSkeleton rows=8 cols=6` | **No.** Real page is a full-bleed gradient hero (icon + 5xl title + subtitle + "Add Product"), 4 *coloured* gradient stat cards, then a rounded-3xl card wrapping the DataTable with its own gradient card-header, search box, filter row and pagination. The skeleton is a 7px text line, 4 neutral cards and grey bars. |
| `/admin/orders` | `AdminListPageSkeleton rows=8 cols=6` | **No.** Same hero template; stat grid is **6** across, not 4. |
| `/admin/coupons` | `AdminListPageSkeleton rows=6 cols=5` | **No.** Same hero; 4 stats; table card titled "Coupon Management". |
| `/admin/blogs` | `AdminListPageSkeleton rows=6 cols=5` | **No.** Same hero; 4 stats. |
| `/admin/customers` | `AdminListPageSkeleton showStats=false rows=8 cols=5` | **No**, and it actively lies: `showStats={false}` while the real page has a **5-card** stat grid. Guaranteed jump. |
| `/admin/messaging` | `AdminListPageSkeleton showStats=false rows=6 cols=4` | **No.** Same lie — real page has 5 stat cards. |
| `/admin/audit-logs` | `AdminListPageSkeleton rows=10 cols=5` | **No.** Same hero; 4 stats. |
| `/admin/admin-manager` | `AdminListPageSkeleton showStats=false rows=6 cols=4` | **No.** Hero + a bespoke role table. |
| `/admin/categories` | bare `<Loader size="lg">` in an `h-96` box | **No.** Real page: plain header + "Add Category" button, 3 stat cards, 3 filter pills, drag-and-drop tree. None of it suggested. |
| `/admin/customer-feedback` | bare `<Loader size="lg">` | **No.** Real page is a 3-up grid of review cards with a coloured platform header, avatar, stars and body copy. |
| `/admin/settings` | `AdminPageLoader` (spinner) | **No.** Real page: gradient hero + a 7-tab bar + a long form. The tab bar is static and could be on screen instantly. |
| `/admin/returns` | header + chips + search stay mounted; 5 skeleton rows inside the table | **Yes — this is the pattern to copy.** Only flaw: each row is one `colSpan={7}` bar instead of 7 cells, so the column rhythm is missing. |
| `/admin/courier` | tabs mount immediately, each panel skeletons itself | **Yes.** Panels use `Loader2`/`RefreshCw` spinners for in-flight actions, which is correct. |
| `/admin/marketing` | tabs mount immediately; `DealsPanel` uses `AdminRefreshIndicator`; `QuickDealsPanel`/`ComboBundlesPanel` use `AdminListPageSkeleton` | **Mixed.** Tabs are right; the two panels that use the generic skeleton are not. |
| `/admin/customer-trends` | `<Loader label=…>` inside `GeoRetargetingCenter` | **No.** Heavy map + chart page. |
| `/admin/landing-management` + children | static card grid / own panels | Fine. |
| `/admin/products/[id]`, `/[id]/edit` | `AdminDetailPageSkeleton` | **Roughly.** Two-column form + sidebar is the right idea; column split is `2/1` in both. Acceptable, lowest priority. |
| `/admin/orders/[id]` | delegates to a component | Check separately. |
| 4 redirect stubs | n/a | keep |

**Verdict on the shared vocabulary.** `AdminListPageSkeleton` is not salvageable
as a page-level component — it describes a screen that does not exist in this
admin. But the 8 list pages are *structurally identical* to each other (gradient
hero → gradient stat grid → card-wrapped DataTable), so the answer is not 8
hand-written skeletons; it is one honest `AdminHeroPageSkeleton` family that
mirrors **that** template, parameterised by stat count, stat tint, column widths
and the table-card title. That is content-shaped, not generic.

---

## 2. Performance findings

### 2.1 `AdminLayout` blocks the whole shell on the session (all 26 real pages)
`components/admin/AdminLayout.tsx:172`. Renders nothing but a spinner until
`useSession()` resolves. Fix: always render the shell; skeleton only the
role-filtered nav list and the avatar.

### 2.2 GSAP is loaded by 9 admin pages and is dead in 7 of them
`gsap` is imported only by `app/admin/{products,orders,coupons,blogs,audit-logs,admin-manager,settings,customers,messaging}/page.tsx` — nowhere else in the app.

In 7 of them the timeline is built in a **mount-only** effect (`useEffect(…, [])`)
while `if (loading) return <Skeleton/>` is still returning early, so
`headerRef.current` / `statsRef.current` / `containerRef.current` are all `null`
and every `tl.fromTo` is a no-op. The animation has never run. Two pages
(`customers:147`, `messaging:136`) gate on `[loading]` so theirs does run — and
it is exactly the "header slides in after the wait" effect the brief asks to kill.

Removing GSAP removes a dependency from the admin bundle outright.

### 2.3 Framer-motion entrance on every list page
Each hero is `<motion.div initial={{opacity:0,y:-30,scale:.95}} … duration:0.8>`
with children staggered to `delay: 0.4`, and the table card at `delay: 0.8`. So
after the data has already landed the user waits another ~1.2s to see it settle.
On the pages that also run GSAP this is a duplicate animation of the same element.

### 2.4 A refetch throws the whole page away
`setLoading(true)` inside the *refetch* function, with a page-level
`if (loading)` gate:

- `products` — fires on every debounced keystroke, filter, sort and page change.
  Typing in the search box flashes the entire page to a skeleton every 400ms.
- `customers`, `blogs`, `messaging`, `customer-feedback` — same, on search/filter/page.
- `/admin` dashboard — every time-range / category / customer-type change blanks
  the whole dashboard, including the filter bar that was just used.

This is what `AdminRefreshIndicator` exists for and nothing calls it except
`DealsPanel` and `AdvertisementsPanel`.

### 2.5 Fetch fan-out
Mostly fine. `settings` already `Promise.all`s its four endpoints; the dashboard
analytics route already `Promise.all`s 18 aggregations behind a 120s
`unstable_cache` keyed on the range token. Two smaller ones:

- `/admin` fires `fetchCategories()` and `fetchDashboardData()` from two separate
  effects — independent, so they do overlap; no change needed, but the categories
  result only feeds a filter dropdown and should not be able to delay anything.
- `products` fetches categories in one effect and products in another — fine.

**Do not split `/api/admin/dashboard/analytics`.** It is one cache entry
(`admin-dashboard-analytics-v3`); splitting KPIs onto a second endpoint would
double the aggregation cost on a cold key and change response shapes. The KPI
cards land faster by rendering the chrome + card shells immediately, not by
splitting the payload.

### 2.6 Heavy libraries pulled in by dead code
`@deck.gl/*` (8 packages), `maplibre-gl`, `react-map-gl` and `@amcharts/amcharts5`
are imported by `CustomerMap`, `CustomerMapHeatmap` and `TimeSeriesAnimationMap`
— all in the dead tree below. After the deletion the remaining users are
`components/admin/customer-trends/DistrictChoroplethMap` (amCharts),
`components/ui/map-location-picker` and `app/contact/page` (maplibre), so the
packages stay, but three of the largest client components stop being compiled.

---

## 3. Dead code — proven

### 3.1 `/admin/customer-target` — delete
`grep -rn "customer-target"` across the repo returns **zero** hits outside the
file itself. The sidebar entry labelled "Customer Target"
(`AdminLayout.tsx:85`) points at `/admin/customer-trends`. Nothing links here.

Uniquely-imported tree (no other importer anywhere):

| File | Size | Only importer |
| --- | --- | --- |
| `app/admin/customer-target/page.tsx` | 345 lines | — (unreachable) |
| `components/admin/CustomerAnalyticsDashboard.tsx` | 20 KB | customer-target |
| `components/admin/CustomerMap.tsx` | 36 KB | customer-target |
| `components/admin/DataExportManager.tsx` | 14 KB | customer-target |
| `components/admin/MLPredictionEngine.tsx` | 28 KB | CustomerAnalyticsDashboard |
| `components/admin/TimeSeriesAnimationMap.tsx` | 15 KB | CustomerAnalyticsDashboard |
| `components/admin/CustomerMapHeatmap.tsx` | 30 KB | **nothing at all** |

~158 KB of source, 7 files.

**Left in place deliberately:** `app/api/admin/geospatial/{orders,analytics}` and
`app/api/admin/heatmap/districts` become unreferenced by the client after this,
but deleting API routes is out of scope for "don't change API response shapes"
and they may be called by something outside this repo. Flagged, not removed.

### 3.2 Redirect stubs — keep
`/admin/advertisements`, `/admin/events`, `/admin/courier/consignments`,
`/admin/courier/integrations` are documented bookmark targets. Keep.

### 3.3 Skeleton exports to retire after the replacement
`AdminListPageSkeleton` (once its 8 page callers and 2 panel callers are moved
off it) and `AdminPageLoader` (settings is its only caller).
`SkeletonText`, `SkeletonStatCards`, `SkeletonTable`, `SkeletonPageHeader`,
`AdminInlineLoader`, `AdminRefreshIndicator`, `AdminDetailPageSkeleton` stay —
they are the building blocks the new page-specific skeletons compose from.

---

## 4. Plan, in commit order

1. **Shell first.** `AdminLayout` renders sidebar + topbar immediately; nav items
   and avatar skeleton until the session resolves. One commit, benefits all 26 pages.
2. **Dashboard.** Header + filter bar + Refresh render at once; only the data
   region skeletons, and it skeletons the *real* section list (8 KPIs → 2 chart
   rows → heatmap → operations → deals → 2 widget rows → high-value row).
   Refetch on filter change uses `AdminRefreshIndicator`, never a full skeleton.
3. **The hero-template family.** `components/admin/ui/hero-page-skeleton.tsx`:
   hero block, tinted stat grid, table card. Then products → orders → the other
   six list pages, each passing its own stat count/tints/columns.
4. **Kill the entrance animations.** Remove GSAP from all 9 pages and the
   `initial`/`animate` pairs from the list-page heroes and stat cards.
5. **Stop full-page reloads on refetch.** Split `loading` (first load) from
   `refreshing` (everything after) on products, customers, blogs, messaging,
   customer-feedback, dashboard.
6. **Spinner pages.** categories, customer-feedback, settings, customer-trends
   get structural skeletons; returns' row skeleton becomes per-column cells.
7. **Delete the dead tree** and the retired skeleton exports.

## 5. Needs live data to verify
- Actual TTFB of `/api/admin/dashboard/analytics` on a cold cache key.
- Whether `/api/admin/geospatial/*` and `/api/admin/heatmap/districts` have any
  external caller before those routes could be removed.
- Real column widths in the DataTable at ≥1280px, to tune the skeleton cell
  widths against a populated table.

---

# Outcome

Everything in the plan above was implemented. `yarn build` and `yarn test`
(195 tests) pass.

## Measured: first-load JS per admin route

Two full production builds, one at `8754327` (before) and one at the final
commit. Numbers are the First Load JS column from `next build`, in kB.

| Route | Before | After | Δ |
| --- | ---: | ---: | ---: |
| `/admin/settings` | 655 | 629 | **−26** |
| `/admin/blogs` | 481 | 455 | **−26** |
| `/admin/coupons` | 437 | 411 | **−26** |
| `/admin/customers` | 437 | 411 | **−26** |
| `/admin/orders` | 417 | 391 | **−26** |
| `/admin/messaging` | 415 | 389 | **−26** |
| `/admin/audit-logs` | 410 | 384 | **−26** |
| `/admin/products` | 410 | 384 | **−26** |
| `/admin/admin-manager` | 389 | 363 | **−26** |
| `/admin/customer-target` | 491 | **gone** | −491 |
| everything else | — | — | ±1 |

The uniform −26 kB is GSAP leaving the nine pages that imported it. The ±1 kB
elsewhere is the new skeleton components. Shared chunk is unchanged at 102 kB.

`/admin` itself is flat at 485 kB: its weight is Recharts and the choropleth,
neither of which this work touched.

## What changed, by screen

| Screen | Before | After |
| --- | --- | --- |
| shell (all 26) | full-screen spinner until `useSession()` resolved, *then* the page's own wait | chrome paints immediately; nav items and account block placeheld |
| `/admin` | whole page → `DashboardSkeleton`, on first load **and every filter change** | header + filters stay; data region only, shaped band-for-band; refetch shows a marker |
| products | generic skeleton; full-page reset per keystroke | hero + tinted stats + thumbnail-led table; search keeps rows up |
| orders | generic skeleton | hero + 6 stats + insight cards + table |
| coupons / blogs / customers / messaging / audit-logs / admin-manager | generic skeleton, two of them claiming no stat row while rendering five | own hero, own stat count, own column rhythm |
| categories | centred spinner in an `h-96` box | header, stats, filter pills, indented tree rows |
| customer-feedback | centred spinner | review-card grid |
| settings | `AdminPageLoader` spinner | hero + 7-tab strip + form field rhythm |
| returns | one bar spanning 7 columns | 7 cells |
| products/[id], /edit | one shared 2/1 skeleton for two different layouts | a detail shape and a form shape |
| Quick Deals / Combo Bundles panels | a whole-*page* skeleton drawn *inside* a panel that had already rendered its header and stats | data region only |

## Deleted

- `app/admin/customer-target/page.tsx` — zero references repo-wide.
- `components/admin/{CustomerAnalyticsDashboard,CustomerMap,DataExportManager,MLPredictionEngine,TimeSeriesAnimationMap,CustomerMapHeatmap}.tsx` — ~158 KB, each reachable only from that page or from each other. `CustomerMapHeatmap` had no importer at all.
- Dependencies: `gsap` and the eight `@deck.gl/*` packages.
- Retired exports: `AdminListPageSkeleton`, `AdminDetailPageSkeleton`, `AdminPageLoader`, `AdminInlineLoader`, `SkeletonText`, `SkeletonStatCards`, `SkeletonTable`, `SkeletonPageHeader`. `components/admin/ui/loading.tsx` is now one export, `AdminRefreshIndicator`.
- Kept: all four redirect stubs.

## Still needs live data to verify

1. **Every skeleton's fidelity.** They were built by reading each page's JSX.
   Column widths in particular are estimates — a populated table at ≥1280px is
   the only way to tune them.
2. **`/admin/orders` fetches `/api/admin/orders` with no pagination params** and
   filters client-side. On a store with real order volume that is the page's
   dominant cost, and no skeleton work fixes it. Not touched here: it changes
   what the page requests.
3. **`/api/admin/geospatial/{orders,analytics}` and `/api/admin/heatmap/districts`**
   now have no caller in this repo. Confirm nothing external calls them before
   removing the routes.
4. **`/admin` and `/admin/settings` remain the heaviest routes** (485 kB / 629 kB)
   — Recharts, the choropleth, and the settings form. Reducing those means code
   splitting, which is a separate piece of work.
5. **i18n debt.** The list pages are almost entirely hardcoded English
   ("Total Revenue", "Manage your product catalog with elegance"). New copy
   added here uses `t('common.loading')`, but the existing strings are
   pre-existing and out of scope for a loading-states change.
