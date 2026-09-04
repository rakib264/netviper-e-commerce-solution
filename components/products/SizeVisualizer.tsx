'use client';

/**
 * Interactive Size & Fit visualizer.
 * Compares the product against real-world reference objects on a shared
 * cm→px scale, or against a body silhouette scaled to the shopper's height.
 */

import {
  dimensionsToCm,
  formatHeightImperial,
  formatMeasurement,
  hasAnyDimension,
  type MeasurementUnit,
} from '@/lib/products/measurements';
import {
  computeBodyLayout,
  computeStageLayout,
  getReferenceObject,
  SIZE_REFERENCE_OBJECTS,
  type SizeReferenceObject,
} from '@/lib/products/size-visualizer';
import type { SizeReferenceId, SizeVisualizerConfig } from '@/lib/products/types';
import { AnimatePresence, motion } from 'framer-motion';
import { PersonStanding, Ruler } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import HumanSilhouette from './size-visualizer/human-silhouette';
import { GlyphDefs, GlyphIcon, ReferenceGlyph } from './size-visualizer/reference-glyphs';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface SizeVisualizerProps {
  productName: string;
  dimensions: {
    length: string | number;
    width: string | number;
    height: string | number;
  };
  config: SizeVisualizerConfig;
  /** Product photo, drawn to scale on the stage for a realistic comparison */
  productImage?: string;
  compact?: boolean;
}

const SPRING = { type: 'spring', stiffness: 140, damping: 20, mass: 0.6 } as const;

function DimensionLabel({
  x,
  y,
  text,
  rotate = 0,
}: {
  x: number;
  y: number;
  text: string;
  rotate?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      className="fill-muted-foreground text-[10px] tracking-[0.08em]"
      stroke="hsl(var(--muted))"
      strokeWidth={4}
      paintOrder="stroke"
      style={{ fontSize: 10, textTransform: 'uppercase' }}
    >
      {text}
    </text>
  );
}

