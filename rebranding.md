# Premium Rebrand Implementation Brief
### For: Cursor / Engineering Team
### Prepared as: Senior Product Design + Frontend Engineering Specification
### Objective: Transform current site into a premium, minimalist, globally-credible leather goods brand (Germany, EUR)

---

## 0. Context & Business Framing

**Current state:** The live site (muscarimart.com) is built as a Bangladeshi women's saree e-commerce store — BDT currency, saree-category IA, and a visual language (typography, density, imagery, colour use) suited to a mass-market regional fashion catalogue rather than a premium accessories house.

**Target state:** A new brand, based in Germany, selling premium leather goods for men and women — bags, handbags, backpacks, wallets, purses, shoes, sunglass cases — positioned in the Gucci / Coach / Louis Vuitton tier. Currency: **EUR (€)**. Audience: European / global, English + German locale support recommended.

**Design north star:** The reference used for this brief is the visual *system* (not the brand identity) of a flagship luxury fashion e-commerce site — restrained white/grey/black palette, generous whitespace, large editorial photography, quiet serif+sans typography, and an understated, confidence-first UI. **Do not copy any competitor's logo, wordmark, monogram pattern, or proprietary imagery** — the instructions below describe a *design system*, to be executed with 100% original brand assets, photography, and copy.

---

## 1. Design System — Colour, Typography, Spacing

### 1.1 Colour Palette (White / Grey / Black minimalist system)

Replace all current brand colours (BDT-store bright/saree palette) with a restrained neutral system. No accent colour should dominate — the product photography supplies the colour.

```
--color-bg-primary:      #FFFFFF   /* page background */
--color-bg-secondary:    #F5F5F3   /* section backgrounds, alternating blocks */
--color-bg-tertiary:     #EDEDEB   /* card backgrounds, hover states */

--color-text-primary:    #1A1A1A   /* near-black, not pure #000 — softer, premium */
--color-text-secondary:  #55534E   /* body copy, secondary labels */
--color-text-muted:      #8C8A85   /* disabled, meta text, placeholder */

--color-border:          #E2E0DC   /* hairline dividers */
--color-border-strong:   #1A1A1A   /* underlines on hover, active states */

--color-cta-bg:          #1A1A1A   /* primary button */
--color-cta-text:        #FFFFFF
--color-cta-hover-bg:    #333330

--color-error:           #B3261E   /* only for stock/error states */
--color-success:         #2E5339   /* order confirmation, muted forest, not neon green */
```

