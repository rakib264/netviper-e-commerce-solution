'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { normalizeDistrictName } from '@/lib/analytics/districts';
import { binColor, orderBinIndex } from '@/lib/analytics/heatmap';
import type { DistrictHeatmapDatum } from '@/lib/analytics/targeting';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import { cn } from '@/lib/utils';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface DistrictChoroplethMapProps {
  /** Every district with orders in the period — never narrowed by the district filter. */
  data: DistrictHeatmapDatum[];
  /** Canonical name of the district currently filtered on, or `null`. */
  selectedDistrict: string | null;
  /** Clicking a polygon selects it, clicking the selected one clears the filter. */
  onSelectDistrict: (district: string | null) => void;
  /** Tooltip copy, built by the caller so it stays translated. */
  tooltipFor: (datum: DistrictHeatmapDatum) => string;
  className?: string;
}

/**
 * Bangladesh, centred. A map chart otherwise opens on the whole-world view at
 * zoom 1, where the country is a speck — the reason the map read as blank even
 * once the polygons were there. The real fit is done by `zoomToGeoBounds`
 * below; this is the fallback if the geometry bounds cannot be measured.
 */
const HOME_GEO_POINT = { longitude: 90.35, latitude: 23.7 };
const HOME_ZOOM_LEVEL = 20;

/** Districts outside the current filter stay drawn, but recede. */
const MUTED_OPACITY = 0.25;

/** Share of the country's span left as breathing room on each edge. */
const MAP_INSET = 0.04;

/**
 * The GeoJSON spells some districts its own way ("Coxsbazar", "Chapainawabganj").
 * Folding through the same normaliser the API uses is what lets a polygon, a
 * table row and the filter dropdown all agree on one name.
 */
function canonicalNameOf(context: Record<string, unknown> | undefined): string {
  const raw = (context?.name_en as string) || (context?.name as string) || '';
  return normalizeDistrictName(raw) ?? '';
}

