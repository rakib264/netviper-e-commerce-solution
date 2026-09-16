'use client';

import { AnswerBlock } from '@/components/seo/AnswerBlock';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { sortCategories } from '@/lib/categories/sort';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  parent?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
  productCount?: number;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

/** One shared focus ring so every interactive element on the page reads the same. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Card / row title: the largest of the two category name treatments. */
const TITLE = 'font-navigation text-sm font-semibold uppercase tracking-[0.1em]';

/** Every category name inside a navigation list, at every level. */
const NAV_ITEM = 'font-navigation text-xs uppercase tracking-[0.08em]';

/**
 * Groups the flat `/api/categories` payload into a tree of arbitrary depth.
 * The endpoint returns every active category in one response, so the whole page
 * — grid, sidebar rail and every nested list — is derived from a single request.
 */
function buildCategoryTree(flat: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  flat.forEach((category) => byId.set(category._id, { ...category, children: [] }));

  const roots: CategoryNode[] = [];
  flat.forEach((category) => {
    const node = byId.get(category._id)!;
    const parent = category.parent ? byId.get(category.parent._id) : undefined;
    // A category whose parent was filtered out of the payload is treated as a root.
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sortDeep = (nodes: CategoryNode[]): CategoryNode[] =>
    sortCategories(nodes).map((node) => ({ ...node, children: sortDeep(node.children) }));

  return sortDeep(roots);
}

/**
 * Admins routinely save the description as a copy of the name, which then renders
 * as the same word twice under a card. Only show copy that adds something.
 */
function descriptionOf(category: Category): string | null {
  const description = category.description?.trim();
  if (!description) return null;
  const normalise = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
  return normalise(description) === normalise(category.name) ? null : description;
}

function subcategoryLabel(count: number) {
  return `${count} ${count === 1 ? 'Subcategory' : 'Subcategories'}`;
}

/**
 * CSS-only disclosure: the 0fr → 1fr row transition animates without a JS
 * per-frame loop, and `invisible` keeps collapsed links out of the tab order.
 */
function Collapsible({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        'grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none',
        open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** The single disclosure affordance used by the rail, the rows and the cards. */
function ChevronToggle({
  open,
  onClick,
  controls,
  label,
  className,
}: {
  open: boolean;
  onClick: () => void;
  controls: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground',
        FOCUS_RING,
        className,
      )}
    >
      <ChevronRight
        size={16}
        aria-hidden
        className={cn(
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          open && 'rotate-90',
        )}
      />
    </button>
  );
}

/** Image tile used by the cards and rows. Falls back to a neutral monogram. */
function CategoryTile({
  category,
  sizes,
  className,
}: {
  category: Category;
  sizes: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-sm border border-border bg-muted',
        className,
      )}
    >
      {category.image ? (
        <Image
          src={category.image}
          alt={category.name}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center font-navigation text-2xl font-semibold tracking-[0.08em] text-muted-foreground"
        >
          {category.name.trim().charAt(0).toUpperCase()}
        </span>
      )}

      {category.productCount !== undefined && category.productCount > 0 && (
        <span className="absolute left-3 top-3 rounded-sm border border-border bg-background/90 px-2 py-1 font-caption text-[11px] tracking-[0.06em] text-foreground">
          {category.productCount} {t('categories.items')}
        </span>
      )}
    </div>
  );
}

