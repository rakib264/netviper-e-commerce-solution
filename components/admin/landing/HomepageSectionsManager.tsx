'use client';

import HomepageSectionConfigDialog from '@/components/admin/landing/HomepageSectionConfigDialog';
import HomepageSectionsSkeleton from '@/components/admin/landing/HomepageSectionsSkeleton';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  HOMEPAGE_SECTION_META,
  mergeHomepageSections,
  type HomepageSectionConfig,
  type HomepageSectionKey,
  type HomepageSectionMeta,
  type HomepageSectionSettings,
} from '@/lib/landing/homepage-sections';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast-notifications';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader } from '@/components/ui/loader';

const STATIC_META_BY_KEY = new Map<HomepageSectionKey, HomepageSectionMeta>(
  HOMEPAGE_SECTION_META.map((meta) => [meta.key, meta]),
);

type VisibilityFilter = 'all' | 'live' | 'hidden';

const FILTERS: Array<{ value: VisibilityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'hidden', label: 'Hidden' },
];

/* ── Row ────────────────────────────────────────────────────────────────── */

interface SectionRowProps {
  section: HomepageSectionConfig;
  meta?: HomepageSectionMeta;
  /** Render order on the storefront, 1-based. */
  ordinal: number;
  isDirty: boolean;
  isSaving: boolean;
  isExpanded: boolean;
  /** Drag is off while the list is filtered — a partial list cannot be reordered. */
  sortable: boolean;
  onToggleExpanded: (key: HomepageSectionKey) => void;
  onFieldChange: (
    key: HomepageSectionKey,
    field: 'eyebrow' | 'title' | 'subtitle',
    value: string,
  ) => void;
  onToggle: (key: HomepageSectionKey, isEnabled: boolean) => void;
  onSave: (key: HomepageSectionKey) => void;
  onReset: (key: HomepageSectionKey) => void;
  onConfigure: (key: HomepageSectionKey) => void;
}

