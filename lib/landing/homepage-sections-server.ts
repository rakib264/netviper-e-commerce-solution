import 'server-only';

import { unstable_cache } from 'next/cache';

import { DEFAULT_CURATED_SECTIONS } from '@/lib/curated-sections/defaults';
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  HOMEPAGE_SECTION_KEYS,
  LEGACY_SHOWCASE_SECTION_KEY,
  curatedSlotKey,
  isCuratedSlotKey,
  isShowcaseSlotKey,
  mergeHomepageSections,
  showcaseSlotKey,
  type CuratedSlotDescriptor,
  type HomepageSectionConfig,
  type ShowcaseSlotDescriptor,
} from '@/lib/landing/homepage-sections';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { revalidateStorefront } from '@/lib/cache/revalidate';
import CuratedSection from '@/lib/models/CuratedSection';
import HomepageSection from '@/lib/models/HomepageSection';
import ProductShowcaseSection from '@/lib/models/ProductShowcaseSection';
import { resolveShowcaseTemplate } from '@/lib/product-showcase/types';
import connectDB from '@/lib/mongodb';
import { revalidatePath, revalidateTag } from 'next/cache';

export const HOMEPAGE_SECTIONS_CACHE_TAG = 'homepage-sections';

/**
 * Create any slot that does not exist yet. Runs on first read so a fresh
 * database (or a newly added section key) needs no manual seed step. Upserts are
 * keyed on `key`, so concurrent callers converge instead of duplicating.
 */
