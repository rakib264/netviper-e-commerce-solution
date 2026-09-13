# COURIER_PLAN.md — Phase 0 inspection & unification plan

**Scope:** the three `/admin/courier*` surfaces, `lib/courier/*`, the courier API
routes, both order-confirmation hooks, and the Pathao/Steadfast webhooks.
**Baseline:** `yarn test` 182/182 green. No edits made in this phase.

---

## 1. Current architecture — the confirm → consignment path

```
PUT /api/admin/orders/[id]/status        PATCH /api/admin/orders/[id]
  status === 'confirmed'                   status === 'confirmed'
          │                                         │
          └──────────────┬──────────────────────────┘
                         ▼
     ~166 lines of courier auto-create, DUPLICATED VERBATIM in both files
     reads  CourierSettings  (LEGACY singleton)
       · senderInfo → courier.sender
       · deliveryCharges / codChargeRate → courier.charges
       · defaultCourierPartners[0] || 'steadfast' → courier.courierPartner   ← GAP (a)
     writes Courier.create({...})    ← providerMeta NEVER set                ← GAP (b)
                         ▼
     autoDispatchOrderCourier(orderId)          lib/courier/dispatch.ts
       · reads CourierIntegrationSettings (NEW singleton)
       · returns early unless autoDispatchOnConfirm === true   (default false)
       · finds Courier by order, returns early if consignmentId exists
                         ▼
     dispatchCourier(courierId)
       provider = options.provider ?? courier.courierPartner ?? settings.defaultProvider
                                       ^^^^^^^^^^^^^^^^^^^^^ legacy value wins  ← GAP (a)
       · configuredProviders() guard → enabled + credentials present
       · toDispatchInput(courier)  → reads courier.providerMeta.pathao*        ← GAP (b)
       · validateDispatchInput()   → name / phone / address ≥ 10 chars
                         ▼
     provider.createConsignment(input)
       steadfast: free-text recipient_address            ✅ works
       pathao:    recipient_city / recipient_zone are OMITTED when unresolved  ← GAP (b)
                         ▼
     on success: consignmentId, trackingCode, providerStatus, dispatchedAt,
                 statusHistory entry, dispatchError cleared → mirrorToOrder()
     on failure: courier.dispatchError = message → "failed" lane
                         ▼
     Webhooks  /api/webhooks/courier/{pathao,steadfast}   +  manual sync
       → applyProviderStatus() → mirrorToOrder()
       → order.trackingNumber, order.courierInfo, order.orderStatus
         (picked/in_transit → shipped, delivered → delivered)
       → notifyCustomerOrderStatusChanged()
```

**What is already correct and must not be disturbed:** the provider adapter
abstraction, `CourierApiError`, the status normalisation map, both webhook
handlers (Pathao secret-header handshake, Steadfast constant-time bearer
compare), `applyProviderStatus`, `mirrorToOrder`'s refusal to walk a cancelled or
already-delivered order forward, and the never-throws contract on
`autoDispatchOrderCourier`.

---

## 2. The three surfaces, and exactly how they overlap

| | `/admin/courier` (legacy) | `/admin/courier/consignments` | `/admin/courier/integrations` |
|---|---|---|---|
| File | `app/admin/courier/page.tsx` — **2034 lines** | `ConsignmentBoard.tsx` — 512 lines | `CourierIntegrationsPanel.tsx` — 900 lines |
| Reads | `/api/admin/courier`, `/api/admin/settings/courier` | `/api/admin/courier` (same route) | `/api/admin/courier/integrations` |
| Writes | `/api/admin/courier` POST/PUT/DELETE, `[id]/status`, `bulk-status`, `bulk-delete` | `/dispatch`, `/sync` | `/integrations`, `/integrations/test`, `pathao/*`, `steadfast/balance` |
| i18n | **5 `t()` calls, no `useTranslation` import** — ~150 bare English strings | fully keyed | fully keyed |
| Currency | `formatStoreCurrency` ✅ — but three literal `(BDT)` labels | `formatPrice` ✅ | ✅ |

**Overlap:** both list surfaces read the *same* `/api/admin/courier` GET. The
route already serves both — `dispatchState` lanes and `counts` for the board,
plain pagination for the table. **No API work is needed to merge them.**

**What only the legacy page can do:** manual courier create, edit, delete, manual
status override, bulk status, bulk delete, the detail/tracking-timeline dialog,
CSV export of selected rows.

**What the legacy page does badly, and is the reason I do not propose keeping it
as-is:**

1. `fetchCouriers()` calls `/api/admin/courier` with **no pagination params**, so
   it receives the default `limit=20`.
2. The six "Delivery Analytics" stat cards are computed **client-side from that
   20-row page** (`page.tsx:841`). "Total Couriers" is therefore capped at 20 and
   is simply wrong on any real dataset.
3. `averageDeliveryTime: 0` and `onTimeDeliveryRate: 0` are hardcoded zeros
   rendered as analytics.