- **No pure black (#000) or pure grey blocks** — use warm off-blacks/off-whites (as above) for a softer, tactile "leather" premium feel rather than a cold tech aesthetic.
- **One neutral palette only.** Kill all current saree-store colour accents (pinks, golds, reds used as UI chrome). Colour should come exclusively from product photography.
- Dark mode: not required for v1. Optional footer band in `--color-text-primary` with white text is the only permitted "dark" surface.

### 1.2 Typography

Two-typeface system: a refined serif for display/heading moments (brand voice, editorial), and a clean grotesque sans for UI/body (usability, global legibility, German diacritics support).

```
--font-display: "Canela", "Playfair Display", "Georgia", serif;      /* headlines, product name on PDP hero, editorial titles */
--font-sans:    "Suisse Intl", "Neue Haas Grotesk", "Inter", -apple-system, sans-serif; /* nav, body, buttons, product cards, forms */
```

- Buy or license a proper luxury serif (e.g., **Canela**, **GT Sectra**, or **Reckless**) plus a Swiss grotesque (e.g., **Suisse Int'l**, **Söhne**, or **Neue Haas Grotesk**) if budget allows. Fallbacks above (Playfair Display / Inter, both free on Google Fonts) are acceptable for MVP.
- **Kill all current fonts** used on muscarimart (default e-commerce theme fonts / Bengali-friendly fallback fonts not needed for this brand unless German+Bengali dual support is required — confirm with team).
- Letter-spacing: navigation labels, button labels, and category eyebrows use **uppercase + `letter-spacing: 0.08em–0.12em`** — this single detail reads as "luxury" more than any other typographic choice.
- Type scale (rem, mobile-first, scale up ~1.25× per breakpoint):

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--text-hero` | 3.5–6rem | 400 (serif) | Homepage hero headline |
| `--text-h1` | 2.25rem | 400 (serif) | PDP product name, page titles |
| `--text-h2` | 1.5rem | 400 (serif) | Section titles ("New Arrivals", "The Atelier") |
| `--text-nav` | 0.75rem | 500 (sans, uppercase, tracked) | Nav links, category labels |
| `--text-body` | 1rem | 400 (sans) | Descriptions, PDP copy |
| `--text-price` | 0.9375rem | 500 (sans) | Price display |
| `--text-meta` | 0.75rem | 400 (sans, muted) | SKU, care labels, breadcrumbs |

- Line-height: generous — 1.4–1.6 for body, 1.05–1.15 for display serif headlines.
- No bold/loud weights anywhere in UI chrome. Max weight used = 500 (medium), except serif headlines which stay regular (400).

### 1.3 Spacing, Grid & Whitespace

This is the single biggest gap between a "regional e-commerce" feel and a "global luxury house" feel — **whitespace is a luxury signal**.

- Base spacing unit: `8px`. Section vertical padding: minimum `96px–160px` desktop, `56px–72px` mobile (current site almost certainly runs tighter — audit and roughly double it).
- Max content width: `1440–1600px`, with generous side gutters (`5–8vw`), never edge-to-edge text.
- Product grids: **3–4 columns desktop, 2 columns tablet, 1–2 columns mobile**, with wide gutters (`24–40px`) — not the dense 4–6 column cramped grids typical of mass e-commerce.
- Remove all visual clutter: badges, starburst "SALE" stickers, multiple overlapping banners, countdown timers, pop-up spam. Luxury sites use at most one quiet, editorial promotional message at a time.

---

## 2. Navigation Bar

**Reference pattern (flagship luxury retailer standard):**

- **Structure:** Slim, fixed/sticky top bar, transparent-over-hero on homepage (becomes solid white on scroll), always solid white on category/PDP pages.
- **Layout (desktop):**
  - Left: Hamburger "Menu" trigger (opens full-screen or mega-menu overlay) — luxury sites favour a clean mega-menu over cluttered dropdowns.
  - Center: Wordmark/logo, perfectly centered, serif or custom logotype, no icon — pure typography.
  - Right, in order: Search icon, Country/Language selector (flag + "Ship to: Germany €"), Wishlist/heart icon, Account icon, Bag/cart icon (with subtle item-count badge, no loud red circle — use a small tonal dot).
- **Top-level categories** (adapt to this brand): `Women | Men | New Arrivals | Bags | Shoes | Wallets & Small Leather Goods | Backpacks | Gifts | The Atelier / Our Story`.
- **Mega-menu on hover/click:** Full-width panel, editorial image on one side, text link columns on the other (categories, sub-categories, "Shop the Edit" curated links). Panel background white, generous padding, thin-weight sans links with tracked uppercase section headers.
- **Micro-interactions:** Underline-on-hover for nav links (1px, animates width from 0→100%), no colour change, no drop shadows, no bounce animations — everything eases at `200–300ms ease-in-out`.
- **Mobile:** Full-screen slide-in menu, large tappable rows, accordion for sub-categories, search bar pinned at top.

---

## 3. Homepage Structure

Rebuild the homepage as a sequence of **full-bleed editorial modules**, not a dense product-listing page. Suggested order:

1. **Hero Module** — Full-viewport-height video or large static campaign image, minimal overlay text (collection name + one CTA link, e.g., "Discover the Collection"), no clutter, no multiple CTAs stacked.
2. **Category Discovery Grid** — 6–9 square/portrait tiles in a clean grid, each: full-bleed lifestyle/product image, one-line category label below or overlaid at the bottom-left in small tracked caps (e.g., "Women's Handbags", "Men's Wallets", "Backpacks"). No price, no badges on this module — pure discovery.
3. **Editorial Banner + Product Push** — A large campaign image/video on one side, 3–4 hero product cards on the other (or below), each with quiet "Discover the collection" link. Rotate this module 2–3 times down the page for different collections (Women's New Arrivals, Men's Essentials, Travel/Backpacks).
4. **Brand Story / "The Maison" Module** — Three-column editorial tiles (History/Craft, Campaigns, Sustainability or "Made in Germany" savoir-faire story) with small serif headline + "Explore" link each. This is where the "posh, global brand" credibility is built — invest real content here (founding story, craftsmanship, materials sourcing).
5. **Newsletter / Client Services strip** — Minimal, centered, one input + one button, small print about updates/exclusive previews.
6. **Footer** (see §5).

**General rules:**
- Every image is full-bleed or generously framed — no thumbnails floating in whitespace with borders.
- No sidebar filters visible on homepage.
- No "Best Seller / Flash Sale / Limited Time" loud banners — replace with quiet seasonal campaign language.
- Prices appear only inside product cards deeper in the funnel, not plastered across the homepage hero modules.

---

## 4. Product Card Design (Category / Listing Pages)

Reference pattern:

- **Image:** Large portrait aspect ratio (4:5 or 3:4), single clean product-on-white (or on quiet neutral studio background) shot as default state; on hover (desktop) cross-fade to a second angle or lifestyle shot. No image borders, no drop shadows, no rounded corners (luxury = sharp/clean edges, 0–2px radius max).
- **Below image, left-aligned, minimal:**
  - Product name (sans, regular weight, `--text-body` size)
  - Short material/colour descriptor in muted grey (e.g., "Grained Calfskin, Cognac")
  - Price in EUR, formatted `€ 1.290` (European format — space or period as thousands separator, comma for decimals if used; confirm final format with German locale convention: `1.290,00 €`)
- **No visible "Add to Cart" button on the card itself** in the default luxury pattern — a small heart/wishlist icon appears top-right of the image on hover only. (If the business wants faster conversion, a quiet text-link "Quick Add" on hover is an acceptable middle ground — avoid loud button chrome on grid view.)
- **Grid gap:** wide (24–40px), 3–4 per row desktop, 2 per row tablet, 1–2 per row mobile.
- **No sale-price strike-through red badges.** If discounting exists at all (uncommon for this tier), show it quietly: original price in muted grey with a thin strikethrough, new price in primary text colour — no red, no percentage-off starbursts.
- **Sort/filter bar above grid:** minimal text-only controls ("Sort by ↓", "Filter"), opens a clean slide-in panel, not a heavy sidebar of checkboxes with coloured counters.

---

## 5. Single Product Page (PDP)

Reference pattern:

- **Layout:** Two-column desktop — left ~60% is a vertical scroll/gallery of large product images (studio shots + detail/texture close-ups + one lifestyle shot), right ~40% is a sticky purchase panel.
- **Right panel content, top to bottom:**
  1. Category eyebrow, small tracked uppercase (e.g., "HANDBAGS")
  2. Product name, serif display type, `--text-h1`
  3. Price, EUR, clean
  4. Colour/material swatches (small circular or square swatches, current selection has a thin ring, not a checkmark badge)
  5. Size selector if applicable (clean text chips, not dropdown for shoes — luxury sites show all sizes as tappable chips, out-of-stock sizes shown greyed-out with a strike, not hidden)
  6. Primary CTA: full-width or generous button, `--color-cta-bg` background, uppercase tracked label ("Add to Bag"), no icon needed
  7. Secondary link: "Add to Wishlist" (heart icon + text, ghost style, no border box)
  8. Delivery/returns micro-copy (collapsed accordion): "Complimentary shipping and returns", estimated delivery, click-and-collect if applicable
  9. Product description accordion — short poetic description first, then structured accordions: "Details & Care", "Composition", "Dimensions" (with a simple line diagram/measurements, not a dense spec table)
  10. "Complete the Look" or "You May Also Like" — a horizontal scroll rail of 4–6 related product cards, same card component as §4, appearing *below the fold*, never competing with the main PDP content.
- **No comparison tables, no star-rating widgets, no "12 people are viewing this" urgency banners, no coupon code input boxes on the PDP.** These are mass-market e-commerce patterns and actively undermine a premium positioning.
- **Zoom interaction:** click-to-expand full-screen image viewer with a clean close (×) and left/right arrow navigation, no jarring browser-native zoom.

---

## 6. Footer

Reference pattern — a dense but *organised* multi-column footer on a solid dark or solid light band (pick one; dark (`--color-text-primary` bg, white text) reads slightly more premium and is the recommended choice):

**Columns (adapt labels to this brand):**
1. **Client Services** — Contact Us (phone/WhatsApp/email), FAQ, Product Care, Store Locator (if applicable), Shipping & Returns
2. **Services** — Repairs, Personalisation/Monogramming (if offered), Gift Wrapping, Download App (if applicable)
3. **About [Brand Name]** — Our Story, Craftsmanship, Sustainability, Latest News/Journal, Careers
4. **Connect** — Newsletter signup (single email input + subscribe button, one line of microcopy about exclusive previews), Social icons (thin-line icon style, monochrome, no coloured brand icon buttons)

**Bottom bar (full width, smaller text, muted colour):**
- Legal links: Legal & Privacy, Terms & Conditions, Accessibility Statement, Cookie Settings
- Ship-to selector: small flag icon + "Ship to: Germany — €" (keep this visible in both nav and footer since currency/locale credibility matters for a new brand)
- Copyright line, brand name, year

**Rules:** thin-weight sans-serif throughout, generous line-height between links, hairline `--color-border` divider above the bottom bar, no clutter of payment-icon badges (max 4–5 quiet monochrome icons if needed for trust, not a colourful row of 10 badges).

---

## 7. Currency, Locale & Content Changes

- [ ] Replace all price fields/currency formatting: **BDT/৳ → EUR/€**, using German/European number formatting (`1.290,00 €` or `€1,290.00` depending on final locale decision — confirm with the German co-founder which convention to standardize, then apply site-wide via a single currency-formatting utility, not hardcoded strings).
- [ ] Update all payment gateway integrations to EUR-supporting processors (e.g., Stripe EU, PayPal EU, Klarna — Klarna is a strong trust signal for German/EU shoppers and worth prioritizing).
- [ ] Update shipping/tax logic for EU VAT rules (display prices VAT-inclusive for EU consumers, as is standard/required practice).
- [ ] Replace all product categories from sarees/women's ethnic wear → leather goods taxonomy: `Handbags, Shoulder Bags, Totes, Backpacks, Wallets, Card Holders, Purses, Belts, Sunglass Cases, Travel & Luggage` split under `Women / Men / Unisex`.
- [ ] Update meta tags, structured data (schema.org Product/Organization), OG images, and sitemap to reflect the new brand name, EUR currency, and Germany-based business (`og:locale: de_DE` + `en_GB`/`en_US` alternates, `meta-country: DE`).
- [ ] Add a language switcher (English / Deutsch) if the co-founder in Germany wants full German localisation — at minimum, ensure the UI copy is written in clean, error-free English suitable for a global audience, with German available as a toggle.
- [ ] Update legal/company footer info to reflect German business registration requirements (Impressum page is **legally required** for a business operating in Germany — add `/impressum` and `/datenschutz` (privacy policy per GDPR) pages; this is not optional under German law).

---

## 8. Imagery & Photography Direction

- Commission (or plan for) actual studio product photography on a seamless neutral background (`#F5F5F3` or pure white), plus editorial/lifestyle photography shot in a clean, desaturated, minimal-prop style — this is non-negotiable; stock photography or low-quality current-site images will undercut every other change on this list.
- Consistent lighting/shadow treatment across all product shots (soft, single-direction shadow or none at all — no drop-shadow filters applied in CSS).
- Hero/campaign imagery: large-format, model-led or still-life "product as hero" compositions, generous negative space for text overlay.
- Icon set: replace any current icon set with a single thin-line (1–1.5px stroke) icon family, monochrome, consistent style (search, bag, heart, account, chevrons, close).

---

## 9. Motion & Micro-interactions

- Global transition timing: `200–300ms`, easing `cubic-bezier(0.4, 0, 0.2, 1)` — nothing should feel bouncy or playful.
- Image hover: subtle scale (`transform: scale(1.03–1.05)`) or cross-fade only, never a spin, bounce, or shake.
- Page transitions: soft fade, no slide/wipe gimmicks.
- Add-to-bag confirmation: quiet slide-in mini-cart drawer from the right, not a jarring modal or toast with bright colour.
- Loading states: skeleton screens in `--color-bg-tertiary`, not spinners with brand-colour animation.

---

## 10. Accessibility & Technical Standards

- Maintain WCAG AA contrast even within the muted neutral palette — verify `--color-text-secondary` (#55534E) on `--color-bg-primary` (#FFFFFF) passes AA for body text (it does, ~7:1).
- All interactive elements keyboard-navigable; mega-menu and mini-cart drawer must trap focus correctly and be dismissible via `Esc`.
- Image `alt` text required for all product images (also an SEO requirement).
- Core Web Vitals: given the image-heavy editorial design, implement responsive `srcset`/`sizes`, lazy-loading below the fold, and a modern format (AVIF/WebP) pipeline — a "premium" site that loads slowly reads as cheap regardless of visual design.

---

## 11. Prioritised Implementation Checklist (for Cursor)

**Phase 1 — Foundation (do first, unblocks everything else)**
- [ ] Set up design tokens (colour, type, spacing) as CSS variables / Tailwind theme config exactly as specified in §1.
- [ ] Install/configure serif + sans font pairing (self-hosted or Google Fonts fallback).
- [ ] Build the global currency-formatting utility (EUR, European number format) and replace all BDT instances site-wide.
- [ ] Strip existing saree-store colour classes/utility styles from the codebase to avoid style leakage.

**Phase 2 — Core Components**
- [ ] Rebuild Navbar component per §2 (mega-menu, centered logo, right-icon cluster, sticky/transparent-on-hero behaviour).
- [ ] Rebuild Product Card component per §4.
- [ ] Rebuild Footer component per §5, including `/impressum` and `/datenschutz` pages.

**Phase 3 — Pages**
- [ ] Rebuild Homepage as modular editorial sections per §3.
- [ ] Rebuild Category/Listing page (grid, filter/sort per §4 rules).
- [ ] Rebuild PDP per §5.

**Phase 4 — Content & Data**
- [ ] Recategorize product taxonomy from sarees → leather goods categories.
- [ ] Replace all product data, images, and copy with new brand content (real photography — flag this as a dependency, not a Cursor/code task).
- [ ] Update all meta/SEO/structured data per §7.

**Phase 5 — Polish**
- [ ] Add motion/micro-interaction layer per §9.
- [ ] Full accessibility + performance audit per §10.
- [ ] Cross-browser/responsive QA at mobile, tablet, desktop breakpoints.

---

## 12. Explicit Guardrails

- Do **not** copy any competitor's logo, monogram, trademark, proprietary pattern, marketing copy, or photography. Everything above describes a **design system**, to be built with fully original brand assets.
- Do **not** name the new brand after, or in a way confusingly similar to, any existing luxury house — this is a legal/trademark risk, not just a style note.
- Keep the tone "quiet luxury": the biggest lever available is *restraint* — fewer colours, fewer competing CTAs, more whitespace, better photography. Resist the urge to add more visual elements to look "premium"; premium in this category reads as **less, better**.

---

*Note: this brief was written against direct review of the reference site's live structure/navigation/homepage pattern and the current site's available metadata. Detailed visual specs (exact current fonts/colours/spacing on the current site) were not fully retrievable via automated inspection since the current site renders via JavaScript and was not directly crawlable pixel-by-pixel — recommend a quick manual screenshot pass or a `computed-style` audit in browser DevTools before Cursor begins, to diff against the token system in §1 precisely.*