export async function ensureHomepageSectionsSeeded(): Promise<void> {
  await connectDB();

  const existing = await HomepageSection.find()
    .select('key')
    .lean<Array<{ key: string }>>();
  const existingKeys = new Set(existing.map((doc) => doc.key));

  const missing = DEFAULT_HOMEPAGE_SECTIONS.filter(
    (section) => !existingKeys.has(section.key),
  );
  if (missing.length === 0) return;

  await HomepageSection.bulkWrite(
    missing.map((section) => ({
      updateOne: {
        filter: { key: section.key },
        update: { $setOnInsert: section },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

/* ── Dynamic slots ──────────────────────────────────────────────────────── */

interface ReconcileOptions {
  /** Every slot key this family should have, in the order they were created. */
  wantedKeys: string[];
  /** Recognises a key as belonging to this family, so orphans can be found. */
  belongsToFamily: (key: string) => boolean;
  /**
   * A retired slot whose position new slots inherit. When absent, new slots
   * append after everything else.
   */
  legacyKey?: string;
}

/**
 * Bring one family of dynamic slots in line with its source records.
 *
 * Creates a slot for every record that lacks one, removes slots whose record is
 * gone, and retires the family's legacy aggregate slot if it still exists. New
 * slots are inserted at the legacy slot's position — everything from there down
 * shifts by the number of insertions — so an existing homepage keeps its shape
 * instead of having the whole family dumped at the bottom of the page.
 *
 * Returns whether anything actually changed, so callers can skip cache work.
 */
async function reconcileSlots({
  wantedKeys,
  belongsToFamily,
  legacyKey,
}: ReconcileOptions): Promise<boolean> {
  const slots = await HomepageSection.find()
    .select('key sortOrder')
    .lean<Array<{ key: string; sortOrder?: number }>>();

  const existingKeys = new Set(slots.map((slot) => slot.key));
  const wanted = new Set(wantedKeys);

  const missing = wantedKeys.filter((key) => !existingKeys.has(key));
  const legacy = legacyKey
    ? slots.find((slot) => slot.key === legacyKey)
    : undefined;
  const orphans = slots
    .filter((slot) => belongsToFamily(slot.key) && !wanted.has(slot.key))
    .map((slot) => slot.key);

  if (missing.length === 0 && orphans.length === 0 && !legacy) return false;

  if (missing.length > 0) {
    const maxOrder = slots.reduce(
      (highest, slot) => Math.max(highest, slot.sortOrder ?? 0),
      0,
    );
    const anchor = legacy?.sortOrder ?? maxOrder + 1;

    // Open a gap rather than reusing one position, so the new slots keep a
    // stable, distinct order instead of colliding and sorting by key.
    await HomepageSection.updateMany(
      {
        sortOrder: { $gte: anchor },
        ...(legacyKey ? { key: { $ne: legacyKey } } : {}),
      },
      { $inc: { sortOrder: missing.length } },
    );

    await HomepageSection.bulkWrite(
      missing.map((key, index) => ({
        updateOne: {
          filter: { key },
          update: {
            $setOnInsert: {
              key,
              eyebrow: '',
              title: '',
              subtitle: '',
              isEnabled: true,
              sortOrder: anchor + index,
              settings: {},
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  const removable = [...orphans, ...(legacy && legacyKey ? [legacyKey] : [])];
  if (removable.length > 0) {
    await HomepageSection.deleteMany({ key: { $in: removable } });
  }

  return true;
}

export interface DynamicSlotSyncResult {
  showcases: ShowcaseSlotDescriptor[];
  curated: CuratedSlotDescriptor[];
  /** True when a document was created or removed, i.e. caches need dropping. */
  changed: boolean;
}

/**
 * Give every product-showcase section and every curated product section its own
 * homepage slot, so both can be dragged into position among the static ones.
 */
export async function syncDynamicSectionSlots(): Promise<DynamicSlotSyncResult> {
  await connectDB();
  await seedCuratedSections();

  const [showcaseDocs, curatedDocs] = await Promise.all([
    ProductShowcaseSection.find()
      // The panels come along so a document that never had a template written
      // can still be resolved from the content it actually holds.
      .select('_id title template isActive order splitLeft splitRight')
      .sort({ order: 1, createdAt: -1 })
      .lean<
        Array<{
          _id: unknown;
          title?: string;
          template?: string;
          isActive?: boolean;
          splitLeft?: unknown;
          splitRight?: unknown;
        }>
      >(),
    CuratedSection.find()
      .select('_id label sourceMode isActive order')
      .sort({ order: 1, createdAt: 1 })
      .lean<
        Array<{ _id: unknown; label?: string; sourceMode?: string; isActive?: boolean }>
      >(),
  ]);

  const showcases: ShowcaseSlotDescriptor[] = showcaseDocs.map((doc) => ({
    id: String(doc._id),
    title: String(doc.title || ''),
    // Resolved rather than compared, so a section stored with a legacy
    // spelling is still labelled "Split media" in the homepage order.
    template: resolveShowcaseTemplate(doc.template, null, {
      splitLeft: doc.splitLeft,
      splitRight: doc.splitRight,
    }),
    isActive: doc.isActive !== false,
  }));

  const curated: CuratedSlotDescriptor[] = curatedDocs.map((doc) => ({
    id: String(doc._id),
    label: String(doc.label || ''),
    sourceMode: String(doc.sourceMode || 'auto'),
    isActive: doc.isActive !== false,
  }));

  // Sequential, not parallel: both passes read and shift `sortOrder`, so
  // running them together would let one compute its anchor from a stale list.
  const showcaseChanged = await reconcileSlots({
    wantedKeys: showcases.map((item) => showcaseSlotKey(item.id)),
    belongsToFamily: isShowcaseSlotKey,
    legacyKey: LEGACY_SHOWCASE_SECTION_KEY,
  });
  const curatedChanged = await reconcileSlots({
    wantedKeys: curated.map((item) => curatedSlotKey(item.id)),
    belongsToFamily: isCuratedSlotKey,
  });

  return { showcases, curated, changed: showcaseChanged || curatedChanged };
}

/**
 * Create the shipped curated sections on a database that has none.
 *
 * Keyed upserts, so this is idempotent and a section an admin later deletes
 * does not come back: only a completely empty collection is seeded.
 */
export async function seedCuratedSections(): Promise<void> {
  const existing = await CuratedSection.estimatedDocumentCount();
  if (existing > 0) return;

  await CuratedSection.bulkWrite(
    DEFAULT_CURATED_SECTIONS.map((section) => ({
      updateOne: {
        filter: { key: section.key },
        update: { $setOnInsert: section },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

/**
 * Re-sync the slots and drop the storefront caches. Called by the showcase and
 * curated-section admin routes, so creating or deleting a section updates the
 * page order without waiting for the next uncached read.
 *
 * Both families' *content* caches go with the slot cache. `CuratedSection` and
 * `HomepageSection` are the two models that deliberately carry no schema-level
 * invalidation hook — they are seeded lazily from inside a cached read, so a
 * hook there would invalidate the entry being computed — which makes this the
 * one place their caches are dropped.
 */
export async function revalidateDynamicSlots(): Promise<void> {
  try {
    await syncDynamicSectionSlots();
  } catch (error) {
    console.error('Homepage slot sync failed:', error);
  }
  revalidateTag(HOMEPAGE_SECTIONS_CACHE_TAG);
  revalidateStorefront(
    CACHE_TAGS.curatedSections,
    CACHE_TAGS.productShowcase,
    CACHE_TAGS.homepage,
  );
  revalidatePath('/');
}

/** Uncached read. Falls back to shipped defaults so the homepage always renders. */
export async function getFreshHomepageSections(): Promise<HomepageSectionConfig[]> {
  try {
    await ensureHomepageSectionsSeeded();
    await syncDynamicSectionSlots();
    const stored = await HomepageSection.find()
      .sort({ sortOrder: 1 })
      .lean<Array<Partial<HomepageSectionConfig>>>();
    return mergeHomepageSections(stored);
  } catch (error) {
    console.error('Homepage sections read failed, using defaults:', error);
    return mergeHomepageSections(null);
  }
}

/**
 * Cached read for the storefront. Invalidated by tag whenever the admin writes,
 * mirroring how theme settings are handled.
 */
export const getCachedHomepageSections = unstable_cache(
  async () => getFreshHomepageSections(),
  // Bumped to v2 when the deals band was added below the hero: the tag is only
  // revalidated by an admin write, so a slot whose order changes outside that
  // path needs the key to move for the change to be picked up.
  ['homepage-sections-cache-v2'],
  { tags: [HOMEPAGE_SECTIONS_CACHE_TAG] },
);

/** Enabled slots only, in render order. */
export async function getEnabledHomepageSections(): Promise<HomepageSectionConfig[]> {
  const sections = await getCachedHomepageSections();
  return sections.filter((section) => section.isEnabled);
}

export { HOMEPAGE_SECTION_KEYS };
