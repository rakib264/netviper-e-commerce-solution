export type VariantMode = "single" | "multi";

export type BarcodeType = "UPC" | "EAN" | "ISBN" | "Custom";

export type MediaType = "image" | "video";

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
}

export interface ProductVariantForm {
  id: string;
  attributeName: string;
  attributeValue: string;
  thumbnailImage: string;
  media: MediaItem[];
  price: number;
  comparePrice: number;
  sku: string;
  barcodeType: BarcodeType;
  barcode: string;
  trackQuantity: boolean;
  quantity: number;
}

export type SizeReferenceId =
  | "iphone"
  | "credit-card"
  | "wine-bottle"
  | "a4-paper"
  | "laptop"
  | "water-bottle"
  | "coffee-mug";

export type MeasurementUnit = "cm" | "in";

export interface SizeVisualizerConfig {
  enabled: boolean;
  referenceObjectIds: SizeReferenceId[];
  bodySilhouetteEnabled: boolean;
  defaultReferenceId?: SizeReferenceId;
  /** Unit assumed for measurements typed without an explicit "cm" / " suffix */
  unit?: MeasurementUnit;
  /** How the product hangs when worn — drives strap length in body mode */
  wearStyle?: "shoulder" | "crossbody" | "handheld";
  /** Optional merchant scale tweaks keyed by reference id */
  scaleOverrides?: Partial<Record<SizeReferenceId, number>>;
}

export interface ShippingClassRef {
  id: string;
  name: string;
  description?: string;
}

export function createMediaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createVariantId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyVariant(
  attributeName = "Color",
  overrides: Partial<ProductVariantForm> = {},
): ProductVariantForm {
  return {
    id: createVariantId(),
    attributeName,
    attributeValue: "",
    thumbnailImage: "",
    media: [],
    price: 0,
    comparePrice: 0,
    sku: "",
    barcodeType: "Custom",
    barcode: "",
    trackQuantity: true,
    quantity: 0,
    ...overrides,
  };
}

/** Normalize legacy string[] images + videoLinks into MediaItem[] */
export function legacyToMedia(
  images: string[] = [],
  videoLinks: string[] = [],
): MediaItem[] {
  return [
    ...images.filter(Boolean).map((url) => ({
      id: createMediaId(),
      type: "image" as const,
      url,
    })),
    ...videoLinks.filter(Boolean).map((url) => ({
      id: createMediaId(),
      type: "video" as const,
      url,
    })),
  ];
}

export function mediaToLegacy(media: MediaItem[] = []) {
  return {
    images: media.filter((m) => m.type === "image").map((m) => m.url),
    videoLinks: media.filter((m) => m.type === "video").map((m) => m.url),
  };
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com") ||
    /\.(mp4|webm|ogg|mov)(\?|$)/i.test(lower)
  );
}

/** True for direct video files we can render in a <video> element */
export function isPlayableVideoFile(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

/**
 * Media fragment that makes browsers paint the first frame as a poster
 * instead of showing a blank black box before playback starts.
 */
export function withPosterFrame(url: string, seconds = 0.1): string {
  if (!url || url.includes("#t=")) return url;
  return `${url}#t=${seconds}`;
}

export function toEmbedUrl(url: string): string {
  return url
    .replace("watch?v=", "embed/")
    .replace("youtu.be/", "youtube.com/embed/")
    .replace("vimeo.com/", "player.vimeo.com/video/");
}