function GroundShadow({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={Math.max(3, rx * 0.16)} fill="url(#svShadow)" />;
}

function FallbackBag({ w, h }: { w: number; h: number }) {
  return (
    <g>
      <path
        d={`M ${w * 0.04} ${h * 0.3} Q ${w * 0.04} ${h * 0.22} ${w * 0.14} ${h * 0.22}
            L ${w * 0.86} ${h * 0.22} Q ${w * 0.96} ${h * 0.22} ${w * 0.96} ${h * 0.3}
            L ${w} ${h * 0.86} Q ${w} ${h} ${w * 0.86} ${h}
            L ${w * 0.14} ${h} Q 0 ${h} 0 ${h * 0.86} Z`}
        fill="url(#svBagFallback)"
      />
      <path
        d={`M ${w * 0.22} ${h * 0.22} C ${w * 0.24} ${h * 0.02} ${w * 0.76} ${h * 0.02} ${w * 0.78} ${h * 0.22}`}
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth={Math.max(2, w * 0.035)}
        strokeLinecap="round"
      />
      <rect
        x={w * 0.42}
        y={h * 0.5}
        width={w * 0.16}
        height={h * 0.12}
        rx={2}
        fill="hsl(var(--secondary))"
      />
    </g>
  );
}

export default function SizeVisualizer({
  productName,
  dimensions,
  config,
  productImage,
  compact = false,
}: SizeVisualizerProps) {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(compact ? 380 : 560);
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  const refs = useMemo<SizeReferenceObject[]>(() => {
    const ids = (config.referenceObjectIds || []).filter(Boolean) as SizeReferenceId[];
    const list = ids.map(getReferenceObject).filter(Boolean) as SizeReferenceObject[];
    return list.length ? list : SIZE_REFERENCE_OBJECTS.slice(0, 3);
  }, [config.referenceObjectIds]);

  const [activeId, setActiveId] = useState<SizeReferenceId>(
    (config.defaultReferenceId as SizeReferenceId) || refs[0]?.id || 'iphone',
  );
  const [mode, setMode] = useState<'objects' | 'body'>('objects');
  const [unit, setUnit] = useState<MeasurementUnit>(config.unit === 'in' ? 'in' : 'cm');
  const [heightCm, setHeightCm] = useState(170);

  useEffect(() => {
    if (!refs.some((r) => r.id === activeId)) setActiveId(refs[0]?.id ?? 'iphone');
  }, [refs, activeId]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setStageWidth(Math.max(280, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!productImage) {
      setImageAspect(null);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled && img.naturalHeight > 0) {
        setImageAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = productImage;
    return () => {
      cancelled = true;
    };
  }, [productImage]);

  const dimsCm = useMemo(
    () => dimensionsToCm(dimensions, config.unit === 'in' ? 'in' : 'cm'),
    [dimensions, config.unit],
  );

  const stageHeight = compact ? 240 : 340;
  const active = getReferenceObject(activeId) || refs[0];

  const layout = useMemo(
    () =>
      active
        ? computeStageLayout({
            product: dimsCm,
            reference: active,
            stageWidth,
            stageHeight,
            padding: compact ? 34 : 46,
          })
        : null,
    [active, dimsCm, stageWidth, stageHeight, compact],
  );

  const body = useMemo(
    () =>
      computeBodyLayout({
        shopperHeightCm: heightCm,
        product: dimsCm,
        stageWidth,
        stageHeight,
        wearStyle: config.wearStyle || 'shoulder',
        padding: compact ? 18 : 26,
      }),
    [heightCm, dimsCm, stageWidth, stageHeight, config.wearStyle, compact],
  );

  if (!config.enabled) return null;
  if (!hasAnyDimension(dimensions)) return null;

  const bodyModeAvailable = Boolean(config.bodySilhouetteEnabled);
  const unitLabel = unit === 'in' ? 'in' : 'cm';
  const dims = [
    { key: 'L', cm: dimsCm.length },
    { key: 'W', cm: dimsCm.width },
    { key: 'H', cm: dimsCm.height },
  ].filter((d) => d.cm > 0);

  const productBox = layout?.product;
  const refBox = layout?.reference;
  const imageBox =
    productBox && imageAspect
      ? (() => {
          // Fit the photo inside the true footprint so it can never look
          // larger than the product actually is.
          const boxAspect = productBox.w / productBox.h;
          const w = imageAspect > boxAspect ? productBox.w : productBox.h * imageAspect;
          const h = imageAspect > boxAspect ? productBox.w / imageAspect : productBox.h;
          return {
            w,
            h,
            x: productBox.x + (productBox.w - w) / 2,
            y: productBox.y + (productBox.h - h),
          };
        })()
      : null;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      {!compact ? (
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-subtle-foreground">{t('products.sizeVisualizer.sizeFit')}</p>
          <h3 className="mt-1 font-heading text-2xl text-foreground">{t('products.sizeVisualizer.seeItInRealSize')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('products.sizeVisualizer.compareWithObjects', { product: productName })}
            {bodyModeAvailable ? ', or scale it to your height' : ''}.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex border border-border p-0.5">
          <button
            type="button"
            onClick={() => setMode('objects')}
            aria-pressed={mode === 'objects'}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors ${
              mode === 'objects' ? 'text-white' : 'text-subtle-foreground hover:text-foreground'
            }`}
          >
            {mode === 'objects' ? (
              <motion.span
                layoutId="sv-mode-pill"
                className="absolute inset-0 bg-primary"
                transition={SPRING}
              />
            ) : null}
            <Ruler className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">{t('products.sizeVisualizer.objects')}</span>
          </button>
          {bodyModeAvailable ? (
            <button
              type="button"
              onClick={() => setMode('body')}
              aria-pressed={mode === 'body'}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                mode === 'body' ? 'text-white' : 'text-subtle-foreground hover:text-foreground'
              }`}
            >
              {mode === 'body' ? (
                <motion.span
                  layoutId="sv-mode-pill"
                  className="absolute inset-0 bg-primary"
                  transition={SPRING}
                />
              ) : null}
              <PersonStanding className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{t('products.sizeVisualizer.onBody')}</span>
            </button>
          ) : null}
        </div>

        <div className="inline-flex overflow-hidden border border-border text-[11px] font-label uppercase tracking-[0.1em]">
          {(['cm', 'in'] as MeasurementUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              aria-pressed={unit === u}
              className={`px-2.5 py-1.5 transition-colors ${
                unit === u ? 'bg-accent text-foreground' : 'text-subtle-foreground hover:text-foreground'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {mode === 'objects' ? (
        <div className="flex flex-wrap gap-2">
          {refs.map((ref) => (
            <button
              key={ref.id}
              type="button"
              onClick={() => setActiveId(ref.id)}
              aria-pressed={activeId === ref.id}
              title={ref.description}
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
                activeId === ref.id
                  ? 'border-foreground bg-primary text-white'
                  : 'border-border text-muted-foreground hover:border-border'
              }`}
            >
              <GlyphIcon id={ref.id} />
              {ref.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        ref={stageRef}
        className="relative overflow-hidden border border-border bg-muted"
        style={{ height: stageHeight }}
      >
        <svg
          width="100%"
          height={stageHeight}
          viewBox={`0 0 ${stageWidth} ${stageHeight}`}
          role="img"
          aria-label={
            mode === 'objects'
              ? t('products.sizeVisualizer.comparedWith', { product: productName, object: active?.label ?? '' })
              : t('products.sizeVisualizer.shownOnFigure', { product: productName, height: heightCm })
          }
        >
          <GlyphDefs />
          <rect width={stageWidth} height={stageHeight} fill="url(#svStage)" />

          <AnimatePresence mode="wait">
            {mode === 'objects' && layout && productBox && refBox && active ? (
              <motion.g
                key="objects"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <line
                  x1={0}
                  y1={layout.baseline}
                  x2={stageWidth}
                  y2={layout.baseline}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 4"
                />

                <GroundShadow
                  cx={productBox.x + productBox.w / 2}
                  cy={layout.baseline + 2}
                  rx={productBox.w * 0.62}
                />
                <GroundShadow
                  cx={refBox.x + refBox.w / 2}
                  cy={layout.baseline + 2}
                  rx={refBox.w * 0.7}
                />

                {/* Product, drawn at true scale */}
                <motion.g animate={{ opacity: 1 }} transition={SPRING}>
                  <rect
                    x={productBox.x}
                    y={productBox.y}
                    width={productBox.w}
                    height={productBox.h}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeDasharray="4 4"
                  />
                  {imageBox && productImage ? (
                    <image
                      href={productImage}
                      x={imageBox.x}
                      y={imageBox.y}
                      width={imageBox.w}
                      height={imageBox.h}
                      preserveAspectRatio="xMidYMax meet"
                      style={{ mixBlendMode: 'multiply' }}
                    />
                  ) : (
                    <g transform={`translate(${productBox.x} ${productBox.y})`}>
                      <FallbackBag w={productBox.w} h={productBox.h} />
                    </g>
                  )}
                </motion.g>

                {/* Height guide */}
                {dimsCm.height > 0 ? (
                  <g>
                    <line
                      x1={productBox.x - 14}
                      y1={productBox.y}
                      x2={productBox.x - 14}
                      y2={layout.baseline}
                      stroke="hsl(var(--subtle-foreground))"
                      markerStart="url(#svArrowStart)"
                      markerEnd="url(#svArrowEnd)"
                    />
                    <DimensionLabel
                      x={productBox.x - 14}
                      y={productBox.y + productBox.h / 2}
                      rotate={-90}
                      text={`${formatMeasurement(dimsCm.height, unit)} ${unitLabel}`}
                    />
                  </g>
                ) : null}

                {/* Width guide */}
                {dimsCm.length > 0 || dimsCm.width > 0 ? (
                  <g>
                    <line
                      x1={productBox.x}
                      y1={layout.baseline + 16}
                      x2={productBox.x + productBox.w}
                      y2={layout.baseline + 16}
                      stroke="hsl(var(--subtle-foreground))"
                      markerStart="url(#svArrowStart)"
                      markerEnd="url(#svArrowEnd)"
                    />
                    <DimensionLabel
                      x={productBox.x + productBox.w / 2}
                      y={layout.baseline + 28}
                      text={`${formatMeasurement(dimsCm.length || dimsCm.width, unit)} ${unitLabel}`}
                    />
                  </g>
                ) : null}

                {/* Reference object */}
                <AnimatePresence mode="wait">
                  <motion.g
                    key={active.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={SPRING}
                  >
                    <g transform={`translate(${refBox.x} ${refBox.y})`}>
                      <ReferenceGlyph id={active.id} w={refBox.w} h={refBox.h} />
                    </g>
                    <DimensionLabel
                      x={refBox.x + refBox.w / 2}
                      y={layout.baseline + 28}
                      text={`${active.label} · ${formatMeasurement(active.heightCm, unit)} ${unitLabel}`}
                    />
                  </motion.g>
                </AnimatePresence>
              </motion.g>
            ) : null}

            {mode === 'body' ? (
              <motion.g
                key="body"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <line
                  x1={0}
                  y1={body.bodyTop + body.bodyH}
                  x2={stageWidth}
                  y2={body.bodyTop + body.bodyH}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 4"
                />
                <GroundShadow
                  cx={body.bodyX + body.bodyW / 2}
                  cy={body.bodyTop + body.bodyH + 2}
                  rx={body.bodyW * 0.9}
                />

                {/* Stature ruler */}
                <g>
                  <line
                    x1={26}
                    y1={body.bodyTop}
                    x2={26}
                    y2={body.bodyTop + body.bodyH}
                    stroke="hsl(var(--border))"
                    markerStart="url(#svArrowStart)"
                    markerEnd="url(#svArrowEnd)"
                  />
                  <DimensionLabel
                    x={26}
                    y={body.bodyTop + body.bodyH / 2}
                    rotate={-90}
                    text={
                      unit === 'in'
                        ? formatHeightImperial(heightCm)
                        : `${Math.round(heightCm)} cm`
                    }
                  />
                </g>

                <HumanSilhouette
                  x={body.bodyX}
                  y={body.bodyTop}
                  width={body.bodyW}
                  height={body.bodyH}
                />

                {/* Strap */}
                <path
                  d={`M ${body.strap.x} ${body.strap.y}
                      Q ${body.product.x + body.product.w * 0.1} ${(body.strap.y + body.product.y) / 2}
                        ${body.product.x + body.product.w * 0.22} ${body.product.y}`}
                  fill="none"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={Math.max(1.5, body.product.w * 0.05)}
                  strokeLinecap="round"
                />
                <path
                  d={`M ${body.strap.x + body.bodyW * 0.12} ${body.strap.y}
                      Q ${body.product.x + body.product.w * 0.9} ${(body.strap.y + body.product.y) / 2}
                        ${body.product.x + body.product.w * 0.78} ${body.product.y}`}
                  fill="none"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={Math.max(1.5, body.product.w * 0.05)}
                  strokeLinecap="round"
                />

                <motion.g
                  animate={{ x: body.product.x, y: body.product.y }}
                  transition={SPRING}
                  initial={false}
                >
                  {productImage && imageAspect ? (
                    <image
                      href={productImage}
                      width={body.product.w}
                      height={body.product.h}
                      preserveAspectRatio="xMidYMid meet"
                      style={{ mixBlendMode: 'multiply' }}
                    />
                  ) : (
                    <FallbackBag w={body.product.w} h={body.product.h} />
                  )}
                </motion.g>
              </motion.g>
            ) : null}
          </AnimatePresence>
        </svg>
      </div>

      {mode === 'body' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-label uppercase tracking-[0.1em] text-subtle-foreground">
            <label htmlFor="sv-height">{t('products.sizeVisualizer.yourHeight')}</label>
            <span className="text-foreground">
              {Math.round(heightCm)} {t('products.sizeVisualizer.cm')} {formatHeightImperial(heightCm)}
            </span>
          </div>
          <input
            id="sv-height"
            type="range"
            min={140}
            max={205}
            step={1}
            value={heightCm}
            onChange={(event) => setHeightCm(Number(event.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>
      ) : null}

      {dims.length ? (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {dims.map((d) => (
            <div key={d.key} className="flex gap-1.5">
              <dt className="uppercase tracking-[0.1em] text-subtle-foreground font-label">{d.key}</dt>
              <dd>
                {formatMeasurement(d.cm, unit)} {unitLabel}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