4. Zero i18n — a standing violation of CLAUDE.md's hard rule.
5. Errors surface through `alert()`, not the toast system.

---

## 3. The gaps, confirmed by reading the code

### (a) Two sources of truth for the provider — **confirmed**

`CourierSettings.defaultCourierPartners[0] || 'steadfast'` stamps
`courier.courierPartner` at creation. `dispatchCourier` prefers
`courier.courierPartner` over `settings.defaultProvider`. So the **legacy** value
wins and the provider chosen in the Integrations panel is ignored for every
auto-created consignment. An admin who enables Pathao and sets it as the default
still gets every order stamped `steadfast`.

**Not a simple delete.** `CourierSettings` is live and carries four things the new
model does not:
- `senderInfo` — the pickup address, used by courier creation **and** `/api/admin/courier/test-order`
- `deliveryCharges` / `codChargeRate` / `freeDeliveryThreshold` — read by **checkout** via `useCourierSettings` → `/api/settings/courier`
- `shippingClasses` — referenced by `Product.shippingClassId`
- `defaultCourierPartners` — **the only overlapping field**

So the reconciliation is narrow: `defaultCourierPartners` yields to
`defaultProvider`; everything else in `CourierSettings` stays exactly as it is.

**Proposed resolution order** (one helper, `resolveDefaultCourierPartner()`):
1. `CourierIntegrationSettings.defaultProvider` — **if that provider is actually configured** (`configuredProviders()` includes it)
2. else `CourierSettings.defaultCourierPartners[0]` — preserves off-platform partners (`redx`, `paperfly`, `sundarban`) that are tracked manually and have no adapter
3. else `'steadfast'`

Existing records keep their stamped `courierPartner`; nothing is migrated
destructively.

### (b) Pathao routing IDs are never resolved — **confirmed, Pathao auto-dispatch is 100% broken**

`toDispatchInput` reads `courier.providerMeta.pathaoCityId / ZoneId / AreaId`.
A repo-wide grep for `providerMeta` returns **six hits: four reads in
`dispatch.ts` and two declarations in the model. Nothing anywhere writes it.**

The adapter then omits `recipient_city` / `recipient_zone` with the comment
"Pathao then auto-detects the routing from the address". That comment is wrong —
both are required fields on `POST /aladdin/api/v1/orders`, so Pathao returns a
422 and the parcel lands in the "failed" lane with an opaque validation error.
Steadfast is unaffected because it takes a free-text address.

**Proposed fix:**
- New `lib/courier/pathao-routing.ts`:
  - `getPathaoCityList()` / `getPathaoZoneList(cityId)` / `getPathaoAreaList(zoneId)` wrapped in `unstable_cache` under a new `courier:pathao-geo` tag with a long `revalidate` — Pathao's geography is static, and today every cascade step is a live API call. (Inline `unstable_cache` is the established precedent for non-storefront caching in this repo; `admin/dashboard/analytics` does the same. This does **not** touch `lib/home/storefront-content.ts`, which is storefront-only.)
  - `resolvePathaoRouting({ city, district, division, street })` → normalised name matching: `district` → Pathao city, then `city`/address tokens → zone, then area. Returns `{ cityId, zoneId, areaId? }` or `null`.
- Call it in `dispatchCourier`, **only** when `providerId === 'pathao'` and
  `providerMeta.pathaoCityId` is unset. Persist the result to `providerMeta` so
  the lookup happens once per record, and so an admin can see what was chosen.
- **Fail loudly, never silently:** if city or zone cannot be resolved, set a
  specific `dispatchError`, save, and return `ok: false` **without calling
  Pathao**. The parcel appears in the "failed" lane with a reason an admin can
  act on.
- **Manual override:** a "Set Pathao routing" action on a failed row, reusing
  `hooks/use-pathao-locations.ts` (the city→zone→area cascade already exists and
  already invalidates children on parent change). It writes `providerMeta` via
  the existing `PUT /api/admin/courier/[id]` and re-dispatches.

### (c) Visibility & idempotency — mostly sound, two real holes

| Claim | Verdict |
|---|---|
| Auto-created consignment appears immediately in the board | ✅ — the board's `undispatched` lane is `consignmentId: {$in:[null,'']}`, which a fresh record matches. After unification it is the default tab. |
| Re-confirmation never double-**dispatches** | ✅ — guarded twice: `autoDispatchOrderCourier` checks `consignmentId`, and `dispatchCourier` checks it again. |
| Re-confirmation never double-**creates** | ⚠️ **hole.** The auto-create block does `findOne({order})` then `create()`, and `CourierSchema.index({ order: 1 })` is **not unique**. Two concurrent confirmations create two courier records for one order. `courierId` is also `CR${Date.now().toString().slice(-8)}` — collision-prone in the same millisecond. → Propose a **unique partial index on `order`** plus a create that tolerates a duplicate-key error as "already created". |
| `autoDispatchOnConfirm` defaults off | ✅ intentional (`CourierIntegrationSettings.ts:121`) — a merchant should not start booking real parcels the moment they paste credentials. ⚠️ but it is **undocumented in the UI**, which is why auto-dispatch "doesn't work" for anyone who never found the toggle. → Propose explicit explanatory copy in the Settings tab. |