export default function DistrictChoroplethMap({
  data,
  selectedDistrict,
  onSelectDistrict,
  tooltipFor,
  className,
}: DistrictChoroplethMapProps) {
  const { palette } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<am5map.MapPolygonSeries | null>(null);
  const chartRef = useRef<am5map.MapChart | null>(null);
  const fittedRef = useRef(false);
  /**
   * Last district the pointer was over. Cleared when the pointer leaves the
   * map, not on `pointerout` — see the click wiring below.
   */
  const hoveredRef = useRef<string | null>(null);
  /** Polygons already switched to interactive; each is flipped exactly once. */
  const activatedRef = useRef(new WeakSet<object>());
  /** Everything the DOM tooltip needs: what to say, and where to say it. */
  const [tip, setTip] = useState<{ lines: string[]; x: number; y: number } | null>(null);
  const tipPointRef = useRef({ x: 0, y: 0 });

  /*
   * Every render input the imperative styling needs, held in a ref.
   *
   * The chart is built once and never rebuilt, so the click handler registered
   * at build time would otherwise close over the first render's props forever.
   */
  const latest = useRef({ data, selectedDistrict, onSelectDistrict, tooltipFor, palette });
  latest.current = { data, selectedDistrict, onSelectDistrict, tooltipFor, palette };

  /*
   * Style the polygons that the GeoJSON already created.
   *
   * This is deliberately NOT done through `series.data.setAll()`. A map series
   * builds one data item per GeoJSON feature and parses the GeoJSON exactly
   * once; a later `setAll` replaces those geometry-carrying items with rows
   * that have no geometry, and nothing is left to draw. That is what blanked
   * this map. Writing to the polygons directly leaves the geometry untouched.
   */
  const paint = useCallback(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    if (series.mapPolygons.length === 0) return;

    const current = latest.current;
    const byId = new Map(current.data.map((datum) => [datum.districtId, datum]));
    const borderColor = am5.color(current.palette['--border'] || '#cbd5e1');
    const selectedStroke = am5.color(current.palette['--foreground'] || '#111827');

    series.mapPolygons.each((polygon) => {
      const dataItem = polygon.dataItem as
        | { get(key: 'id'): number | string | undefined; dataContext?: Record<string, unknown> }
        | undefined;
      if (!dataItem) return;

      const rawId = dataItem.get('id');
      const districtId = typeof rawId === 'string' ? Number(rawId) : rawId;
      const datum = districtId === undefined ? undefined : byId.get(districtId);
      const orders = datum?.orders ?? 0;

      // A district with no orders still belongs on the map; it just sits in the
      // zero bin rather than being dropped.
      const name = datum?.district ?? canonicalNameOf(dataItem.dataContext);

      const isSelected = current.selectedDistrict !== null && name === current.selectedDistrict;
      const isDimmed = current.selectedDistrict !== null && !isSelected;

      if (!activatedRef.current.has(polygon)) {
        activatedRef.current.add(polygon);
        polygon.set('interactive', true);
      }

      polygon.setAll({
        fill: am5.color(binColor(orderBinIndex(orders), current.palette)),
        fillOpacity: isDimmed ? MUTED_OPACITY : 1,
        stroke: isSelected ? selectedStroke : borderColor,
        strokeWidth: isSelected ? 2.5 : 0.5,
        strokeOpacity: isDimmed ? MUTED_OPACITY : 1,
        tooltipText: current.tooltipFor(
          datum ?? { district: name, districtId: districtId ?? 0, orders: 0, revenue: 0 },
        ),
      });
    });

    /*
     * Fit the country to the card, once.
     *
     * Done here rather than on a series event because the chart only knows its
     * geographical bounds after its own validation pass, which is later than
     * the series' — reading them too early yields an empty box and no zoom.
     * Once fitted we leave the viewport alone, so a repaint after a filter
     * change does not yank the map back from wherever the user panned it.
     */
    if (fittedRef.current) return;
    const bounds = chart.geoBounds();
    if (bounds && bounds.left !== bounds.right && bounds.top !== bounds.bottom) {
      // Pad the bounds rather than the container: an exact fit puts the
      // southern islands hard against the frame.
      const padX = (bounds.right - bounds.left) * MAP_INSET;
      const padY = (bounds.top - bounds.bottom) * MAP_INSET;
      chart.zoomToGeoBounds(
        {
          left: bounds.left - padX,
          right: bounds.right + padX,
          top: bounds.top + padY,
          bottom: bounds.bottom - padY,
        },
        0,
      );
      fittedRef.current = true;
    } else {
      // Bounds unreadable (no geometry yet): fall back to the pinned view so
      // the chart still opens on Bangladesh rather than the whole world.
      chart.goHome(0);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const root = am5.Root.new(containerRef.current);

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: am5map.geoMercator(),
        // Panning and zooming are both off. The view is auto-fitted to the
        // whole country, so the only thing a pan could achieve is dragging
        // Bangladesh out of the frame — the exact failure this map had. It
        // also keeps the chart container from swallowing the pointer press
        // that selects a district.
        panX: 'none',
        panY: 'none',
        wheelX: 'none',
        wheelY: 'none',
        pinchZoom: false,
        homeGeoPoint: HOME_GEO_POINT,
        homeZoomLevel: HOME_ZOOM_LEVEL,
      }),
    );

    const series = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
    chartRef.current = chart;
    seriesRef.current = series;

    /*
     * `interactive` is deliberately absent here; `paint` switches it on per
     * polygon instead.
     *
     * amCharts wires a sprite's hover and pointer-down tracking inside an
     * `isDirty("interactive")` branch. A template carrying `interactive: true`
     * makes it the polygon's *initial* value, which is never dirty — so that
     * branch never runs and the polygon gets no tooltip and no hover state,
     * even though an explicitly registered `pointerover` handler still fires.
     * Flipping the setting after creation is what actually activates them.
     */
    series.mapPolygons.template.setAll({ strokeWidth: 0.8 });

    /*
     * Selection is driven by hover plus a native click, rather than by
     * amCharts' own `click` event on a polygon.
     *
     * The canvas renderer resolves a press through its hit-test layer only
     * when the DOM event lands on it, and here the tooltip layer sits on top:
     * `pointerdown` never reaches a polygon, and `click` is gated on it, so no
     * amCharts click ever fires. Hover hit-testing is unaffected and does
     * work, and a click is always preceded by a hover of the same polygon for
     * both mouse and touch — so the hovered district is what a click acts on.
     *
     * The press itself makes amCharts fire `pointerout`, so the hovered
     * district is held until the pointer actually leaves the map; clearing it
     * on `pointerout` would empty it a moment before every click.
     */
    series.mapPolygons.template.events.on('pointerover', (event) => {
      const hovered = event.target.dataItem as
        | { dataContext?: Record<string, unknown> }
        | undefined;
      const name = canonicalNameOf(hovered?.dataContext) || null;
      hoveredRef.current = name;
      if (!name) {
        setTip(null);
        return;
      }
      const current = latest.current;
      const datum =
        current.data.find((entry) => entry.district === name) ??
        ({ district: name, districtId: 0, orders: 0, revenue: 0 } as DistrictHeatmapDatum);
      setTip({
        lines: current.tooltipFor(datum).split('\n').filter(Boolean),
        x: tipPointRef.current.x,
        y: tipPointRef.current.y,
      });
    });
    const container = containerRef.current;
    const handleClick = () => {
      const name = hoveredRef.current;
      if (!name) return;
      const current = latest.current;
      current.onSelectDistrict(current.selectedDistrict === name ? null : name);
    };
    const handleLeave = () => {
      hoveredRef.current = null;
      setTip(null);
    };
    // The tooltip is rendered in the DOM rather than through amCharts. Its
    // canvas tooltip depends on the same internal hover wiring that never
    // activates for these polygons, so it simply never appeared; this keeps
    // the copy translatable and themeable besides.
    const handleMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      tipPointRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setTip((previous) =>
        previous ? { ...previous, ...tipPointRef.current } : previous,
      );
    };
    container.addEventListener('click', handleClick);
    container.addEventListener('pointerleave', handleLeave);
    container.addEventListener('pointermove', handleMove);

    let disposed = false;
    am5.net
      .load('/geo-json/district_wise_bangla_name.json')
      .then((result) => {
        if (disposed) return;
        // GeoJSON first: this is what creates the 64 polygons. Painting only
        // makes sense once they exist, hence the `datavalidated` hook.
        series.set('geoJSON', am5.JSONParser.parse(result.response || '{}'));
        // `paint` is a no-op until the polygons exist, so it is retried both
        // when the series validates and whenever the props change.
        series.events.on('datavalidated', paint);
      })
      .catch(() => {
        /* The districts table below the map remains the readable fallback. */
      });

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('pointerleave', handleLeave);
      container.removeEventListener('pointermove', handleMove);
      disposed = true;
      seriesRef.current = null;
      chartRef.current = null;
      fittedRef.current = false;
      root.dispose();
    };
  }, [paint]);

  // Repaint on any input change. The chart itself is never rebuilt, so the
  // viewport and the user's pan position survive a filter or theme change.
  useEffect(() => {
    paint();
  }, [paint, data, selectedDistrict, tooltipFor, palette]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* The cursor is set here rather than through amCharts' `cursorOverStyle`,
          which depends on the same dormant hover wiring as its tooltip. */}
      <div ref={containerRef} className="absolute inset-0 cursor-pointer" />
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          // Offset from the cursor, and flipped near the right/bottom edge so
          // the tooltip never leaves the card.
          style={{
            left: tip.x > 240 ? undefined : tip.x + 14,
            right: tip.x > 240 ? 12 : undefined,
            top: tip.y > 380 ? undefined : tip.y + 14,
            bottom: tip.y > 380 ? 12 : undefined,
          }}
        >
          {tip.lines.map((line, index) => (
            <p
              key={line}
              className={index === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}
            >
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