function SectionRow({
  section,
  meta,
  ordinal,
  isDirty,
  isSaving,
  isExpanded,
  sortable,
  onToggleExpanded,
  onFieldChange,
  onToggle,
  onSave,
  onReset,
  onConfigure,
}: SectionRowProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.key, disabled: !sortable });

  const supportsHeader = meta?.supportsHeader ?? true;
  const label = meta?.label ?? section.key;
  // Several showcase rows sit in this list at once, so each is badged with its
  // template — and with its own live flag, which hides it independently of the
  // slot toggle beside it.
  const showcase = meta?.showcase;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-lg border bg-card transition-shadow',
        isDragging ? 'z-10 border-ring shadow-lg' : 'border-border',
        !section.isEnabled && 'opacity-70',
      )}
    >
      {/* Summary line — everything needed to scan the page order at a glance. */}
      <div className="flex items-center gap-3 p-3 sm:px-4">
        <button
          type="button"
          aria-label={`Reorder ${label}`}
          disabled={!sortable}
          className={cn(
            'touch-none rounded p-1 text-subtle-foreground',
            sortable
              ? 'cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing'
              : 'cursor-not-allowed opacity-40',
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <span className="w-6 shrink-0 text-center font-caption text-xs tabular-nums text-subtle-foreground">
          {ordinal}
        </span>

        <button
          type="button"
          onClick={() => onToggleExpanded(section.key)}
          aria-expanded={isExpanded}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-navigation text-sm font-semibold text-foreground">
              {label}
            </span>
            {showcase ? (
              <Badge variant="outline" className="uppercase tracking-wide">
                {t(
                  showcase.template === 'split_media'
                    ? 'admin.homepageSections.splitMedia'
                    : 'admin.homepageSections.productShowcase',
                )}
              </Badge>
            ) : null}
            {showcase && !showcase.isActive ? (
              <Badge variant="subtle">
                <EyeOff className="mr-1 h-3 w-3" />
                {t('admin.homepageSections.offInShowcaseManager')}
              </Badge>
            ) : null}
            {section.isEnabled ? null : (
              <Badge variant="outline">
                <EyeOff className="mr-1 h-3 w-3" />
                Hidden
              </Badge>
            )}
            {isDirty ? <Badge variant="subtle">Unsaved</Badge> : null}
          </span>
          <span className="mt-0.5 block truncate font-caption text-xs text-muted-foreground">
            {supportsHeader && (section.title || meta?.defaults.title)
              ? section.title || meta?.defaults.title
              : meta?.description}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onConfigure(section.key)}
            className="font-button"
            aria-label={`Configure ${label}`}
          >
            <Settings2 className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Configure</span>
          </Button>
          <Switch
            checked={section.isEnabled}
            aria-label={`${section.isEnabled ? 'Hide' : 'Show'} ${label}`}
            onCheckedChange={(checked) => onToggle(section.key, checked)}
          />
          <button
            type="button"
            onClick={() => onToggleExpanded(section.key)}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${label}`}
            aria-expanded={isExpanded}
            className="rounded p-1 text-subtle-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180',
              )}
            />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-border px-4 py-4">
          {meta?.description ? (
            <p className="font-caption text-xs text-muted-foreground">
              {meta.description}
            </p>
          ) : null}

          {supportsHeader ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-label text-xs">Eyebrow</Label>
                <Input
                  value={section.eyebrow}
                  placeholder={meta?.defaults.eyebrow || 'Optional label'}
                  onChange={(event) =>
                    onFieldChange(section.key, 'eyebrow', event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-label text-xs">Title</Label>
                <Input
                  value={section.title}
                  placeholder={meta?.defaults.title || 'Section title'}
                  onChange={(event) =>
                    onFieldChange(section.key, 'title', event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="font-label text-xs">Subtitle</Label>
                <Input
                  value={section.subtitle}
                  placeholder={meta?.defaults.subtitle || 'Optional supporting copy'}
                  onChange={(event) =>
                    onFieldChange(section.key, 'subtitle', event.target.value)
                  }
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 font-caption text-xs text-muted-foreground">
              This section renders no heading of its own — use Configure for its
              options.
            </p>
          )}

          {meta?.manageHref ? (
            <Link
              href={meta.manageHref}
              className="mt-3 inline-flex items-center gap-1.5 font-navigation text-sm text-foreground underline-offset-4 hover:underline"
            >
              Manage {meta.label.toLowerCase()} content
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {isDirty ? (
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReset(section.key)}
            disabled={isSaving}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Revert
          </Button>
          <Button size="sm" onClick={() => onSave(section.key)} disabled={isSaving}>
            {isSaving ? (
              <Loader size="xs" label={null} className="mr-1.5" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* ── Manager ────────────────────────────────────────────────────────────── */

export function HomepageSectionsManager() {
  const [sections, setSections] = useState<HomepageSectionConfig[]>([]);
  const [baseline, setBaseline] = useState<HomepageSectionConfig[]>([]);
  /**
   * Product-showcase slots are created at runtime, one per showcase section, so
   * their registry entries arrive with the list rather than being imported.
   */
  const [remoteMeta, setRemoteMeta] = useState<HomepageSectionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<HomepageSectionKey | null>(null);
  const [reordering, setReordering] = useState(false);
  const [configuringKey, setConfiguringKey] = useState<HomepageSectionKey | null>(
    null,
  );
  const [expandedKeys, setExpandedKeys] = useState<Set<HomepageSectionKey>>(
    () => new Set(),
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<VisibilityFilter>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/homepage-sections', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      const merged = mergeHomepageSections(data.sections);
      setSections(merged);
      setBaseline(merged);
      setRemoteMeta(Array.isArray(data.meta) ? data.meta : []);
    } catch {
      showErrorToast({
        title: 'Could not load sections',
        description: 'Check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metaByKey = useMemo(() => {
    const map = new Map(STATIC_META_BY_KEY);
    for (const meta of remoteMeta) map.set(meta.key, meta);
    return map;
  }, [remoteMeta]);

  const baselineByKey = useMemo(
    () => new Map(baseline.map((section) => [section.key, section])),
    [baseline],
  );

  const dirtyKeys = useMemo(() => {
    const keys = new Set<HomepageSectionKey>();
    for (const section of sections) {
      const original = baselineByKey.get(section.key);
      if (!original) continue;
      if (
        original.eyebrow !== section.eyebrow ||
        original.title !== section.title ||
        original.subtitle !== section.subtitle
      ) {
        keys.add(section.key);
      }
    }
    return keys;
  }, [sections, baselineByKey]);

  const isFiltered = query.trim().length > 0 || filter !== 'all';

  const visibleSections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sections.filter((section) => {
      if (filter === 'live' && !section.isEnabled) return false;
      if (filter === 'hidden' && section.isEnabled) return false;
      if (!needle) return true;
      const meta = metaByKey.get(section.key);
      return [meta?.label, meta?.description, section.title, section.eyebrow, section.key]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [sections, query, filter, metaByKey]);

  const patchSection = useCallback(
    async (key: HomepageSectionKey, body: Record<string, unknown>) => {
      const response = await fetch(`/api/admin/homepage-sections/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.details?.join(' ') || data?.error || 'Failed to save section',
        );
      }
      return data?.section as HomepageSectionConfig | undefined;
    },
    [],
  );

  const handleToggleExpanded = (key: HomepageSectionKey) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleFieldChange = (
    key: HomepageSectionKey,
    field: 'eyebrow' | 'title' | 'subtitle',
    value: string,
  ) => {
    setSections((previous) =>
      previous.map((section) =>
        section.key === key ? { ...section, [field]: value } : section,
      ),
    );
  };

  /** Toggling is optimistic — it reverts if the request fails. */
  const handleToggle = async (key: HomepageSectionKey, isEnabled: boolean) => {
    const previous = sections;
    setSections((current) =>
      current.map((section) =>
        section.key === key ? { ...section, isEnabled } : section,
      ),
    );

    try {
      await patchSection(key, { isEnabled });
      setBaseline((current) =>
        current.map((section) =>
          section.key === key ? { ...section, isEnabled } : section,
        ),
      );
      showSuccessToast({
        title: isEnabled ? 'Section is live' : 'Section hidden',
        description: `${metaByKey.get(key)?.label ?? key} updated.`,
      });
    } catch (error: any) {
      setSections(previous);
      showErrorToast({
        title: 'Could not update visibility',
        description: error?.message || 'Please try again.',
      });
    }
  };

  const handleSave = async (key: HomepageSectionKey) => {
    const section = sections.find((item) => item.key === key);
    if (!section) return;

    setSavingKey(key);
    try {
      await patchSection(key, {
        eyebrow: section.eyebrow,
        title: section.title,
        subtitle: section.subtitle,
      });
      setBaseline((current) =>
        current.map((item) => (item.key === key ? { ...section } : item)),
      );
      showSuccessToast({
        title: 'Section saved',
        description: `${metaByKey.get(key)?.label ?? key} copy updated.`,
      });
    } catch (error: any) {
      showErrorToast({
        title: 'Save failed',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = (key: HomepageSectionKey) => {
    const original = baselineByKey.get(key);
    if (!original) return;
    setSections((current) =>
      current.map((section) => (section.key === key ? { ...original } : section)),
    );
  };

  const handleSaveSettings = async (settings: HomepageSectionSettings) => {
    if (!configuringKey) return;
    setSavingKey(configuringKey);
    try {
      const updated = await patchSection(configuringKey, { settings });
      const nextSettings = updated?.settings ?? settings;
      setSections((current) =>
        current.map((section) =>
          section.key === configuringKey
            ? { ...section, settings: nextSettings }
            : section,
        ),
      );
      setBaseline((current) =>
        current.map((section) =>
          section.key === configuringKey
            ? { ...section, settings: nextSettings }
            : section,
        ),
      );
      showSuccessToast({ title: 'Settings saved' });
      setConfiguringKey(null);
    } catch (error: any) {
      showErrorToast({
        title: 'Could not save settings',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  /** Reordering is optimistic; the previous order is restored on failure. */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((section) => section.key === active.id);
    const newIndex = sections.findIndex((section) => section.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = sections;
    const reordered = arrayMove(sections, oldIndex, newIndex).map(
      (section, index) => ({ ...section, sortOrder: index + 1 }),
    );
    setSections(reordered);
    setReordering(true);

    try {
      const response = await fetch('/api/admin/homepage-sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: reordered.map((section) => section.key) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to reorder');
      }
      setBaseline(reordered);
      showSuccessToast({ title: 'Order updated' });
    } catch (error: any) {
      setSections(previous);
      showErrorToast({
        title: 'Could not reorder',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return <HomepageSectionsSkeleton />;
  }

  const liveCount = sections.filter((section) => section.isEnabled).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a section…"
            aria-label="Find a homepage section"
            className="pl-9 pr-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-subtle-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                'rounded px-3 py-1.5 font-button text-xs transition-colors',
                filter === option.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setExpandedKeys((current) =>
              current.size > 0
                ? new Set()
                : new Set(visibleSections.map((section) => section.key)),
            )
          }
        >
          {expandedKeys.size > 0 ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-paragraph text-sm text-muted-foreground">
          {liveCount} of {sections.length} sections live.{' '}
          {isFiltered
            ? 'Clear the filter to drag sections into a new order.'
            : 'Drag to reorder — the storefront updates immediately.'}
        </p>
        {reordering ? (
          <span className="inline-flex items-center gap-1.5 font-caption text-xs text-muted-foreground">
            <Loader size="xs" label={null} />
            Saving order…
          </span>
        ) : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleSections.map((section) => section.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {visibleSections.map((section) => (
              <SectionRow
                key={section.key}
                section={section}
                meta={metaByKey.get(section.key)}
                ordinal={
                  sections.findIndex((item) => item.key === section.key) + 1
                }
                isDirty={dirtyKeys.has(section.key)}
                isSaving={savingKey === section.key}
                isExpanded={expandedKeys.has(section.key)}
                sortable={!isFiltered}
                onToggleExpanded={handleToggleExpanded}
                onFieldChange={handleFieldChange}
                onToggle={handleToggle}
                onSave={handleSave}
                onReset={handleReset}
                onConfigure={setConfiguringKey}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {visibleSections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Eye className="mx-auto h-8 w-8 text-subtle-foreground" />
          <p className="mt-3 font-paragraph text-sm text-muted-foreground">
            No sections match this filter.
          </p>
        </div>
      ) : null}

      <HomepageSectionConfigDialog
        section={sections.find((section) => section.key === configuringKey) ?? null}
        meta={configuringKey ? metaByKey.get(configuringKey) : undefined}
        saving={savingKey === configuringKey}
        onClose={() => setConfiguringKey(null)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default HomepageSectionsManager;