---

## 4. Proposed unified UI

One page at `/admin/courier`, three tabs, deep-linkable via `?tab=`:

| Tab | Component | Notes |
|---|---|---|
| **Consignments** (default) | `ConsignmentBoard` (unchanged) | The dispatch desk. Gains a "Set Pathao routing" action on failed rows. |
| **Records** | **new, smaller** `CourierRecordsTable.tsx` | Keeps every capability the board lacks: create, edit, delete, manual status, bulk status, bulk delete, detail/timeline, CSV. Drops the broken analytics cards and the duplicated listing chrome. Fully i18n'd, toasts instead of `alert()`, real server-side pagination. |
| **Settings** | `CourierIntegrationsPanel` (unchanged) | Gains the `autoDispatchOnConfirm` explanation and a note that this tab owns the default provider. |

- Tabs mount **lazily** — only the active tab fetches, so opening the page costs one request, not three.
- Sidebar: the three `Engagement` entries collapse to a single **Courier**. The `PlugZap` / `Send` icon imports go with them.
- `/admin/courier/consignments` and `/admin/courier/integrations` become tiny server components that `redirect()` to `/admin/courier?tab=consignments|settings`, so existing bookmarks and the in-app `Link`s keep working.
- `/admin/settings` → Courier tab: the "default courier partners" control becomes read-only legacy (shipping-rate fields stay), pointing at Courier → Settings. **This removes a control, so I am flagging it rather than assuming it.**

### Why "Records" survives rather than being deleted

The board cannot create a courier for an order whose auto-create failed, cannot
correct a wrong recipient address, cannot delete a mistaken record, and cannot
set a status for an off-platform partner like `redx`. Those are real operational
needs. What I am deleting is the *presentation* — 2034 lines of it — not the
capability.

---

## 5. Commit plan

| # | Commit | Touches | Risk |
|---|---|---|---|
| 1 | Extract the duplicated 166-line auto-create block into `lib/courier/auto-create.ts`; add `resolveDefaultCourierPartner()`; unique partial index on `Courier.order` | both order routes, `lib/courier/`, `Courier` model | medium — order-confirm path; behaviour-preserving except the provider stamp |
| 2 | `lib/courier/pathao-routing.ts` + resolution in `dispatchCourier` + graceful failure | `lib/courier/` | low — additive; Steadfast untouched |
| 3 | Unified page + `CourierRecordsTable` + redirects + sidebar | `app/admin/courier/**`, `AdminLayout` | low — UI only |
| 4 | i18n keys for every new/changed string in `en`/`bn`/`de`; drop the `(BDT)` literals | `locales/*.json` | low — `yarn test` enforces parity |

Each commit keeps `yarn build` and `yarn test` green on its own.

---

## 6. Decisions I need from you

1. **Records tab — rewrite or port?** I recommend **rewrite** (smaller, i18n'd, correct pagination, no fake analytics). The alternative is to port all 2034 lines and add ~150 keys × 3 locales for stats that are wrong anyway. Confirm the rewrite, and confirm dropping the "Delivery Analytics" cards and the hardcoded `averageDeliveryTime` / `onTimeDeliveryRate` zeros.
2. **CSV export** — keep it in the Records tab? It is client-side, unindexed, and exports only the loaded page. I would keep it but fix it to export the current filter server-side, or drop it. Your call.
3. **`/admin/settings` → Courier tab** — make `defaultCourierPartners` read-only legacy and let the unified Settings tab own the default provider? This removes a control an admin can use today.
4. **`Courier.order` unique index** — if the database already contains duplicate courier records for one order, the index build fails. I would add it as a **partial** unique index and report duplicates first rather than fail a deploy. Confirm you want me to add the constraint at all, versus only fixing the code path.
5. **Pathao name matching** — district→city matching is inherently fuzzy (`Comilla`/`Cumilla`, `Chittagong`/`Chattogram`). My plan is: exact normalised match only, and anything ambiguous goes to the "failed" lane for an admin to resolve manually. Confirm you prefer that over a best-guess match that could route a parcel to the wrong city.

---

## 7. What I cannot verify without live credentials

`createConsignment`, `fetchStatus`, `testConnection`, the city/zone/area lists and
the webhook round trip all require real Pathao and Steadfast merchant accounts.
I will verify everything up to the provider boundary — record creation, provider
selection, routing resolution against a stubbed list, the failure path, lane
placement, and `mirrorToOrder` — and will state plainly which steps stayed
unexercised.
