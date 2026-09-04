import type { CuratedSectionInput } from '@/lib/curated-sections/types';

/**
 * Sections created on first read, so a fresh install has a working homepage
 * rather than an empty manager.
 *
 * Deliberately *not* a "Featured" section: the static `featuredProducts` slot
 * already renders one, and seeding a second would show the same products twice
 * on every existing install. An admin who wants the curated version can add it
 * and switch the static slot off — that is their call, not a migration's.
 *
 * Copy is English here because it is seed data an admin edits, not shipped UI
 * strings; the storefront renders whatever they save.
 */
export const DEFAULT_CURATED_SECTIONS: CuratedSectionInput[] = [
  {
    key: 'new-arrivals',
    label: 'New Arrivals',
    eyebrow: 'Just landed',
    title: 'New Arrivals',
    subtitle: 'The latest pieces to join the collection.',
    ctaText: 'View all',
    ctaHref: '',
    variant: 'grid',
    isActive: true,
    order: 0,
    sourceMode: 'auto',
    autoSource: 'new-arrivals',
    categorySlug: '',
    manualProductIds: [],
    limit: 8,
  },
  {
    key: 'best-selling',
    label: 'Best Selling',
    eyebrow: 'Most wanted',
    title: 'Best Sellers',
    subtitle: 'Ranked by what our customers actually take home.',
    ctaText: 'View all',
    ctaHref: '',
    variant: 'rail',
    isActive: true,
    order: 1,
    // Hybrid from the start: the ranking is live, and a merchandiser can pin a
    // launch ahead of it without breaking the ordering underneath.
    sourceMode: 'hybrid',
    autoSource: 'best-selling',
    categorySlug: '',
    manualProductIds: [],
    limit: 10,
  },
  {
    key: 'limited-edition',
    label: 'Limited Edition',
    eyebrow: 'Limited',
    title: 'Limited Edition',
    subtitle: 'Small runs, made once.',
    ctaText: 'View all',
    ctaHref: '',
    variant: 'editorial',
    isActive: true,
    order: 2,
    sourceMode: 'auto',
    autoSource: 'limited-edition',
    categorySlug: '',
    manualProductIds: [],
    limit: 7,
  },
];