/** Grid card: image tile, label beneath, optional inline subcategory disclosure. */
function CategoryCard({
  category,
  expanded,
  onToggle,
}: {
  category: CategoryNode;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const description = descriptionOf(category);
  const hasChildren = category.children.length > 0;
  const panelId = `card-panel-${category._id}`;

  return (
    <div className="flex flex-col">
      <Link
        href={`/categories/${category.slug}`}
        className={cn('group block rounded-sm', FOCUS_RING)}
      >
        <CategoryTile
          category={category}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 30vw"
          className="aspect-[4/5]"
        />
        <h3 className={cn('mt-4', TITLE, 'text-foreground')}>
          <span className="border-b border-transparent pb-0.5 transition-colors duration-200 group-hover:border-foreground motion-reduce:transition-none">
            {category.name}
          </span>
        </h3>
      </Link>

      {description && (
        <p className="mt-2 line-clamp-2 font-paragraph text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {hasChildren && (
        <>
          <button
            type="button"
            onClick={() => onToggle(category._id)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className={cn(
              'mt-3 flex w-full items-center justify-between gap-3 rounded-sm border-t border-border py-3 text-left font-caption text-xs uppercase tracking-[0.08em] text-muted-foreground transition-colors duration-200 hover:text-foreground',
              FOCUS_RING,
            )}
          >
            {subcategoryLabel(category.children.length)}
            <ChevronRight
              size={14}
              aria-hidden
              className={cn(
                'transition-transform duration-300 ease-out motion-reduce:transition-none',
                expanded && 'rotate-90',
              )}
            />
          </button>

          <Collapsible id={panelId} open={expanded}>
            <ul className="border-l border-border pl-3 pb-1">
              {category.children.map((child) => (
                <li key={child._id}>
                  <Link
                    href={`/categories/${child.slug}`}
                    className={cn(
                      'block rounded-sm py-2 pl-2 text-muted-foreground transition-colors duration-200 hover:text-foreground',
                      NAV_ITEM,
                      FOCUS_RING,
                    )}
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Collapsible>
        </>
      )}
    </div>
  );
}

/** Recursive rail item. Roots filter the grid; deeper levels navigate. */
function RailItem({
  category,
  isActiveRoot,
  expandedIds,
  onToggle,
  onSelect,
}: {
  category: CategoryNode;
  isActiveRoot: boolean;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: ((category: CategoryNode) => void) | null;
}) {
  const { t } = useTranslation();
  const hasChildren = category.children.length > 0;
  const open = expandedIds.has(category._id);
  const panelId = `rail-panel-${category._id}`;

  const itemClass = cn(
    'min-w-0 flex-1 truncate rounded-sm px-3 py-2.5 text-left transition-colors duration-200',
    NAV_ITEM,
    FOCUS_RING,
    isActiveRoot
      ? 'bg-muted font-semibold text-foreground'
      : 'text-muted-foreground hover:text-foreground',
  );

  return (
    <li>
      <div className="flex items-center gap-1">
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(category)}
            aria-current={isActiveRoot ? 'true' : undefined}
            className={itemClass}
          >
            {category.name}
          </button>
        ) : (
          <Link href={`/categories/${category.slug}`} className={itemClass}>
            {category.name}
          </Link>
        )}

        {hasChildren && (
          <ChevronToggle
            open={open}
            onClick={() => onToggle(category._id)}
            controls={panelId}
            label={t(open ? 'categories.hideSubcategories' : 'categories.showSubcategories', { category: category.name })}
            className="h-9 w-9"
          />
        )}
      </div>

      {hasChildren && (
        <Collapsible id={panelId} open={open}>
          <ul className="ml-3 border-l border-border pl-1">
            {category.children.map((child) => (
              <RailItem
                key={child._id}
                category={child}
                isActiveRoot={false}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onSelect={null}
              />
            ))}
          </ul>
        </Collapsible>
      )}
    </li>
  );
}

/** Recursive nested list used inside the mobile rows. */
function NestedLinks({
  categories,
  expandedIds,
  onToggle,
}: {
  categories: CategoryNode[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <ul className="border-l border-border pl-4">
      {categories.map((child) => {
        const hasChildren = child.children.length > 0;
        const open = expandedIds.has(child._id);
        const panelId = `mobile-panel-${child._id}`;

        return (
          <li key={child._id}>
            <div className="flex items-center gap-2">
              <Link
                href={`/categories/${child.slug}`}
                className={cn(
                  'flex min-h-[44px] flex-1 items-center truncate rounded-sm text-muted-foreground transition-colors duration-200 hover:text-foreground',
                  NAV_ITEM,
                  FOCUS_RING,
                )}
              >
                {child.name}
              </Link>
              {hasChildren && (
                <ChevronToggle
                  open={open}
                  onClick={() => onToggle(child._id)}
                  controls={panelId}
                  label={t(open ? 'categories.hideSubcategories' : 'categories.showSubcategories', { category: child.name })}
                  className="h-11 w-11"
                />
              )}
            </div>

            {hasChildren && (
              <Collapsible id={panelId} open={open}>
                <div className="pb-1">
                  <NestedLinks
                    categories={child.children}
                    expandedIds={expandedIds}
                    onToggle={onToggle}
                  />
                </div>
              </Collapsible>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const SKELETON_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2', 'w-3/5', 'w-1/3', 'w-2/5'];

/** Mirrors the real layout one-for-one so nothing shifts when data lands. */
function CategoriesSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('categories.loadingCategories')} className="animate-pulse">
      {/* Mobile / tablet rows */}
      <div className="lg:hidden">
        <ul className="divide-y divide-border border-y border-border">
          {SKELETON_WIDTHS.slice(0, 4).map((width, index) => (
            <li key={index} className="flex items-center gap-4 py-5">
              <div className="h-[72px] w-[72px] flex-shrink-0 rounded-sm bg-muted sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className={cn('h-3.5 rounded-sm bg-muted', width)} />
                <div className="h-3 w-4/5 rounded-sm bg-accent" />
              </div>
              <div className="h-11 w-11 flex-shrink-0 rounded-sm border border-border" />
            </li>
          ))}
        </ul>
      </div>

      {/* Desktop rail + grid */}
      <div className="hidden lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-16">
        <div>
          <div className="h-2.5 w-16 rounded-sm bg-muted" />
          <div className="mt-6 space-y-4 border-t border-border pt-5">
            {SKELETON_WIDTHS.map((width, index) => (
              <div key={index} className={cn('h-3.5 rounded-sm bg-muted', width)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 xl:grid-cols-3 xl:gap-x-7 xl:gap-y-12">
          {SKELETON_WIDTHS.map((width, index) => (
            <div key={index}>
              <div className="aspect-[4/5] rounded-sm bg-muted" />
              <div className={cn('mt-4 h-3.5 rounded-sm bg-muted', width)} />
              <div className="mt-2.5 h-3 w-4/5 rounded-sm bg-accent" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * `initialCategories` is what the server already resolved. `undefined` means
 * this component was rendered outside its server shell and must fetch; an empty
 * array is a resolved answer and must render the empty state, not a skeleton.
 */
export interface CategoriesPageClientProps {
  initialCategories?: Category[];
  /** The server-resolved extractable answer for this page. */
  answer?: string;
}

export default function CategoriesPageClient({
  initialCategories,
  answer,
}: CategoriesPageClientProps = {}) {
  const { t } = useTranslation();
  const [tree, setTree] = useState<CategoryNode[]>(() =>
    initialCategories ? buildCategoryTree(initialCategories) : [],
  );
  const [loading, setLoading] = useState(!initialCategories);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);
  // Navigation disclosures (rail + mobile rows) never render at the same
  // breakpoint, so they share one set; the grid cards keep their own.
  const [navExpanded, setNavExpanded] = useState<Set<string>>(new Set());
  const [cardExpanded, setCardExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Already resolved on the server — nothing to fetch.
    if (initialCategories) return;

    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories', { cache: 'no-store' });
        const data = await response.json();
        if (cancelled) return;
        setTree(buildCategoryTree(data.categories || []));
      } catch (error) {
        console.error('Error fetching categories:', error);
        if (!cancelled) setTree([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => {
      setter((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [],
  );

  const toggleNav = useMemo(() => toggle(setNavExpanded), [toggle]);
  const toggleCard = useMemo(() => toggle(setCardExpanded), [toggle]);

  // Selecting a root filters the grid and reveals its branch in the rail.
  const selectRoot = useCallback(
    (category: CategoryNode) => {
      setActiveRootId(category._id);
      if (category.children.length > 0) {
        setNavExpanded((previous) => new Set(previous).add(category._id));
      }
    },
    [],
  );

  const activeRoot = useMemo(
    () => tree.find((category) => category._id === activeRootId) ?? null,
    [tree, activeRootId],
  );

  // Subcategories are already in memory — selecting a root never refetches.
  const gridCategories = activeRoot ? activeRoot.children : tree;

  return (
    <div className="min-h-screen bg-background font-paragraph">
      <Header />

      <main className="mb-20 lg:mb-0">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="luxury-container py-12 md:py-16">
            <p className="luxury-eyebrow">{t('categories.curatedCollections')}</p>
            <h1 className="mt-3 font-navigation text-3xl font-semibold text-foreground md:text-4xl lg:text-5xl">
              {t('categories.discoverCategories')}
            </h1>
            <p className="mt-4 max-w-2xl font-paragraph text-sm leading-relaxed text-muted-foreground md:text-base">
              {t('categories.exploreOurCarefullyCuratedCategoriesEach')}
            </p>
            {answer ? <AnswerBlock className="mt-6">{answer}</AnswerBlock> : null}
          </div>
        </section>

        <section className="luxury-container py-10 md:py-14">
          {loading ? (
            <CategoriesSkeleton />
          ) : tree.length === 0 ? (
            <p className="font-caption text-sm text-muted-foreground">
              {t('categories.noCategoriesAvailableRightNow')}
            </p>
          ) : (
            <>
              {/* Mobile / tablet: stacked accordion */}
              <div className="lg:hidden">
                <ul className="divide-y divide-border border-y border-border">
                  {tree.map((category) => {
                    const description = descriptionOf(category);
                    const hasChildren = category.children.length > 0;
                    const open = navExpanded.has(category._id);
                    const panelId = `mobile-panel-${category._id}`;

                    return (
                      <li key={category._id}>
                        <div className="flex items-center gap-4 py-5">
                          <Link
                            href={`/categories/${category.slug}`}
                            className={cn(
                              'group flex min-w-0 flex-1 items-center gap-4 rounded-sm',
                              FOCUS_RING,
                            )}
                          >
                            <CategoryTile
                              category={category}
                              sizes="(min-width: 640px) 96px, 72px"
                              className="h-[72px] w-[72px] flex-shrink-0 sm:h-24 sm:w-24"
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className={cn(TITLE, 'text-foreground')}>
                                {category.name}
                              </h3>
                              {description && (
                                <p className="mt-1.5 line-clamp-2 font-paragraph text-sm leading-relaxed text-muted-foreground">
                                  {description}
                                </p>
                              )}
                              {hasChildren && (
                                <p className="mt-1.5 font-caption text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                  {subcategoryLabel(category.children.length)}
                                </p>
                              )}
                            </div>
                          </Link>

                          {hasChildren && (
                            <ChevronToggle
                              open={open}
                              onClick={() => toggleNav(category._id)}
                              controls={panelId}
                              label={t(open ? 'categories.hideSubcategories' : 'categories.showSubcategories', { category: category.name })}
                              className="h-11 w-11 border border-border"
                            />
                          )}
                        </div>

                        {hasChildren && (
                          <Collapsible id={panelId} open={open}>
                            <div className="pb-5">
                              <NestedLinks
                                categories={category.children}
                                expandedIds={navExpanded}
                                onToggle={toggleNav}
                              />
                            </div>
                          </Collapsible>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Desktop: navigation rail + grid */}
              <div className="hidden lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-16">
                <aside className="sticky top-24 self-start">
                  <p className="luxury-eyebrow">{t('categories.browse')}</p>
                  <nav aria-label={t('categories.categoryNavigation')} className="mt-4">
                    <ul className="space-y-0.5 border-t border-border pt-4">
                      <li>
                        <button
                          type="button"
                          onClick={() => setActiveRootId(null)}
                          aria-current={activeRoot ? undefined : 'true'}
                          className={cn(
                            'w-full rounded-sm px-3 py-2.5 text-left transition-colors duration-200',
                            NAV_ITEM,
                            FOCUS_RING,
                            activeRoot
                              ? 'text-muted-foreground hover:text-foreground'
                              : 'bg-muted font-semibold text-foreground',
                          )}
                        >
                          {t('categories.allCategories')}
                        </button>
                      </li>

                      {tree.map((category) => (
                        <RailItem
                          key={category._id}
                          category={category}
                          isActiveRoot={activeRoot?._id === category._id}
                          expandedIds={navExpanded}
                          onToggle={toggleNav}
                          onSelect={selectRoot}
                        />
                      ))}
                    </ul>
                  </nav>
                </aside>

                <div>
                  {activeRoot && (
                    <nav
                      aria-label={t('categories.breadcrumb')}
                      className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border pb-4"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveRootId(null)}
                        className={cn(
                          'rounded-sm text-muted-foreground transition-colors duration-200 hover:text-foreground',
                          NAV_ITEM,
                          FOCUS_RING,
                        )}
                      >
                        {t('categories.allCategories')}
                      </button>
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground"
                        aria-hidden
                      />
                      <span className={cn(NAV_ITEM, 'font-semibold text-foreground')}>
                        {activeRoot.name}
                      </span>
                      <Link
                        href={`/categories/${activeRoot.slug}`}
                        className={cn('luxury-link ml-auto text-foreground', FOCUS_RING)}
                      >
                        {t('categories.viewCollection')}
                      </Link>
                    </nav>
                  )}

                  {gridCategories.length > 0 ? (
                    <div className="grid grid-cols-2 items-start gap-x-6 gap-y-10 xl:grid-cols-3 xl:gap-x-7 xl:gap-y-12">
                      {gridCategories.map((category) => (
                        <CategoryCard
                          key={category._id}
                          category={category}
                          expanded={cardExpanded.has(category._id)}
                          onToggle={toggleCard}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-sm border border-border bg-muted/40 p-8">
                      <p className="font-paragraph text-sm text-muted-foreground">
                        {t('categories.noSubcategoriesFor', { category: activeRoot?.name ?? '' })}
                      </p>
                      {activeRoot && (
                        <Link
                          href={`/categories/${activeRoot.slug}`}
                          className={cn(
                            'luxury-link mt-4 inline-block text-foreground',
                            FOCUS_RING,
                          )}
                        >
                          {t('categories.browseCategory', { category: activeRoot.name })}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Closing call to action */}
        <section className="border-t border-border bg-muted/40">
          <div className="luxury-container py-14 md:py-20">
            <div className="max-w-2xl">
              <p className="luxury-eyebrow">{t('categories.theFullAssortment')}</p>
              <h2 className="mt-3 font-navigation text-2xl font-semibold text-foreground md:text-3xl">
                {t('categories.readyToExplore')}
              </h2>
              <p className="mt-4 font-paragraph text-sm leading-relaxed text-muted-foreground md:text-base">
                {t('categories.discoverThousandsOfProductsAcrossAll')}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-sm">
                  <Link href="/explore">
                    {t('categories.exploreProducts')}
                    <ArrowRight className="ml-2" size={16} aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-sm">
                  <Link href="/products">
                    {t('categories.browseAllProducts')}
                    <ArrowRight className="ml-2" size={16} aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
