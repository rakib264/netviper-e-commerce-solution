import { scaleLinear } from "d3-scale";
import type { SizeReferenceId } from "./types";

export interface SizeReferenceObject {
  id: SizeReferenceId;
  label: string;
  /** Real-world height in centimeters */
  heightCm: number;
  /** Real-world width in centimeters */
  widthCm: number;
  description: string;
  /** Natural drawing aspect used by the SVG glyph (width / height) */
  glyphAspect?: number;
}

/** Catalog of reference objects for Tangiblee-style size comparison */
export const SIZE_REFERENCE_OBJECTS: SizeReferenceObject[] = [
  {
    id: "iphone",
    label: "iPhone",
    heightCm: 14.7,
    widthCm: 7.1,
    description: "iPhone 15 · 14.7 × 7.1 cm",
  },
  {
    id: "credit-card",
    label: "Credit card",
    heightCm: 5.4,
    widthCm: 8.6,
    description: "ISO ID-1 card · 8.6 × 5.4 cm",
  },
  {
    id: "wine-bottle",
    label: "Wine bottle",
    heightCm: 30,
    widthCm: 7.5,
    description: "Standard 750 ml bottle",
  },
  {
    id: "a4-paper",
    label: "A4 paper",
    heightCm: 29.7,
    widthCm: 21,
    description: "ISO 216 A4 sheet",
  },
  {
    id: "laptop",
    label: 'Laptop 13"',
    heightCm: 21.5,
    widthCm: 30.4,
    description: "13-inch laptop, closed",
  },
  {
    id: "water-bottle",
    label: "Water bottle",
    heightCm: 25,
    widthCm: 7,
    description: "500–750 ml bottle",
  },
  {
    id: "coffee-mug",
    label: "Coffee mug",
    heightCm: 9.5,
    widthCm: 8,
    description: "Standard ceramic mug",
  },
];

export function getReferenceObject(
  id: SizeReferenceId,
): SizeReferenceObject | undefined {
  return SIZE_REFERENCE_OBJECTS.find((o) => o.id === id);
}

export interface ProductDimensionsCm {
  length: number;
  width: number;
  height: number;
}

export interface StageBox {
  w: number;
  h: number;
  x: number;
  y: number;
}

export interface StageLayout {
  /** Pixels per centimeter, shared by every object on the stage */
  pxPerCm: number;
  baseline: number;
  product: StageBox;
  reference: StageBox;
}

/**
 * Lays product and reference object side by side on a shared baseline using a
 * single linear cm→px scale, so the comparison stays dimensionally honest.
 */
export function computeStageLayout({
  product,
  reference,
  stageWidth,
  stageHeight,
  padding = 32,
  gapCm,
}: {
  product: ProductDimensionsCm;
  reference: SizeReferenceObject;
  stageWidth: number;
  stageHeight: number;
  padding?: number;
  gapCm?: number;
}): StageLayout {
  const productH = Math.max(product.height || product.width || 1, 0.5);
  const productW = Math.max(product.length || product.width || 1, 0.5);
  const refH = reference.heightCm;
  const refW = reference.widthCm;

  const tallestCm = Math.max(productH, refH);
  const gap = gapCm ?? tallestCm * 0.18;
  const totalWidthCm = productW + refW + gap;

  const usableW = Math.max(stageWidth - padding * 2, 40);
  const usableH = Math.max(stageHeight - padding * 2, 40);

  // Fit on both axes; the tighter constraint wins so nothing overflows.
  const pxPerCm = Math.min(usableW / totalWidthCm, usableH / tallestCm);

  const scale = scaleLinear().domain([0, tallestCm]).range([0, tallestCm * pxPerCm]);

  const baseline = padding + usableH;
  const groupW = totalWidthCm * pxPerCm;
  const startX = (stageWidth - groupW) / 2;

  const productBox = {
    w: scale(productW),
    h: scale(productH),
    x: startX,
    y: baseline - scale(productH),
  };
  const referenceBox = {
    w: scale(refW),
    h: scale(refH),
    x: startX + scale(productW) + scale(gap),
    y: baseline - scale(refH),
  };

  return { pxPerCm, baseline, product: productBox, reference: referenceBox };
}

export type WearStyle = "shoulder" | "crossbody" | "handheld";

export interface BodyLayout {
  pxPerCm: number;
  bodyH: number;
  bodyW: number;
  bodyX: number;
  bodyTop: number;
  product: StageBox;
  /** Anchor where the strap meets the shoulder */
  strap: { x: number; y: number };
}

/**
 * Maps a shopper height to the stage and positions the product where that
 * carry style naturally sits on the torso.
 */
export function computeBodyLayout({
  shopperHeightCm,
  product,
  stageWidth,
  stageHeight,
  wearStyle = "shoulder",
  padding = 24,
}: {
  shopperHeightCm: number;
  product: ProductDimensionsCm;
  stageWidth: number;
  stageHeight: number;
  wearStyle?: WearStyle;
  padding?: number;
}): BodyLayout {
  const height = Math.min(210, Math.max(140, shopperHeightCm || 170));
  const bodyH = stageHeight - padding * 2;
  const pxPerCm = bodyH / height;
  const bodyW = bodyH * 0.26;
  const bodyX = stageWidth * 0.42 - bodyW / 2;
  const bodyTop = padding;

  const productW = Math.max(product.length || product.width || 1, 0.5) * pxPerCm;
  const productH = Math.max(product.height || product.width || 1, 0.5) * pxPerCm;

  // Fractions of total stature, measured from the crown of the head.
  const dropByStyle: Record<WearStyle, number> = {
    shoulder: 0.46,
    crossbody: 0.52,
    handheld: 0.58,
  };
  const shoulderY = bodyTop + bodyH * 0.2;
  const productY = bodyTop + bodyH * dropByStyle[wearStyle];
  const productX =
    wearStyle === "handheld"
      ? bodyX + bodyW * 1.05
      : bodyX + bodyW * 0.78;

  return {
    pxPerCm,
    bodyH,
    bodyW,
    bodyX,
    bodyTop,
    product: { w: productW, h: productH, x: productX, y: productY },
    strap: { x: bodyX + bodyW * 0.55, y: shoulderY },
  };
}
