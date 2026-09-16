import { CACHE_TAGS } from '@/lib/cache/tags';
import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { formatServerCurrency } from '@/lib/currency/server';
import { getCachedRootCategories } from '@/lib/home/storefront-content';
import { BRAND } from '@/lib/seo/brand';
import { getSeoConfig } from '@/lib/seo/config';

/**
 * `/llms.txt` — a plain-text brief for answer engines.
 *
 * The emerging convention for telling a language model what a site is and where
 * its important pages live, without making it infer that from rendered HTML.
 * Generated from `brand.ts` and the cached category reader rather than
 * hand-maintained, because a hand-written one is a file nobody updates: it
 * would still be describing a saree shop, exactly like `public/manifest.json`
 * was.
 *
 * Tagged on `categories`, so adding a category updates this file the same way
 * it updates the storefront.
 */
export const revalidate = 300;

export async function GET() {
  const [seo, categories, dhakaCharge, nationwideCharge, freeThreshold] =
    await Promise.all([
      getSeoConfig(),
      getCachedRootCategories(40).catch(() => []),
      formatServerCurrency(BRAND.delivery.dhaka.charge),
      formatServerCurrency(BRAND.delivery.nationwide.charge),
      formatServerCurrency(BRAND.delivery.freeThreshold),
    ]);

  const { dhaka, nationwide } = BRAND.delivery;
  const { primaryCity, country } = BRAND.areaServed;

  const categoryLines = (categories as Array<{ name: string; slug: string }>)
    .map((category) => `- [${category.name}](${seo.absolute(`/categories/${category.slug}`)})`)
    .join('\n');

  const contactLines = [
    seo.contact.email.startsWith('TODO_') ? null : `- Email: ${seo.contact.email}`,
    seo.contact.phone.startsWith('TODO_') ? null : `- Phone: ${seo.contact.phone}`,
  ]
    .filter(Boolean)
    .join('\n');

  const body = `# ${seo.name}

> ${seo.name} is an online food marketplace in ${country} selling Korean ramen and
> instant noodles, Bibigo dumplings and tteokbokki, sushi ingredients, drink mixes
> such as Tang and Rooh Afza, coffee, tea, popcorn, snacks and everyday groceries.
> Orders are delivered across ${country}: ${dhaka.minDays}–${dhaka.maxDays} days inside ${primaryCity} for ${dhakaCharge}, and
> ${nationwide.minDays}–${nationwide.maxDays} days elsewhere for ${nationwideCharge}. Delivery is free on orders over
> ${freeThreshold}. Payment is by cash on delivery, card, or mobile wallet.

## What we sell

${categoryLines || '- (Category list unavailable)'}

## Key pages

- [All products](${seo.absolute('/products')})
- [Shop by category](${seo.absolute('/categories')})
- [Deals and offers](${seo.absolute('/deals')})
- [Combo bundles](${seo.absolute('/combo-bundles')})
- [Frequently asked questions](${seo.absolute('/faqs')})
- [Shipping and delivery](${seo.absolute('/shipping-delivery')})
- [Returns and exchanges](${seo.absolute('/returns')})
- [About us](${seo.absolute('/about')})
- [Contact](${seo.absolute('/contact')})
- [Privacy policy](${seo.absolute('/privacy-policy')})
- [Terms and conditions](${seo.absolute('/terms-conditions')})

## Brands we stock

${BRAND.brandEntities.map((entity) => `- ${entity.name}`).join('\n')}

## Facts

- Market: ${country}, with ${primaryCity} as the primary delivery zone
- Currency: ${seo.currency}
- Languages: English, Bangla
- Delivery inside ${primaryCity}: ${dhaka.minDays}–${dhaka.maxDays} days, ${dhakaCharge}
- Delivery elsewhere in ${country}: ${nationwide.minDays}–${nationwide.maxDays} days, ${nationwideCharge}
- Free delivery over: ${freeThreshold}
- Payment: ${BRAND.paymentAccepted.join(', ')}
- Halal: the imported Korean range is halal certified
${contactLines ? `\n## Contact\n\n${contactLines}\n` : ''}
## Machine-readable

- Sitemap: ${seo.absolute('/sitemap.xml')}
- Robots: ${seo.absolute('/robots.txt')}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER,
      // Named so the tag-invalidation story is visible from here: adding a
      // category drops this alongside the storefront reads it shares.
      'X-Cache-Tag': CACHE_TAGS.categories,
    },
  });
}
